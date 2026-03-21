"""
EcoSync Grid Event Controller
Manages global grid events like cloud cover and grid failures
"""
import json
import time
import random
import threading
from typing import Optional
import paho.mqtt.client as mqtt


class GridEventController:
    """
    Controls global grid events that affect all buildings:
    - Cloud cover (reduces solar generation)
    - Grid failures (island mode)
    - Price fluctuations
    """
    
    def __init__(
        self,
        mqtt_broker: str = "localhost",
        mqtt_port: int = 1883,
        auto_events: bool = True,
        event_interval: int = 60  # Seconds between random events
    ):
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.auto_events = auto_events
        self.event_interval = event_interval
        
        # Event states
        self.cloud_cover_active = False
        self.grid_failure_active = False
        self.current_price = 0.15  # $/kWh
        
        # MQTT client
        self.client = mqtt.Client(client_id="grid_controller")
        self.client.on_connect = self._on_connect
        
        # Event thread
        self.running = False
        self.event_thread: Optional[threading.Thread] = None
        
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print("Grid Controller: Connected to MQTT broker")
        else:
            print(f"Grid Controller: Connection failed with code {rc}")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"Grid Controller: Failed to connect - {e}")
    
    def trigger_cloud_cover(self, intensity: float = 0.8, duration: int = 30):
        """
        Trigger a cloud cover event
        intensity: 0.0-1.0 (percentage of solar reduction)
        duration: seconds to maintain the event
        """
        self.cloud_cover_active = True
        event = {
            "type": "cloud_cover",
            "active": True,
            "intensity": intensity,
            "timestamp": time.time()
        }
        self.client.publish("ecosync/grid/events", json.dumps(event), qos=1)
        print(f"Grid Controller: Cloud cover triggered ({intensity*100}% reduction for {duration}s)")
        
        # Schedule end of event
        if duration > 0:
            threading.Timer(duration, self._end_cloud_cover).start()
    
    def _end_cloud_cover(self):
        """End cloud cover event"""
        self.cloud_cover_active = False
        event = {
            "type": "cloud_cover",
            "active": False,
            "intensity": 0,
            "timestamp": time.time()
        }
        self.client.publish("ecosync/grid/events", json.dumps(event), qos=1)
        print("Grid Controller: Cloud cover ended")
    
    def trigger_grid_failure(self, duration: int = 60):
        """
        Trigger a grid failure event
        duration: seconds before grid is restored
        """
        self.grid_failure_active = True
        event = {
            "type": "grid_failure",
            "active": True,
            "timestamp": time.time()
        }
        self.client.publish("ecosync/grid/events", json.dumps(event), qos=1)
        print(f"Grid Controller: GRID FAILURE triggered (island mode for {duration}s)")
        
        # Schedule restoration
        if duration > 0:
            threading.Timer(duration, self._restore_grid).start()
    
    def _restore_grid(self):
        """Restore grid after failure"""
        self.grid_failure_active = False
        event = {
            "type": "grid_failure",
            "active": False,
            "timestamp": time.time()
        }
        self.client.publish("ecosync/grid/events", json.dumps(event), qos=1)
        print("Grid Controller: Grid restored")
    
    def update_price(self, new_price: float):
        """Update energy market price"""
        self.current_price = new_price
        event = {
            "type": "price_update",
            "price": new_price,
            "timestamp": time.time()
        }
        self.client.publish("ecosync/grid/events", json.dumps(event), qos=1)
        print(f"Grid Controller: Price updated to ${new_price:.3f}/kWh")
    
    def _random_event_loop(self):
        """Generate random grid events"""
        while self.running:
            time.sleep(self.event_interval)
            
            if not self.running:
                break
            
            # Random event selection
            event_type = random.choice([
                "cloud_cover",
                "cloud_cover",
                "price_change",
                "grid_failure",  # Rare event
                "none",
                "none"
            ])
            
            if event_type == "cloud_cover" and not self.cloud_cover_active:
                intensity = random.uniform(0.5, 0.9)
                duration = random.randint(20, 60)
                self.trigger_cloud_cover(intensity, duration)
            
            elif event_type == "grid_failure" and not self.grid_failure_active:
                if random.random() < 0.1:  # 10% chance
                    duration = random.randint(30, 120)
                    self.trigger_grid_failure(duration)
            
            elif event_type == "price_change":
                # Random price fluctuation
                price_change = random.uniform(-0.05, 0.05)
                new_price = max(0.05, min(0.50, self.current_price + price_change))
                self.update_price(new_price)
    
    def start(self):
        """Start the grid controller"""
        self.connect()
        self.running = True
        
        if self.auto_events:
            self.event_thread = threading.Thread(target=self._random_event_loop)
            self.event_thread.daemon = True
            self.event_thread.start()
        
        print("Grid Controller: Started")
    
    def stop(self):
        """Stop the grid controller"""
        self.running = False
        self.client.loop_stop()
        self.client.disconnect()
        print("Grid Controller: Stopped")
    
    def get_status(self) -> dict:
        """Get current grid status"""
        return {
            "cloud_cover_active": self.cloud_cover_active,
            "grid_failure_active": self.grid_failure_active,
            "current_price": self.current_price
        }
