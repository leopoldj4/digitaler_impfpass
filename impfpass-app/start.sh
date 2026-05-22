#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> 1/4 PostgreSQL starten..."
docker-compose -f "$ROOT/docker-compose.yml" up -d postgres
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
[ ! -d node_modules ] && npm install

echo "==> 5/5 Backend + Frontend starten..."
cd "$ROOT/backend"
.venv/bin/uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ API Docs: http://localhost:8000/docs"
echo "✓ Frontend: http://localhost:5173"
echo ""
echo "Stoppen mit: kill $BACKEND_PID $FRONTEND_PID"
wait
