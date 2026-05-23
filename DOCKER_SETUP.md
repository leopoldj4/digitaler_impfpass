# Docker Setup für Digitaler Impfpass

This guide explains how to run the entire application stack using Docker Compose and local Convex development.

## 📋 Prerequisites

- Docker Desktop (or Docker + Docker Compose CLI)
- Git
- Node.js 20+ (for running Convex locally)

## 🚀 Quick Start

### 1. Clone and Enter the Repository

```bash
git clone <repository-url>
cd digitaler_impfpass
git checkout feature/dockerize
```

### 2. Start Convex Backend (Host Terminal)

In one terminal, start the Convex backend on your host machine:

```bash
cd impfpass-app/frontend-next
npm install
npm run convex-dev
```

Wait until you see:
```
✔ Convex functions ready!
```

This service will run on ports 3210 (API) and 3211 (Dashboard).

### 3. Start Docker Services (Another Terminal)

In a separate terminal, build and start the containerized services:

```bash
# From the root directory
docker compose up --build -d
```

This will start:
- **Frontend** on `http://localhost:3000`
- **Data Acquisition API** on `http://localhost:8000`

### 4. Import Mock Data (Optional)

Once Convex is running, import the sample patient and vaccination data:

```bash
cd impfpass-app/frontend-next
npm run import
```

Or via Docker:

```bash
docker compose exec frontend npm run import
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Data Acquisition API**: http://localhost:8000 (for image processing)
- **Convex Dashboard**: http://localhost:3211

## 📊 Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Host Machine                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Convex Backend (npm run convex-dev)                   │  │
│  │  Running on: localhost:3210 & localhost:3211           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         ↑                                ↑
         │ connects to                    │ dashboard
         │ host.docker.internal:3210      │ http://localhost:3211
         │                                │
┌────────┴────────┬──────────────────────┴───────────────────┐
│  Docker Network                                             │
│  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  │  Frontend Container      │  │  Data Acquisition      │  │
│  │  (Next.js)               │  │  (Python LLM Service)  │  │
│  │  :3000                   │  │  :8000                 │  │
│  └──────────────────────────┘  └────────────────────────┘  │
│         ↓                                ↓                    │
│  http://localhost:3000          http://localhost:8000        │
└─────────────────────────────────────────────────────────────┘
```

## 🛑 Stop the Application

### Stop Docker Services

```bash
docker compose down
```

### Stop Convex Backend

In the Convex terminal, press `Ctrl+C`.

### Stop and Clean Up Everything

```bash
docker compose down -v
# Then Ctrl+C on the Convex terminal
```

## 🔧 Configuration

### Environment Variables

The root `.env` file is already configured with:

```bash
LLAMA_CPP_BASE_URL=http://rcbe-srv-012.hs-regensburg.de:49068
NEXT_PUBLIC_CONVEX_URL=http://convex:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://localhost:3211
DATA_ACQUISITION_API=http://data-acquisition:8000
```

For local testing, you can modify `.env` to use a different LLM:

```bash
LLAMA_CPP_BASE_URL=http://your-local-llm:port
```

### Services Overview

#### Data Acquisition Service (Port 8000)
- **Purpose**: Extracts text and vaccination data from vaccine passport images using LLM
- **Technology**: FastAPI + Gemma LLM
- **Configuration**: Uses LLAMA_CPP_BASE_URL from environment
- **Endpoint**: `http://localhost:8000/extract` (POST)
- **Status**: ✅ Runs in Docker container
- **Volume**: `/app/vaccines.json` - Vaccination database

#### Convex Backend (Ports 3210-3211)
- **Purpose**: Real-time database and API backend
- **Technology**: Convex
- **Ports**:
  - 3210: API endpoint (internal Docker network uses `http://host.docker.internal:3210`)
  - 3211: Dashboard UI
- **Features**: Real-time sync, file storage, authentication
- **Status**: 🏠 Runs on host machine (not containerized due to binary compatibility)
- **Command**: `npm run convex-dev` from `impfpass-app/frontend-next/`

#### Frontend (Port 3000)
- **Purpose**: Next.js React application
- **Technology**: Next.js 16 + React 19 + TypeScript
- **Features**: Patient management, vaccination tracking, document upload
- **Status**: ✅ Runs in Docker container
- **Mock Data**: 
  - `samplePatients.jsonl` - 12 sample patients
  - `vaccinations.jsonl` - 20+ vaccine types
- **Import Command**: `npm run import`

## 📊 Mock Data

### Sample Patients
Located in `impfpass-app/frontend-next/samplePatients.jsonl`:
- 12 sample patient records with birth dates and metadata
- Auto-imported via `npm run import`

### Sample Vaccines
Located in `impfpass-app/frontend-next/vaccinations.jsonl`:
- 20+ vaccine types and combinations
- Auto-imported to Convex database

### Re-import Mock Data

```bash
# From the root or frontend directory
cd impfpass-app/frontend-next
npm run import
```

Or via Docker (requires Convex running):

```bash
docker compose exec frontend npm run import
```

