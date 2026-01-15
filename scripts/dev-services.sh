#!/usr/bin/env bash
set -euo pipefail

docker compose up -d

echo ""
echo "Core services running:"
echo "- Web Portal: http://localhost:5173"
echo "- Keycloak Admin: http://localhost:8080"
echo "- Cashier API: http://localhost:3002 (dev only)"
echo "- Portal BFF: http://localhost:3003"
