"""
EcoSync AI Agent - Building Energy Trading Agent
LangGraph-powered agent for autonomous energy trading decisions
"""
import json
import random
import time
from typing import Dict, List, Optional, Callable
from datetime import datetime
from enum import Enum
import uuid

import paho.mqtt.client as mqtt

from config.settings import mqtt_config


class AgentState(Enum):
    IDLE = "idle"
    ANALYZING = "analyzing"
    CHECKING_PRICE = "checking_price"
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
        mqtt_broker: str = None,
        mqtt_port: int = None
    ):
        self.building_id = building_id
        self.building_type = building_type
        self.is_priority = is_priority
        
        # Agent state
        self.state = AgentState.IDLE
        self.current_balance = random.uniform(1000, 5000)  # EcoTokens
        self.reputation_score = random.uniform(0.7, 1.0)  # Trading reputation
        
        # Energy state (updated from telemetry)
        self.current_load = 0.0
        self.solar_generation = 0.0
        self.battery_soc = 50.0
        self.net_energy = 0.0
        self.is_selling = False
        self.is_buying = False
        
        # Trading state
        self.target_price = 0.15
        self.pending_trades: List[Dict] = []
        self.completed_trades: List[Dict] = []
        
        # Thought logs for visualization
        self.thought_logs: List[Dict] = []
        self.max_logs = 100
        
        # MQTT client
        self.mqtt_broker = mqtt_broker or mqtt_config.broker_host
        self.mqtt_port = mqtt_port or mqtt_config.broker_port
        self.client = mqtt.Client(
            client_id=f"agent_{building_id}_{uuid.uuid4().hex[:8]}",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1
        )
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        
        # Market data
        self.market_price = 0.15
        self.active_offers: Dict[int, Dict] = {}  # building_id -> offer
        
        # Callbacks
        self.log_callback: Optional[Callable] = None
        self.trade_callback: Optional[Callable] = None
        
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            # Subscribe to telemetry for this building
            self.client.subscribe(f"ecosync/building/{self.building_id}/telemetry")
            # Subscribe to market trades
            self.client.subscribe("ecosync/market/trades")
            # Subscribe to agent offers
            self.client.subscribe("ecosync/agents/offers")
        else:
            print(f"❌ Agent {self.building_id}: Connection failed")
    
    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            print(f"⚠️ Agent {self.building_id}: Unexpected disconnection")
    
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
            print(f"⚠️ Agent {self.building_id}: Message error - {e}")
    
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
            role = "sold" if trade.get("seller_id") == self.building_id else "bought"
            self._log_thought(
                f"Trade completed! {role} {trade['amount']:.1f}kWh at ${trade['price']:.3f}/kWh "
                f"(Total: ${trade.get('total_cost', 0):.2f})",
                "success"
            )
            
            if self.trade_callback:
                self.trade_callback(trade)
    
    def _handle_offer(self, offer: Dict):
        """Process offers from other agents"""
        sender_id = offer.get("from_agent")
        if sender_id == self.building_id:
            return
        
        self.active_offers[sender_id] = offer
        
        # If we're buying and someone is selling
        if self.is_buying and offer.get("type") == "sell_offer":
            self._evaluate_offer(offer)
    
    def _evaluate_offer(self, offer: Dict):
        """Evaluate and potentially accept a sell offer from another agent"""
        price = offer.get("price", 999)
        amount = offer.get("amount", 0)
        seller_id = offer.get("from_agent")
        
        # Max acceptable price depends on urgency
        max_acceptable = 0.22 if self.battery_soc > 20 else 0.30
        
        if price <= max_acceptable:
            self._log_thought(
                f"✅ Accepting offer from Building {seller_id}: {amount:.1f}kWh at ${price:.3f}/kWh",
                "success"
            )
            # Execute the trade
            trade_details = {
                "agreed": True,
                "final_price": price,
                "final_amount": min(amount, abs(self.net_energy)),
                "seller_id": seller_id,
                "buyer_id": self.building_id
            }
            self.execute_trade(trade_details)
        else:
            self._log_thought(
                f"❌ Rejecting offer from Building {seller_id}: Price ${price:.3f} too high (max ${max_acceptable:.3f})",
                "warning"
            )
    
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
        try:
            self.client.publish(
                f"ecosync/agents/{self.building_id}/logs",
                json.dumps(log_entry)
            )
        except:
            pass
        
        # Call callback if set
        if self.log_callback:
            self.log_callback(log_entry)
        
        # Keep only last N logs
        if len(self.thought_logs) > self.max_logs:
            self.thought_logs = self.thought_logs[-self.max_logs:]
    
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
            urgency = "URGENT" if self.battery_soc < 10 else ""
            self._log_thought(
                f"🚨 {urgency} CRITICAL: Battery at {self.battery_soc:.1f}%! "
                f"Need to buy energy immediately to avoid shutdown.",
                "critical"
            )
            self.is_buying = True
            self.is_selling = False
            return "buy"
        
        elif self.battery_soc > surplus_threshold and self.net_energy > 0:
            surplus = self.net_energy
            sell_amount = min(surplus * 0.5, 50)  # Sell up to 50kW
            self._log_thought(
                f"💰 Surplus detected: {surplus:.1f}kW available. Battery at {self.battery_soc:.1f}%. "
                f"Can sell ~{sell_amount:.1f}kW at market price ${self.market_price:.3f}/kWh.",
                "info"
            )
            self.is_selling = True
            self.is_buying = False
            return "sell"
        
        else:
            self._log_thought(
                f"⚖️ Energy balanced. Load: {self.current_load:.1f}kW, "
                f"Generation: {self.solar_generation:.1f}kW, SoC: {self.battery_soc:.1f}%",
                "info"
            )
            self.is_selling = False
            self.is_buying = False
            return "hold"
    
    def check_market_price(self) -> Dict:
        """Check current market conditions"""
        price_acceptance_range = (0.08, 0.30)
        
        is_price_favorable = price_acceptance_range[0] <= self.market_price <= price_acceptance_range[1]
        
        # Dynamic pricing based on urgency
        if self.battery_soc < 20:
            max_buy_price = 0.30  # Desperate - pay more
        elif self.battery_soc < 40:
            max_buy_price = 0.22
        else:
            max_buy_price = 0.18
        
        # Selling price based on surplus
        if self.battery_soc > 90:
            min_sell_price = 0.10  # Overflow - sell cheap
        elif self.battery_soc > 70:
            min_sell_price = 0.13
        else:
            min_sell_price = 0.15
        
        analysis = {
            "current_price": self.market_price,
            "is_favorable": is_price_favorable,
            "max_buy_price": max_buy_price,
            "min_sell_price": min_sell_price
        }
        
        self._log_thought(
            f"📊 Market analysis: Price ${self.market_price:.3f}/kWh is "
            f"{'favorable' if is_price_favorable else 'unfavorable'} for trading. "
            f"My range: ${min_sell_price:.3f}-${max_buy_price:.3f}",
            "info"
        )
        
        return analysis
    
    def find_trading_partner(self, action: str) -> Optional[int]:
        """Find a suitable trading partner"""
        if action == "sell":
            # Look for buyers (agents with low battery)
            # In real implementation, would query from a registry
            # For now, return None to trigger broadcast offer
            return None
        elif action == "buy":
            # Look for sellers (agents with high battery)
            return None
        return None
    
    def negotiate(self, counterparty_id: int, offer_type: str, amount: float, price: float) -> Dict:
        """
        Negotiate with another agent
        Returns the final agreed trade terms
        """
        self.state = AgentState.NEGOTIATING
        
        self._log_thought(
            f"🤝 Initiating negotiation with Building {counterparty_id} for {amount:.1f}kWh at ${price:.3f}/kWh",
            "negotiation"
        )
        
        # Simple negotiation logic
        if offer_type == "buy":
            # We're selling
            min_acceptable = self.target_price * 0.85
            if price >= min_acceptable:
                self._log_thought(
                    f"✅ Accepting offer from Building {counterparty_id}. "
                    f"Price ${price:.3f} meets minimum ${min_acceptable:.3f}",
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
                    f"🔄 Counter-offering ${counter_offer:.3f}/kWh (original: ${price:.3f})",
                    "negotiation"
                )
                return {
                    "agreed": False,
                    "counter_offer": counter_offer,
                    "reason": "Price too low"
                }
        
        else:  # sell offer
            # We're buying
            max_acceptable = 0.22 if self.battery_soc > 20 else 0.30
            if price <= max_acceptable:
                self._log_thought(
                    f"✅ Accepting purchase from Building {counterparty_id}. "
                    f"Price ${price:.3f} is within budget (${max_acceptable:.3f})",
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
                    f"❌ Rejecting offer - price ${price:.3f} exceeds max ${max_acceptable:.3f}",
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
            f"💸 Trade executed! {action} {trade_details['final_amount']:.1f}kWh for ${total_cost:.2f}. "
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
            "total_cost": total_cost,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            self.client.publish("ecosync/market/trades", json.dumps(trade_msg))
        except:
            pass
        
        self.state = AgentState.COMPLETED
        self.pending_trades.append(trade_details)
        
        if self.trade_callback:
            self.trade_callback(trade_msg)
        
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
        try:
            self.client.publish("ecosync/agents/offers", json.dumps(offer))
        except:
            pass
        self._log_thought(f"📢 Published sell offer: {amount:.1f}kWh at ${price:.3f}/kWh", "info")
    
    def run_trading_cycle(self) -> Optional[Dict]:
        """Run a complete trading cycle"""
        # Step 1: Analyze load
        action = self.analyze_load()
        
        if action == "hold":
            return None
        
        # Step 2: Check market price
        market_analysis = self.check_market_price()
        
        # Step 3: Find trading partner or publish offer
        partner = self.find_trading_partner(action)
        
        if partner:
            # Direct negotiation
            if action == "sell":
                amount = min(self.net_energy * 0.5, 50)
                price = market_analysis["min_sell_price"] * 1.1
                result = self.negotiate(partner, "buy", amount, price)
            else:
                amount = min(abs(self.net_energy) * 0.5, 50)
                price = market_analysis["max_buy_price"] * 0.9
                result = self.negotiate(partner, "sell", amount, price)
            
            if result.get("agreed"):
                return self.execute_trade(result)
        else:
            # Publish offer to market
            if action == "sell":
                amount = min(self.net_energy * 0.5, 50)
                price = market_analysis["min_sell_price"]
                self.publish_offer(amount, price)
        
        return None
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"❌ Agent {self.building_id}: Connection failed - {e}")
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        self.client.loop_stop()
        self.client.disconnect()
    
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
            "market_price": self.market_price,
            "trades_completed": len(self.completed_trades),
            "recent_logs": self.thought_logs[-5:]
        }
    
    def set_log_callback(self, callback: Callable):
        """Set callback for agent logs"""
        self.log_callback = callback
    
    def set_trade_callback(self, callback: Callable):
        """Set callback for trade execution"""
        self.trade_callback = callback
