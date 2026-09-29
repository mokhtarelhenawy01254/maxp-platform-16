#!/bin/bash
# ============================================================
# server-deploy.sh  –  runs ON the server, triggered by webhook
# ============================================================
set -euo pipefail

LOG=/var/log/maxp-deploy.log
exec >> "$LOG" 2>&1

echo ""
echo "======================================================="
echo " 🚀 Deploy started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "======================================================="

REPO_DIR=/opt/maxp-repo
FRONTEND_DIST=/var/www/frontend2/dist
BACKEND_DIR=/var/www/backend2
SHARED_DIR=/var/www/shared
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REPO_URL="https://${GITHUB_TOKEN}@github.com/mokhtar-el7/maxp-platform-13.git"
NODE_BIN=/root/.nvm/versions/node/v20.19.5/bin
PM2_BIN="$NODE_BIN/pm2"
export PATH="$NODE_BIN:$PATH"

# ── 1. Pull latest code ──────────────────────────────────────
echo "📥 Pulling latest code..."
if [ ! -d "$REPO_DIR/.git" ]; then
  git clone --depth=1 "$REPO_URL" "$REPO_DIR"
else
  cd "$REPO_DIR"
  git remote set-url origin "$REPO_URL"
  git fetch --depth=1 origin main
  git reset --hard origin/main
fi
cd "$REPO_DIR"
echo "✅ Code updated to: $(git rev-parse --short HEAD)"

# ── 2. Build Frontend ────────────────────────────────────────
echo "🔨 Building frontend..."
cd "$REPO_DIR/apps/frontend"
npm ci --prefer-offline 2>/dev/null || npm install
NODE_OPTIONS='--max-old-space-size=2048' npm run build
echo "✅ Frontend built"

# ── 3. Sync frontend dist ────────────────────────────────────
echo "📂 Syncing frontend..."
sudo mkdir -p "$FRONTEND_DIST"
sudo rsync -a "$REPO_DIR/apps/frontend/dist/" "$FRONTEND_DIST/"
# Clean up stale hashed assets older than 7 days.
# Without this grace window, cached index.html in user browsers
# would request old hashed chunks that --delete removes mid-flight.
sudo find "$FRONTEND_DIST/assets" -type f -mtime +7 -delete 2>/dev/null || true
sudo chown -R "$(whoami):$(whoami)" "$FRONTEND_DIST"
echo "✅ Frontend synced"

# ── 4. Sync backend ──────────────────────────────────────────
echo "📦 Syncing backend..."
sudo mkdir -p "$BACKEND_DIR"

# Preserve uploads and .env
[ -d "$BACKEND_DIR/uploads" ] && sudo cp -r "$BACKEND_DIR/uploads" /tmp/maxp_uploads_bak || true
[ -f "$BACKEND_DIR/.env" ]    && sudo cp "$BACKEND_DIR/.env" /tmp/maxp_env_bak.env       || true

sudo rsync -a --delete \
  --exclude uploads \
  --exclude logs \
  --exclude .env \
  --exclude node_modules \
  "$REPO_DIR/apps/backend/" "$BACKEND_DIR/"

# Restore preserved files (rsync merge, never rm+mv to avoid data loss)
[ -d /tmp/maxp_uploads_bak ] && sudo rsync -a /tmp/maxp_uploads_bak/ "$BACKEND_DIR/uploads/" && sudo rm -rf /tmp/maxp_uploads_bak || true
if [ -f "$BACKEND_DIR/.env.production" ]; then
  sudo cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
elif [ -f /tmp/maxp_env_bak.env ]; then
  sudo cp /tmp/maxp_env_bak.env "$BACKEND_DIR/.env"
fi

sudo chown -R "$(whoami):$(whoami)" "$BACKEND_DIR"

# ── 5. Install backend deps ──────────────────────────────────
echo "📦 Installing backend dependencies..."
cd "$BACKEND_DIR"
PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
  npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# ── 6. Prisma generate & db push ────────────────────────────
echo "🔄 Prisma generate..."
sudo rm -f "$BACKEND_DIR/prisma/schema.prisma" 2>/dev/null || true
PRISMA="$BACKEND_DIR/node_modules/.bin/prisma"
"$PRISMA" generate --schema=prisma/schema
rm -rf node_modules/.prisma/client
mkdir -p node_modules/.prisma
cp -a prisma/generated/postgresql_v2 node_modules/.prisma/client

echo "🔄 Prisma db push..."
"$PRISMA" db push --schema=prisma/schema --skip-generate --accept-data-loss

# ── 7. Sync shared ───────────────────────────────────────────
if [ -d "$REPO_DIR/shared" ]; then
  echo "📂 Syncing shared..."
  sudo rsync -a --delete "$REPO_DIR/shared/" "$SHARED_DIR/"
fi

# ── 8. Restart services ──────────────────────────────────────
echo "🔄 Restarting PM2..."
cd "$BACKEND_DIR"
NODE_ENV=production "$PM2_BIN" startOrReload ecosystem.config.js --env production
"$PM2_BIN" save

sleep 3

# ── 9. Health check ──────────────────────────────────────────
echo "🩺 Health check..."
for attempt in $(seq 1 20); do
  if curl -fsS --max-time 10 "http://127.0.0.1:3007/api/v1/health" > /dev/null 2>&1 || \
     curl -fsS --max-time 10 "http://127.0.0.1:3008/api/v1/health" > /dev/null 2>&1; then
    echo "✅ Backend healthy!"
    break
  fi
  echo "⏳ Attempt $attempt/20 – waiting..."
  sleep 5
done

echo ""
echo "======================================================="
echo " ✅ Deploy finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "======================================================="
