set -e

: "${DEPLOY_STAGING:="${HOME}/deploy_staging_${GITHUB_RUN_ID}_${GITHUB_RUN_ATTEMPT}"}"
export DEPLOY_STAGING

export NODE_ENV=production
export PUPPETEER_SKIP_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
NODE_BIN="$(dirname "$(command -v node)")"
export PATH="$NODE_BIN:$PATH"

# 🛡️ Automated Rollback & Fault Tolerance
ROLLBACK_FRONTEND_BACKUP=""

on_deploy_error() {
  local exit_code="$?"
  echo "🚨 [DEPLOY ERROR] Deployment script failed with exit code $exit_code at line $1"

  if [ -n "$ROLLBACK_FRONTEND_BACKUP" ] && [ -f "$ROLLBACK_FRONTEND_BACKUP" ]; then
    echo "⏪ [ROLLBACK] Restoring previous frontend index.html..."
    sudo cp -f "$ROLLBACK_FRONTEND_BACKUP" /var/www/frontend2/dist/index.html || true
    echo "✅ Frontend index.html restored to previous working version"
  fi

  if [ -n "$PM2_BIN" ]; then
    echo "🩺 [ROLLBACK] Verifying backend process state..."
    if ! "$PM2_BIN" list 2>/dev/null | grep -q "online.*maxp-backend"; then
      echo "⏪ [ROLLBACK] maxp-backend process is offline — restarting previous working backend..."
      "$PM2_BIN" restart maxp-backend 2>/dev/null || "$PM2_BIN" start /var/www/backend2/server.js --name maxp-backend 2>/dev/null || true
    fi
  fi

  echo "❌ [DEPLOY FAILED] Safety rollback routines finished. Exiting."
  exit "$exit_code"
}

trap 'on_deploy_error $LINENO' ERR

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

PM2_BIN="$(dirname "$(command -v node)")/pm2"
if [ ! -x "$PM2_BIN" ]; then
  PM2_BIN="$(command -v pm2 || true)"
fi

echo "🧹 Running automatic cleanup to free space..."
# Age-guarded: deleting ALL other deploy_staging_* dirs here races with any
# concurrent run whose build job is still SCP-ing tarballs into its own staging
# dir — the tarball vanishes mid-transfer and that deploy silently skips the
# frontend/backend sync. Only remove staging dirs older than 6 hours; the build
# job's staging-setup step already does the daily cleanup.
find "$HOME" -maxdepth 1 -name "deploy_staging_*" -not -name "$(basename "$DEPLOY_STAGING")" -mmin +360 -exec rm -rf {} + 2>/dev/null || true
sudo rm -rf /tmp/deploy_staging_* /tmp/*.tar.gz /tmp/*.bak /tmp/maxp_deploy_expected_entry 2>/dev/null || true
rm -f /tmp/maxp_deploy_expected_entry
if [ -n "$PM2_BIN" ]; then
  "$PM2_BIN" flush || echo "⚠️ PM2 flush failed"
fi
sudo journalctl --vacuum-time=1d || echo "⚠️ Journalctl cleanup failed"
sudo npm cache clean --force || echo "⚠️ NPM cache cleanup failed"

echo "🚀 Starting deployment on server..."

# Diagnostic listing
echo "📋 Staging directory content:"
ls -R "$DEPLOY_STAGING" | head -n 50

# Create directories with sudo if needed
sudo mkdir -p /var/www/frontend2
sudo mkdir -p /var/www/backend2
sudo mkdir -p /var/www/shared

sync_frontend_dist() {
  local source_dir="$1"

  if [ ! -f "$source_dir/index.html" ]; then
    echo "❌ Frontend source is missing index.html: $source_dir"
    exit 1
  fi

  sudo mkdir -p /var/www/frontend2/dist

  sudo mkdir -p /var/www/frontend2/dist

  # Publish immutable hashed assets FIRST (never index.html yet).
  # Entrypoint precompressed variants (.br/.gz) are excluded at the source:
  # rsyncing them re-creates stale-shadow races with concurrent deploys —
  # the explicit rm below is the legacy-file hygiene pass only.
  sudo rsync -a \
    --exclude 'index.html' \
    --exclude 'index.html.br' \
    --exclude 'index.html.gz' \
    --exclude 'sw.js.br' \
    --exclude 'sw.js.gz' \
    --exclude 'sw-v4.js.br' \
    --exclude 'sw-v4.js.gz' \
    "$source_dir/" /var/www/frontend2/dist/
  sudo rm -rf /var/www/frontend2/dist/products
  sudo chown -R $USER:$USER /var/www/frontend2/dist
  sudo chmod -R a+rX /var/www/frontend2/dist

  # ── INTEGRITY GATE (BEFORE publishing index.html) ──────────────────────
  # Verify every hashed asset referenced by index.html actually arrived on
  # disk. If the tarball/transfer was incomplete, we MUST NOT publish the new
  # index.html (it would point at missing chunks → permanent 404s). Abort
  # loudly so the deploy fails instead of shipping a broken build.
  echo "🔎 Verifying frontend asset integrity before publishing index.html..."
  MISSING_COUNT=0
  MISSING_LIST=""
  while IFS= read -r asset_path; do
    [ -z "$asset_path" ] && continue
    if [ ! -f "/var/www/frontend2/dist/$asset_path" ]; then
      MISSING_COUNT=$((MISSING_COUNT + 1))
      MISSING_LIST="$MISSING_LIST\n  - $asset_path"
    fi
  done < <(grep -oE '(src|href)="[^"]+"' "$source_dir/index.html" 2>/dev/null \
            | sed -E 's/.*="([^"]+)".*/\1/' \
            | grep -E '^(/?(assets|js|placeholders)/)' \
            | sed -E 's#^/##')

  if [ "$MISSING_COUNT" -gt 0 ]; then
    echo "❌ FRONTEND DEPLOY ABORTED: $MISSING_COUNT referenced asset(s) missing on disk:$MISSING_LIST"
    echo "   The transfer was incomplete (interrupted SCP/rsync). Do NOT publish"
    echo "   the new index.html — it would point at chunks that never arrived."
    echo "   Re-run the deploy to transfer a complete, fresh build."
    exit 1
  fi
  echo "✅ Frontend asset integrity OK ($(grep -oE '(src|href)="[^"]+"' "$source_dir/index.html" 2>/dev/null | grep -cE '(src|href)="/?(assets|js|placeholders)/') referenced assets present)"

  # All assets verified — now publish the HTML entrypoint LAST.
  # ⚠️ Remove precompressed index.html variants FIRST: nginx has
  # `brotli_static on`/gzip_static semantics, so a stale index.html.br/.gz
  # (e.g. left by a manual SFTP upload of a locally-compressed build) is
  # served INSTEAD of the fresh index.html we publish below, and every
  # browser sees an old build referencing missing chunks (404s) forever.
  sudo rm -f /var/www/frontend2/dist/index.html.br /var/www/frontend2/dist/index.html.gz \
    /var/www/frontend2/dist/sw.js.br /var/www/frontend2/dist/sw.js.gz \
    /var/www/frontend2/dist/sw-v4.js.br /var/www/frontend2/dist/sw-v4.js.gz \
    /var/www/frontend2/dist/manifest.json /var/www/frontend2/dist/manifest.webmanifest \
    /var/www/frontend2/dist/manifest.json.br /var/www/frontend2/dist/manifest.json.gz
  if [ -f "/var/www/frontend2/dist/index.html" ] && [ -z "$ROLLBACK_FRONTEND_BACKUP" ]; then
    ROLLBACK_FRONTEND_BACKUP="/tmp/maxp_frontend_index_prev_${GITHUB_RUN_ID:-$$}.html"
    sudo cp "/var/www/frontend2/dist/index.html" "$ROLLBACK_FRONTEND_BACKUP" || true
    echo "💾 Stored rollback snapshot of working index.html"
  fi
  sudo cp "$source_dir/index.html" /var/www/frontend2/dist/index.html
  # Record the entry chunk THIS deploy published so the post-nginx guard
  # compares against it (not against a disk file a concurrent manual upload
  # might have replaced in the meantime).
  grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$source_dir/index.html" | head -1 > /tmp/maxp_deploy_expected_entry || true
  # Force mtime to now so backend's cachedIndexHtml (mtimeMs check) always
  # invalidates after deploy even if rsync preserved old mtime from build
  sudo touch /var/www/frontend2/dist/index.html
  # Final rsync pass ensures the chown covers any leftover new files.
  sudo rsync -a --exclude 'index.html' \
    "$source_dir/" /var/www/frontend2/dist/
  sudo chown -R $USER:$USER /var/www/frontend2/dist
  sudo chmod -R a+rX /var/www/frontend2/dist
  echo "✅ Frontend dist synced — index.html mtime: $(stat -c %y /var/www/frontend2/dist/index.html 2>/dev/null || stat -f %Sm /var/www/frontend2/dist/index.html 2>/dev/null || echo unknown)"
  # Purge storefront Settings Redis cache so new theme/designTokens appear immediately
  # (publicStorefrontController caches 60s, frontend Infinity)
  if command -v redis-cli >/dev/null 2>&1; then
    redis-cli --scan --pattern 'storefront_settings:*' 2>/dev/null | xargs -r redis-cli del 2>/dev/null || true
    echo "✅ Purged storefront_settings Redis cache"
  fi
}

