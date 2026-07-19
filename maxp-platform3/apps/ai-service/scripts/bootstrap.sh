#!/usr/bin/env bash
###############################################################################
# maxp-ai-service :: One-shot server bootstrap
# Run this ONCE on a fresh server (or to re-provision).
#
# Idempotent — safe to re-run.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/elhenawym124-ops/maxp-ai-service/main/scripts/bootstrap.sh | sudo bash
#
# Or clone & run locally:
#   git clone https://github.com/elhenawym124-ops/maxp-ai-service.git /opt/maxp-ai-service
#   cd /opt/maxp-ai-service
#   sudo bash scripts/bootstrap.sh
###############################################################################
set -euo pipefail

# ---------------------------------------------------------------------------
# Config — override via env vars
# ---------------------------------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/elhenawym124-ops/maxp-ai-service.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/maxp-ai-service}"
DOMAIN="${DOMAIN:-ai.maxp-ai.pro}"
BACKEND_PORT="${BACKEND_PORT:-3007}"
AI_PORT="${AI_PORT:-8000}"
DB_NAME="${DB_NAME:-maxp_ai}"
DB_USER="${DB_USER:-ai_service}"
DB_SCHEMA="${DB_SCHEMA:-ai}"
MAXP_API_BASE_URL="${MAXP_API_BASE_URL:-https://maxp.online}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
B="\033[1;36m"; G="\033[1;32m"; Y="\033[1;33m"; R="\033[1;31m"; N="\033[0m"
log() { printf "\n${B}▶ %s${N}\n" "$*"; }
ok()  { printf "${G}✓ %s${N}\n" "$*"; }
warn(){ printf "${Y}⚠ %s${N}\n" "$*"; }
die() { printf "${R}✗ %s${N}\n" "$*" >&2; exit 1; }
require_root() { [ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash $0"; }

detect_os() {
    . /etc/os-release
    case "${ID}-${VERSION_ID}" in
        ubuntu-22.*|ubuntu-24.*|debian-1*|debian-1[2-9]*) echo "debian" ;;
        *) die "Unsupported OS: ${ID} ${VERSION_ID}. This script targets Ubuntu 22.04/24.04." ;;
    esac
}

# ---------------------------------------------------------------------------
# 1. OS detection + base packages
# ---------------------------------------------------------------------------
require_root
OS=$(detect_os)
log "Detected OS: ${OS}"

log "Installing base packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >/dev/null
apt-get install -y --no-install-recommends \
    ca-certificates curl git gnupg lsb-release \
    apt-transport-https debian-keyring debian-archive-keyring \
    postgresql-client openssl jq
ok "Base packages installed"

# ---------------------------------------------------------------------------
# 2. Docker
# ---------------------------------------------------------------------------
log "Checking Docker..."
if ! command -v docker >/dev/null 2>&1; then
    warn "Docker not found — installing..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -y >/dev/null
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
fi
ok "Docker: $(docker --version)"

# ---------------------------------------------------------------------------
# 3. Database (maxp_ai on local Postgres)
# ---------------------------------------------------------------------------
log "Checking database '${DB_NAME}'..."
if ! command -v psql >/dev/null 2>&1; then
    apt-get install -y postgresql-client >/dev/null
fi

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || echo "")
if [ -z "${DB_EXISTS}" ]; then
    warn "Database '${DB_NAME}' missing — creating..."
    if [ -z "${MAXP_AI_DB_PASSWORD:-}" ]; then
        read -r -s -p "Password for new Postgres user '${DB_USER}': " MAXP_AI_DB_PASSWORD
        echo
    fi
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${MAXP_AI_DB_PASSWORD}';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
    sudo -u postgres psql -d "${DB_NAME}" -c "CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA};"
    sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA ${DB_SCHEMA} TO ${DB_USER};"
    sudo -u postgres psql -d "${DB_NAME}" -c "ALTER USER ${DB_USER} SET search_path TO ${DB_SCHEMA}, public;"
    ok "Database '${DB_NAME}' created with schema '${DB_SCHEMA}'"
else
    ok "Database '${DB_NAME}' already exists"
    sudo -u postgres psql -d "${DB_NAME}" -c "CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA};" >/dev/null 2>&1 || true
    sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA ${DB_SCHEMA} TO ${DB_USER};" >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
# 4. Clone / pull the repo
# ---------------------------------------------------------------------------
log "Cloning repo..."
if [ -d "${APP_DIR}/.git" ]; then
    (cd "${APP_DIR}" && git fetch origin && git reset --hard "origin/${BRANCH}")
    ok "Repo updated to ${BRANCH}"
else
    git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
    ok "Repo cloned to ${APP_DIR}"
fi

# ---------------------------------------------------------------------------
# 5. Build .env (idempotent — never overwrite without --force-env)
# ---------------------------------------------------------------------------
log "Configuring .env..."
if [ -f "${APP_DIR}/.env" ] && [ "${1:-}" != "--force-env" ]; then
    ok ".env exists — keeping it (use --force-env to regenerate)"
else
    if [ -z "${MAXP_AI_DB_PASSWORD:-}" ]; then
        # Try to recover from existing deploy
        if [ -f "${APP_DIR}/.env" ]; then
            MAXP_AI_DB_PASSWORD=$(grep -oP 'postgresql\+asyncpg://[^:]+:\K[^@]+' "${APP_DIR}/.env" | head -1 || echo "")
        fi
        if [ -z "${MAXP_AI_DB_PASSWORD}" ]; then
            read -r -s -p "Password for Postgres user '${DB_USER}': " MAXP_AI_DB_PASSWORD
            echo
        fi
    fi

    SECRET_TOKEN=$(openssl rand -hex 32)

    cat > "${APP_DIR}/.env" <<EOF
