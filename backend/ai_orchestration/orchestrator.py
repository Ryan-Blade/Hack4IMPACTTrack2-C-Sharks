"""
EcoSync AI Orchestrator
Manages multiple AI agents for P2P energy trading
"""
import json
import time
import threading
import random
from typing import Dict, List, Optional, Callable
from datetime import datetime
from dataclasses import dataclass, field

from .agent import BuildingAgent, AgentState


@dataclass
class Trade:
    """Represents a completed trade"""
    trade_id: str
    buyer_id: int
    seller_id: int
    amount: float
    price: float
    total_cost: float
    timestamp: str
    status: str = "completed"


@dataclass
class OrchestratorStats:
    """Statistics for the orchestrator"""
    total_trades: int = 0
    total_volume: float = 0.0
    total_value: float = 0.0
    active_sellers: int = 0
    active_buyers: int = 0
    critical_buildings: int = 0
    start_time: str = field(default_factory=lambda: datetime.now().isoformat())
    trades_history: List[Dict] = field(default_factory=list)


class MultiAgentOrchestrator:
    """
    Orchestrates multiple AI agents for P2P energy trading.
    Manages the complete trading lifecycle from analysis to execution.
    """
    
    def __init__(self, mqtt_broker: str = None, mqtt_port: int = None):
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.agents: Dict[int, BuildingAgent] = {}
        self.stats = OrchestratorStats()
        self.running = False
        self._stop_event = threading.Event()   # fast-wakeup on stop
        
        # Trading cycle thread
        self.cycle_thread: Optional[threading.Thread] = None
        self.cycle_interval = 10  # seconds
        
        # Callbacks
        self.log_callback: Optional[Callable] = None
        self.trade_callback: Optional[Callable] = None
        
        # Matchmaking queue
        self.buy_offers: List[Dict] = []  # Buildings wanting to buy
        self.sell_offers: List[Dict] = []  # Buildings wanting to sell
        
    def register_agent(self, building_id: int, building_type: str = "residential", is_priority: bool = False):
        """Register a new building agent"""
        agent = BuildingAgent(
            building_id=building_id,
            building_type=building_type,
            is_priority=is_priority,
            mqtt_broker=self.mqtt_broker,
            mqtt_port=self.mqtt_port
        )
        
        # Set callbacks
        agent.set_log_callback(self._on_agent_log)
        agent.set_trade_callback(self._on_agent_trade)
        
        agent.connect()
        self.agents[building_id] = agent
        print(f"🤖 Registered Agent for Building {building_id} ({building_type})")
    
    def unregister_agent(self, building_id: int):
        """Remove an agent from the orchestrator"""
        if building_id in self.agents:
            self.agents[building_id].disconnect()
            del self.agents[building_id]
            print(f"🗑️  Unregistered Agent for Building {building_id}")
    
    def _on_agent_log(self, log_entry: Dict):
        """Handle agent log messages"""
        if self.log_callback:
            self.log_callback(log_entry)
    
    def _on_agent_trade(self, trade: Dict):
        """Handle agent trade execution"""
        # Update statistics
        self.stats.total_trades += 1
        self.stats.total_volume += trade.get("amount", 0)
        self.stats.total_value += trade.get("total_cost", 0)
        self.stats.trades_history.append(trade)
        
        # Keep only last 100 trades
        if len(self.stats.trades_history) > 100:
            self.stats.trades_history = self.stats.trades_history[-100:]
        
        if self.trade_callback:
            self.trade_callback(trade)
    
    def _match_trades(self):
        """Match buy and sell offers"""
        # Get current buy/sell intentions from agents
        buyers = [a for a in self.agents.values() if a.is_buying]
        sellers = [a for a in self.agents.values() if a.is_selling]
        
        # Sort by urgency (battery level)
        buyers.sort(key=lambda x: x.battery_soc)
        sellers.sort(key=lambda x: x.battery_soc, reverse=True)
        
        matched_trades = []
        
        for buyer in buyers:
            if not sellers:
                break
            
            # Find best seller (highest battery, best price)
            for seller in sellers[:]:
                if seller.building_id == buyer.building_id:
                    continue
                
                # Calculate trade amount
                buyer_need = abs(buyer.net_energy) * 0.5
                seller_surplus = seller.net_energy * 0.5
                trade_amount = min(buyer_need, seller_surplus, 50)  # Max 50kW
                
                if trade_amount < 1:  # Minimum trade size
                    continue
                
                # Determine price (average of both parties' targets)
                price = (buyer.market_price + seller.market_price) / 2
                
                # Execute trade
                trade_details = {
                    "agreed": True,
                    "final_price": round(price, 3),
                    "final_amount": round(trade_amount, 1),
                    "buyer_id": buyer.building_id,
                    "seller_id": seller.building_id
                }
                
                # Execute for both parties
                buyer.execute_trade(trade_details)
                seller.execute_trade(trade_details)
                
                matched_trades.append(trade_details)
                
                # Remove seller from available list
                sellers.remove(seller)
                break
        
        return matched_trades
    
    def _trading_cycle(self):
        """Main trading cycle loop"""
        while self.running:
            try:
                # Run trading cycle for each agent
                for agent in self.agents.values():
                    try:
                        agent.run_trading_cycle()
                    except Exception as e:
                        print(f"⚠️ Agent {agent.building_id} cycle error: {e}")
                
                # Match trades between agents
                self._match_trades()
                
                # Update statistics
                self._update_stats()
                
                # Sleep until next cycle — Event.wait wakes immediately on stop()
                self._stop_event.wait(self.cycle_interval)
                
            except Exception as e:
                print(f"⚠️ Trading cycle error: {e}")
                self._stop_event.wait(5)
    
    def _update_stats(self):
        """Update orchestrator statistics"""
        self.stats.active_sellers = sum(1 for a in self.agents.values() if a.is_selling)
        self.stats.active_buyers = sum(1 for a in self.agents.values() if a.is_buying)
        self.stats.critical_buildings = sum(1 for a in self.agents.values() if a.battery_soc < 15)
    
    def start(self):
        """Start the orchestrator"""
        print("\n" + "="*70)
        print("  🤖 EcoSync AI Trading Orchestrator")
        print("="*70 + "\n")
        
        self.running = True
        
        # Start trading cycle
        self.cycle_thread = threading.Thread(target=self._trading_cycle, daemon=True)
        self.cycle_thread.start()
        
        print(f"▶️  Orchestrator started with {len(self.agents)} agents")
        print(f"   Trading cycle interval: {self.cycle_interval}s\n")
    
    def stop(self):
        """Stop the orchestrator"""
        self.running = False
        self._stop_event.set()   # Wake the trading cycle thread immediately
        
        # Unregister all agents
        for building_id in list(self.agents.keys()):
            self.unregister_agent(building_id)
        
        print("⏹️  Orchestrator stopped")
    
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
        return {
            "total_trades": self.stats.total_trades,
            "total_volume": round(self.stats.total_volume, 2),
            "total_value": round(self.stats.total_value, 2),
            "active_sellers": self.stats.active_sellers,
            "active_buyers": self.stats.active_buyers,
            "critical_buildings": self.stats.critical_buildings,
            "registered_agents": len(self.agents),
            "avg_trade_size": round(self.stats.total_volume / max(1, self.stats.total_trades), 2),
            "uptime": (datetime.now() - datetime.fromisoformat(self.stats.start_time)).total_seconds()
        }
    
    def get_recent_trades(self, limit: int = 10) -> List[Dict]:
        """Get recent trades"""
        return self.stats.trades_history[-limit:]
    
    def set_log_callback(self, callback: Callable):
        """Set callback for agent logs"""
        self.log_callback = callback
    
    def set_trade_callback(self, callback: Callable):
        """Set callback for trades"""
        self.trade_callback = callback
    
    def force_trade(self, buyer_id: int, seller_id: int, amount: float, price: float):
        """Force a trade between two agents"""
        if buyer_id not in self.agents or seller_id not in self.agents:
            raise ValueError("Invalid buyer or seller ID")
        
        trade_details = {
            "agreed": True,
            "final_price": price,
            "final_amount": amount,
            "buyer_id": buyer_id,
            "seller_id": seller_id
        }
        
        self.agents[buyer_id].execute_trade(trade_details)
        self.agents[seller_id].execute_trade(trade_details)
        
        return trade_details


# Singleton instance
_orchestrator: Optional[MultiAgentOrchestrator] = None

def get_orchestrator(mqtt_broker: str = None, mqtt_port: int = None) -> MultiAgentOrchestrator:
    """Get or create the singleton orchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MultiAgentOrchestrator(mqtt_broker, mqtt_port)
    return _orchestrator
