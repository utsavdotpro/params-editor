#!/usr/bin/env bash
set -euo pipefail

docker compose up -d extension-dev pocketbase

echo "Services started:"
docker compose ps
