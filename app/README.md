# 🌿 EcoSync - Smart City Energy Microgrid

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black.svg)](https://threejs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **A next-generation smart city energy management system featuring AI-powered peer-to-peer energy trading, real-time 3D digital twin visualization, and blockchain-based settlement.**

![EcoSync Dashboard](docs/dashboard-preview.png)

## 🚀 Features

### 🔌 Virtual IoT Layer
- **50 Simulated Smart Buildings** with realistic energy patterns
- **MQTT-based telemetry** with 5-second update intervals
- **Building types**: Residential, Commercial, Hospital, Data Center, Emergency Services
- **Realistic simulation**: Solar generation curves, battery dynamics, load variations
- **Grid events**: Cloud cover (80% solar reduction), grid failures (island mode)
- **Gaussian noise injection** for sensor realism

### 🧠 AI Orchestration (LangGraph)
- **Multi-agent system** where each building is an autonomous AI agent
- **State machine**: Analyze → Check Price → Negotiate → Execute
- **Thought logs** visible in real-time terminal feed
- **Autonomous trading decisions** based on battery SoC, market prices, and building priorities
- **P2P negotiation** between buyer and seller agents

### 🎨 3D Digital Twin (Three.js + React)
- **Interactive 3D city grid** with 50 buildings
- **Real-time heatmap**: Green (selling), Amber (buying), Red (critical), Purple (priority)
- **Building selection** with detailed info panel
- **Energy flow particles** and glow effects
- **Orbit controls** for 360° exploration
- **Dark theme with neon emerald accents**

### 📊 Analytics Dashboard
- **Grid efficiency metrics** vs traditional grid
- **Load vs Generation** real-time charts
- **Battery SoC distribution** across all buildings
- **Building status pie chart**
- **Market statistics**: Price, active sellers/buyers, critical buildings

### 💰 Blockchain Settlement (Solidity)
- **EcoToken (ECO)** ERC-20 compatible token
- **P2P energy trading** with automated settlement
- **Zero-Knowledge Proof** placeholder for energy verification
- **Oracle-based validation** system
- **Platform fee mechanism** (1%)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  3D City     │  │  Analytics   │  │  Terminal Logs       │  │
│  │  (Three.js)  │  │  (Recharts)  │  │  (WebSocket)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                    API BRIDGE (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  REST API    │  │  WebSocket   │  │  MQTT Client         │  │
│  │  Endpoints   │  │  Handler     │  │  Bridge              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ MQTT
┌─────────────────────────────────────────────────────────────────┐
│                   IOT SIMULATOR (Python)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  50 Building │  │  Grid Events │  │  MQTT Publisher      │  │
│  │  Simulators  │  │  Controller  │  │  (paho-mqtt)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Agent Messages
┌─────────────────────────────────────────────────────────────────┐
│              AI ORCHESTRATION (LangGraph)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Building    │  │  State       │  │  Negotiation         │  │
│  │  Agents      │  │  Machine     │  │  Engine              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Smart Contract Calls
┌─────────────────────────────────────────────────────────────────┐
│            BLOCKCHAIN (Solidity/Ethereum)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  EcoToken    │  │  Marketplace │  │  ZKP Verification    │  │
│  │  (ERC-20)    │  │  Contract    │  │  (Placeholder)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Python 3.9+**
- **FastAPI** - Modern web framework
- **paho-mqtt** - MQTT client for IoT simulation
- **LangGraph** - Multi-agent orchestration
- **Redis** - Real-time data caching
- **WebSockets** - Real-time frontend communication

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Three.js + React Three Fiber** - 3D visualization
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

### Blockchain
- **Solidity 0.8.19** - Smart contract language
- **ERC-20** - Token standard
- **Zero-Knowledge Proofs** - Energy verification (placeholder)

## 📦 Installation

### Prerequisites
- Python 3.9+
- Node.js 18+
- MQTT Broker (Mosquitto recommended)
- Redis (optional, for caching)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ecosync.git
cd ecosync
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Frontend Setup
```bash
cd app
npm install
```

### 4. Start MQTT Broker
```bash
# Using Mosquitto
mosquitto -d

# Or using Docker
docker run -d -p 1883:1883 -p 9001:9001 eclipse-mosquitto
```

## 🚀 Running the System

### Option 1: Run All Services (Recommended)
```bash
cd backend
python run.py
```
This starts:
- IoT Simulator (50 buildings)
- AI Agent Orchestration
- MQTT connections

Then in another terminal:
```bash
cd backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Then start the frontend:
```bash
cd app
npm run dev
```

### Option 2: Individual Components

#### IoT Simulator Only
```bash
cd backend
python -m iot_simulator.simulator
```

#### FastAPI Server Only
```bash
cd backend
uvicorn api.main:app --reload
```

#### Frontend Only
```bash
cd app
npm run dev
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
| `/api/trade` | POST | Execute P2P trade |
| `/api/analytics/summary` | GET | Grid analytics |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws` | Real-time updates (telemetry, logs, trades) |

### MQTT Topics
| Topic | Direction | Description |
|-------|-----------|-------------|
| `ecosync/building/{id}/telemetry` | Pub | Building state |
| `ecosync/grid/events` | Pub/Sub | Grid-wide events |
| `ecosync/agents/{id}/logs` | Pub | Agent thought logs |
| `ecosync/market/trades` | Pub | Trade notifications |
| `ecosync/agents/offers` | Pub | Buy/sell offers |

## 🎮 Usage

### 1. View 3D City
Open `http://localhost:5173` to see the 3D digital twin. Buildings change color based on their status:
- 🟢 **Green** - Selling energy
- 🟡 **Amber** - Buying energy
- 🔴 **Red** - Critical (low battery)
- 🟣 **Purple** - Priority building

### 2. Monitor Agent Logs
Watch the terminal at the bottom to see AI agents making trading decisions in real-time.

### 3. View Analytics
The sidebar shows:
- Grid efficiency metrics
- Load vs generation charts
- Battery levels
- Market statistics

### 4. Trigger Grid Events
```bash
# Trigger cloud cover (reduces solar by 80%)
curl -X POST "http://localhost:8000/api/grid/event?event_type=cloud_cover&intensity=0.8&duration=30"

# Trigger grid failure
curl -X POST "http://localhost:8000/api/grid/event?event_type=grid_failure&duration=60"
```

### 5. Execute Manual Trade
```bash
curl -X POST "http://localhost:8000/api/trade" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_id": 5,
    "seller_id": 12,
    "amount": 25.5,
    "price": 0.15
  }'
```

## 🏆 Hackathon Demo Tips

### Pitch Points
1. **"Digital Twin First"** - Physical hardware is a bottleneck; we simulate 10,000 buildings before laying a single wire
2. **"AI-Powered P2P Trading"** - Buildings negotiate energy prices autonomously
3. **"Real-time 3D Visualization"** - Judges can see the entire grid state at a glance
4. **"Blockchain Settlement"** - Transparent, trustless energy trading with ZKP verification

### Live Demo Flow
1. Show the 3D city with buildings trading
2. Point out agent logs showing AI decisions
3. Trigger a cloud cover event - watch solar drop
4. Show critical buildings appearing (red)
5. Watch AI agents negotiate to balance the grid
6. Show analytics comparing EcoSync vs traditional grid

## 🔮 Future Enhancements

- [ ] Real hardware integration (Raspberry Pi + sensors)
- [ ] Machine learning for price prediction
- [ ] Full ZKP implementation for energy verification
- [ ] Mobile app for building managers
- [ ] Carbon credit tracking
- [ ] Integration with real energy markets

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- Built for hackathons and smart city research
- Inspired by the need for sustainable energy management
- Powered by open-source technologies

---

<p align="center">
  <strong>🌿 EcoSync - Powering the Future of Smart Cities</strong>
</p>
