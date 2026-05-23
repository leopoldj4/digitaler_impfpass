#!/bin/bash

# Import Mock Data Script
# Imports sample patients and vaccines into Convex

echo "📥 Importing Mock Data"
echo "====================="
echo ""

# Check if Convex is running
if ! nc -z 127.0.0.1 3210 2>/dev/null; then
    echo "❌ Convex backend is not running on port 3210"
    echo ""
    echo "Please start Convex first:"
    echo "  npm run convex-dev"
    echo ""
    exit 1
fi

# Check if docker compose services are running
if ! docker compose ps frontend 2>/dev/null | grep -q "Up"; then
    echo "ℹ Frontend container not running, attempting to start..."
    docker compose up frontend -d
    sleep 5
fi

echo "🔄 Importing patients and vaccines..."
echo ""

# Import via docker compose
docker compose exec -T frontend npm run import

echo ""
echo "✅ Import complete!"
echo ""
echo "You can now access the application at:"
echo "  🌐 http://localhost:3000"
