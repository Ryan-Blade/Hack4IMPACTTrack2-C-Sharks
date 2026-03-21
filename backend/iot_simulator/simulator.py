"""
EcoSync Building Cluster Simulator
Manages a cluster of 50 smart buildings
"""
import time
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional, Callable
from .building import SmartBuilding
from .grid_controller import GridEventController


class BuildingClusterSimulator:
    """
    Simulates a cluster of 50 smart buildings with different characteristics:
    - Residential buildings (30)
    - Commercial buildings (12)
    - Hospital (1) - Priority
    - Data Center (1) - Priority
    - Emergency Services (1) - Priority
    - Mixed use (5)
    """
    
    def __init__(
        self,
        mqtt_broker: str = None,
        mqtt_port: int = None,
        num_buildings: int = 50
    ):
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.num_buildings = num_buildings
        self.buildings: List[SmartBuilding] = []
        self.grid_controller = GridEventController(mqtt_broker, mqtt_port)
        self.telemetry_callback: Optional[Callable] = None
        
    def _create_buildings(self):
        """Create diverse building types"""
        building_configs = []
        
        # Hospital (Priority)
        building_configs.append({
            "id": 1,
            "type": "hospital",
            "base_load": 500.0,
            "solar": 300.0,
            "battery": 2000.0
        })
        
        # Data Center (Priority)
        building_configs.append({
            "id": 2,
            "type": "datacenter",
            "base_load": 800.0,
            "solar": 400.0,
            "battery": 3000.0
        })
        
        # Emergency Services (Priority)
        building_configs.append({
            "id": 3,
            "type": "emergency",
            "base_load": 200.0,
            "solar": 150.0,
            "battery": 800.0
        })
        
        # Commercial buildings
        for i in range(4, 16):
            building_configs.append({
                "id": i,
                "type": "commercial",
                "base_load": random.uniform(100, 300),
                "solar": random.uniform(50, 200),
                "battery": random.uniform(200, 800)
            })
        
        # Residential buildings
        for i in range(16, 46):
            building_configs.append({
                "id": i,
                "type": "residential",
                "base_load": random.uniform(20, 80),
                "solar": random.uniform(30, 100),
                "battery": random.uniform(50, 300)
            })
        
        # Mixed use
        for i in range(46, 51):
            building_configs.append({
                "id": i,
                "type": "mixed",
                "base_load": random.uniform(50, 150),
                "solar": random.uniform(40, 150),
                "battery": random.uniform(100, 500)
            })
        
        # Create building objects
        for config in building_configs:
            building = SmartBuilding(
                building_id=config["id"],
                mqtt_broker=self.mqtt_broker,
                mqtt_port=self.mqtt_port,
                base_load=config["base_load"],
                solar_capacity=config["solar"],
                battery_capacity=config["battery"],
                building_type=config["type"]
            )
            if self.telemetry_callback:
                building.set_telemetry_callback(self.telemetry_callback)
            self.buildings.append(building)
    
    def start(self):
        """Start all building simulations"""
        print(f"\n{'='*70}")
        print("  🌿 EcoSync Smart Energy Microgrid - IoT Simulator")
        print(f"{'='*70}\n")
        print(f"Initializing {self.num_buildings} smart buildings...\n")
        
        self._create_buildings()
        
        # Start grid controller
        self.grid_controller.start()
        time.sleep(0.5)  # Short wait for broker subscription
        
        # Start all buildings in parallel (was sequential with 50×0.05 s stagger = 2.5 s)
        print(f"Starting {len(self.buildings)} buildings in parallel...")
        with ThreadPoolExecutor(max_workers=min(len(self.buildings), 20)) as pool:
            futures = {pool.submit(building.start): building for building in self.buildings}
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as exc:
                    bld = futures[future]
                    print(f"⚠️  Building {bld.building_id} failed to start: {exc}")
        
        print(f"\n{'='*70}")
        print(f"  ✅ All {self.num_buildings} buildings are now running!")
        print(f"{'='*70}\n")
        
        # Print summary
        self._print_summary()
    
    def stop(self):
        """Stop all building simulations"""
        print("\n" + "="*70)
        print("  🛑 Shutting down building cluster...")
        print("="*70 + "\n")
        
        for building in self.buildings:
            building.stop()
        
        self.grid_controller.stop()
        print("\n  ✅ All buildings stopped.")
    
    def _print_summary(self):
        """Print building summary"""
        types = {}
        for b in self.buildings:
            types[b.building_type] = types.get(b.building_type, 0) + 1
        
        print("Building Distribution:")
        for btype, count in sorted(types.items()):
            emoji = {"hospital": "🏥", "datacenter": "🖥", "emergency": "🚨", 
                     "commercial": "🏢", "residential": "🏠", "mixed": "🏘"}.get(btype, "🏢")
            print(f"  {emoji} {btype.capitalize():12s}: {count:2d}")
        
        total_solar = sum(b.solar_capacity for b in self.buildings)
        total_battery = sum(b.battery_capacity for b in self.buildings)
        total_base_load = sum(b.base_load for b in self.buildings)
        
        print(f"\nTotal Capacity:")
        print(f"  ☀️  Solar:     {total_solar:8.1f} kW")
        print(f"  🔋 Battery:   {total_battery:8.1f} kWh")
        print(f"  ⚡ Base Load: {total_base_load:8.1f} kW")
        print(f"\n{'='*70}\n")
    
    def get_all_states(self) -> List[Dict]:
        """Get states of all buildings"""
        return [building.get_state() for building in self.buildings]
    
    def get_building(self, building_id: int) -> SmartBuilding:
        """Get a specific building by ID"""
        for building in self.buildings:
            if building.building_id == building_id:
                return building
        raise ValueError(f"Building {building_id} not found")
    
    def trigger_event(self, event_type: str, **kwargs):
        """Manually trigger a grid event"""
        if event_type == "cloud_cover":
            intensity = kwargs.get("intensity", 0.8)
            duration = kwargs.get("duration", 30)
            self.grid_controller.trigger_cloud_cover(intensity, duration)
        elif event_type == "grid_failure":
            duration = kwargs.get("duration", 60)
            self.grid_controller.trigger_grid_failure(duration)
        elif event_type == "price_update":
            price = kwargs.get("price", 0.15)
            self.grid_controller.update_price(price)
    
    def set_telemetry_callback(self, callback: Callable):
        """Set callback for all building telemetry"""
        self.telemetry_callback = callback
        for building in self.buildings:
            building.set_telemetry_callback(callback)
    
    def set_grid_event_callback(self, callback: Callable):
        """Set callback for grid events"""
        self.grid_controller.set_event_callback(callback)


def main():
    """Main entry point for the simulator"""
    import signal
    import sys
    
    simulator = BuildingClusterSimulator()
    
    def signal_handler(sig, frame):
        print("\n\nReceived shutdown signal...")
        simulator.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    simulator.start()
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        simulator.stop()


if __name__ == "__main__":
    main()
