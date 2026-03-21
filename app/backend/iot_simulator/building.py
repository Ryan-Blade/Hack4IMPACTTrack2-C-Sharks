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
from typing import Dict, Optional
import paho.mqtt.client as mqtt


class SmartBuilding:
    """
    Simulates a smart building with solar generation, battery storage,
    and dynamic energy consumption patterns.
    """
    
    def __init__(
        self,
        building_id: int,
        mqtt_broker: str = "localhost",
        mqtt_port: int = 1883,
        base_load: float = 50.0,  # kW
        solar_capacity: float = 100.0,  # kW
        battery_capacity: float = 200.0,  # kWh
        building_type: str = "residential"
    ):
        self.building_id = building_id
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        
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
        self.client = mqtt.Client(client_id=f"building_{building_id}")
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        
        # Simulation thread
        self.running = False
        self.thread: Optional[threading.Thread] = None
        
        # Priority buildings (hospitals, data centers)
        self.is_priority = building_type in ["hospital", "datacenter", "emergency"]
        
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            print(f"Building {self.building_id}: Connected to MQTT broker")
            # Subscribe to global grid events
            self.client.subscribe("ecosync/grid/events")
            # Subscribe to individual building commands
            self.client.subscribe(f"ecosync/building/{self.building_id}/commands")
        else:
            print(f"Building {self.building_id}: Connection failed with code {rc}")
    
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
            print(f"Building {self.building_id}: Error processing message - {e}")
    
    def _handle_grid_event(self, event: Dict):
        """Process global grid events"""
        event_type = event.get("type")
        
        if event_type == "cloud_cover":
            self.cloud_cover_active = event.get("active", False)
            intensity = event.get("intensity", 0.8)
            if self.cloud_cover_active:
                print(f"Building {self.building_id}: Cloud cover event - solar reduced by {intensity*100}%")
        
        elif event_type == "grid_failure":
            self.grid_failure = event.get("active", False)
            if self.grid_failure:
                print(f"Building {self.building_id}: GRID FAILURE DETECTED - Switching to island mode")
                self.grid_frequency = 0.0
            else:
                print(f"Building {self.building_id}: Grid restored")
                self.grid_frequency = 50.0
        
        elif event_type == "price_update":
            # Store current market price for trading decisions
            self.current_price = event.get("price", 0.15)
    
    def _handle_command(self, command: Dict):
        """Process individual building commands"""
        cmd_type = command.get("command")
        
        if cmd_type == "force_discharge":
            amount = command.get("amount", 50.0)
            self._discharge_battery(amount)
        elif cmd_type == "force_charge":
            amount = command.get("amount", 50.0)
            self._charge_battery(amount)
        elif cmd_type == "emergency_mode":
            self.is_critical = True
            print(f"Building {self.building_id}: EMERGENCY MODE ACTIVATED")
    
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
        if self.cloud_cover_active:
            generation *= 0.2  # 80% reduction
        
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
        else:
            load_factor = 1.0
        
        # Add Gaussian noise for realism
        noise = np.random.normal(0, self.base_load * 0.05)
        load = self.base_load * load_factor + noise
        
        return max(10, load)  # Minimum 10kW load
    
    def _update_battery(self, net_energy: float, time_delta: float = 5.0):
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
        self.is_critical = self.battery_soc < 15.0 or (self.is_priority and self.battery_soc < 30.0)
        
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
            "load": round(self.current_load, 2),
            "solar_generation": round(self.solar_generation, 2),
            "battery_soc": round(self.battery_soc, 2),
            "grid_frequency": round(self.grid_frequency, 2),
            "is_selling": self.is_selling,
            "is_buying": self.is_buying,
            "is_critical": self.is_critical,
            "is_priority": self.is_priority,
            "building_type": self.building_type,
            "net_energy": round(self.solar_generation - self.current_load, 2)
        }
        
        topic = f"ecosync/building/{self.building_id}/telemetry"
        self.client.publish(topic, json.dumps(telemetry), qos=1)
        
        return telemetry
    
    def _simulation_loop(self):
        """Main simulation loop running every 5 seconds"""
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
                
                # Publish telemetry
                telemetry = self._publish_telemetry()
                
                # Print status for debugging
                status = "SELLING" if self.is_selling else "BUYING" if self.is_buying else "BALANCED"
                if self.is_critical:
                    status = "CRITICAL"
                
                print(f"[{self.building_id:02d}] {status:8s} | Load: {self.current_load:6.1f}kW | "
                      f"Solar: {self.solar_generation:6.1f}kW | SoC: {self.battery_soc:5.1f}%")
                
                # Sleep for 5 seconds
                time.sleep(5)
                
            except Exception as e:
                print(f"Building {self.building_id}: Simulation error - {e}")
                time.sleep(5)
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"Building {self.building_id}: Failed to connect - {e}")
    
    def start(self):
        """Start the simulation"""
        self.connect()
        self.running = True
        self.thread = threading.Thread(target=self._simulation_loop)
        self.thread.daemon = True
        self.thread.start()
        print(f"Building {self.building_id}: Simulation started")
    
    def stop(self):
        """Stop the simulation"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)
        self.client.loop_stop()
        self.client.disconnect()
        print(f"Building {self.building_id}: Simulation stopped")
    
    def get_state(self) -> Dict:
        """Get current building state"""
        return {
            "building_id": self.building_id,
            "building_type": self.building_type,
            "is_priority": self.is_priority,
            "current_load": round(self.current_load, 2),
            "solar_generation": round(self.solar_generation, 2),
            "battery_soc": round(self.battery_soc, 2),
            "grid_frequency": round(self.grid_frequency, 2),
            "is_selling": self.is_selling,
            "is_buying": self.is_buying,
            "is_critical": self.is_critical,
            "cloud_cover": self.cloud_cover_active,
            "grid_failure": self.grid_failure
        }
