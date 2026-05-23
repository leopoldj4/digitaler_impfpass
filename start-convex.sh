#!/bin/bash

# Convex Backend Startup Script
# Starts only the Convex backend on the host

cd "$(dirname "$0")/impfpass-app/frontend-next" || exit 1

echo "🚀 Starting Convex Backend"
echo "=========================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "📌 IMPORTANT: Keep this terminal open while developing!"
echo ""
echo "Convex will be available at:"
echo "  API:       http://localhost:3210"
echo "  Dashboard: http://localhost:3211"
echo ""
echo "To stop Convex, press Ctrl+C"
echo ""

npm run convex-dev
