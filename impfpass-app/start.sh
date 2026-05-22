#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

if command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  DOCKER_COMPOSE="docker compose"
fi

echo "==> 1/4 PostgreSQL starten..."
$DOCKER_COMPOSE -f "$ROOT/docker-compose.yml" up -d postgres
echo "    Warte auf Datenbankbereitschaft..."
until docker exec impfpass_db pg_isready -U impfpass -q; do sleep 1; done

echo "==> 2/4 Backend-Dependencies installieren..."
cd "$ROOT/backend"
[ ! -d .venv ] && python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -q

echo "==> 3/4 Datenbank-Migrationen ausführen..."
.venv/bin/alembic upgrade head

echo "==> 4/5 Frontend-Dependencies installieren..."
cd "$ROOT/frontend"
if command -v npm >/dev/null 2>&1; then
  FRONTEND_PM_INSTALL="npm install"
  FRONTEND_PM_DEV="npm run dev"
else
  corepack prepare pnpm@9.15.9 --activate
  FRONTEND_PM_INSTALL="corepack pnpm install"
  FRONTEND_PM_DEV="corepack pnpm dev"
fi
[ ! -d node_modules ] && $FRONTEND_PM_INSTALL

echo "==> 5/5 Backend + Frontend starten..."
cd "$ROOT/backend"
.venv/bin/uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

cd "$ROOT/frontend"
$FRONTEND_PM_DEV &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ API Docs: http://localhost:8000/docs"
echo "✓ Frontend: http://localhost:5173"
echo ""
echo "Stoppen mit: kill $BACKEND_PID $FRONTEND_PID"
wait
