# 🚀 Digitaler Impfpass - Containerized Application

Complete Docker Compose setup for the Digital Vaccination Passport application with Convex backend, Next.js frontend, and LLM-based data extraction service.

## 📦 Quick Start (One Command)

```bash
# Make the startup script executable (first time only)
chmod +x start.sh

# Run the startup script
./start.sh
```

The script will automatically:
1. Start Convex backend (in a new terminal)
2. Start Docker Compose services
3. Display access URLs

## 🏗️ Application Architecture

```
┌─────────────────────────────────────────────────────┐
│              Your Host Machine                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Convex Backend (npm run convex-dev)          │  │
│  │  Ports: 3210 (API), 3211 (Dashboard)          │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         ↓                          ↓
┌─────────────────────────────────────────────────────┐
│           Docker Compose Network                    │
│  ┌──────────────────────┐   ┌──────────────────┐   │
│  │  Frontend            │   │  Data Acquisition│   │
│  │  (Next.js)           │   │  (FastAPI/LLM)   │   │
│  │  Port: 3000          │   │  Port: 8000      │   │
│  │  Hot reload ready    │   │  LLAMA_CPP ready │   │
│  └──────────────────────┘   └──────────────────┘   │
│  http://localhost:3000   http://localhost:8000     │
└─────────────────────────────────────────────────────┘
```

## 🎯 What's Running

| Service | Type | Port | Status | Command |
|---------|------|------|--------|---------|
| **Convex Backend** | Backend | 3210/3211 | Host | `npm run convex-dev` |
| **Next.js Frontend** | Docker | 3000 | Running | `npm run dev` |
| **Data Acquisition** | Docker | 8000 | Running | FastAPI + Gemma LLM |

## 📋 Prerequisites

- ✅ Docker Desktop (with Compose)
- ✅ Node.js 20+
- ✅ npm
- ✅ macOS/Linux/Windows with WSL2

## 🚀 Starting the Application

### Method 1: Automated (Recommended)

```bash
cd /path/to/digitaler_impfpass
./start.sh
```

### Method 2: Manual Setup

**Terminal 1 - Start Convex Backend:**
```bash
cd impfpass-app/frontend-next
npm install
npm run convex-dev
# Wait for "✔ Convex functions ready!"
```

**Terminal 2 - Start Docker Services:**
```bash
# From root directory
docker compose up -d

# Check status
docker compose ps
```

**Terminal 3 - Import Mock Data (Optional):**
```bash
./import-data.sh
# OR
docker compose exec frontend npm run import
```

## 🌐 Access Points