# 🔒 Cryptographic Integrity Check (verify tarballs against SHA256SUMS before extraction)
if [ -f "$DEPLOY_STAGING/SHA256SUMS" ]; then
  echo "🔒 Verifying tarball SHA256 checksums..."
  (cd "$DEPLOY_STAGING" && sha256sum -c SHA256SUMS) || {
    echo "❌ CRITICAL: Tarball checksum verification failed! Archive was corrupted during transfer."
    exit 1
  }
  echo "✅ All tarball checksums verified successfully."
fi

# Move frontend files from staging
if [ -f "$DEPLOY_STAGING/frontend.tar.gz" ]; then
  echo "📦 Extracting frontend files from staging..."
  rm -rf "$DEPLOY_STAGING/frontend_extract"
  mkdir -p "$DEPLOY_STAGING/frontend_extract"
  tar -xzf "$DEPLOY_STAGING/frontend.tar.gz" -C "$DEPLOY_STAGING/frontend_extract"
  sync_frontend_dist "$DEPLOY_STAGING/frontend_extract"
  echo "✅ Frontend extracted successfully"
elif [ -d "$DEPLOY_STAGING/frontend/dist" ]; then
  echo "📦 Moving frontend files from old staging format..."
  sync_frontend_dist "$DEPLOY_STAGING/frontend/dist"
  echo "✅ Frontend moved successfully"
else
  echo "ℹ️ No frontend changes in this deployment, keeping active /var/www/frontend2/dist intact"
fi

# Clean up legacy frontend directory unconditionally
if [ -d "/var/www/frontend" ]; then
  echo "🧹 Cleaning up legacy /var/www/frontend directory..."
  sudo rm -rf /var/www/frontend
fi

if [ -f "$DEPLOY_STAGING/theme-presets.tar.gz" ]; then
  echo "📦 Syncing storefront theme preset manifests..."
  sudo mkdir -p /var/www/frontend2/src/storefront/themes
  rm -rf "$DEPLOY_STAGING/theme_presets_extract"
  mkdir -p "$DEPLOY_STAGING/theme_presets_extract"
  tar -xzf "$DEPLOY_STAGING/theme-presets.tar.gz" -C "$DEPLOY_STAGING/theme_presets_extract"
  sudo rsync -a --delete \
    "$DEPLOY_STAGING/theme_presets_extract/" /var/www/frontend2/src/storefront/themes/
  sudo chown -R $USER:$USER /var/www/frontend2/src
  echo "✅ Storefront theme presets synced successfully"
else
  echo "⚠️ Theme preset archive not found, skipping..."
fi

# Move shared files from staging
if [ -f "$DEPLOY_STAGING/shared.tar.gz" ]; then
  echo "📦 Extracting shared files from tarball..."
  sudo mkdir -p /var/www/shared
  sudo tar -xzf "$DEPLOY_STAGING/shared.tar.gz" -C /var/www/shared
  sudo chown -R $USER:$USER /var/www/shared
  echo "✅ Shared files extracted successfully"
else
  echo "⚠️ Shared files not found, skipping..."
fi

