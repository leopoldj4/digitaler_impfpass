#!/bin/sh
# Runs inside the convex-functions container on every `docker compose up`.
# Deploys Convex TypeScript functions to the self-hosted backend and sets
# the runtime environment variable that actions need to reach data-acquisition.
set -e

cd /app

if [ -z "$CONVEX_SELF_HOSTED_URL" ]; then
  echo "ERROR: CONVEX_SELF_HOSTED_URL is not set." >&2
  exit 1
fi

ADMIN_KEY_FILE=/secrets/admin_key
if [ ! -f "$ADMIN_KEY_FILE" ] || [ ! -s "$ADMIN_KEY_FILE" ]; then
  echo "ERROR: Admin key file $ADMIN_KEY_FILE is missing or empty." >&2
  echo "The convex-keygen container must complete successfully first." >&2
  exit 1
fi

CONVEX_SELF_HOSTED_ADMIN_KEY=$(cat "$ADMIN_KEY_FILE")
export CONVEX_SELF_HOSTED_ADMIN_KEY

echo "Installing dependencies..."
npm ci

echo "Deploying Convex functions to $CONVEX_SELF_HOSTED_URL ..."
npx convex deploy --typecheck disable

echo "Setting EXTRACTOR_BASE_URL -> http://data-acquisition:8000 ..."
npx convex env set EXTRACTOR_BASE_URL http://data-acquisition:8000

echo "Importing vaccine catalog (vaccinations.jsonl -> vaccines table) ..."
npx convex import --table vaccines vaccinations.jsonl --replace --yes

echo "Checking whether patients table is empty ..."
EXISTING_PATIENTS=$(npx convex run patients:list '{"search":null}')
if [ "$EXISTING_PATIENTS" = "[]" ]; then
  echo "No patients found — importing sample patients ..."
  npx convex import --table patients samplePatients.jsonl --yes
else
  echo "Patients already present — skipping sample import."
fi

echo "Convex functions deployed successfully."
