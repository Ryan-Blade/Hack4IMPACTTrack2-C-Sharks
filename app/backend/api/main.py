"""
EcoSync FastAPI MQTT Bridge
Real-time data ingestion, storage, and API endpoints
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

import paho.mqtt.client as mqtt
import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Redis connection
redis_client: Optional[redis.Redis] = None

# In-memory storage for latest data (fallback if Redis unavailable)
building_data: Dict[int, dict] = {}
grid_events: List[dict] = []
market_data = {
    "current_price": 0.15,
    "trades_today": 0,
    "total_volume": 0.0,
    "grid_stability": 100.0
}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# MQTT Client
mqtt_client = mqtt.Client(client_id="fastapi_bridge")

def on_mqtt_connect(client, userdata, flags, rc):
    """Subscribe to all building topics on connect"""
    if rc == 0:
        print("MQTT Bridge: Connected to broker")
        # Subscribe to all building telemetry
        client.subscribe("ecosync/building/+/telemetry")
        # Subscribe to grid events
        client.subscribe("ecosync/grid/events")
        # Subscribe to AI agent logs
        client.subscribe("ecosync/agents/+/logs")
        print("MQTT Bridge: Subscribed to all topics")
    else:
        print(f"MQTT Bridge: Connection failed with code {rc}")

def on_mqtt_message(client, userdata, msg):
    """Process incoming MQTT messages"""
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode())
        
        if "telemetry" in topic:
            # Extract building ID from topic
            parts = topic.split("/")
            building_id = int(parts[2])
            
            # Add timestamp if not present
            if "timestamp" not in payload:
                payload["timestamp"] = datetime.now().isoformat()
            
            # Store in memory
            building_data[building_id] = payload
            
            # Store in Redis (async operation in sync context)
            asyncio.create_task(store_in_redis(f"building:{building_id}", payload))
            
            # Broadcast to WebSocket clients
            asyncio.create_task(manager.broadcast({
                "type": "telemetry",
                "data": payload
            }))
        
        elif "grid/events" in topic:
            # Store grid event
            grid_events.append({
                "timestamp": datetime.now().isoformat(),
                "event": payload
            })
            
            # Update market data if price update
            if payload.get("type") == "price_update":
                market_data["current_price"] = payload.get("price", 0.15)
            
            asyncio.create_task(manager.broadcast({
                "type": "grid_event",
                "data": payload
            }))
        
        elif "agents" in topic and "logs" in topic:
            # AI agent thought logs
            asyncio.create_task(manager.broadcast({
                "type": "agent_log",
                "data": payload
            }))
    
    except Exception as e:
        print(f"Error processing MQTT message: {e}")

async def store_in_redis(key: str, data: dict):
    """Store data in Redis with TTL"""
    if redis_client:
        try:
            await redis_client.setex(
                key,
                timedelta(hours=1),
                json.dumps(data)
            )
        except Exception as e:
            print(f"Redis error: {e}")

async def get_from_redis(key: str) -> Optional[dict]:
    """Retrieve data from Redis"""
    if redis_client:
        try:
            data = await redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"Redis error: {e}")
    return None

# Pydantic models
class BuildingTelemetry(BaseModel):
    building_id: int
    load: float
    solar_generation: float
    battery_soc: float
    grid_frequency: float
    is_selling: bool
    is_buying: bool
    is_critical: bool
    is_priority: bool
    building_type: str
    net_energy: float
    timestamp: str

class GridEvent(BaseModel):
    type: str
    active: bool
    intensity: Optional[float] = None
    price: Optional[float] = None
    timestamp: str

class MarketStatus(BaseModel):
    current_price: float
    trades_today: int
    total_volume: float
    grid_stability: float
    active_sellers: int
    active_buyers: int
    critical_buildings: int

class TradeRequest(BaseModel):
    buyer_id: int
    seller_id: int
    amount: float  # kWh
    price: float   # $/kWh

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    global redis_client
    
    # Startup
    print("Starting EcoSync API Bridge...")
    
    # Connect to Redis
    try:
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        await redis_client.ping()
        print("Connected to Redis")
    except Exception as e:
        print(f"Redis connection failed: {e}")
        print("Falling back to in-memory storage")
        redis_client = None
    
    # Connect to MQTT
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_message = on_mqtt_message
    try:
        mqtt_client.connect("localhost", 1883, 60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"MQTT connection failed: {e}")
    
    yield
    
    # Shutdown
    print("Shutting down EcoSync API Bridge...")
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    if redis_client:
        await redis_client.close()

# Create FastAPI app
app = FastAPI(
    title="EcoSync API",
    description="Smart City Energy Microgrid API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints
@app.get("/")
async def root():
    return {
        "name": "EcoSync API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/api/buildings", response_model=List[BuildingTelemetry])
async def get_all_buildings():
    """Get telemetry for all buildings"""
    return list(building_data.values())

@app.get("/api/buildings/{building_id}", response_model=BuildingTelemetry)
async def get_building(building_id: int):
    """Get telemetry for a specific building"""
    if building_id not in building_data:
        raise HTTPException(status_code=404, detail="Building not found")
    return building_data[building_id]

@app.get("/api/market/status", response_model=MarketStatus)
async def get_market_status():
    """Get current market status"""
    active_sellers = sum(1 for b in building_data.values() if b.get("is_selling"))
    active_buyers = sum(1 for b in building_data.values() if b.get("is_buying"))
    critical = sum(1 for b in building_data.values() if b.get("is_critical"))
    
    return MarketStatus(
        current_price=market_data["current_price"],
        trades_today=market_data["trades_today"],
        total_volume=market_data["total_volume"],
        grid_stability=market_data["grid_stability"],
        active_sellers=active_sellers,
        active_buyers=active_buyers,
        critical_buildings=critical
    )

@app.get("/api/grid/events")
async def get_grid_events(limit: int = 10):
    """Get recent grid events"""
    return grid_events[-limit:]

@app.post("/api/trade")
async def execute_trade(trade: TradeRequest):
    """Execute a P2P energy trade"""
    # Validate buildings exist
    if trade.buyer_id not in building_data:
        raise HTTPException(status_code=404, detail="Buyer building not found")
    if trade.seller_id not in building_data:
        raise HTTPException(status_code=404, detail="Seller building not found")
    
    # Update market data
    market_data["trades_today"] += 1
    market_data["total_volume"] += trade.amount
    
    # Publish trade to MQTT for AI agents
    trade_msg = {
        "type": "trade_executed",
        "buyer_id": trade.buyer_id,
        "seller_id": trade.seller_id,
        "amount": trade.amount,
        "price": trade.price,
        "total_cost": trade.amount * trade.price,
        "timestamp": datetime.now().isoformat()
    }
    mqtt_client.publish("ecosync/market/trades", json.dumps(trade_msg))
    
    # Broadcast to WebSocket
    await manager.broadcast({
        "type": "trade",
        "data": trade_msg
    })
    
    return {"status": "success", "trade": trade_msg}

@app.post("/api/grid/event")
async def trigger_grid_event(event_type: str, intensity: float = 0.8, duration: int = 30):
    """Manually trigger a grid event"""
    event = {
        "type": event_type,
        "active": True,
        "intensity": intensity if event_type == "cloud_cover" else None,
        "timestamp": datetime.now().isoformat()
    }
    mqtt_client.publish("ecosync/grid/events", json.dumps(event))
    
    # Schedule deactivation
    if duration > 0:
        await asyncio.sleep(duration)
        event["active"] = False
        mqtt_client.publish("ecosync/grid/events", json.dumps(event))
    
    return {"status": "success", "event": event}

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """Get grid analytics summary"""
    if not building_data:
        return {
            "total_load": 0,
            "total_generation": 0,
            "net_grid_flow": 0,
            "avg_battery_soc": 0,
            "grid_efficiency": 0
        }
    
    total_load = sum(b.get("load", 0) for b in building_data.values())
    total_gen = sum(b.get("solar_generation", 0) for b in building_data.values())
    avg_soc = sum(b.get("battery_soc", 0) for b in building_data.values()) / len(building_data)
    
    # Calculate grid efficiency (local consumption / total generation)
    local_consumption = sum(
        min(b.get("load", 0), b.get("solar_generation", 0))
        for b in building_data.values()
    )
    efficiency = (local_consumption / total_gen * 100) if total_gen > 0 else 0
    
    return {
        "total_load": round(total_load, 2),
        "total_generation": round(total_gen, 2),
        "net_grid_flow": round(total_load - total_gen, 2),
        "avg_battery_soc": round(avg_soc, 2),
        "grid_efficiency": round(efficiency, 2),
        "building_count": len(building_data),
        "timestamp": datetime.now().isoformat()
    }

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle client messages if needed
                if msg.get("action") == "get_buildings":
                    await websocket.send_json({
                        "type": "buildings_list",
                        "data": list(building_data.values())
                    })
            except:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
