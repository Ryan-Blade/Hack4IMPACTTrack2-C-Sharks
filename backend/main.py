#!/usr/bin/env python3
"""
EcoSync Backend - Main Entry Point
Starts all backend services: IoT Simulator, AI Orchestration, and API
"""
import os
import sys
import time
import signal
import argparse
import threading
from typing import Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from iot_simulator import BuildingClusterSimulator
from ai_orchestration import MultiAgentOrchestrator
from config.settings import mqtt_config, simulator_config


class EcoSyncBackend:
    """
    Main backend orchestrator that runs all EcoSync services
    """
    
    def __init__(
        self,
        enable_simulator: bool = True,
        enable_ai: bool = True,
        enable_api: bool = True,
        num_buildings: int = 50
    ):
        self.enable_simulator = enable_simulator
        self.enable_ai = enable_ai
        self.enable_api = enable_api
        self.num_buildings = num_buildings
        
        self.simulator: Optional[BuildingClusterSimulator] = None
        self.orchestrator: Optional[MultiAgentOrchestrator] = None
        self.running = False
        
        # Shared state
        self.building_data = {}
        self.agent_logs = []
        
    def start(self):
        """Start all backend services"""
        print("\n" + "="*70)
        print("  🌿 EcoSync Smart Energy Microgrid - Backend Services")
        print("="*70 + "\n")
        
        self.running = True
        
        # 1. Start IoT Simulator
        if self.enable_simulator:
            print("[1/3] Starting IoT Simulator...")
            self.simulator = BuildingClusterSimulator(
                mqtt_broker=mqtt_config.broker_host,
                mqtt_port=mqtt_config.broker_port,
                num_buildings=self.num_buildings
            )
            
            # Set up telemetry callback to share data
            self.simulator.set_telemetry_callback(self._on_telemetry)
            self.simulator.set_grid_event_callback(self._on_grid_event)
            
            self.simulator.start()
            time.sleep(2)  # Let buildings connect
        
        # 2. Start AI Orchestration
        if self.enable_ai:
            print("\n[2/3] Starting AI Trading Orchestration...")
            self.orchestrator = MultiAgentOrchestrator(
                mqtt_broker=mqtt_config.broker_host,
                mqtt_port=mqtt_config.broker_port
            )
            
            # Register agents for all buildings
            if self.simulator:
                for building in self.simulator.buildings:
                    self.orchestrator.register_agent(
                        building_id=building.building_id,
                        building_type=building.building_type,
                        is_priority=building.is_priority
                    )
            else:
                # Register default agents without simulator
                for i in range(1, self.num_buildings + 1):
                    building_type = "residential"
                    is_priority = False
                    if i == 1:
                        building_type = "hospital"
                        is_priority = True
                    elif i == 2:
                        building_type = "datacenter"
                        is_priority = True
                    elif i <= 15:
                        building_type = "commercial"
                    
                    self.orchestrator.register_agent(
                        building_id=i,
                        building_type=building_type,
                        is_priority=is_priority
                    )
            
            # Set up callbacks
            self.orchestrator.set_log_callback(self._on_agent_log)
            self.orchestrator.set_trade_callback(self._on_trade)
            
            self.orchestrator.start()
        
        # 3. Start API (if requested)
        if self.enable_api:
            print("\n[3/3] Starting FastAPI Server...")
            self._start_api_server()
        
        print("\n" + "="*70)
        print("  ✅ All services started successfully!")
        print("="*70)
        print("\nServices:")
        if self.enable_simulator:
            print(f"  • IoT Simulator: {self.num_buildings} buildings")
        if self.enable_ai:
            print(f"  • AI Orchestrator: {len(self.orchestrator.agents)} agents")
        if self.enable_api:
            print(f"  • FastAPI: http://localhost:8000")
            print(f"  • WebSocket: ws://localhost:8000/ws")
        print(f"  • MQTT Broker: {mqtt_config.broker_host}:{mqtt_config.broker_port}")
        print("\nPress Ctrl+C to stop\n")
        
        # Print status periodically
        self._start_status_thread()
    
    def _start_api_server(self):
        """Start FastAPI server in a separate thread"""
        def run_api():
            import uvicorn
            from api.main import app
            from config.settings import api_config
            uvicorn.run(app, host=api_config.host, port=api_config.port, log_level="warning")
        
        api_thread = threading.Thread(target=run_api, daemon=True)
        api_thread.start()
    
    def _start_status_thread(self):
        """Start a thread to print periodic status updates"""
        def print_status():
            while self.running:
                time.sleep(30)  # Print every 30 seconds
                if not self.running:
                    break
                
                print("\n" + "-"*50)
                print(f"📊 Status Update - {time.strftime('%H:%M:%S')}")
                print("-"*50)
                
                if self.orchestrator:
                    stats = self.orchestrator.get_market_stats()
                    print(f"Trades: {stats['total_trades']} | "
                          f"Volume: {stats['total_volume']:.1f}kWh | "
                          f"Value: ${stats['total_value']:.2f}")
                    print(f"Sellers: {stats['active_sellers']} | "
                          f"Buyers: {stats['active_buyers']} | "
                          f"Critical: {stats['critical_buildings']}")
                
                if self.simulator:
                    states = self.simulator.get_all_states()
                    total_gen = sum(s.get("solar_generation", 0) for s in states)
                    total_load = sum(s.get("current_load", 0) for s in states)
                    avg_soc = sum(s.get("battery_soc", 0) for s in states) / len(states) if states else 0
                    print(f"Generation: {total_gen:.1f}kW | Load: {total_load:.1f}kW | Avg SoC: {avg_soc:.1f}%")
                
                print("-"*50 + "\n")
        
        status_thread = threading.Thread(target=print_status, daemon=True)
        status_thread.start()
    
    def _on_telemetry(self, telemetry: dict):
        """Handle building telemetry updates"""
        self.building_data[telemetry["building_id"]] = telemetry
    
    def _on_grid_event(self, event: dict):
        """Handle grid events"""
        pass  # Could add logging or special handling
    
    def _on_agent_log(self, log_entry: dict):
        """Handle agent log messages"""
        self.agent_logs.append(log_entry)
        if len(self.agent_logs) > 500:
            self.agent_logs.pop(0)
    
    def _on_trade(self, trade: dict):
        """Handle trade execution"""
        pass  # Could add special handling
    
    def stop(self):
        """Stop all backend services"""
        print("\n" + "="*70)
        print("  🛑 Shutting down EcoSync Backend...")
        print("="*70 + "\n")
        
        self.running = False
        
        if self.orchestrator:
            print("[1/3] Stopping AI Orchestrator...")
            self.orchestrator.stop()
        
        if self.simulator:
            print("[2/3] Stopping IoT Simulator...")
            self.simulator.stop()
        
        print("[3/3] Cleanup complete!")
        print("\n" + "="*70)
        print("  ✅ EcoSync Backend stopped")
        print("="*70 + "\n")
    
    def get_status(self) -> dict:
        """Get current system status"""
        status = {
            "running": self.running,
            "simulator": self.enable_simulator and self.simulator is not None,
            "ai_orchestrator": self.enable_ai and self.orchestrator is not None,
            "api": self.enable_api
        }
        
        if self.orchestrator:
            status["market_stats"] = self.orchestrator.get_market_stats()
        
        return status


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="EcoSync Backend")
    parser.add_argument("--no-simulator", action="store_true", help="Disable IoT simulator")
    parser.add_argument("--no-ai", action="store_true", help="Disable AI orchestration")
    parser.add_argument("--no-api", action="store_true", help="Disable FastAPI server")
    parser.add_argument("--buildings", type=int, default=50, help="Number of buildings to simulate")
    parser.add_argument("--mqtt-host", default="localhost", help="MQTT broker host")
    parser.add_argument("--mqtt-port", type=int, default=1883, help="MQTT broker port")
    args = parser.parse_args()
    
    # Update MQTT config from args
    mqtt_config.broker_host = args.mqtt_host
    mqtt_config.broker_port = args.mqtt_port
    
    # Create backend — API and AI are ON by default
    backend = EcoSyncBackend(
        enable_simulator=not args.no_simulator,
        enable_ai=not args.no_ai,
        enable_api=not args.no_api,
        num_buildings=args.buildings
    )
    
    # Set up signal handlers
    def signal_handler(sig, frame):
        print("\n\nShutdown signal received...")
        backend.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start backend
    backend.start()
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        backend.stop()


if __name__ == "__main__":
    main()
