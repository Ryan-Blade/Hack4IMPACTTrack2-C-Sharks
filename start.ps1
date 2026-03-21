# ============================================================
#  EcoSync - One-command Startup Script (PowerShell)
#  Starts backend (FastAPI + AI + IoT) AND frontend (Vite)
# ============================================================

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "app"
$PythonExe = Join-Path $BackendDir "venv\Scripts\python.exe"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   🌿  EcoSync - Starting All Services" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# --- Validate prerequisites ---
if (-Not (Test-Path $PythonExe)) {
    Write-Host "❌ Python venv not found at: $PythonExe" -ForegroundColor Red
    Write-Host "   Run: cd backend && python -m venv venv && .\venv\Scripts\pip install -r requirements.txt"
    exit 1
}

$NodeAvailable = Get-Command node -ErrorAction SilentlyContinue
if (-Not $NodeAvailable) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# --- Start Backend in a new window ---
Write-Host "🚀 Starting Backend (FastAPI + AI Agents + IoT Simulator)..." -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$BackendDir'; Write-Host '🌿 EcoSync Backend' -ForegroundColor Green; & '$PythonExe' main.py --buildings 50"
) -WindowStyle Normal

# Give the backend a moment to boot before frontend starts
Write-Host "   ⏳ Waiting 3s for backend to boot..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# --- Start Frontend in a new window ---
Write-Host "🚀 Starting Frontend (Vite dev server)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$FrontendDir'; Write-Host '⚡ EcoSync Frontend' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  ✅ All services launched in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Green
Write-Host "  API Docs : http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  WebSocket: ws://localhost:8000/ws" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Close the opened windows to stop the services." -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