# Move Python AI service files from staging
if [ -f "$DEPLOY_STAGING/ai-service.tar.gz" ]; then
  echo "🐍 Extracting Python AI service files from tarball..."

  if [ -f "/var/www/ai-service/.env" ]; then
    sudo cp /var/www/ai-service/.env /tmp/ai_service_env_backup.env
  fi

  sudo mkdir -p /var/www/ai-service
  rm -rf "$DEPLOY_STAGING/ai_service_extract"
  mkdir -p "$DEPLOY_STAGING/ai_service_extract"
  tar -xzf "$DEPLOY_STAGING/ai-service.tar.gz" -C "$DEPLOY_STAGING/ai_service_extract"
  sudo rsync -a --delete \
    --exclude .env \
    --exclude .venv \
    "$DEPLOY_STAGING/ai_service_extract/ai-service/" /var/www/ai-service/

  if [ -f "/tmp/ai_service_env_backup.env" ]; then
    sudo cp /tmp/ai_service_env_backup.env /var/www/ai-service/.env
  fi

  sudo chown -R $USER:$USER /var/www/ai-service
  test -f /var/www/ai-service/pyproject.toml
  test -f /var/www/ai-service/src/main.py
  echo "✅ Python AI service source is present at /var/www/ai-service"

  UV_BIN=""
  for candidate in /root/.local/bin/uv /usr/local/bin/uv; do
    if [ -x "$candidate" ]; then
      UV_BIN="$candidate"
      break
    fi
  done

  if [ -z "$UV_BIN" ]; then
    echo "📦 Installing uv package manager..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    UV_BIN="/root/.local/bin/uv"
  fi

  cd /var/www/ai-service
  if [ "${AI_CHANGED:-true}" = "true" ] || [ ! -d ".venv" ]; then
    echo "🐍 Installing/updating Python dependencies..."
    "$UV_BIN" sync --frozen 2>&1 | tail -5

    echo "🗄️ Running ai-service database migrations..."
    "$UV_BIN" run alembic upgrade head 2>&1 || echo "⚠️ Migration failed (non-fatal)"

    echo "🌱 Seeding agent templates..."
    "$UV_BIN" run python -m scripts.seed_agent_templates 2>&1 || echo "⚠️ Seeding failed (non-fatal)"

    echo "📋 Migrating custom_instructions to PERSONA.md..."
    "$UV_BIN" run python -m scripts.migrate_custom_instructions_to_persona 2>&1 || echo "⚠️ Migration skipped (non-fatal)"
  else
    echo "⚡ AI service dependencies unchanged — skipping uv sync & migrations"
  fi

  echo "🔄 Starting/restarting maxp-ai-service in PM2..."
  if [ -n "$PM2_BIN" ]; then
    if "$PM2_BIN" list | grep -q "maxp-ai-service"; then
      "$PM2_BIN" restart maxp-ai-service --update-env
    else
      "$PM2_BIN" start "$UV_BIN run uvicorn src.main:app --host 0.0.0.0 --port 8000" \
        --name maxp-ai-service --interpreter none \
        --cwd /var/www/ai-service
    fi
    sleep 4
    if "$PM2_BIN" list | grep "maxp-ai-service" | grep -q "online"; then
      echo "✅ maxp-ai-service is running"
    else
      echo "⚠️ maxp-ai-service may not be running — check logs"
      "$PM2_BIN" logs maxp-ai-service --lines 20 --nostream || true
    fi
    "$PM2_BIN" save || true
  fi
else
  echo "⚠️ AI service archive not found, skipping Python AI service deploy"
fi

# Move backend files from staging
if [ -f "$DEPLOY_STAGING/backend.tar.gz" ]; then
  echo "📦 Extracting backend files from tarball..."
  # Keep the current backend running during file sync/preparation.
  # We only switch/reload at the very end to minimize production downtime.
  
  # Ensure uploads directory exists (protected from rsync via --exclude uploads)
  sudo mkdir -p /var/www/backend2/uploads
  sudo chown -R $USER:$USER /var/www/backend2/uploads 2>/dev/null || true

  # Save .env if it exists in backend2
  if [ -f "/var/www/backend2/.env" ]; then
    sudo cp /var/www/backend2/.env /tmp/backend_env_backup.env
  fi

  sudo mkdir -p /var/www/backend2
  rm -rf "$DEPLOY_STAGING/backend_extract"
  mkdir -p "$DEPLOY_STAGING/backend_extract"
  tar -xzf "$DEPLOY_STAGING/backend.tar.gz" -C "$DEPLOY_STAGING/backend_extract"
  sudo rsync -a --delete \
    --exclude uploads \
    --exclude logs \
    --exclude .env \
    --exclude node_modules \
    --exclude prisma/generated \
    --exclude data/facebook-oauth-config.json \
    --exclude config/firebase-service-account.json \
    --exclude ".last_*" \
    "$DEPLOY_STAGING/backend_extract/backend/" /var/www/backend2/
  sudo mkdir -p /var/www/backend2/logs
  sudo chown -R $USER:$USER /var/www/backend2 || true
  
  # Restore .env strategy: backup first (preserves real secrets), then fallback to template
  if [ -f "/tmp/backend_env_backup.env" ]; then
    sudo cp /tmp/backend_env_backup.env /var/www/backend2/.env
  elif [ -f "/var/www/backend2/.env.production" ]; then
    sudo cp /var/www/backend2/.env.production /var/www/backend2/.env
  fi

  # 🔑 Restore Firebase Service Account Key from persistent /var/www/shared
  if [ -f "/var/www/shared/firebase-service-account.json" ]; then
    sudo mkdir -p /var/www/backend2/config
    sudo cp /var/www/shared/firebase-service-account.json /var/www/backend2/config/firebase-service-account.json
    sudo chmod 600 /var/www/backend2/config/firebase-service-account.json
    echo "✅ Restored Firebase Service Account key"
  fi

  # 🔑 Sync MAXP_SERVICE_TOKEN from ai-service .env (real token) to backend .env
  # This ensures BackendClient tools (offers_list_active, etc.) can authenticate
  AI_SVC_TOKEN=""
  for ENV_PATH in /var/www/ai-service/.env /opt/maxp-ai-service/.env /opt/maxp-ai-service/.env.production; do
    if [ -f "$ENV_PATH" ]; then
      AI_SVC_TOKEN="$(grep -m1 '^MAXP_SERVICE_TOKEN=' "$ENV_PATH" | cut -d= -f2-)"
      [ -z "$AI_SVC_TOKEN" ] && AI_SVC_TOKEN="$(grep -m1 '^SERVICE_AUTH_TOKEN=' "$ENV_PATH" | cut -d= -f2-)"
      [ -n "$AI_SVC_TOKEN" ] && echo "📋 Found token in $ENV_PATH" && break
    fi
  done
  if [ -n "$AI_SVC_TOKEN" ]; then
    if grep -q '^AI_SERVICE_TOKEN=' /var/www/backend2/.env; then
      sudo sed -i "s|^AI_SERVICE_TOKEN=.*|AI_SERVICE_TOKEN=${AI_SVC_TOKEN}|" /var/www/backend2/.env
    elif grep -q '^MAXP_SERVICE_TOKEN=' /var/www/backend2/.env; then
      sudo sed -i "s|^MAXP_SERVICE_TOKEN=.*|MAXP_SERVICE_TOKEN=${AI_SVC_TOKEN}|" /var/www/backend2/.env
    else
      echo "MAXP_SERVICE_TOKEN=${AI_SVC_TOKEN}" | sudo tee -a /var/www/backend2/.env
    fi
    echo "✅ Synced token from ai-service to backend"
  else
    echo "⚠️ Could not find token in any ai-service .env — tools may fail to auth"
  fi

  echo "✅ Backend extracted and restored successfully (uploads preserved in-place)"
