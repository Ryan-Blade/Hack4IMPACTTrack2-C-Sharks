# 🌿 EcoSync — Smart City Energy Microgrid

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black.svg)](https://threejs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What Is This?

> Imagine you have **50 toy houses** in a city. Each house has a little **solar panel** on the roof and a **battery** inside.

> ☀️ When the sun shines, houses make **extra electricity**. Instead of wasting it, they **sell it to their neighbours** who need more!

> 🤖 Tiny **robot brains** (AI agents) live inside each house. They decide: *"Should I sell my energy? Should I buy some? Am I running low?"*

> 🏙️ You can **watch the whole city** on your screen in beautiful **3D** — houses glow green when selling, red when they're running low, and gold when buying!

> 💰 Every trade is recorded fairly, like a **digital receipt book** (blockchain), so no one can cheat.

**EcoSync is like a super-smart, fair, and beautiful energy-sharing neighbourhood — but for whole cities!**

---

## ✨ Features

| 🔌 IoT Simulation | 🤖 AI Agents | 🎨 3D Visualisation | 💰 Blockchain |
|---|---|---|---|
| 50 virtual smart buildings | Each building trades autonomously | Interactive Three.js city grid | EcoToken (ERC-20) trades |
| MQTT telemetry every 5s | LangGraph state machines | Real-time colour heatmap | ZKP verification placeholder |
| Solar, battery, load simulation | Negotiate prices peer-to-peer | Orbit controls & glow effects | Oracle-based validation |
| Grid events (clouds, failures) | Live thought logs visible | 360° camera exploration | Transparent settlement |

---

## 🚀 Start Everything — One Command

> **This is the only command you need.** It starts the backend AND frontend together automatically.

### Option A — Single terminal (recommended)
```powershell
# From the root project folder:
npm start
```
Both services launch in the same terminal with colour-coded output.

### Option B — Separate windows
```powershell
# From the root project folder:
.\start.ps1
```
Opens two dedicated PowerShell windows (one per service) and waits for the backend to boot before starting the frontend.

### Option C — Frontend only (backend auto-starts)
```powershell
cd app
npm run dev
```
The Vite dev server automatically spawns the Python backend in the background. Stopping Vite also stops the backend.

### Option D — Backend only (API + AI auto-start)
```powershell
cd backend
.\venv\Scripts\python.exe main.py --buildings 50
```
The API server and AI agents start automatically — no extra flags needed.

---

## 🌐 Access Links (once running)

| Service | URL |
|---|---|
| **Frontend** (3D dashboard) | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Docs** (Swagger) | http://localhost:8000/docs |
| **WebSocket** (live updates) | ws://localhost:8000/ws |

---

## 🏗️ How It's Built

```
┌─────────────────────────────────────────────────────────────────┐
│           FRONTEND  (React + Three.js)  → localhost:5173         │
│  3D City  │  Analytics Charts  │  Live Agent Terminal Feed       │
└─────────────────────────┬───────────────────────────────────────┘
                          │  WebSocket / HTTP
┌─────────────────────────▼───────────────────────────────────────┐
│           BACKEND  (FastAPI)  → localhost:8000                   │
│  REST API  │  WebSocket Hub  │  MQTT Bridge                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │  MQTT
┌─────────────────────────▼───────────────────────────────────────┐
│           IoT SIMULATOR  (Python / paho-mqtt)                    │
│  50 Building Simulators  │  Grid Events  │  MQTT Publisher       │
└─────────────────────────┬───────────────────────────────────────┘
                          │  Agent Messages
┌─────────────────────────▼───────────────────────────────────────┐
│           AI TRADING AGENTS  (LangGraph)                         │
│  Building Agents  │  State Machine  │  P2P Negotiation Engine    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 First-Time Setup

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **MQTT Broker** (Mosquitto via Docker is easiest)

### 1. Start an MQTT Broker
```bash
docker run -d -p 1883:1883 eclipse-mosquitto:2
```

### 2. Set Up the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

### 3. Set Up the Frontend
```bash
cd app
npm install
```

### 4. Install Root Tooling
```bash
# Back in the project root:
npm install
```

Now you're ready — just run `npm start` from the root! 🎉

---

## 📁 Project Structure

```
/EcoSync/
├── 📄 package.json          ← Root: npm start launches everything
├── 📄 start.ps1             ← PowerShell: separate window per service
├── 📄 docker-compose.yml    ← Full Docker stack (alternative)
│
├── app/                     ← React Frontend (Three.js + Recharts)
│   ├── src/components/      ← UI components
│   ├── vite.config.ts       ← Auto-spawns backend on npm run dev
│   └── package.json
│
├── backend/                 ← Python Backend
│   ├── main.py              ← Entry point (API + AI start automatically)
│   ├── api/main.py          ← FastAPI server + WebSocket hub
│   ├── iot_simulator/       ← 50-building simulation
│   ├── ai_orchestration/    ← LangGraph AI trading agents
│   ├── contracts/           ← Solidity smart contracts
│   └── requirements.txt
│
└── config/                  ← Docker / Nginx / Mosquitto configs
```

---

## 📡 API Quick Reference

| Endpoint | Method | What It Does |
|---|---|---|
| `/api/buildings` | GET | All 50 buildings' live data |
| `/api/buildings/{id}` | GET | One building's data |
| `/api/market/status` | GET | Price, sellers, buyers, critical count |
| `/api/grid/events` | GET | Recent grid events |
| `/api/grid/event` | POST | Trigger cloud cover / grid failure |
| `/api/trade` | POST | Execute a manual P2P trade |
| `/api/analytics/summary` | GET | Grid efficiency summary |
| `/api/agents/logs` | GET | AI agent thought logs |
| `/api/trades` | GET | Recent completed trades |
| `/ws` | WebSocket | Real-time stream of everything above |

---

## 🎮 Demo Tips (Hackathon Ready!)

1. Open the **3D city** — buildings animate in real-time 🏙️
2. Watch the **terminal feed** — AI agents negotiate live 🤖
3. Trigger a **cloud cover** event and watch solar output drop ☁️
4. See **critical buildings** (red) get rescued by their neighbours ❤️
5. Check **analytics** — compare EcoSync efficiency vs. a traditional grid 📊

```bash
# Trigger cloud cover (80% solar reduction for 30s)
curl -X POST http://localhost:8000/api/grid/event \
  -H "Content-Type: application/json" \
  -d '{"event_type": "cloud_cover", "intensity": 0.8, "duration": 30}'
```

---

## 🔮 What's Next?

- [ ] Real Raspberry Pi + sensor hardware integration
- [ ] ML price prediction
- [ ] Full ZKP energy proof implementation
- [ ] Mobile app for building managers
- [ ] Carbon credit tracking
- [ ] Support for 1,000+ buildings
- [ ] Live weather API integration

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<p align="center">
  <strong>🌿 EcoSync — Sharing Energy, Powering the Future</strong><br/>
  <a href="./BACKEND_README.md">Backend Docs</a> •
  <a href="./docker-compose.yml">Docker Setup</a> •
  <a href="http://localhost:8000/docs">API Docs (local)</a>
</p>
