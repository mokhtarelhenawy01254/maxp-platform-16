#!/bin/bash
# ==============================================
# Activate AI Service in Production
# Run on the production server as root
# ==============================================
set -euo pipefail

AI_DIR="/opt/maxp-ai-service"
BE_ENV="/opt/maxp-platform/apps/backend/.env"

echo "=== Activating AI Service ==="

# 1. Verify AI service is running
echo "Checking AI service..."
curl -sf http://localhost:8000/health || {
    echo "AI service not running. Starting..."
    cd "$AI_DIR"
    docker compose -f docker-compose.prod.yml up -d
    sleep 5
}

# 2. Health check
HEALTH=$(curl -sf http://localhost:8000/health)
echo "Health: $HEALTH"

# 3. Ready check
READY=$(curl -sf http://localhost:8000/ready)
echo "Ready: $READY"

# 4. Check backend config
if [ -f "$BE_ENV" ]; then
    echo "Backend config:"
    grep "AI_SERVICE" "$BE_ENV" || echo "  AI_SERVICE vars not set!"
fi

echo ""
echo "=== To activate, update backend .env and restart PM2 ==="
echo "  echo 'AI_SERVICE_MODE=pilot' >> $BE_ENV"
echo "  echo 'AI_SERVICE_URL=http://localhost:8000' >> $BE_ENV"
echo "  pm2 restart maxp-backend"
echo ""
echo "Done."