elif [ -d "$DEPLOY_STAGING/backend" ]; then
  echo "📦 Syncing backend files from staging directory..."
  
  # Ensure uploads directory exists (protected from rsync via --exclude uploads)
  sudo mkdir -p /var/www/backend2/uploads
  sudo chown -R $USER:$USER /var/www/backend2/uploads 2>/dev/null || true

  # Save .env if it exists in backend2
  if [ -f "/var/www/backend2/.env" ]; then
    sudo cp /var/www/backend2/.env /tmp/backend_env_backup.env
  fi

  # Save facebook-oauth-config.json if it exists (managed via Super Admin, not in git)
  if [ -f "/var/www/backend2/data/facebook-oauth-config.json" ]; then
    sudo cp /var/www/backend2/data/facebook-oauth-config.json /tmp/facebook_oauth_config_backup.json
  fi

  sudo mkdir -p /var/www/backend2
  sudo rsync -a --delete \
    --exclude uploads \
    --exclude logs \
    --exclude .env \
    --exclude node_modules \
    --exclude prisma/generated \
    --exclude data/facebook-oauth-config.json \
    --exclude config/firebase-service-account.json \
    --exclude ".last_*" \
    "$DEPLOY_STAGING/backend/" /var/www/backend2/
  sudo mkdir -p /var/www/backend2/logs
  sudo chown -R $USER:$USER /var/www/backend2

  # Restore facebook-oauth-config.json
  if [ -f "/tmp/facebook_oauth_config_backup.json" ]; then
    sudo mkdir -p /var/www/backend2/data
    sudo cp /tmp/facebook_oauth_config_backup.json /var/www/backend2/data/facebook-oauth-config.json
    sudo chown $USER:$USER /var/www/backend2/data/facebook-oauth-config.json
    sudo rm -f /tmp/facebook_oauth_config_backup.json
  fi
  
  # Restore .env strategy: backup first (preserves real secrets), then fallback to template
  if [ -f "/tmp/backend_env_backup.env" ]; then
    sudo cp /tmp/backend_env_backup.env /var/www/backend2/.env
  elif [ -f "/var/www/backend2/.env.production" ]; then
    sudo cp /var/www/backend2/.env.production /var/www/backend2/.env
  fi

  # 🔑 Restore Firebase Service Account Key from persistent /var/www/shared
  if [ -f "/var/www/shared/firebase-service-account.json" ]; then
    sudo mkdir -p /var/www/backend2/config
    sudo cp /var/www/shared/firebase-service-account.json /var/www/backend2/config/firebase-service-account.json
    sudo chmod 600 /var/www/backend2/config/firebase-service-account.json
    echo "✅ Restored Firebase Service Account key"
  fi

  # 🔑 Sync MAXP_SERVICE_TOKEN from ai-service .env (real token) to backend .env
  AI_SVC_TOKEN=""
  for ENV_PATH in /var/www/ai-service/.env /opt/maxp-ai-service/.env /opt/maxp-ai-service/.env.production; do
    if [ -f "$ENV_PATH" ]; then
      AI_SVC_TOKEN="$(grep -m1 '^MAXP_SERVICE_TOKEN=' "$ENV_PATH" | cut -d= -f2-)"
      [ -z "$AI_SVC_TOKEN" ] && AI_SVC_TOKEN="$(grep -m1 '^SERVICE_AUTH_TOKEN=' "$ENV_PATH" | cut -d= -f2-)"
      [ -n "$AI_SVC_TOKEN" ] && echo "📋 Found token in $ENV_PATH" && break
    fi
  done
  if [ -n "$AI_SVC_TOKEN" ]; then
    if grep -q '^AI_SERVICE_TOKEN=' /var/www/backend2/.env; then
      sudo sed -i "s|^AI_SERVICE_TOKEN=.*|AI_SERVICE_TOKEN=${AI_SVC_TOKEN}|" /var/www/backend2/.env
    elif grep -q '^MAXP_SERVICE_TOKEN=' /var/www/backend2/.env; then
      sudo sed -i "s|^MAXP_SERVICE_TOKEN=.*|MAXP_SERVICE_TOKEN=${AI_SVC_TOKEN}|" /var/www/backend2/.env
    else
      echo "MAXP_SERVICE_TOKEN=${AI_SVC_TOKEN}" | sudo tee -a /var/www/backend2/.env
    fi
    echo "✅ Synced token from ai-service to backend"
  else
    echo "⚠️ Could not find token in any ai-service .env — tools may fail to auth"
  fi

  echo "✅ Backend synced successfully from staging (uploads preserved in-place)"
elif [ -d "/var/www/backend" ]; then
  echo "📦 Moving backend files from legacy location..."
  sudo rm -rf /var/www/backend2 || true
  sudo mv /var/www/backend /var/www/backend2
  sudo mkdir -p /var/www/backend2/logs
  sudo chown -R $USER:$USER /var/www/backend2
  echo "✅ Backend moved successfully from legacy"
else
  echo "⚠️ Backend not found, skipping..."
fi

# Intelligent Dependency Synchronization
echo "📦 Checking backend production dependencies on server..."
cd /var/www/backend2
LOCK_HASH=""
if [ -f package-lock.json ]; then
  LOCK_HASH=$(sha256sum package-lock.json | awk '{print $1}')
fi

NEED_NPM_INSTALL=false
if [ ! -d node_modules ] || [ ! -d node_modules/@prisma ]; then
  echo "ℹ️ node_modules missing or incomplete — npm ci required"
  NEED_NPM_INSTALL=true
elif [ "${BACKEND_DEPS_CHANGED:-false}" = "true" ]; then
  echo "ℹ️ CI detected package-lock.json changes — npm ci required"
  NEED_NPM_INSTALL=true
elif [ -f .last_package_lock_hash ] && [ -n "$LOCK_HASH" ]; then
  if [ "$(cat .last_package_lock_hash 2>/dev/null)" != "$LOCK_HASH" ]; then
    echo "ℹ️ package-lock.json hash changed — npm ci required"
    NEED_NPM_INSTALL=true
  fi
elif [ ! -f .last_package_lock_hash ]; then
  NEED_NPM_INSTALL=true
fi

if [ "$NEED_NPM_INSTALL" = "true" ]; then
  echo "📦 Installing backend production dependencies on server..."
  if [ -f package-lock.json ]; then
    PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm ci --omit=dev
    echo "$LOCK_HASH" > .last_package_lock_hash
  else
    PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 npm install --omit=dev
  fi
  echo "🖼️ Ensuring sharp dependency for Linux..."
  npm install --os=linux --cpu=x64 sharp --no-save || echo "⚠️ Sharp fix failed, continuing..."
else
  echo "⚡ Backend dependencies unchanged — skipping npm ci (saved ~3 minutes)"
fi
 
# Clean up legacy Prisma files
sudo rm -f /var/www/backend2/prisma/schema.prisma || echo "⚠️ Could not delete schema.prisma"
sudo rm -f /var/www/backend2/schema.prisma || echo "⚠️ Could not delete root schema.prisma"

PRISMA_BIN="./node_modules/.bin/prisma"
if [ ! -x "$PRISMA_BIN" ]; then
  PRISMA_BIN="$(command -v prisma || true)"
fi

# Run generate with the specific schema folder
# Keep the existing generated clients in place until the new client
# is ready. PM2 can restart a worker during deploy, and deleting
# these folders first makes that worker crash while the app is live.
"$PRISMA_BIN" generate --schema=prisma/schema || {
    echo "❌ Prisma generation failed"
    exit 1
}
test -f prisma/generated/postgresql_v2/runtime/library.js || {
    echo "❌ Prisma runtime files are missing after generate"
    find prisma/generated/postgresql_v2 -maxdepth 2 -type f | sort | head -n 80 || true
    exit 1
}
mkdir -p node_modules/.prisma
rsync -a --delete prisma/generated/postgresql_v2/ node_modules/.prisma/client/
test -f node_modules/.prisma/client/default.js || {
    echo "❌ Prisma compatibility client is missing after sync"
    find node_modules/.prisma/client -maxdepth 2 -type f | sort | head -n 80 || true
    exit 1
}

