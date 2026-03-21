# 🌿 EcoSync Backend

Complete Python backend for the EcoSync Smart Energy Microgrid system.

## 🏗️ Architecture

```
backend/
├── config/              # Configuration settings
│   ├── __init__.py
│   └── settings.py      # Environment & app settings
│
├── iot_simulator/       # Virtual IoT Layer
│   ├── __init__.py
│   ├── building.py      # Individual building simulator
│   ├── grid_controller.py  # Grid events manager
│   └── simulator.py     # Building cluster manager
│
├── ai_orchestration/    # AI Trading Layer
│   ├── __init__.py
│   ├── agent.py         # Building AI agent
│   └── orchestrator.py  # Multi-agent manager
│
├── api/                 # FastAPI Backend
│   ├── __init__.py
│   └── main.py          # REST API + WebSocket
│
├── contracts/           # Blockchain (Solidity)
│   ├── __init__.py
│   ├── EcoSyncMarketplace.sol
│   └── deploy.py
│
├── main.py              # Main entry point
├── requirements.txt     # Python dependencies
└── Dockerfile           # Container image
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- MQTT Broker (Mosquitto)

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Start MQTT Broker
```bash
# Using Docker
docker run -d -p 1883:1883 eclipse-mosquitto:2

# Or using your system's package manager
# Ubuntu/Debian: sudo apt install mosquitto
# macOS: brew install mosquitto
```

### 3. Run the Backend
```bash
# Full system (simulator + AI + API)
python main.py --api --buildings 50

# Just simulator and AI (no API)
python main.py --buildings 50

# Custom MQTT broker
python main.py --api --mqtt-host 192.168.1.100 --mqtt-port 1883
```

## 📡 API Endpoints

### REST API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/api/buildings` | GET | All building telemetry |
| `/api/buildings/{id}` | GET | Specific building |
| `/api/market/status` | GET | Market statistics |
| `/api/grid/events` | GET | Recent grid events |
| `/api/grid/event` | POST | Trigger grid event |
| `/api/trade` | POST | Execute P2P trade |
| `/api/analytics/summary` | GET | Grid analytics |
| `/api/agents/logs` | GET | AI agent logs |
| `/api/trades` | GET | Recent trades |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws` | Real-time updates |

### MQTT Topics
| Topic | Description |
|-------|-------------|
| `ecosync/building/{id}/telemetry` | Building state |
| `ecosync/grid/events` | Grid events |
| `ecosync/agents/{id}/logs` | Agent logs |
| `ecosync/market/trades` | Trade notifications |

## 🐳 Docker Deployment

### Using Docker Compose (Full Stack)
```bash
cd /mnt/okcomputer/output
docker-compose up --build
```

Services:
- MQTT Broker: `localhost:1883`
- FastAPI: `localhost:8000`
- Frontend: `localhost:80`

### Backend Only
```bash
cd backend
docker build -t ecosync-backend .
docker run -p 8000:8000 --network host ecosync-backend
```

## ⚙️ Configuration

Environment variables:
```bash
# MQTT
MQTT_HOST=localhost
MQTT_PORT=1883

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false

# Simulator
NUM_BUILDINGS=50
TELEMETRY_INTERVAL=5.0
AUTO_EVENTS=true
EVENT_INTERVAL=60

# AI
TRADING_INTERVAL=10
ENABLE_NEGOTIATION=true
```

## 🧪 Testing

```bash
# Test MQTT connection
mosquitto_pub -t "test" -m "hello"
mosquitto_sub -t "ecosync/building/+/telemetry"

# Test API
curl http://localhost:8000/api/buildings
curl http://localhost:8000/api/market/status

# Trigger grid event
curl -X POST "http://localhost:8000/api/grid/event" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "cloud_cover", "intensity": 0.8, "duration": 30}'

# Execute trade
curl -X POST "http://localhost:8000/api/trade" \
  -H "Content-Type: application/json" \
  -d '{"buyer_id": 5, "seller_id": 12, "amount": 25, "price": 0.15}'
```

## 📊 Monitoring

The backend prints periodic status updates:
```
--------------------------------------------------
📊 Status Update - 14:30:00
--------------------------------------------------
Trades: 15 | Volume: 342.5kWh | Value: $51.38
Sellers: 8 | Buyers: 5 | Critical: 1
Generation: 2450.3kW | Load: 1892.7kW | Avg SoC: 62.3%
--------------------------------------------------
```

## 🔧 Components

### IoT Simulator
- Simulates 50 smart buildings
- Realistic energy patterns (solar curves, load variations)
- Grid events: cloud cover, grid failures
- MQTT telemetry every 5 seconds

### AI Orchestration
- Each building is an autonomous AI agent
- State machine: Analyze → Check Price → Negotiate → Execute
- P2P negotiation between agents
- Real-time thought logs

### FastAPI Backend
- REST API for queries
- WebSocket for real-time updates
- MQTT bridge for IoT integration
- CORS enabled for frontend

## 📄 License

MIT License
