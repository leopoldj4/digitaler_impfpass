#!/bin/bash

# Digitaler Impfpass Startup Script
# Starts Convex backend and Docker Compose services

set -e

echo "🚀 Starting Digitaler Impfpass Application Stack"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}Error: docker-compose.yml not found${NC}"
    echo "Please run this script from the root of the digitaler_impfpass directory"
    exit 1
fi

# Check if Docker is running
if ! docker ps &>/dev/null; then
    echo -e "${YELLOW}Error: Docker daemon is not running${NC}"
    echo "Please start Docker Desktop or Docker daemon and try again"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &>/dev/null; then
    echo -e "${YELLOW}Error: npm is not installed${NC}"
    echo "Please install Node.js 20+ and try again"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 1: Checking Convex...${NC}"
if lsof -Pi :3210 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✓ Convex already running on port 3210${NC}"
else
    echo -e "${YELLOW}ℹ Starting Convex in a new terminal...${NC}"
    echo ""
    echo -e "${YELLOW}📌 IMPORTANT: Keep the Convex terminal window open!${NC}"
    echo ""
    
    # Try to open in a new terminal window (macOS specific)
    if command -v open &>/dev/null; then
        open -a Terminal "$PWD/start-convex.sh"
        echo -e "${BLUE}Waiting for Convex to start (30 seconds)...${NC}"
        for i in {1..30}; do
            if lsof -Pi :3210 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
                echo -e "${GREEN}✓ Convex is ready!${NC}"
                break
            fi
            echo -n "."
            sleep 1
        done
        
        if ! lsof -Pi :3210 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo -e "${YELLOW}⚠ Convex may still be starting. Check the terminal window.${NC}"
        fi
    else
        echo -e "${YELLOW}Please start Convex manually:${NC}"
        echo "  cd impfpass-app/frontend-next"
        echo "  npm run convex-dev"
        echo ""
        echo "Then come back to this terminal and press Enter to continue..."
        read -p ""
    fi
fi

echo ""
echo -e "${BLUE}Step 2: Starting Docker Compose services...${NC}"
docker compose up -d

echo ""
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 5

# Check service status
echo ""
echo -e "${BLUE}Step 3: Checking service status...${NC}"
docker compose ps

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Application started successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Access the application:${NC}"
echo -e "  🌐 Frontend:      ${GREEN}http://localhost:3000${NC}"
echo -e "  📊 Convex:        ${GREEN}http://localhost:3211${NC}"
echo -e "  🤖 Data API:      ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "${BLUE}To import mock data:${NC}"
echo "  docker compose exec frontend npm run import"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo "  docker compose logs -f"
echo ""
echo -e "${BLUE}To stop services:${NC}"
echo "  docker compose down"
echo ""
echo -e "${YELLOW}Keep your terminal windows open while developing!${NC}"
