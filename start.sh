#!/bin/bash

# Digitaler Impfpass Startup Script
# All services run inside Docker Compose — no host dependencies required
# except an LLM inference server at LLAMA_CPP_BASE_URL.

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Digitaler Impfpass${NC}"
echo "=================================="

# ── Pre-flight checks ────────────────────────────────────────────────────────

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: run this script from the digitaler_impfpass root directory.${NC}"
    exit 1
fi

if ! docker ps &>/dev/null; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    echo "Start Docker Desktop and try again."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.example ...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠  INSTANCE_SECRET is not set.${NC}"
    echo -e "${YELLOW}   Generate one and add it to .env:${NC}"
    echo -e "${YELLOW}     echo \"INSTANCE_SECRET=\$(openssl rand -hex 32)\" >> .env${NC}"
    exit 1
fi

# Validate required env vars
source .env 2>/dev/null || true
if [ -z "$INSTANCE_SECRET" ]; then
    echo -e "${RED}Error: INSTANCE_SECRET is not set in .env${NC}"
    echo "Generate one with: echo \"INSTANCE_SECRET=\$(openssl rand -hex 32)\" >> .env"
    exit 1
fi

# ── Start services ───────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}Starting all services ...${NC}"
docker compose up --build -d

echo ""
echo -e "${BLUE}Waiting for Convex backend to become healthy ...${NC}"
for i in $(seq 1 60); do
    if docker compose ps convex-backend 2>/dev/null | grep -q "healthy"; then
        echo -e "${GREEN}✓ Convex backend ready${NC}"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo -e "${YELLOW}⚠ Convex backend did not become healthy in time.${NC}"
        echo "Check logs: docker compose logs convex-backend"
    fi
    sleep 2
done

echo ""
echo -e "${BLUE}Waiting for function deployment to complete ...${NC}"
docker compose wait convex-functions 2>/dev/null || true

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}✓ Application started successfully!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${BLUE}Access the application:${NC}"
echo -e "  🌐 Frontend:        ${GREEN}http://localhost:3000${NC}"
echo -e "  🔧 Convex API:      ${GREEN}http://localhost:3210${NC}"
echo -e "  📊 Convex Dashboard:${GREEN}http://localhost:6791${NC}"
echo -e "  🤖 Data API:        ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "${BLUE}To import mock data:${NC}"
echo "  docker compose run --rm convex-functions sh -c 'npm ci && npx convex import --table patients samplePatients.jsonl && npx convex import --table vaccines vaccinations.jsonl'"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo "  docker compose logs -f"
echo "  docker compose logs -f convex-functions   # function deployment log"
echo ""
echo -e "${BLUE}To stop:${NC}"
echo "  docker compose down"
