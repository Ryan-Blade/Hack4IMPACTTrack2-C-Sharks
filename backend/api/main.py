"""
EcoSync FastAPI Backend
Real-time API with WebSocket support for the EcoSync system
"""
import json
import asyncio
import time
from collections import deque
from datetime import datetime
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

import paho.mqtt.client as mqtt
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

from config.settings import mqtt_config, api_config

# ── In-memory storage (O(1) bounded with deque) ──────────────────────────────
building_data: Dict[int, dict] = {}
grid_events: deque  = deque(maxlen=100)
agent_logs:  deque  = deque(maxlen=500)
trades:      deque  = deque(maxlen=100)

market_data = {
    "current_price":  0.15,
    "trades_today":   0,
    "total_volume":   0.0,
    "grid_stability": 100.0,
}

# ── Analytics cache (5-second TTL) ───────────────────────────────────────────
_analytics_cache: Optional[dict] = None
_analytics_cache_ts: float = 0.0
_ANALYTICS_TTL: float = 5.0          # seconds


def _build_analytics() -> dict:
    """Compute analytics summary from current building data."""
    if not building_data:
        return {
            "total_load": 0, "total_generation": 0, "net_grid_flow": 0,
            "avg_battery_soc": 0, "grid_efficiency": 0, "building_count": 0,
            "timestamp": datetime.now().isoformat(),
        }
    values = list(building_data.values())
    total_load = sum(b.get("load", 0) for b in values)
    total_gen  = sum(b.get("solar_generation", 0) for b in values)
    avg_soc    = sum(b.get("battery_soc", 0) for b in values) / len(values)
    local_consumption = sum(
        min(b.get("load", 0), b.get("solar_generation", 0)) for b in values
    )
    efficiency = (local_consumption / total_gen * 100) if total_gen > 0 else 0
    return {
        "total_load":       round(total_load, 2),
        "total_generation": round(total_gen, 2),
        "net_grid_flow":    round(total_load - total_gen, 2),
        "avg_battery_soc":  round(avg_soc, 2),
        "grid_efficiency":  round(efficiency, 2),
        "building_count":   len(values),
        "timestamp":        datetime.now().isoformat(),
    }


# ── WebSocket connection manager ──────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"🔌 WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast concurrently — one slow/dead client won't block others."""
        if not self.active_connections:
            return

        async def _send(ws: WebSocket):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)

        await asyncio.gather(*[_send(ws) for ws in list(self.active_connections)],
                             return_exceptions=True)


manager = ConnectionManager()
main_loop: Optional[asyncio.AbstractEventLoop] = None


def broadcast_safe(msg: dict):
    """Thread-safe bridge: schedule a broadcast from a sync thread."""
    if main_loop and main_loop.is_running():
        asyncio.run_coroutine_threadsafe(manager.broadcast(msg), main_loop)


# ── MQTT Client ────────────────────────────────────────────────────────────────
mqtt_client = mqtt.Client(
    client_id="fastapi_bridge",
    callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
)


def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ MQTT Bridge: Connected to broker")
        client.subscribe("ecosync/building/+/telemetry")
        client.subscribe("ecosync/grid/events")
        client.subscribe("ecosync/agents/+/logs")
        client.subscribe("ecosync/market/trades")
        print("📡 MQTT Bridge: Subscribed to all topics")
    else:
        print(f"❌ MQTT Bridge: Connection failed with code {rc}")


def on_mqtt_message(client, userdata, msg):
    global _analytics_cache, _analytics_cache_ts
    try:
        topic   = msg.topic
        payload = json.loads(msg.payload.decode())

        if "telemetry" in topic:
            building_id = int(topic.split("/")[2])
            if "timestamp" not in payload:
                payload["timestamp"] = datetime.now().isoformat()
            building_data[building_id] = payload
            # Invalidate analytics cache on new telemetry
            _analytics_cache_ts = 0.0
            broadcast_safe({"type": "telemetry", "data": payload})

        elif "grid/events" in topic:
            event_data = {"timestamp": datetime.now().isoformat(), "event": payload}
            grid_events.append(event_data)           # deque auto-trims
            if payload.get("type") == "price_update":
                market_data["current_price"] = payload.get("price", 0.15)
            broadcast_safe({"type": "grid_event", "data": payload})

        elif "agents" in topic and "logs" in topic:
            agent_logs.append(payload)               # deque auto-trims
            broadcast_safe({"type": "agent_log", "data": payload})

        elif "market/trades" in topic:
            trades.append(payload)                   # deque auto-trims
            market_data["trades_today"]  += 1
            market_data["total_volume"]  += payload.get("amount", 0)
            broadcast_safe({"type": "trade", "data": payload})

    except Exception as e:
        print(f"⚠️ Error processing MQTT message: {e}")


