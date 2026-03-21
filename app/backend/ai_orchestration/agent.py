"""
EcoSync AI Agent - Building Energy Trading Agent
LangGraph-powered agent for autonomous energy trading decisions
"""
import json
import random
from typing import Dict, List, Optional, TypedDict, Annotated
from datetime import datetime
from enum import Enum

import paho.mqtt.client as mqtt


class AgentState(str, Enum):
    IDLE = "idle"
    ANALYZING = "analyzing"
    NEGOTIATING = "negotiating"
    EXECUTING = "executing"
    COMPLETED = "completed"


class BuildingAgent:
    """
    AI Agent representing a smart building in the energy marketplace.
    Makes autonomous decisions about buying/selling energy.
    """
    
    def __init__(
        self,
        building_id: int,
        building_type: str = "residential",
        is_priority: bool = False,
        mqtt_broker: str = "localhost",
        mqtt_port: int = 1883
    ):
        self.building_id = building_id
        self.building_type = building_type
        self.is_priority = is_priority
        
        # Agent state
        self.state = AgentState.IDLE
        self.current_balance = random.uniform(1000, 5000)  # EcoTokens
        self.reputation_score = random.uniform(0.7, 1.0)  # Trading reputation
        
        # Energy state
        self.current_load = 0.0
        self.solar_generation = 0.0
        self.battery_soc = 50.0
        self.net_energy = 0.0
        
        # Trading state
        self.is_selling = False
        self.is_buying = False
        self.target_price = 0.15
        self.pending_trades: List[Dict] = []
        self.completed_trades: List[Dict] = []
        
        # Thought logs for visualization
        self.thought_logs: List[Dict] = []
        
        # MQTT client
        self.mqtt_client = mqtt.Client(client_id=f"agent_{building_id}")
        self.mqtt_client.on_connect = self._on_connect
        self.mqtt_client.on_message = self._on_message
        
        # Market data
        self.market_price = 0.15
        self.active_offers: Dict[int, Dict] = {}  # building_id -> offer
        
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            # Subscribe to telemetry for this building
            self.mqtt_client.subscribe(f"ecosync/building/{self.building_id}/telemetry")
            # Subscribe to market trades
            self.mqtt_client.subscribe("ecosync/market/trades")
            # Subscribe to agent offers
            self.mqtt_client.subscribe("ecosync/agents/offers")
        else:
            print(f"Agent {self.building_id}: Connection failed")
    
    def _on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            if f"building/{self.building_id}/telemetry" in topic:
                self._update_telemetry(payload)
            elif "market/trades" in topic:
                self._handle_trade_notification(payload)
            elif "agents/offers" in topic:
                self._handle_offer(payload)
        except Exception as e:
            print(f"Agent {self.building_id}: Message error - {e}")
    
    def _update_telemetry(self, data: Dict):
        """Update agent's understanding of building state"""
        self.current_load = data.get("load", 0)
        self.solar_generation = data.get("solar_generation", 0)
        self.battery_soc = data.get("battery_soc", 50)
        self.net_energy = data.get("net_energy", 0)
        self.is_selling = data.get("is_selling", False)
        self.is_buying = data.get("is_buying", False)
    
    def _handle_trade_notification(self, trade: Dict):
        """Process trade notifications from the market"""
        if trade.get("buyer_id") == self.building_id or trade.get("seller_id") == self.building_id:
            self.completed_trades.append(trade)
            self._log_thought(
                f"Trade completed! {trade['amount']}kWh at ${trade['price']}/kWh",
                "success"
            )
    
    def _handle_offer(self, offer: Dict):
        """Process offers from other agents"""
        sender_id = offer.get("from_agent")
        if sender_id == self.building_id:
            return
        
        self.active_offers[sender_id] = offer
        
        # If we're buying and someone is selling
        if self.is_buying and offer.get("type") == "sell_offer":
            self._evaluate_offer(offer)
    
    def _log_thought(self, message: str, thought_type: str = "info"):
        """Log agent's thought process for visualization"""
        log_entry = {
            "agent_id": self.building_id,
            "building_type": self.building_type,
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "type": thought_type,
            "state": self.state.value,
            "battery_soc": self.battery_soc,
            "net_energy": self.net_energy
        }
        self.thought_logs.append(log_entry)
        
        # Publish to MQTT for frontend
        self.mqtt_client.publish(
            f"ecosync/agents/{self.building_id}/logs",
            json.dumps(log_entry)
        )
        
        # Keep only last 100 logs
        if len(self.thought_logs) > 100:
            self.thought_logs = self.thought_logs[-100:]
    
    def analyze_load(self) -> str:
        """
        Analyze current energy situation and determine next action
        Returns: 'sell', 'buy', or 'hold'
        """
        self.state = AgentState.ANALYZING
        
        # Priority buildings have different thresholds
        critical_threshold = 30 if self.is_priority else 15
        surplus_threshold = 80 if self.is_priority else 70
        
        if self.battery_soc < critical_threshold:
            self._log_thought(
                f"CRITICAL: Battery at {self.battery_soc:.1f}%! Need to buy energy urgently.",
                "critical"
            )
            self.is_buying = True
            self.is_selling = False
            return "buy"
        
        elif self.battery_soc > surplus_threshold and self.net_energy > 0:
            surplus = self.net_energy
            self._log_thought(
                f"Surplus detected: {surplus:.1f}kW available. Battery at {self.battery_soc:.1f}%. "
                f"Ready to sell at market price ${self.market_price}/kWh.",
                "info"
            )
            self.is_selling = True
            self.is_buying = False
            return "sell"
        
        else:
            self._log_thought(
                f"Energy balanced. Load: {self.current_load:.1f}kW, "
                f"Generation: {self.solar_generation:.1f}kW, SoC: {self.battery_soc:.1f}%",
                "info"
            )
            self.is_selling = False
            self.is_buying = False
            return "hold"
    
    def check_market_price(self) -> Dict:
        """Check current market conditions"""
        price_acceptance_range = (0.10, 0.25)
        
        is_price_favorable = price_acceptance_range[0] <= self.market_price <= price_acceptance_range[1]
        
        analysis = {
            "current_price": self.market_price,
            "is_favorable": is_price_favorable,
            "max_buy_price": 0.20 if self.battery_soc > 20 else 0.25,
            "min_sell_price": 0.12 if self.battery_soc < 90 else 0.10
        }
        
        self._log_thought(
            f"Market analysis: Price ${self.market_price}/kWh is "
            f"{'favorable' if is_price_favorable else 'unfavorable'} for trading.",
            "info"
        )
        
        return analysis
    
    def negotiate(self, counterparty_id: int, offer_type: str, amount: float, price: float) -> Dict:
        """
        Negotiate with another agent
        Returns the final agreed trade terms
        """
        self.state = AgentState.NEGOTIATING
        
        self._log_thought(
            f"Initiating negotiation with Building {counterparty_id} for {amount}kWh at ${price}/kWh",
            "negotiation"
        )
        
        # Simple negotiation logic
        if offer_type == "buy":
            # We're selling
            min_acceptable = self.target_price * 0.9
            if price >= min_acceptable:
                self._log_thought(
                    f"Accepting offer from Building {counterparty_id}. "
                    f"Price ${price} meets minimum ${min_acceptable:.3f}",
                    "success"
                )
                return {
                    "agreed": True,
                    "final_price": price,
                    "final_amount": amount,
                    "seller_id": self.building_id,
                    "buyer_id": counterparty_id
                }
            else:
                counter_offer = (price + min_acceptable) / 2
                self._log_thought(
                    f"Counter-offering ${counter_offer:.3f}/kWh (original: ${price})",
                    "negotiation"
                )
                return {
                    "agreed": False,
                    "counter_offer": counter_offer,
                    "reason": "Price too low"
                }
        
        else:  # sell offer
            # We're buying
            max_acceptable = 0.20 if self.battery_soc > 20 else 0.25
            if price <= max_acceptable:
                self._log_thought(
                    f"Accepting purchase from Building {counterparty_id}. "
                    f"Price ${price} is within budget.",
                    "success"
                )
                return {
                    "agreed": True,
                    "final_price": price,
                    "final_amount": amount,
                    "seller_id": counterparty_id,
                    "buyer_id": self.building_id
                }
            else:
                self._log_thought(
                    f"Rejecting offer - price ${price} exceeds max ${max_acceptable}",
                    "warning"
                )
                return {
                    "agreed": False,
                    "reason": "Price too high"
                }
    
    def execute_trade(self, trade_details: Dict) -> Dict:
        """Execute the finalized trade"""
        self.state = AgentState.EXECUTING
        
        total_cost = trade_details["final_amount"] * trade_details["final_price"]
        
        # Update balance
        if trade_details["buyer_id"] == self.building_id:
            self.current_balance -= total_cost
            action = "bought"
        else:
            self.current_balance += total_cost
            action = "sold"
        
        self._log_thought(
            f"Trade executed! {action} {trade_details['final_amount']}kWh for ${total_cost:.2f}. "
            f"Balance: {self.current_balance:.2f} EcoTokens",
            "success"
        )
        
        # Publish trade to market
        trade_msg = {
            "type": "trade_request",
            "buyer_id": trade_details["buyer_id"],
            "seller_id": trade_details["seller_id"],
            "amount": trade_details["final_amount"],
            "price": trade_details["final_price"],
            "timestamp": datetime.now().isoformat()
        }
        self.mqtt_client.publish("ecosync/market/trades", json.dumps(trade_msg))
        
        self.state = AgentState.COMPLETED
        self.pending_trades.append(trade_details)
        
        return trade_msg
    
    def publish_offer(self, amount: float, price: float):
        """Publish a sell offer to the market"""
        offer = {
            "type": "sell_offer",
            "from_agent": self.building_id,
            "building_type": self.building_type,
            "amount": amount,
            "price": price,
            "timestamp": datetime.now().isoformat()
        }
        self.mqtt_client.publish("ecosync/agents/offers", json.dumps(offer))
        self._log_thought(f"Published sell offer: {amount}kWh at ${price}/kWh", "info")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.mqtt_client.connect("localhost", 1883, 60)
            self.mqtt_client.loop_start()
        except Exception as e:
            print(f"Agent {self.building_id}: Connection failed - {e}")
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()
    
    def get_state_dict(self) -> Dict:
        """Get agent state as dictionary"""
        return {
            "agent_id": self.building_id,
            "building_type": self.building_type,
            "state": self.state.value,
            "balance": round(self.current_balance, 2),
            "reputation": round(self.reputation_score, 3),
            "battery_soc": round(self.battery_soc, 2),
            "net_energy": round(self.net_energy, 2),
            "is_selling": self.is_selling,
            "is_buying": self.is_buying,
            "trades_completed": len(self.completed_trades),
            "recent_logs": self.thought_logs[-5:]
        }
