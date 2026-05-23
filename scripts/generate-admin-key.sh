#!/usr/bin/env bash
# Runs inside the convex-keygen container (same image as convex-backend, WORKDIR=/convex).
# Derives the admin key and writes only the key line to the shared secrets volume.
set -eo pipefail

./generate_admin_key.sh | tail -n 1 > /secrets/admin_key
echo "Admin key written to /secrets/admin_key."