# ── Pydantic models ───────────────────────────────────────────────────────────
class BuildingTelemetry(BaseModel):
    building_id:      int
    load:             float
    solar_generation: float
    battery_soc:      float
    grid_frequency:   float
    is_selling:       bool
    is_buying:        bool
    is_critical:      bool
    is_priority:      bool
    building_type:    str
    net_energy:       float
    timestamp:        str


class GridEventModel(BaseModel):
    type:      str
    active:    bool
    intensity: Optional[float] = None
    price:     Optional[float] = None
    timestamp: str


class MarketStatus(BaseModel):
    current_price:      float
    trades_today:       int
    total_volume:       float
    grid_stability:     float
    active_sellers:     int
    active_buyers:      int
    critical_buildings: int


class TradeRequest(BaseModel):
    buyer_id:  int
    seller_id: int
    amount:    float   # kWh
    price:     float   # $/kWh


class GridEventTrigger(BaseModel):
    event_type: str               # cloud_cover, grid_failure, price_update
    intensity:  Optional[float] = 0.8
    duration:   int = 30
    price:      Optional[float] = None


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop
    main_loop = asyncio.get_running_loop()
    print("\n" + "="*70)
    print("  🚀 EcoSync FastAPI Backend Starting...")
    print("="*70 + "\n")

    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_message = on_mqtt_message
    try:
        mqtt_client.connect(mqtt_config.broker_host, mqtt_config.broker_port, 60)
        mqtt_client.loop_start()
        print(f"✅ Connected to MQTT at {mqtt_config.broker_host}:{mqtt_config.broker_port}")
    except Exception as e:
        print(f"⚠️ MQTT connection failed: {e}")

    yield

    print("\n" + "="*70)
    print("  🛑 EcoSync FastAPI Backend Shutting down...")
    print("="*70 + "\n")
    mqtt_client.loop_stop()
    mqtt_client.disconnect()


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="EcoSync API",
    description="Smart City Energy Microgrid API — Real-time P2P energy trading with AI agents",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=api_config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def root():
    return {
        "name": "EcoSync API", "version": "1.0.0", "status": "operational",
        "features": [
            "Real-time building telemetry", "AI agent orchestration",
            "P2P energy trading", "Grid event management", "WebSocket streaming",
        ],
    }


@app.get("/api/buildings", response_model=List[dict])
async def get_all_buildings():
    return list(building_data.values())


@app.get("/api/buildings/{building_id}")
async def get_building(building_id: int):
    if building_id not in building_data:
        raise HTTPException(status_code=404, detail="Building not found")
    return building_data[building_id]


@app.get("/api/market/status")
async def get_market_status():
    values = list(building_data.values())
    return {
        "current_price":      market_data["current_price"],
        "trades_today":       market_data["trades_today"],
        "total_volume":       round(market_data["total_volume"], 2),
        "grid_stability":     market_data["grid_stability"],
        "active_sellers":     sum(1 for b in values if b.get("is_selling")),
        "active_buyers":      sum(1 for b in values if b.get("is_buying")),
        "critical_buildings": sum(1 for b in values if b.get("is_critical")),
    }


@app.get("/api/grid/events")
async def get_grid_events(limit: int = 10):
    events = list(grid_events)
    return events[-limit:]


