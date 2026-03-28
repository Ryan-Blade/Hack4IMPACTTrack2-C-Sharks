"""
EcoSync Smart Building Simulator
Individual building MQTT client with realistic energy simulation
"""
import json
import random
import time
import threading
import numpy as np
from datetime import datetime
from typing import Dict, Optional, Callable
import uuid
import paho.mqtt.client as mqtt

from config.settings import mqtt_config


class SmartBuilding:
    """
    Simulates a smart building with solar generation, battery storage,
    and dynamic energy consumption patterns.
    """
    
    def __init__(
        self,
        building_id: int,
        mqtt_broker: str = None,
        mqtt_port: int = None,
        base_load: float = 50.0,  # kW
        solar_capacity: float = 100.0,  # kW
        battery_capacity: float = 200.0,  # kWh
        building_type: str = "residential"
    ):
        self.building_id = building_id
        self.mqtt_broker = mqtt_broker or mqtt_config.broker_host
        self.mqtt_port = mqtt_port or mqtt_config.broker_port
        
        # Building characteristics
        self.building_type = building_type
        self.base_load = base_load
        self.solar_capacity = solar_capacity
        self.battery_capacity = battery_capacity
        
        # Current state
        self.current_load = base_load
        self.solar_generation = 0.0
        self.battery_soc = random.uniform(30.0, 80.0)  # Start with random charge
        self.grid_frequency = 50.0  # Hz
        self.temperature = 22.0  # Celsius
        
        # Status flags
        self.is_selling = False
        self.is_buying = False
        self.is_critical = False
        self.cloud_cover_active = False
        self.grid_failure = False
        
        # MQTT client
        self.client = mqtt.Client(
            client_id=f"building_{building_id}_{uuid.uuid4().hex[:8]}",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1
        )
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        
        # Simulation thread
        self.running = False
        self._stop_event = threading.Event()          # ← fast-wakeup on stop
        self.thread: Optional[threading.Thread] = None
        self.telemetry_callback: Optional[Callable] = None
        
        # Priority buildings (hospitals, data centers)
        self.is_priority = building_type in ["hospital", "datacenter", "emergency"]
        
        # Statistics
        self.total_energy_generated = 0.0
        self.total_energy_consumed = 0.0
        self.trades_completed = 0

        # Track previous status string so we only log on change
        self._last_status: str = ""
        self._mqtt_connected: bool = False
        
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            self._mqtt_connected = True
            # Subscribe to global grid events
            self.client.subscribe("ecosync/grid/events")
            # Subscribe to individual building commands
            self.client.subscribe(f"ecosync/building/{self.building_id}/commands")
        else:
            self._mqtt_connected = False
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self._mqtt_connected = False
    
    def _on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            if topic == "ecosync/grid/events":
                self._handle_grid_event(payload)
            elif topic == f"ecosync/building/{self.building_id}/commands":
                self._handle_command(payload)
        except Exception as e:
            print(f"⚠️ Building {self.building_id}: Error processing message - {e}")
    
    def _handle_grid_event(self, event: Dict):
        """Process global grid events"""
        event_type = event.get("type")
        
        if event_type == "cloud_cover":
            self.cloud_cover_active = event.get("active", False)
            intensity = event.get("intensity", 0.8)
            if self.cloud_cover_active:
                print(f"☁️  Building {self.building_id}: Cloud cover - solar reduced by {intensity*100:.0f}%")
        
        elif event_type == "grid_failure":
            self.grid_failure = event.get("active", False)
            if self.grid_failure:
                print(f"🚨 Building {self.building_id}: GRID FAILURE - Island mode activated")
                self.grid_frequency = 0.0
            else:
                print(f"✅ Building {self.building_id}: Grid restored")
                self.grid_frequency = 50.0
        
        elif event_type == "price_update":
            self.current_price = event.get("price", 0.15)
            
        elif event_type == "weather_change":
            weather = event.get("weather", "CLEAR")
            self.current_weather = weather
            if weather == "OVERCAST":
                self.cloud_cover_active = True
                self.cloud_intensity = 0.6
                print(f"☁️  Building {self.building_id}: Weather changed to OVERCAST")
            elif weather == "STORM":
                self.cloud_cover_active = True
                self.cloud_intensity = 0.95
                print(f"⛈️ Building {self.building_id}: Weather changed to STORM")
            elif weather == "HEAT_WAVE":
                self.cloud_cover_active = False
                print(f"🌊 Building {self.building_id}: Weather changed to HEAT_WAVE (High AC Load)")
            elif weather == "BLIZZARD":
                self.cloud_cover_active = True
                self.cloud_intensity = 0.99
                print(f"❄️ Building {self.building_id}: Weather changed to BLIZZARD (High Heating Load, No Solar)")
            else: # CLEAR
                self.cloud_cover_active = False
                self.cloud_intensity = 0.0
                print(f"☀️ Building {self.building_id}: Weather changed to CLEAR")
    
    def _handle_command(self, command: Dict):
        """Process individual building commands"""
        cmd_type = command.get("command")
        
        if cmd_type == "force_discharge":
            amount = command.get("amount", 50.0)
            self._discharge_battery(amount)
            print(f"🔋 Building {self.building_id}: Force discharged {amount}kWh")
        elif cmd_type == "force_charge":
            amount = command.get("amount", 50.0)
            self._charge_battery(amount)
            print(f"🔌 Building {self.building_id}: Force charged {amount}kWh")
        elif cmd_type == "emergency_mode":
            self.is_critical = True
            print(f"🚨 Building {self.building_id}: EMERGENCY MODE ACTIVATED")
        elif cmd_type == "trade_completed":
            self.trades_completed += 1
            amount = command.get("amount", 0)
            if command.get("role") == "seller":
                self._discharge_battery(amount)
            else:
                self._charge_battery(amount)
    
    def _calculate_solar_generation(self) -> float:
        """Calculate solar generation with time-of-day and weather effects"""
        hour = datetime.now().hour
        
        # Solar curve based on time of day (peak at noon)
        if 6 <= hour <= 18:
            # Parabolic curve peaking at noon
            time_factor = 1 - ((hour - 12) / 6) ** 2
            time_factor = max(0, time_factor)
        else:
            time_factor = 0
        
        # Add some randomness (clouds, weather)
        weather_noise = np.random.normal(0, 0.1)
        time_factor = max(0, min(1, time_factor + weather_noise))
        
        generation = self.solar_capacity * time_factor
        
        # Apply cloud cover reduction
        if hasattr(self, 'current_weather') and self.current_weather in ["OVERCAST", "STORM", "BLIZZARD"]:
            intensity = getattr(self, 'cloud_intensity', 0.8)
            generation *= (1.0 - intensity)
        elif self.cloud_cover_active:
            generation *= 0.2  # 80% reduction legacy
        
        return max(0, generation)
    
    def _calculate_load(self) -> float:
        """Calculate current energy demand with realistic patterns"""
        hour = datetime.now().hour
        
        # Base load variation by hour
        if self.building_type == "residential":
            # Morning and evening peaks
            if 7 <= hour <= 9 or 18 <= hour <= 22:
                load_factor = 1.5
            elif 0 <= hour <= 5:
                load_factor = 0.3
            else:
                load_factor = 0.8
        elif self.building_type == "commercial":
            # Business hours peak
            if 9 <= hour <= 17:
                load_factor = 1.8
            else:
                load_factor = 0.2
        elif self.building_type == "hospital":
            # Constant high load
            load_factor = 1.2 + np.random.normal(0, 0.1)
        elif self.building_type == "datacenter":
            # High constant load with cooling variations
            load_factor = 2.0 + 0.3 * np.sin(hour * np.pi / 12)
        elif self.building_type == "emergency":
            load_factor = 1.0 + np.random.normal(0, 0.05)
        else:
            load_factor = 1.0
        
        # Weather modifiers for load
        weather_load_multiplier = 1.0
        if hasattr(self, 'current_weather'):
            if self.current_weather == "HEAT_WAVE":
                weather_load_multiplier = 2.0  # Massive AC demand
            elif self.current_weather == "BLIZZARD":
                weather_load_multiplier = 1.8  # Heating demand
            elif self.current_weather == "STORM":
                weather_load_multiplier = 1.1

        # Add Gaussian noise for realism
        noise = np.random.normal(0, self.base_load * 0.05)
        load = (self.base_load * load_factor * weather_load_multiplier) + noise
        
        # In grid failure, some non-priority buildings shed load
        if self.grid_failure and not self.is_priority:
            load *= 0.4
            
        return max(10, load)  # Minimum 10kW load
    
    def _update_battery(self, net_energy: float, time_delta: float = 2.5):
        """
        Update battery state of charge based on net energy
        net_energy: positive = charging, negative = discharging
        """
        # Convert kW * seconds to kWh
        energy_kwh = net_energy * (time_delta / 3600)
        
        # Battery efficiency (90% round-trip)
        efficiency = 0.95 if net_energy > 0 else 0.95
        
        # Update SoC
        soc_change = (energy_kwh * efficiency / self.battery_capacity) * 100
        self.battery_soc = max(0, min(100, self.battery_soc + soc_change))
        
        # Determine status
        critical_threshold = 30 if self.is_priority else 15
        self.is_critical = self.battery_soc < critical_threshold
        
        if self.battery_soc > 80 and net_energy > 0:
            self.is_selling = True
            self.is_buying = False
        elif self.battery_soc < 30 and net_energy < 0:
            self.is_selling = False
            self.is_buying = True
        else:
            self.is_selling = False
            self.is_buying = False
    
    def _discharge_battery(self, amount: float):
        """Force discharge battery by specified amount"""
        discharge_kwh = min(amount, self.battery_soc / 100 * self.battery_capacity)
        self.battery_soc -= (discharge_kwh / self.battery_capacity) * 100
    
    def _charge_battery(self, amount: float):
        """Force charge battery by specified amount"""
        charge_kwh = min(amount, (100 - self.battery_soc) / 100 * self.battery_capacity)
        self.battery_soc += (charge_kwh / self.battery_capacity) * 100
    
    def _publish_telemetry(self):
        """Publish current state to MQTT topic"""
        telemetry = {
            "building_id": self.building_id,
            "timestamp": datetime.now().isoformat(),
            "load": float(round(self.current_load, 2)),
            "solar_generation": float(round(self.solar_generation, 2)),
            "battery_soc": float(round(self.battery_soc, 2)),
            "grid_frequency": float(round(self.grid_frequency, 2)),
            "is_selling": bool(self.is_selling),
            "is_buying": bool(self.is_buying),
            "is_critical": bool(self.is_critical),
            "is_priority": bool(self.is_priority),
            "building_type": self.building_type,
            "net_energy": float(round(self.solar_generation - self.current_load, 2))
        }
        
        topic = f"ecosync/building/{self.building_id}/telemetry"
        # Only publish over MQTT if we have an active connection
        if self._mqtt_connected:
            self.client.publish(topic, json.dumps(telemetry), qos=1)
        
        # Call telemetry callback if set
        if self.telemetry_callback:
            self.telemetry_callback(telemetry)
        
        return telemetry
    
    def _simulation_loop(self):
        """Main simulation loop running every 2.5 seconds"""
        while self.running:
            try:
                # Update solar generation
                self.solar_generation = self._calculate_solar_generation()
                
                # Update load
                self.current_load = self._calculate_load()
                
                # Calculate net energy
                net_energy = self.solar_generation - self.current_load
                
                # Update battery
                self._update_battery(net_energy)
                
                # Update statistics
                self.total_energy_generated += max(0, self.solar_generation * (2.5/3600))
                self.total_energy_consumed += max(0, self.current_load * (2.5/3600))
                
                # Publish telemetry
                self._publish_telemetry()
                
                # Only log on status change — avoids 10 prints/sec flood with 50 buildings
                status = "CRITICAL" if self.is_critical else (
                    "SELLING" if self.is_selling else (
                        "BUYING" if self.is_buying else "BALANCED"
                    )
                )
                if status != self._last_status:
                    self._last_status = status
                    emoji = {"CRITICAL": "🚨", "SELLING": "💚", "BUYING": "🔵", "BALANCED": "⚪"}.get(status, "")
                    print(f"{emoji} Building {self.building_id:02d} → {status} "
                          f"(SoC: {self.battery_soc:.1f}%, "
                          f"Load: {self.current_load:.1f}kW, Solar: {self.solar_generation:.1f}kW)")
                
                # Use Event.wait instead of time.sleep so stop() wakes us immediately
                self._stop_event.wait(2.5)
                
            except Exception as e:
                print(f"⚠️ Building {self.building_id}: Simulation error - {e}")
                self._stop_event.wait(2.5)
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"❌ Building {self.building_id}: Failed to connect - {e}")
    
    def start(self):
        """Start the simulation"""
        self.connect()
        self.running = True
        self.thread = threading.Thread(target=self._simulation_loop, daemon=True)
        self.thread.start()
        print(f"▶️  Building {self.building_id}: Simulation started")
    
    def stop(self):
        """Stop the simulation"""
        self.running = False
        self._stop_event.set()          # Wake up the sleeping thread immediately
        if self.thread:
            self.thread.join(timeout=2)
        self.client.loop_stop()
        self.client.disconnect()
    
    def get_state(self) -> Dict:
        """Get current building state"""
        return {
            "building_id": self.building_id,
            "building_type": self.building_type,
            "is_priority": bool(self.is_priority),
            "current_load": float(round(self.current_load, 2)),
            "solar_generation": float(round(self.solar_generation, 2)),
            "battery_soc": float(round(self.battery_soc, 2)),
            "grid_frequency": float(round(self.grid_frequency, 2)),
            "is_selling": bool(self.is_selling),
            "is_buying": bool(self.is_buying),
            "is_critical": bool(self.is_critical),
            "cloud_cover": bool(self.cloud_cover_active),
            "grid_failure": bool(self.grid_failure),
            "weather": getattr(self, 'current_weather', 'CLEAR'),
            "total_generated": float(round(self.total_energy_generated, 2)),
            "total_consumed": float(round(self.total_energy_consumed, 2)),
            "trades_completed": self.trades_completed
        }
    
    def set_telemetry_callback(self, callback: Callable):
        """Set callback for telemetry updates"""
        self.telemetry_callback = callback