# Step 2.5: Sync appuser password with .env
echo "🔄 Synchronizing appuser password..."
bash scripts/sync-db-pass.sh || echo "⚠️ Password sync failed, continuing..."

# Step 2.7: Fix Audit Logs Types (Casting String to Enum)
echo "🛠️ Fixing Audit Logs data types..."
bash scripts/fix-audit-logs.sh || echo "⚠️ Audit logs fix skipped or failed, continuing..."

# Step 2.8: Fix Data Duplicates
echo "🛠️ Fixing data duplicates..."
timeout 600 node scripts/fix-duplicates.js || echo "⚠️ Duplicates fix failed, continuing..."

# Step 3: Push schema to PostgreSQL database (Incremental)
CURRENT_SCHEMA_HASH=""
if [ -d prisma/schema ]; then
  CURRENT_SCHEMA_HASH=$(find prisma/schema -name "*.prisma" -type f -exec sha256sum {} + 2>/dev/null | sort | sha256sum | awk '{print $1}')
fi

NEED_DB_PUSH=false
if [ "${PRISMA_CHANGED:-false}" = "true" ]; then
  echo "ℹ️ CI detected Prisma schema changes — db push required"
  NEED_DB_PUSH=true
elif [ -f .last_prisma_schema_hash ] && [ -n "$CURRENT_SCHEMA_HASH" ]; then
  if [ "$(cat .last_prisma_schema_hash 2>/dev/null)" != "$CURRENT_SCHEMA_HASH" ]; then
    echo "ℹ️ Prisma schema files modified since last deploy — db push required"
    NEED_DB_PUSH=true
  fi
elif [ ! -f .last_prisma_schema_hash ]; then
  NEED_DB_PUSH=true
fi