@app.post("/api/grid/event")
async def trigger_grid_event(event: GridEventTrigger, background_tasks: BackgroundTasks):
    """
    Trigger a grid event.

    FIX: previously called `await asyncio.sleep(duration)` inside the handler,
    blocking the entire event loop for 30–60 s.  Now the deactivation is
    scheduled as a BackgroundTask so the response returns immediately.
    """
    event_payload = {
        "type":      event.event_type,
        "active":    True,
        "timestamp": datetime.now().isoformat(),
    }

    if event.event_type == "cloud_cover":
        event_payload["intensity"] = event.intensity
    elif event.event_type == "price_update":
        event_payload["price"] = event.price or market_data["current_price"]

    mqtt_client.publish("ecosync/grid/events", json.dumps(event_payload))

    # Schedule deactivation as a background task (non-blocking)
    if event.duration > 0:
        async def _deactivate(payload: dict, delay: int):
            await asyncio.sleep(delay)
            payload = {**payload, "active": False, "timestamp": datetime.now().isoformat()}
            mqtt_client.publish("ecosync/grid/events", json.dumps(payload))
            await manager.broadcast({"type": "grid_event", "data": payload})

        background_tasks.add_task(_deactivate, event_payload, event.duration)

    return {"status": "success", "event": event_payload}


@app.post("/api/trade")
async def execute_trade(trade: TradeRequest):
    if trade.buyer_id not in building_data:
        raise HTTPException(status_code=404, detail="Buyer building not found")
    if trade.seller_id not in building_data:
        raise HTTPException(status_code=404, detail="Seller building not found")

    market_data["trades_today"] += 1
    market_data["total_volume"] += trade.amount

    trade_msg = {
        "type":       "trade_executed",
        "buyer_id":   trade.buyer_id,
        "seller_id":  trade.seller_id,
        "amount":     trade.amount,
        "price":      trade.price,
        "total_cost": trade.amount * trade.price,
        "timestamp":  datetime.now().isoformat(),
    }
    mqtt_client.publish("ecosync/market/trades", json.dumps(trade_msg))
    mqtt_client.publish(
        f"ecosync/building/{trade.seller_id}/commands",
        json.dumps({"command": "trade_completed", "role": "seller", "amount": trade.amount}),
    )
    mqtt_client.publish(
        f"ecosync/building/{trade.buyer_id}/commands",
        json.dumps({"command": "trade_completed", "role": "buyer", "amount": trade.amount}),
    )
    await manager.broadcast({"type": "trade", "data": trade_msg})
    return {"status": "success", "trade": trade_msg}


@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """Return grid analytics.  Cached for 5 s to avoid recomputing on every poll."""
    global _analytics_cache, _analytics_cache_ts
    now = time.monotonic()
    if _analytics_cache is None or (now - _analytics_cache_ts) > _ANALYTICS_TTL:
        _analytics_cache    = _build_analytics()
        _analytics_cache_ts = now
    return _analytics_cache


@app.get("/api/agents/logs")
async def get_agent_logs(limit: int = 100):
    logs = list(agent_logs)
    return logs[-limit:]


@app.get("/api/trades")
async def get_trades(limit: int = 20):
    t = list(trades)
    return t[-limit:]


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send current snapshot to new client
        await websocket.send_json({
            "type": "buildings_list",
            "data": list(building_data.values()),
        })

        while True:
            data = await websocket.receive_text()
            try:
                msg    = json.loads(data)
                action = msg.get("action")

                if action == "get_buildings":
                    await websocket.send_json({
                        "type": "buildings_list",
                        "data": list(building_data.values()),
                    })
                elif action == "get_logs":
                    limit = msg.get("limit", 100)
                    logs  = list(agent_logs)
                    await websocket.send_json({
                        "type": "logs_list",
                        "data": logs[-limit:],
                    })
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# ── React SPA Serving (Must be at the very bottom!) ───────────────────────────
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "app", "dist"))

# Only mount if the dist directory exists (i.e., after npm run build)
if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        path_in_dist = os.path.join(dist_dir, full_path)
        if full_path and os.path.isfile(path_in_dist):
            return FileResponse(path_in_dist)
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    print("⚠️  Warning: React 'dist' directory not found. Frontend will not be served.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=api_config.host, port=api_config.port, log_level="info")