## 🔍 Debugging

### Frontend Not Loading

```bash
docker compose logs frontend -f
```

Check for build errors or missing dependencies.

### Convex Connection Issues

```bash
# Test Convex connectivity from host
curl http://localhost:3210

# Or from Docker container
docker compose exec frontend curl http://host.docker.internal:3210
```

Should return Convex API response.

### Data Acquisition Service Not Responding

```bash
docker compose logs data-acquisition
docker compose exec data-acquisition curl http://localhost:8000/health
```

### Rebuild a Specific Service

```bash
docker compose build --no-cache frontend
docker compose up frontend -d
```

### Check All Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f data-acquisition
docker compose logs -f frontend
```

## 🐛 Troubleshooting

### Port Already in Use

If port 3000, 3210, 8000 are already in use:

**Option 1: Stop conflicting services**

```bash
# Find and kill processes
lsof -i :3000    # Find process on port 3000
lsof -i :3210    # Find process on port 3210
lsof -i :8000    # Find process on port 8000
kill -9 <PID>
```

**Option 2: Change ports in docker-compose.yml**

```yaml
# Example: change frontend from 3000 to 3001
frontend:
  ports:
    - "3001:3000"  # Maps localhost:3001 to container:3000
```

### Docker Compose Permission Denied

```bash
# Make sure Docker daemon is running
docker ps

# On Mac/Linux, may need to run with sudo
sudo docker compose up -d
```

### Out of Disk Space

```bash
# Clean up unused Docker resources
docker system prune -a
```

### Convex Import Fails

If `npm run import` fails:

1. Verify Convex is running: `curl http://localhost:3210`
2. Check Convex logs in the host terminal
3. Retry the import: `npm run import`

### Frontend Can't Reach Convex

If frontend shows connection errors:

1. Verify Convex is running on host
2. Check `.env` has correct Convex URL
3. Restart frontend: `docker compose restart frontend`

### Data Acquisition API Not Accessible

```bash
# Check if service is running
docker compose ps data-acquisition

# Check logs
docker compose logs data-acquisition --tail=50

# Restart service
docker compose restart data-acquisition
```

## 📝 Adding New Mock Data

### Add Sample Patients

Edit `impfpass-app/frontend-next/samplePatients.jsonl`:

```jsonl
{"first_name":"John","last_name":"Doe","birth_date":"1990-01-15","created_at":"2024-03-01T10:00:00.000Z"}
```

Then re-import:

```bash
cd impfpass-app/frontend-next
npm run import
```

### Add Sample Vaccinations

Edit `impfpass-app/frontend-next/vaccinations.jsonl`:

```jsonl
{"id":21,"name":"NewVaccine","brand":"BrandName","diseases":["Disease1","Disease2"]}
```

Then restart frontend or manually import.

## 🚀 Development Workflow

### First Time Setup

```bash
# 1. Terminal 1: Start Convex
cd impfpass-app/frontend-next
npm install
npm run convex-dev

# 2. Terminal 2: Start Docker services
docker compose up --build -d

# 3. Terminal 3: Import mock data
docker compose exec frontend npm run import
# OR
cd impfpass-app/frontend-next
npm run import

# 4. Access the app
# Frontend: http://localhost:3000
# Convex Dashboard: http://localhost:3211
# Data API: http://localhost:8000
```

### Daily Development

```bash
# Terminal 1: Check/start Convex
cd impfpass-app/frontend-next
npm run convex-dev

# Terminal 2: Ensure Docker services are running
docker compose up -d

# Access app at http://localhost:3000
```

### Making Frontend Changes

- Changes to `frontend` code automatically reload thanks to Next.js dev server
- Hot Module Replacement (HMR) enabled
- Just save files and refresh browser if needed

### Making Backend Changes

- Changes in `impfpass-app/frontend-next/convex/` are reflected in Convex automatically
- Check Convex terminal for deployment confirmations

### Making Data Acquisition Changes

```bash
# Rebuild and restart the service
docker compose build --no-cache data-acquisition
docker compose up data-acquisition -d
```

## 📚 Further Reading

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment/docker)
- [Convex Documentation](https://docs.convex.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## 🤝 Contributing

When making changes:

1. Test locally with Docker Compose
2. Ensure services communicate correctly
3. Verify mock data imports
4. Check all logs for errors

```bash
docker compose logs -f --tail=50
```

## ✅ Checklist for Startup

- [ ] Navigate to `digitaler_impfpass` directory
- [ ] Terminal 1: Run `cd impfpass-app/frontend-next && npm run convex-dev` (wait for "Convex functions ready!")
- [ ] Terminal 2: Run `docker compose up -d` (wait for all services to start)
- [ ] Optional: Terminal 2: Run `docker compose exec frontend npm run import` (to load mock data)
- [ ] Open browser to `http://localhost:3000`
- [ ] Verify all three services are running: `docker compose ps`
- [ ] Check Convex dashboard: `http://localhost:3211`
- [ ] Test data API: `curl http://localhost:8000`