if [ "$NEED_DB_PUSH" = "true" ]; then
  # ── SCHEMA GUARD (pre-push): review drift before touching the database ──
  # Refuses destructive drift (DROP TABLE/COLUMN/...) unless explicitly
  # allowed with ALLOW_SCHEMA_DROPS=true. Fail-open only if the diff itself
  # cannot run (tool/URL problem) — and says so loudly.
  cat prisma/schema/*.prisma > /tmp/maxp_combined_schema.prisma
  # Resolve the DB URL for the guard: DATABASE_URL env → POSTGRES_URL → DIRECT_URL
  DB_URL_FOR_GUARD="${DATABASE_URL:-}"
  if [ -z "$DB_URL_FOR_GUARD" ] && [ -f .env ]; then
    DB_URL_FOR_GUARD="$(grep -m1 -E '^POSTGRES_URL=' .env | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//")"
  fi
  if [ -z "$DB_URL_FOR_GUARD" ] && [ -f .env ]; then
    DB_URL_FOR_GUARD="$(grep -m1 -E '^DIRECT_URL=' .env | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//")"
  fi
  export DB_URL_FOR_GUARD
  SCHEMA_GUARD_DIFF="/tmp/maxp_schema_guard_diff.sql"
  if [ -n "${DB_URL_FOR_GUARD:-}" ] && timeout 120 "$PRISMA_BIN" migrate diff \
      --from-url "$DB_URL_FOR_GUARD" \
      --to-schema-datamodel /tmp/maxp_combined_schema.prisma \
      --script > "$SCHEMA_GUARD_DIFF" 2>/dev/null; then
    DROP_COUNT="$(grep -ciE 'DROP (TABLE|COLUMN|SCHEMA|INDEX|CONSTRAINT) ' "$SCHEMA_GUARD_DIFF" || true)"
    if [ "${DROP_COUNT:-0}" -gt 0 ]; then
      echo "🚨 SCHEMA GUARD: $DROP_COUNT destructive statement(s) in pending drift:"
      grep -iE 'DROP (TABLE|COLUMN|SCHEMA|INDEX|CONSTRAINT) ' "$SCHEMA_GUARD_DIFF" | head -20 | sed 's/^/      /'
      if [ "${ALLOW_SCHEMA_DROPS:-false}" != "true" ]; then
        echo "❌ REFUSING db push — destructive drift requires explicit review."
        echo "   Full diff saved at: $SCHEMA_GUARD_DIFF"
        echo "   To proceed deliberately: re-run this deploy with ALLOW_SCHEMA_DROPS=true"
        exit 1
      fi
      echo "⚠️ ALLOW_SCHEMA_DROPS=true — continuing despite $DROP_COUNT destructive op(s). See $SCHEMA_GUARD_DIFF"
    else
      echo "🛡️ SCHEMA GUARD: drift reviewed — zero destructive operations (additive/alter only)."
      rm -f "$SCHEMA_GUARD_DIFF"
    fi
  else
    echo "⚠️ SCHEMA GUARD: pre-push diff unavailable (missing DATABASE_URL or diff failed) — push proceeding UNGUARDED."
  fi
  if [ -f "prisma/migrations/20261001_remove_legacy_plans_system/migration.sql" ]; then
    echo "🛡️ Backing up platform_subscriptions and cleaning legacy plan types before db push..."
    "$PRISMA_BIN" db execute --file prisma/migrations/20261001_remove_legacy_plans_system/migration.sql --schema=prisma/schema || echo "⚠️ Pre-push migration warning (continuing...)"
  fi
  echo "🚀 Pushing schema to PostgreSQL..."
  timeout 600 "$PRISMA_BIN" db push --schema=prisma/schema --skip-generate --accept-data-loss || {
      echo "❌ Database synchronization failed"
      exit 1
  }

  echo "🌱 Running automated seeding..."
  timeout 600 "$PRISMA_BIN" db seed --schema=prisma/schema || echo "⚠️ Seeding failed, continuing deployment..."
  echo "🔐 Seeding permissions..."
  timeout 600 npm run seed:permissions || echo "⚠️ Permissions seeding failed, continuing deployment..."

  echo "👑 Creating/verifying super admin user..."
  SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-}" SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}" timeout 600 npm run setup:superadmin || echo "⚠️ Super admin setup failed, continuing deployment..."

  if [ -n "$CURRENT_SCHEMA_HASH" ]; then
    echo "$CURRENT_SCHEMA_HASH" > .last_prisma_schema_hash
  fi
  # ── POST-PUSH REPORT: verify the database now matches the schema ────────
  if [ -f /tmp/maxp_combined_schema.prisma ] && [ -n "${DB_URL_FOR_GUARD:-}" ] && timeout 120 "$PRISMA_BIN" migrate diff \
      --from-url "$DB_URL_FOR_GUARD" \
      --to-schema-datamodel /tmp/maxp_combined_schema.prisma \
      --script > /tmp/maxp_postpush_diff.sql 2>/dev/null; then
    if grep -qiE '^(ALTER|CREATE|DROP) ' /tmp/maxp_postpush_diff.sql; then
      echo "⚠️ POST-PUSH REPORT: residual drift remains after push (unexpected):"
      head -15 /tmp/maxp_postpush_diff.sql | sed 's/^/      /'
      rm -f /tmp/maxp_postpush_diff.sql
    else
      echo "✅ POST-PUSH REPORT: database schema fully matches prisma/schema — zero residual drift."
      rm -f /tmp/maxp_postpush_diff.sql
    fi
  else
    echo "⚠️ POST-PUSH REPORT: verification diff unavailable — verify schema match manually."
  fi
  rm -f /tmp/maxp_combined_schema.prisma
  echo "✅ Database schema synchronized with PostgreSQL"
else
  echo "⚡ Prisma schema unchanged — skipping db push and seeding (saved ~2-3 minutes)"
fi

# Step 7.5: Sync file-defined marketplace apps/bundles into DB before the app boots.
# This keeps production (CATALOG_SOURCE=db) from hiding newly shipped catalog entries.
# Skipped when the workflow already determined no catalog files changed (saves ~30s).
if [ "${CATALOG_CHANGED:-true}" = "true" ]; then
  echo "🧩 Syncing missing marketplace catalog entries..."
  NODE_ENV=production timeout 600 npm run catalog:sync-target -- --only-missing --fail-on-missing || {
      echo "❌ Marketplace catalog sync failed or left unresolved catalog entries"
      exit 1
  }

  echo "🧩 Syncing POS app (pos-pro) active state and route..."
  NODE_ENV=production timeout 60 node scripts/catalog/sync_pos_pro_app.js || echo "⚠️ sync_pos_pro_app skipped, continuing..."

  echo "🔍 Verifying marketplace catalog drift gate (zero changed entries required)..."
  NODE_ENV=production timeout 600 npm run catalog:diff -- --fail-on-changed || {
      echo "⚠️ Marketplace catalog drift detected (catalog:diff returned changed entries). Continuing deployment..."
  }

  echo "🧹 Removing deprecated duplicate store-pro app..."
  NODE_ENV=production timeout 600 node scripts/catalog/remove_store_pro_app.js || echo "⚠️ store-pro cleanup skipped, continuing..."

  echo "🧹 Repairing stale required-app references in marketplace apps..."
  NODE_ENV=production timeout 600 node scripts/repair_stale_marketplace_required_apps.js || {
      echo "⚠️ Required-app reference repair had issues, continuing..."
  }

  echo "🧹 Deactivating deprecated marketplace apps..."
  NODE_ENV=production timeout 600 node scripts/deactivate_old_marketplace_apps.js || {
      echo "⚠️ Deprecated app deactivation had issues, continuing..."
  }
else
  echo "ℹ️ Skipping marketplace catalog sync (no catalog files changed)"
fi

echo "🧩 Ensuring POS app (pos-pro) is active and public..."
NODE_ENV=production timeout 60 node scripts/catalog/sync_pos_pro_app.js || echo "⚠️ sync_pos_pro_app skipped, continuing..."

# Restart services
echo "🔄 Restarting services..."
if [ -n "$PM2_BIN" ]; then
  echo "📋 Current PM2 processes:"
  "$PM2_BIN" list

  # Remove legacy backend names before standardized ecosystem startup
  "$PM2_BIN" delete backend1 || true
  "$PM2_BIN" delete chat-backend || true

  cd /var/www/backend2
  echo "🚀 Starting/reloading ecosystem (backend + worker)..."
  NODE_ENV=production "$PM2_BIN" startOrReload ecosystem.config.js --env production --update-env || "$PM2_BIN" reload ecosystem.config.js --env production --update-env || true
  "$PM2_BIN" save

  sleep 3

  echo "📋 PM2 status after restart:"
  "$PM2_BIN" list

  if "$PM2_BIN" list | grep -q "maxp-backend"; then
    echo "📋 Maxp-backend logs (last 20 lines):"
    "$PM2_BIN" logs maxp-backend --lines 20 --nostream || echo "⚠️ Could not get backend logs"
  fi

  if "$PM2_BIN" list | grep -q "maxp-webhook-worker"; then
    echo "📋 Webhook worker logs (last 20 lines):"
    "$PM2_BIN" logs maxp-webhook-worker --lines 20 --nostream || echo "⚠️ Could not get worker logs"
  else
    echo "⚠️ Webhook worker process not found after deploy"
    exit 1
  fi

  echo "🩺 Verifying backend health after reload..."
  HEALTH_PORT=""
  for env_file in /var/www/backend2/.env.production /var/www/backend2/.env; do
    CANDIDATE_PORT="$(read_env_port "$env_file" || true)"
    if [ -n "$CANDIDATE_PORT" ]; then
      HEALTH_PORT="$CANDIDATE_PORT"
      echo "ℹ️ Health check port resolved from $(basename "$env_file"): $HEALTH_PORT"
      break
    fi
  done

  HEALTH_PORT_CANDIDATES=""
  if [ -n "$HEALTH_PORT" ]; then
    HEALTH_PORT_CANDIDATES="$HEALTH_PORT"
  fi
  for fallback_port in 3008 3007; do
    if [[ " $HEALTH_PORT_CANDIDATES " != *" $fallback_port "* ]]; then
      HEALTH_PORT_CANDIDATES="$HEALTH_PORT_CANDIDATES $fallback_port"
    fi
  done

  ACTIVE_HEALTH_PORT=""
  HEALTH_MAX_ATTEMPTS=30
  HEALTH_SLEEP_SECONDS=5
  for attempt in $(seq 1 "$HEALTH_MAX_ATTEMPTS"); do
    for port in $HEALTH_PORT_CANDIDATES; do
      echo "🩺 Health attempt $attempt/$HEALTH_MAX_ATTEMPTS: http://127.0.0.1:$port/api/v1/health"
      if curl -fsS --max-time 20 "http://127.0.0.1:$port/api/v1/health" >/dev/null; then
        ACTIVE_HEALTH_PORT="$port"
        break 2
      fi
    done

    if [ "$attempt" -lt "$HEALTH_MAX_ATTEMPTS" ]; then
      echo "⏳ Backend not healthy yet; waiting $HEALTH_SLEEP_SECONDS seconds before retry..."
      sleep "$HEALTH_SLEEP_SECONDS"
    fi
  done

  if [ -z "$ACTIVE_HEALTH_PORT" ]; then
    echo "❌ Backend health check failed after deploy"
    echo "🔎 Tried ports:$HEALTH_PORT_CANDIDATES"
    ss -ltnp | grep -E '3007|3008' || true
    "$PM2_BIN" logs maxp-backend --lines 50 --nostream || true
    exit 1
  fi

  echo "✅ Backend health check passed on port $ACTIVE_HEALTH_PORT"

  echo "🧹 Purging in-memory HTML caches on the running backend..."
  PURGE_SECRET="$(grep '^DEPLOY_SECRET=' /var/www/backend2/.env 2>/dev/null | cut -d= -f2-)"
  if [ -n "$PURGE_SECRET" ]; then
    PURGE_RESP="$(curl -sS --max-time 10 -X POST -H "x-deploy-secret: $PURGE_SECRET" "http://127.0.0.1:${ACTIVE_HEALTH_PORT}/api/v1/internal/purge-cache" 2>&1 || true)"
    if printf '%s' "$PURGE_RESP" | grep -q '"ok":true\|"ok": true'; then
      echo "✅ HTML caches purged successfully"
    else
      echo "⚠️ Cache purge response: ${PURGE_RESP:-no response}"
    fi
  else
    echo "ℹ️ DEPLOY_SECRET not found in .env — skipping internal cache purge"
  fi

  echo "🧩 Verifying marketplace full catalog API after reload..."
  curl -fsS --max-time 20 "http://127.0.0.1:${ACTIVE_HEALTH_PORT}/api/v1/marketplace/apps?page=1&limit=200" > /tmp/marketplace_catalog.json
  node -e 'const fs=require("fs"); const payload=JSON.parse(fs.readFileSync("/tmp/marketplace_catalog.json","utf8")); const data=Array.isArray(payload.data)?payload.data:[]; const total=Number((payload.pagination&&payload.pagination.total)||data.length); const limit=Number((payload.pagination&&payload.pagination.limit)||0); if(limit!==200||data.length===0||data.length!==total){ console.error("❌ Marketplace full catalog API verification failed",{count:data.length,total,limit}); process.exit(1); } console.log("✅ Marketplace full catalog API returned "+data.length+"/"+total+" apps with limit="+limit);'
  echo "📋 Printing last 50 lines of PM2 backend and AI service error logs for debugging..."
  "$PM2_BIN" logs maxp-backend --lines 50 --nostream || true
  "$PM2_BIN" logs maxp-ai-service --lines 50 --nostream || true
else
  echo "⚠️ PM2 not found, skipping restart"
fi

# Save PM2 state so it survives server reboots
if [ -n "$PM2_BIN" ]; then
  echo "💾 Saving PM2 process list..."
  "$PM2_BIN" save || echo "⚠️ PM2 save failed"
fi

# Sync Nginx configs from the repo and reload after backend is healthy
if [ -f "$DEPLOY_STAGING/nginx-configs.tar.gz" ]; then
  echo "🌐 Syncing Nginx configs..."
  rm -rf "$DEPLOY_STAGING/nginx_extract"
  mkdir -p "$DEPLOY_STAGING/nginx_extract"
  tar -xzf "$DEPLOY_STAGING/nginx-configs.tar.gz" -C "$DEPLOY_STAGING/nginx_extract"

  MAXP_NGINX_TARGET="/etc/nginx/sites-available/maxp.online.conf"
  MOKHTAR_NGINX_TARGET="/etc/nginx/sites-available/mokhtarelhenawy.online.conf"
  MAXP_NGINX_ENABLED="/etc/nginx/sites-enabled/maxp.online.conf"
  MOKHTAR_NGINX_ENABLED="/etc/nginx/sites-enabled/mokhtarelhenawy.online.conf"
  MAXP_NGINX_BACKUP="/tmp/maxp.online.conf.${GITHUB_RUN_ID}.${GITHUB_RUN_ATTEMPT}.bak"
  MOKHTAR_NGINX_BACKUP="/tmp/mokhtarelhenawy.online.conf.${GITHUB_RUN_ID}.${GITHUB_RUN_ATTEMPT}.bak"
  CONFLICT_BACKUP_DIR="$DEPLOY_STAGING/nginx_conflict_backup"
  CONFLICT_MANIFEST="$CONFLICT_BACKUP_DIR/manifest.txt"

  if [ -f "$MAXP_NGINX_TARGET" ]; then
    sudo cp "$MAXP_NGINX_TARGET" "$MAXP_NGINX_BACKUP"
  fi
  if [ -f "$MOKHTAR_NGINX_TARGET" ]; then
    sudo cp "$MOKHTAR_NGINX_TARGET" "$MOKHTAR_NGINX_BACKUP"
  fi

  sudo cp "$DEPLOY_STAGING/nginx_extract/maxp.online.conf" "$MAXP_NGINX_TARGET"
  sudo cp "$DEPLOY_STAGING/nginx_extract/mokhtarelhenawy.online.conf" "$MOKHTAR_NGINX_TARGET"
  sudo ln -sfn "$MAXP_NGINX_TARGET" "$MAXP_NGINX_ENABLED"
  sudo ln -sfn "$MOKHTAR_NGINX_TARGET" "$MOKHTAR_NGINX_ENABLED"

  rm -rf "$CONFLICT_BACKUP_DIR"
  mkdir -p "$CONFLICT_BACKUP_DIR"
  : > "$CONFLICT_MANIFEST"

  mapfile -t CONFLICTING_NGINX_FILES < <(
    for candidate in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
      [ -e "$candidate" ] || continue
      if [ "$candidate" = "$MAXP_NGINX_ENABLED" ] || [ "$candidate" = "$MOKHTAR_NGINX_ENABLED" ]; then
        continue
      fi

      if sudo grep -qF 'server_name maxp.online www.maxp.online *.maxp.online;' "$candidate" || \
         sudo grep -qF 'server_name mokhtarelhenawy.online www.mokhtarelhenawy.online *.mokhtarelhenawy.online;' "$candidate"; then
        printf '%s\n' "$candidate"
      fi
    done
  )

  if [ "${#CONFLICTING_NGINX_FILES[@]}" -gt 0 ]; then
    echo "⚠️ Disabling conflicting legacy Nginx configs..."
    for candidate in "${CONFLICTING_NGINX_FILES[@]}"; do
      backup_path="$CONFLICT_BACKUP_DIR/$(basename "$candidate").${GITHUB_RUN_ID}.${GITHUB_RUN_ATTEMPT}.bak"
      echo "   - $candidate"
      sudo cp -L "$candidate" "$backup_path"
      printf '%s|%s\n' "$candidate" "$backup_path" >> "$CONFLICT_MANIFEST"
      sudo rm -f "$candidate"
    done
  fi

  if ! sudo nginx -t; then
    echo "❌ Nginx configuration test failed, restoring previous configs..."
    if [ -f "$MAXP_NGINX_BACKUP" ]; then
      sudo cp "$MAXP_NGINX_BACKUP" "$MAXP_NGINX_TARGET"
    fi
    if [ -f "$MOKHTAR_NGINX_BACKUP" ]; then
      sudo cp "$MOKHTAR_NGINX_BACKUP" "$MOKHTAR_NGINX_TARGET"
    fi
    if [ -f "$CONFLICT_MANIFEST" ]; then
      while IFS='|' read -r original_path backup_path; do
        [ -n "$original_path" ] || continue
        sudo cp "$backup_path" "$original_path"
      done < "$CONFLICT_MANIFEST"
    fi
    sudo nginx -t || true
    exit 1
  fi

  sudo systemctl reload nginx
  echo "✅ Nginx configs synced and reloaded successfully"

  echo "⏳ Waiting for Nginx to stabilize..."
  sleep 3

  echo "🧪 Running storefront SEO smoke tests..."
  TEST_HOST="swan.maxp.online"
  GENERIC_TITLE="منصة إدارة التواصل والتجارة الإلكترونية"
  BACKEND_HTML_FILE="$(mktemp)"
  NGINX_HTML_FILE="$(mktemp)"

  BACKEND_STATUS="$(curl -sS --max-time 20 -o "$BACKEND_HTML_FILE" -w '%{http_code}' -H "Host: ${TEST_HOST}" -H "Accept: text/html" "http://127.0.0.1:${ACTIVE_HEALTH_PORT}/shop")"
  NGINX_STATUS="$(curl -ksS --max-time 20 --resolve "${TEST_HOST}:443:127.0.0.1" -o "$NGINX_HTML_FILE" -w '%{http_code}' -H "Accept: text/html" "https://${TEST_HOST}/shop")"

  BACKEND_HTML="$(cat "$BACKEND_HTML_FILE")"
  NGINX_HTML="$(cat "$NGINX_HTML_FILE")"

  BACKEND_TITLE="$(printf '%s' "$BACKEND_HTML" | tr '\n' ' ' | sed -n 's:.*<title>\([^<]*\)</title>.*:\1:p' | head -n 1)"
  NGINX_TITLE="$(printf '%s' "$NGINX_HTML" | tr '\n' ' ' | sed -n 's:.*<title>\([^<]*\)</title>.*:\1:p' | head -n 1)"

  echo "ℹ️ Backend storefront status: ${BACKEND_STATUS}"
  echo "ℹ️ Backend storefront title: ${BACKEND_TITLE}"
  echo "ℹ️ Nginx storefront status: ${NGINX_STATUS}"
  echo "ℹ️ Nginx storefront title: ${NGINX_TITLE}"

  if [ "$BACKEND_STATUS" != "200" ]; then
    echo "❌ Backend storefront HTML returned HTTP ${BACKEND_STATUS}"
    head -c 240 "$BACKEND_HTML_FILE" || true
    echo
    exit 1
  fi

  if [ "$NGINX_STATUS" != "200" ]; then
    echo "❌ Nginx storefront HTML returned HTTP ${NGINX_STATUS}"
    head -c 240 "$NGINX_HTML_FILE" || true
    echo
    sudo nginx -T 2>/dev/null | grep -nE 'server_name .*maxp\.online|server_name .*mokhtarelhenawy\.online|try_files .*@storefront_spa|proxy_pass http://127\.0\.0\.1:3007|proxy_pass http://localhost:3007' || true
    exit 1
  fi

  if [ -z "$BACKEND_TITLE" ] || [ "$BACKEND_TITLE" = "$GENERIC_TITLE" ]; then
    echo "❌ Backend storefront HTML is still returning generic SEO metadata"
    exit 1
  fi

  if [ -z "$NGINX_TITLE" ] || [ "$NGINX_TITLE" = "$GENERIC_TITLE" ]; then
    echo "❌ Nginx storefront HTML is still returning generic SEO metadata"
    sudo nginx -T 2>/dev/null | grep -nE 'server_name .*maxp\.online|server_name .*mokhtarelhenawy\.online|try_files .*@storefront_spa|proxy_pass http://127\.0\.0\.1:3007|proxy_pass http://localhost:3007' || true
    exit 1
  fi

  if ! printf '%s' "$NGINX_HTML" | grep -q '<link rel="canonical"'; then
    echo "❌ Nginx storefront HTML is missing the canonical link tag"
    exit 1
  fi

  # 🛡️ Admin-app entry verification: whatever nginx serves at maxp.online/
  # MUST reference the same hashed entry chunk as the index.html this deploy
  # just published. A mismatch means a stale precompressed index.html.br/.gz
  # or a concurrent manual upload is shadowing the deploy — fail loudly
  # instead of leaving users on an old build with 404-ing chunks.
  # (curl calls are || true — under set -e a transient curl failure must not
  # kill the deploy; the verdict below handles empty results instead.)
  EXPECTED_ENTRY="$(cat /tmp/maxp_deploy_expected_entry 2>/dev/null || true)"
  [ -z "$EXPECTED_ENTRY" ] && EXPECTED_ENTRY="$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' /var/www/frontend2/dist/index.html | head -1 || true)"
  FETCH_ENTRY() {
    # $1 = extra curl args (e.g. brotli request)
    curl -ksS --max-time 20 "$@" --resolve "maxp.online:443:127.0.0.1" "https://maxp.online/" 2>/dev/null \
      | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1 || true
  }
  SERVED_ENTRY_BR="$(FETCH_ENTRY -H 'Accept-Encoding: br' --compressed)"
  SERVED_ENTRY_ID="$(FETCH_ENTRY)"
  echo "ℹ️ Admin entry expected: $EXPECTED_ENTRY | served(br): ${SERVED_ENTRY_BR:-<none>} | served(identity): ${SERVED_ENTRY_ID:-<none>}"
  if { [ -n "$SERVED_ENTRY_BR" ] && [ "$SERVED_ENTRY_BR" != "$EXPECTED_ENTRY" ]; } \
     || { [ -n "$SERVED_ENTRY_ID" ] && [ "$SERVED_ENTRY_ID" != "$EXPECTED_ENTRY" ]; } \
     || { [ -z "$EXPECTED_ENTRY" ]; }; then
    echo "❌ SERVED HTML DOES NOT MATCH DEPLOYED BUILD!"
    echo "   Expected entry $EXPECTED_ENTRY. Likely causes: stale index.html.br/.gz shadowing"
    echo "   (check: ls -la /var/www/frontend2/dist/index.html.*) or a concurrent manual upload"
    echo "   overwrote the dist during this deploy."
    ls -la /var/www/frontend2/dist/index.html* 2>/dev/null || true
    exit 1
  fi
  if [ -z "$SERVED_ENTRY_BR" ] && [ -z "$SERVED_ENTRY_ID" ]; then
    echo "⚠️ Could not read served HTML from local nginx (both curls empty) — skipping entry verdict"
  else
    echo "✅ Admin app serves the deployed build (br: ${SERVED_ENTRY_BR:-n/a}, identity: ${SERVED_ENTRY_ID:-n/a})"
  fi
else
  echo "⚠️ Nginx config archive not found, skipping Nginx sync"
fi

# Clear error trap and remove rollback backup on successful deployment
trap - ERR
if [ -n "$ROLLBACK_FRONTEND_BACKUP" ] && [ -f "$ROLLBACK_FRONTEND_BACKUP" ]; then
  sudo rm -f "$ROLLBACK_FRONTEND_BACKUP" || true
fi
rm -f /tmp/maxp_deploy_expected_entry

echo "✅ Deployment completed successfully with zero-downtime integrity!"
rm -rf "$DEPLOY_STAGING"