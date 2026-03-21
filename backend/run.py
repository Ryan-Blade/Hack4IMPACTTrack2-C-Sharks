"""
EcoSync Backend Runner
Starts all backend services: MQTT simulator, FastAPI, and AI orchestration
"""
import asyncio
import signal
import sys
import threading
import time
from typing import List

from iot_simulator import BuildingClusterSimulator
from ai_orchestration import get_orchestrator


class EcoSyncBackend:
    """
    Main backend orchestrator that runs all EcoSync services
    """
    
    def __init__(self):
        self.simulator = BuildingClusterSimulator()
        self.orchestrator = get_orchestrator()
        self.running = False
        self.ai_task = None
        
    def start(self):
        """Start all backend services"""
        print("\n" + "="*70)
        print("  🌿 EcoSync Smart Energy Microgrid - Backend Services")
        print("="*70 + "\n")
        
        self.running = True
        
        # 1. Start IoT Simulator (50 buildings)
        print("[1/3] Starting IoT Simulator with 50 Smart Buildings...")
        self.simulator.start()
        time.sleep(2)  # Let buildings connect
        
        # 2. Register AI agents for all buildings
        print("\n[2/3] Registering AI Trading Agents...")
        for building in self.simulator.buildings:
            self.orchestrator.register_agent(
                building_id=building.building_id,
                building_type=building.building_type,
                is_priority=building.is_priority
            )
        print(f"      Registered {len(self.simulator.buildings)} agents")
        
        # 3. Start AI orchestration loop
        print("\n[3/3] Starting AI Trading Orchestration...")
        self.ai_thread = threading.Thread(target=self._ai_loop)
        self.ai_thread.daemon = True
        self.ai_thread.start()
        
        print("\n" + "="*70)
        print("  ✅ All services started successfully!")
        print("="*70)
        print("\nServices:")
        print("  • MQTT Broker: localhost:1883")
        print("  • FastAPI: http://localhost:8000")
        print("  • WebSocket: ws://localhost:8000/ws")
        print("\nPress Ctrl+C to stop\n")
        
    def _ai_loop(self):
        """Background loop for AI trading cycles"""
        while self.running:
            try:
                # Run trading cycles for all agents
                asyncio.run(self.orchestrator.run_all_cycles())
                time.sleep(10)  # Run every 10 seconds
            except Exception as e:
                print(f"AI loop error: {e}")
                time.sleep(5)
    
    def stop(self):
        """Stop all backend services"""
        print("\n" + "="*70)
        print("  🛑 Shutting down EcoSync Backend...")
        print("="*70 + "\n")
        
        self.running = False
        
        # Stop simulator
        print("[1/3] Stopping IoT Simulator...")
        self.simulator.stop()
        
        # Unregister agents
        print("[2/3] Unregistering AI Agents...")
        for building in self.simulator.buildings:
            self.orchestrator.unregister_agent(building.building_id)
        
        print("[3/3] Cleanup complete!")
        print("\n" + "="*70)
        print("  ✅ EcoSync Backend stopped")
        print("="*70 + "\n")


def main():
    """Main entry point"""
    backend = EcoSyncBackend()
    
    def signal_handler(sig, frame):
        print("\n\nShutdown signal received...")
        backend.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    backend.start()
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        backend.stop()


if __name__ == "__main__":
    main()