# Generated by bootstrap.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
ENVIRONMENT=production
LOG_LEVEL=INFO

# --- Database ---
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${MAXP_AI_DB_PASSWORD}@localhost:5432/${DB_NAME}

# --- LLM providers ---
DEFAULT_LLM_PROVIDER=google
DEFAULT_MODEL=gemma-4-31b-it
GOOGLE_API_KEY=${GOOGLE_API_KEY:-}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
CLAUDE_MODEL=claude-sonnet-4-5

# --- MaxP backend bridge ---
MAXP_API_BASE_URL=${MAXP_API_BASE_URL}
MAXP_SERVICE_TOKEN=${SECRET_TOKEN}
SERVICE_AUTH_TOKEN=${SECRET_TOKEN}

# --- CORS ---
CORS_ORIGINS=["https://maxp.online","https://www.maxp.online","https://${DOMAIN}"]

# --- Rate limit / concurrency ---
RATE_LIMIT_PER_MINUTE=60
THREAD_CONCURRENCY_TIMEOUT_SECONDS=30

# --- Cost caps (USD / day / company) ---
COST_SOFT_LIMIT=5
COST_HARD_LIMIT=20

# --- Observability (optional) ---
SENTRY_DSN=
OTLP_ENDPOINT=
EOF
    chmod 600 "${APP_DIR}/.env"
    ok ".env created"
    warn "Edit API keys: nano ${APP_DIR}/.env"
    warn "Set: GOOGLE_API_KEY=...  ANTHROPIC_API_KEY=..."
fi

# ---------------------------------------------------------------------------
# 6. Run migrations
# ---------------------------------------------------------------------------
log "Running Alembic migrations..."
(cd "${APP_DIR}" && docker compose -f docker-compose.prod.yml run --rm ai alembic upgrade head)
ok "Migrations applied"

# ---------------------------------------------------------------------------
# 7. Start the stack
# ---------------------------------------------------------------------------
log "Starting maxp-ai-service..."
(cd "${APP_DIR}" && docker compose -f docker-compose.prod.yml up -d --build)
ok "Container started"

# ---------------------------------------------------------------------------
# 8. Patch MaxP backend .env (idempotent)
# ---------------------------------------------------------------------------
BACKEND_ENV="/var/www/backend2/.env"
if [ -f "${BACKEND_ENV}" ]; then
    log "Patching MaxP backend .env..."
    AI_TOKEN=$(grep '^SERVICE_AUTH_TOKEN=' "${APP_DIR}/.env" | cut -d= -f2)
    grep -q '^AI_SERVICE_URL=' "${BACKEND_ENV}" || \
        echo "AI_SERVICE_URL=https://${DOMAIN}" >> "${BACKEND_ENV}"
    grep -q '^MAXP_SERVICE_TOKEN=' "${BACKEND_ENV}" || \
        echo "MAXP_SERVICE_TOKEN=${AI_TOKEN}" >> "${BACKEND_ENV}"
    grep -q '^AI_SERVICE_ENABLED_COMPANIES=' "${BACKEND_ENV}" || \
        echo "AI_SERVICE_ENABLED_COMPANIES=*" >> "${BACKEND_ENV}"

    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart maxp-backend >/dev/null 2>&1 && ok "MaxP backend restarted" \
            || warn "pm2 restart failed — do it manually"
    fi
else
    warn "MaxP backend .env not found at ${BACKEND_ENV} — patch it manually"
fi

# ---------------------------------------------------------------------------
# 9. Verify
# ---------------------------------------------------------------------------
log "Verifying deployment..."
sleep 5
if curl -fsS "http://localhost:${AI_PORT}/health" 2>/dev/null | grep -q '"status"'; then
    ok "AI service /health responding locally on :${AI_PORT}"
else
    warn "Local health check failed — inspect: docker logs maxp-ai-service"
fi

if [ "${SKIP_REMOTE_CHECK:-0}" != "1" ]; then
    if curl -fsS "https://${DOMAIN}/health" --max-time 20 2>/dev/null | grep -q '"status"'; then
        ok "Public https://${DOMAIN}/health responding"
    else
        warn "Public health not ready yet — make sure nginx config is deployed"
    fi
fi

# ---------------------------------------------------------------------------
# 10. Print summary
# ---------------------------------------------------------------------------
SERVER_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "<unknown>")

cat <<EOF

${G}=========================================================================
✅ maxp-ai-service bootstrap complete
=========================================================================${N}

  Server IP:    ${SERVER_IP}
  Domain:       https://${DOMAIN}
  App dir:      ${APP_DIR}
  Container:    maxp-ai-service
  Postgres DB:  ${DB_NAME} (schema: ${DB_SCHEMA})
  Port:         ${AI_PORT}

  ${B}Next steps:${N}
  1. Make sure nginx is reloaded with the new config:
       sudo cp ${APP_DIR}/scripts/nginx-ai.conf /etc/nginx/sites-available/maxp-ai.pro.conf
       sudo nginx -t && sudo systemctl reload nginx
     (Or trigger the existing deploy.yml workflow in max_p_new)

  2. Verify public endpoint:
       curl https://${DOMAIN}/health

  3. Inspect logs anytime:
       cd ${APP_DIR} && docker compose -f docker-compose.prod.yml logs -f

  4. Update API keys (if not yet):
       nano ${APP_DIR}/.env
       cd ${APP_DIR} && docker compose -f docker-compose.prod.yml restart
EOF