Once running, access your application at:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Convex Dashboard**: [http://localhost:3211](http://localhost:3211)
- **Data Extraction API**: [http://localhost:8000](http://localhost:8000)

## 📊 Available Mock Data

### Sample Patients (12 records)
- Location: `impfpass-app/frontend-next/samplePatients.jsonl`
- Includes: Names, birth dates, creation timestamps
- Import: `npm run import`

### Sample Vaccines (20+ records)
- Location: `impfpass-app/frontend-next/vaccinations.jsonl`
- Includes: Vaccine names, brands, diseases, IDs
- Import: `npm run import`

## 🛑 Stopping the Application

### Stop Everything

```bash
# Stop Docker services
docker compose down

# Stop Convex (in its terminal)
# Press Ctrl+C
```

### Stop and Clean Up

```bash
# Remove containers and volumes
docker compose down -v

# Remove all unused Docker resources
docker system prune -a
```

## 📝 Helper Scripts

### `./start.sh`
Complete automated startup script that handles:
- Checking Docker daemon
- Checking Node.js installation
- Starting Convex backend
- Starting Docker services
- Displaying status and access URLs

```bash
./start.sh
```

### `./start-convex.sh`
Start only the Convex backend on your host machine.

```bash
./start-convex.sh
```

### `./import-data.sh`
Import mock patient and vaccination data into Convex.

```bash
./import-data.sh
```

## 🔧 Configuration

### Environment Variables

File: `.env` (root directory)

```bash
# LLM Configuration
LLAMA_CPP_BASE_URL=http://rcbe-srv-012.hs-regensburg.de:49068

# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=http://convex:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://localhost:3211

# Data Acquisition API
DATA_ACQUISITION_API=http://data-acquisition:8000
```

**To use a different LLM**, edit `.env`:

```bash
LLAMA_CPP_BASE_URL=http://your-llm-server:port
```

## 🔗 Service Details

### Frontend (Next.js on Docker)
- **Port**: 3000
- **Features**:
  - Hot reload enabled (changes reflect immediately)
  - Patient management dashboard
  - Vaccination tracking
  - Document upload
  - QR code generation
- **Commands**:
  - View logs: `docker compose logs -f frontend`
  - Restart: `docker compose restart frontend`
  - Rebuild: `docker compose build --no-cache frontend`

### Data Acquisition (FastAPI on Docker)
- **Port**: 8000
- **Features**:
  - Image text extraction using LLM
  - Vaccine data recognition
  - Bounding box detection
- **Configuration**:
  - Uses `LLAMA_CPP_BASE_URL` from `.env`
  - Vaccination database: `vaccines.json`
- **Commands**:
  - View logs: `docker compose logs -f data-acquisition`
  - Restart: `docker compose restart data-acquisition`

### Convex Backend (Host)
- **Ports**: 3210 (API), 3211 (Dashboard)
- **Features**:
  - Real-time database
  - File storage
  - Function deployment
  - User authentication
- **Location**: `impfpass-app/frontend-next/`
- **Status**: Runs on host machine (not containerized)
- **Commands**:
  - Start: `npm run convex-dev`
  - Stop: Press `Ctrl+C`

## 📊 Data Management

### Importing Mock Data

```bash
# Via script
./import-data.sh

# Via Docker
docker compose exec frontend npm run import

# Via host (if npm is installed)
cd impfpass-app/frontend-next
npm run import
```

### Adding Custom Patient Data

Edit `impfpass-app/frontend-next/samplePatients.jsonl`:

```jsonl
{"first_name":"John","last_name":"Doe","birth_date":"1990-01-15","created_at":"2024-03-01T10:00:00.000Z"}
```

Then re-import:
```bash
./import-data.sh
```

### Adding Custom Vaccines

Edit `impfpass-app/frontend-next/vaccinations.jsonl`:

```jsonl
{"id":21,"name":"Custom Vaccine","brand":"BrandName","diseases":["Disease1"]}
```

Then restart the frontend to reimport.

## 🔍 Debugging

### Check Service Status

```bash
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f data-acquisition
```

### Test Frontend Connectivity

```bash
# Open in browser
open http://localhost:3000

# Or test with curl
curl -I http://localhost:3000
```

### Test Data Acquisition Service

```bash
# Test if service is responding
curl http://localhost:8000
```

### Test Convex Backend

```bash
# Test from host
curl http://localhost:3210

# Test from Docker container
docker compose exec frontend curl http://host.docker.internal:3210
```

## 🐛 Common Issues & Solutions

### "Port 3000 already in use"

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
# Change "3000:3000" to "3001:3000"
```

### "Convex backend isn't running"

Ensure you started Convex in a separate terminal:
```bash
cd impfpass-app/frontend-next
npm run convex-dev
```

Wait until you see: ✔ Convex functions ready!

### "Docker daemon is not running"

Start Docker Desktop or the Docker daemon:
- **macOS**: Open Docker Desktop application
- **Linux**: `sudo systemctl start docker`

### "Module not found" or npm errors

Rebuild the containers:
```bash
docker compose build --no-cache
docker compose up -d
```

### "Permission denied" for startup scripts

Make scripts executable:
```bash
chmod +x start.sh start-convex.sh import-data.sh
```

## 📚 Development Workflow

### Daily Development

1. **Terminal 1**: Start Convex
   ```bash
   cd impfpass-app/frontend-next
   npm run convex-dev
   ```

2. **Terminal 2**: Start Docker services
   ```bash
   docker compose up -d
   ```

3. **Open browser**: http://localhost:3000

### Making Changes

- **Frontend code**: Changes auto-reload via Hot Module Replacement
- **Backend functions**: Check Convex terminal for automatic deployment
- **LLM configuration**: Edit `.env` and restart data-acquisition service

### Deployment Considerations

For production deployment, additional steps are needed:
- Build optimized frontend: `npm run build`
- Configure Convex production deployment
- Set up proper LLM inference server
- Configure SSL/TLS certificates
- See `DOCKER_SETUP.md` for detailed deployment guide

## 📄 Files & Directories

```
digitaler_impfpass/
├── docker-compose.yml          # Docker Compose configuration
├── .env                        # Environment variables
├── .env.example               # Environment template
├── start.sh                   # Automated startup script
├── start-convex.sh           # Convex startup helper
├── import-data.sh            # Data import helper
├── DOCKER_SETUP.md           # Detailed setup documentation
├── README_DOCKER.md          # This file
├── impfpass-app/
│   └── frontend-next/
│       ├── Dockerfile        # Frontend Docker image
│       ├── .dockerignore    # Files to exclude from image
│       ├── package.json      # Dependencies
│       ├── convex/           # Backend functions
│       ├── samplePatients.jsonl
│       └── vaccinations.jsonl
└── data_acquisition/
    ├── Dockerfile           # Data acquisition image
    ├── requirements-web.txt # Python dependencies
    ├── gemma_bbox_web.py   # FastAPI server
    └── vaccines.json        # Vaccination database
```

## 🤝 Contributing

When developing:

1. Make changes in your editor
2. Watch Docker logs for any errors: `docker compose logs -f`
3. Frontend will auto-reload for code changes
4. Test in browser: http://localhost:3000
5. Check Convex dashboard for any issues: http://localhost:3211

## 📖 Additional Resources

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Next.js Docs](https://nextjs.org/docs)
- [Convex Docs](https://docs.convex.dev/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- See `DOCKER_SETUP.md` for detailed technical documentation

## ✅ Startup Checklist

- [ ] Docker Desktop is running
- [ ] Node.js 20+ is installed
- [ ] You're in the `digitaler_impfpass` directory
- [ ] Run `./start.sh` or manually start Convex and Docker services
- [ ] Wait for all services to be ready
- [ ] Open http://localhost:3000 in browser
- [ ] Verify Convex dashboard at http://localhost:3211
- [ ] (Optional) Import mock data with `./import-data.sh`
- [ ] Start developing!

---

**Happy Coding! 🎉**

For detailed troubleshooting and technical information, see [DOCKER_SETUP.md](DOCKER_SETUP.md).
