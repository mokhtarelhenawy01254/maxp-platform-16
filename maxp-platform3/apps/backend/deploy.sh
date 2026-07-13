#!/bin/bash

# Configuration
BACKEND_DIR="/var/www/backend2"
APP_NAME="maxp-backend"

read_env_port() {
    local env_file="$1"
    local port_line=""
    local port_value=""
    if [ ! -f "$env_file" ]; then
        return 1
    fi

    port_line="$(grep -E '^PORT=' "$env_file" | tail -n 1 || true)"
    if [ -z "$port_line" ]; then
        return 1
    fi

    port_value="${port_line#PORT=}"
    port_value="${port_value%\"}"
    port_value="${port_value#\"}"
    port_value="${port_value%\'}"
    port_value="${port_value#\'}"
    printf '%s\n' "$port_value"
}

resolve_health_port() {
    local health_port=""
    local env_file=""

    for env_file in "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"; do
        health_port="$(read_env_port "$env_file" || true)"
        if [ -n "$health_port" ]; then
            echo "$health_port"
            return 0
        fi
    done

    echo "3008"
}

echo "🚀 Starting Deployment for $APP_NAME..."

# 1. Enter directory
cd $BACKEND_DIR || { echo "❌ Directory $BACKEND_DIR not found"; exit 1; }

# 2. Pull latest changes
echo "📥 Pulling latest changes from Git..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install || { echo "❌ NPM install failed"; exit 1; }

# 3.5. Ensure runtime directories exist before PM2 opens log files
mkdir -p logs

# 4. Generate Prisma Client
echo "💎 Generating Prisma Client..."
npm run schema:generate || { echo "❌ Prisma generation failed"; exit 1; }

# 5. Restart application via PM2
echo "🔄 Restarting application..."
if [ -f "ecosystem.config.js" ]; then
    pm2 startOrRestart ecosystem.config.js --env production
else
    pm2 restart $APP_NAME
fi
pm2 save || true

# 6. Verify health
echo "🏥 Performing health check..."
sleep 5
HEALTH_PORT="$(resolve_health_port)"
echo "ℹ️ Using health check port: $HEALTH_PORT"
if curl -fsS --max-time 20 "http://127.0.0.1:${HEALTH_PORT}/api/v1/health" > /dev/null; then
    echo "✅ Deployment Successful!"
else
    echo "⚠️ Warning: Health check failed or endpoint not found on port ${HEALTH_PORT}."
fi

pm2 status $APP_NAME
echo "✨ Build and Deploy Complete!"
