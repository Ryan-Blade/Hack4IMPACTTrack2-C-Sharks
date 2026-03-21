"""
EcoSync LangGraph Multi-Agent Orchestrator
Manages the state machine for energy trading agents
"""
import json
import asyncio
import random
from typing import Dict, List, TypedDict, Annotated, Literal
from datetime import datetime
from enum import Enum

from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor

from .agent import BuildingAgent, AgentState


# Define the state schema for LangGraph
class TradeState(TypedDict):
    """State for the trading workflow"""
    agent_id: int
    action: Literal["analyze", "check_price", "negotiate", "execute", "complete"]
    building_state: Dict
    market_data: Dict
    negotiation_counterparty: int
    negotiation_offer: Dict
    trade_result: Dict
    logs: List[str]


class MultiAgentOrchestrator:
    """
    Orchestrates multiple AI agents for P2P energy trading using LangGraph.
    Manages the complete trading lifecycle from analysis to execution.
    """
    
    def __init__(self, mqtt_broker: str = "localhost", mqtt_port: int = 1883):
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.agents: Dict[int, BuildingAgent] = {}
        self.workflow = self._build_workflow()
        
        # Market statistics
        self.total_trades = 0
        self.total_volume = 0.0
        self.active_negotiations: Dict[str, Dict] = {}
        
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph state machine for trading"""
        
        # Define nodes
        def analyze_load(state: TradeState) -> TradeState:
            """Node 1: Analyze building energy situation"""
            agent_id = state["agent_id"]
            agent = self.agents.get(agent_id)
            
            if not agent:
                state["action"] = "complete"
                return state
            
            decision = agent.analyze_load()
            state["logs"].append(f"Agent {agent_id}: Load analysis - {decision}")
            
            if decision == "sell":
                state["action"] = "check_price"
            elif decision == "buy":
                state["action"] = "check_price"
            else:
                state["action"] = "complete"
            
            return state
        
        def check_market_price(state: TradeState) -> TradeState:
            """Node 2: Check current market conditions"""
            agent_id = state["agent_id"]
            agent = self.agents.get(agent_id)
            
            if not agent:
                state["action"] = "complete"
                return state
            
            analysis = agent.check_market_price()
            state["market_data"] = analysis
            state["logs"].append(
                f"Agent {agent_id}: Market price ${analysis['current_price']}/kWh"
            )
            
            # Find potential trading partners
            if agent.is_selling:
                # Look for buyers
                buyers = [a for a in self.agents.values() if a.is_buying and a.building_id != agent_id]
                if buyers:
                    # Pick buyer with highest need (lowest battery)
                    buyer = min(buyers, key=lambda x: x.battery_soc)
                    state["negotiation_counterparty"] = buyer.building_id
                    state["negotiation_offer"] = {
                        "type": "buy",
                        "amount": min(agent.net_energy * 0.5, 50),  # Offer up to 50kW
                        "price": analysis["current_price"] * 1.1  # Slight premium
                    }
                    state["action"] = "negotiate"
                else:
                    state["logs"].append(f"Agent {agent_id}: No buyers available")
                    state["action"] = "complete"
            
            elif agent.is_buying:
                # Look for sellers
                sellers = [a for a in self.agents.values() if a.is_selling and a.building_id != agent_id]
                if sellers:
                    # Pick seller with highest surplus
                    seller = max(sellers, key=lambda x: x.net_energy)
                    state["negotiation_counterparty"] = seller.building_id
                    state["negotiation_offer"] = {
                        "type": "sell",
                        "amount": min(abs(agent.net_energy) * 0.5, 50),
                        "price": analysis["current_price"] * 0.9  # Slight discount
                    }
                    state["action"] = "negotiate"
                else:
                    state["logs"].append(f"Agent {agent_id}: No sellers available")
                    state["action"] = "complete"
            
            return state
        
        def negotiate(state: TradeState) -> TradeState:
            """Node 3: Negotiate with counterparty"""
            agent_id = state["agent_id"]
            counterparty_id = state.get("negotiation_counterparty")
            offer = state.get("negotiation_offer", {})
            
            agent = self.agents.get(agent_id)
            counterparty = self.agents.get(counterparty_id) if counterparty_id else None
            
            if not agent or not counterparty:
                state["action"] = "complete"
                return state
            
            # Perform negotiation
            result = counterparty.negotiate(
                agent_id,
                offer.get("type", "buy"),
                offer.get("amount", 10),
                offer.get("price", 0.15)
            )
            
            state["logs"].append(
                f"Agent {agent_id}: Negotiation with {counterparty_id} - "
                f"{'Success' if result.get('agreed') else 'Failed'}"
            )
            
            if result.get("agreed"):
                state["trade_result"] = result
                state["action"] = "execute"
            else:
                state["action"] = "complete"
            
            return state
        
        def execute_trade(state: TradeState) -> TradeState:
            """Node 4: Execute the finalized trade"""
            agent_id = state["agent_id"]
            trade_result = state.get("trade_result", {})
            
            agent = self.agents.get(agent_id)
            if not agent:
                state["action"] = "complete"
                return state
            
            # Execute trade
            execution = agent.execute_trade(trade_result)
            
            # Update statistics
            self.total_trades += 1
            self.total_volume += trade_result.get("final_amount", 0)
            
            state["logs"].append(
                f"Agent {agent_id}: Trade executed - "
                f"{trade_result.get('final_amount')}kWh at ${trade_result.get('final_price')}/kWh"
            )
            state["action"] = "complete"
            
            return state
        
        # Build the graph
        workflow = StateGraph(TradeState)
        
        # Add nodes
        workflow.add_node("analyze_load", analyze_load)
        workflow.add_node("check_market_price", check_market_price)
        workflow.add_node("negotiate", negotiate)
        workflow.add_node("execute_trade", execute_trade)
        
        # Define edges
        workflow.set_entry_point("analyze_load")
        
        workflow.add_conditional_edges(
            "analyze_load",
            lambda x: x["action"],
            {
                "check_price": "check_market_price",
                "complete": END
            }
        )
        
        workflow.add_conditional_edges(
            "check_market_price",
            lambda x: x["action"],
            {
                "negotiate": "negotiate",
                "complete": END
            }
        )
        
        workflow.add_conditional_edges(
            "negotiate",
            lambda x: x["action"],
            {
                "execute": "execute_trade",
                "complete": END
            }
        )
        
        workflow.add_edge("execute_trade", END)
        
        return workflow.compile()
    
    def register_agent(self, building_id: int, building_type: str = "residential", is_priority: bool = False):
        """Register a new building agent"""
        agent = BuildingAgent(
            building_id=building_id,
            building_type=building_type,
            is_priority=is_priority,
            mqtt_broker=self.mqtt_broker,
            mqtt_port=self.mqtt_port
        )
        agent.connect()
        self.agents[building_id] = agent
        print(f"Orchestrator: Registered agent for building {building_id} ({building_type})")
    
    def unregister_agent(self, building_id: int):
        """Remove an agent from the orchestrator"""
        if building_id in self.agents:
            self.agents[building_id].disconnect()
            del self.agents[building_id]
    
    async def run_trading_cycle(self, agent_id: int):
        """Run a complete trading cycle for an agent"""
        if agent_id not in self.agents:
            return
        
        initial_state: TradeState = {
            "agent_id": agent_id,
            "action": "analyze",
            "building_state": {},
            "market_data": {},
            "negotiation_counterparty": None,
            "negotiation_offer": {},
            "trade_result": {},
            "logs": []
        }
        
        try:
            result = await asyncio.to_thread(self.workflow.invoke, initial_state)
            return result
        except Exception as e:
            print(f"Trading cycle error for agent {agent_id}: {e}")
            return None
    
    async def run_all_cycles(self):
        """Run trading cycles for all agents"""
        tasks = []
        for agent_id in self.agents:
            # Random delay to prevent thundering herd
            await asyncio.sleep(random.uniform(0.1, 0.5))
            task = asyncio.create_task(self.run_trading_cycle(agent_id))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
    
    def get_agent_status(self, agent_id: int) -> Dict:
        """Get status of a specific agent"""
        if agent_id in self.agents:
            return self.agents[agent_id].get_state_dict()
        return {}
    
    def get_all_status(self) -> List[Dict]:
        """Get status of all agents"""
        return [agent.get_state_dict() for agent in self.agents.values()]
    
    def get_market_stats(self) -> Dict:
        """Get market statistics"""
        active_sellers = sum(1 for a in self.agents.values() if a.is_selling)
        active_buyers = sum(1 for a in self.agents.values() if a.is_buying)
        
        return {
            "total_trades": self.total_trades,
            "total_volume": round(self.total_volume, 2),
            "active_sellers": active_sellers,
            "active_buyers": active_buyers,
            "registered_agents": len(self.agents)
        }


# Singleton instance
_orchestrator: MultiAgentOrchestrator = None

def get_orchestrator() -> MultiAgentOrchestrator:
    """Get or create the singleton orchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MultiAgentOrchestrator()
    return _orchestrator
