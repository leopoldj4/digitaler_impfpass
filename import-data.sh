#!/bin/bash

# Import Mock Data Script
# Imports sample patients and vaccines into the self-hosted Convex backend.
# Requires the stack to be running (docker compose up -d).

set -e

echo "Importing mock data into Convex..."

# Ensure convex-keygen has run so the admin key is available in the shared volume.
if ! docker compose ps convex-backend 2>/dev/null | grep -q "healthy"; then
    echo "Error: convex-backend is not healthy. Run 'docker compose up -d' first."
    exit 1
fi

docker compose run --rm \
  -e CONVEX_SELF_HOSTED_URL=http://convex-backend:3210 \
  convex-functions \
  sh -c '
    npm ci --silent &&
    export CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat /secrets/admin_key) &&
    echo "Importing patients..." &&
    npx convex import --table patients samplePatients.jsonl --yes &&
    echo "Importing vaccines..." &&
    npx convex import --table vaccines vaccinations.jsonl --yes &&
    echo "Import complete."
  '
