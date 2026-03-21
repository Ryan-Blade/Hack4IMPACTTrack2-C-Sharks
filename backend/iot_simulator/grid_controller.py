"""
EcoSync Grid Event Controller
Manages global grid events like cloud cover and grid failures
"""
import json
import time
import random
import threading
from typing import Optional, Callable, List
import paho.mqtt.client as mqtt

from config.settings import mqtt_config


class GridEventController:
    """
    Controls global grid events that affect all buildings:
    - Cloud cover (reduces solar generation)
    - Grid failures (island mode)
    - Price fluctuations
    """
    
    def __init__(
        self,
        mqtt_broker: str = None,
        mqtt_port: int = None,
        auto_events: bool = True,
        event_interval: int = 60  # Seconds between random events
    ):
        self.mqtt_broker = mqtt_broker or mqtt_config.broker_host
        self.mqtt_port = mqtt_port or mqtt_config.broker_port
        self.auto_events = auto_events
        self.event_interval = event_interval
        
        # Event states
        self.cloud_cover_active = False
        self.grid_failure_active = False
        self.current_price = 0.15  # $/kWh
        self.price_history: List[dict] = []
        
        # Event history
        self.event_history: List[dict] = []
        
        # MQTT client
        self.client = mqtt.Client(
            client_id="grid_controller",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1
        )
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        
        # Event thread
        self.running = False
        self.event_thread: Optional[threading.Thread] = None
        
        # Event callback
        self.event_callback: Optional[Callable] = None
        
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print("✅ Grid Controller: Connected to MQTT broker")
        else:
            print(f"❌ Grid Controller: Connection failed with code {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        if rc != 0:
            print("⚠️ Grid Controller: Unexpected disconnection")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"❌ Grid Controller: Failed to connect - {e}")
    
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
        self._record_event(event)
        print(f"☁️  Cloud cover triggered ({intensity*100:.0f}% reduction for {duration}s)")
        
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
        self._record_event(event)
        print("☀️  Cloud cover ended")
    
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
        self._record_event(event)
        print(f"🚨 GRID FAILURE triggered (island mode for {duration}s)")
        
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
        self._record_event(event)
        print("✅ Grid restored")
    
    def update_price(self, new_price: float):
        """Update energy market price"""
        old_price = self.current_price
        self.current_price = new_price
        event = {
            "type": "price_update",
            "price": new_price,
            "timestamp": time.time()
        }
        self.client.publish("ecosync/grid/events", json.dumps(event), qos=1)
        self.price_history.append({
            "price": new_price,
            "timestamp": time.time()
        })
        print(f"💰 Price updated: ${old_price:.3f} → ${new_price:.3f}/kWh")
    
    def _record_event(self, event: dict):
        """Record event to history"""
        self.event_history.append(event)
        if len(self.event_history) > 100:
            self.event_history = self.event_history[-100:]
        
        if self.event_callback:
            self.event_callback(event)
    
    def _random_event_loop(self):
        """Generate random grid events"""
        while self.running:
            time.sleep(self.event_interval)
            
            if not self.running:
                break
            
            # Random event selection
            rand = random.random()
            
            if rand < 0.15 and not self.cloud_cover_active:
                # 15% chance - cloud cover
                intensity = random.uniform(0.5, 0.9)
                duration = random.randint(20, 60)
                self.trigger_cloud_cover(intensity, duration)
            
            elif rand < 0.18 and not self.grid_failure_active:
                # 3% chance - grid failure
                duration = random.randint(30, 120)
                self.trigger_grid_failure(duration)
            
            elif rand < 0.5:
                # Price fluctuation
                price_change = random.uniform(-0.03, 0.03)
                new_price = max(0.05, min(0.50, self.current_price + price_change))
                self.update_price(new_price)
    
    def start(self):
        """Start the grid controller"""
        self.connect()
        self.running = True
        
        if self.auto_events:
            self.event_thread = threading.Thread(target=self._random_event_loop, daemon=True)
            self.event_thread.start()
        
        print("▶️  Grid Controller: Started")
    
    def stop(self):
        """Stop the grid controller"""
        self.running = False
        self.client.loop_stop()
        self.client.disconnect()
        print("⏹️  Grid Controller: Stopped")
    
    def get_status(self) -> dict:
        """Get current grid status"""
        return {
            "cloud_cover_active": self.cloud_cover_active,
            "grid_failure_active": self.grid_failure_active,
            "current_price": self.current_price,
            "event_count": len(self.event_history)
        }
    
    def set_event_callback(self, callback: Callable):
        """Set callback for grid events"""
        self.event_callback = callback
