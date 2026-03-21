#!/bin/bash
# EcoSync Startup Script
# Starts all backend services

set -e

echo "======================================================================"
echo "  🌿 EcoSync Smart Energy Microgrid - Startup Script"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker found${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}⚠ Docker not found, will use Python directly${NC}"
    USE_DOCKER=false
fi

# Check if Python is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo -e "${RED}✗ Python not found. Please install Python 3.9+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Using Python: $PYTHON_CMD${NC}"

# Function to start with Docker
start_docker() {
    echo ""
    echo "Starting services with Docker Compose..."
    echo ""
    
    # Build and start
    docker-compose up --build -d
    
    echo ""
    echo -e "${GREEN}✓ Services started!${NC}"
    echo ""
    echo "Access points:"
    echo "  • Frontend: http://localhost"
    echo "  • API: http://localhost:8000"
    echo "  • WebSocket: ws://localhost:8000/ws"
    echo "  • MQTT: localhost:1883"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
}

# Function to start with Python
start_python() {
    echo ""
    echo "Starting services with Python..."
    echo ""
    
    # Check MQTT broker
    if ! nc -z localhost 1883 2>/dev/null; then
        echo -e "${YELLOW}⚠ MQTT broker not detected on port 1883${NC}"
        echo "  Please start an MQTT broker (e.g., Mosquitto):"
        echo "    docker run -d -p 1883:1883 eclipse-mosquitto:2"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Install dependencies if needed
    if [ ! -d "backend/venv" ]; then
        echo "Creating Python virtual environment..."
        cd backend
        $PYTHON_CMD -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
    else
        source backend/venv/bin/activate
    fi
    
    # Start backend
    echo ""
    echo "Starting EcoSync Backend..."
    echo ""
    cd backend
    $PYTHON_CMD main.py --api --buildings 50 &
    BACKEND_PID=$!
    cd ..
    
    echo ""
    echo -e "${GREEN}✓ Backend started!${NC}"
    echo ""
    echo "Access points:"
    echo "  • API: http://localhost:8000"
    echo "  • WebSocket: ws://localhost:8000/ws"
    echo ""
    echo "To stop: kill $BACKEND_PID"
    echo ""
    
    # Wait for backend
    wait $BACKEND_PID
}

# Main menu
echo ""
echo "Select startup mode:"
echo "  1) Docker Compose (recommended)"
echo "  2) Python Direct"
echo ""
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        if [ "$USE_DOCKER" = true ]; then
            start_docker
        else
            echo -e "${RED}✗ Docker not available${NC}"
            exit 1
        fi
        ;;
    2)
        start_python
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
