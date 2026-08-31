#!/bin/bash
# =============================================================
# PgBouncer install/config for MaxP backend (single VPS).
#
# ⚠️ Safe to run anytime — idempotent. It:
#   1. Installs pgbouncer (apt)
#   2. Generates userlist.txt + pgbouncer.ini from POSTGRES_URL in .env
#      (credentials stay on the server; NEVER committed to git)
#   3. Adds PG_BOUNCER_URL to backend .env so the runtime client uses the pooler
#   4. Starts pgbouncer via systemd + enables on boot
#   5. Restarts the backend so it reconnects through the pooler
#
# Rollback: unset PG_BOUNCER_URL in .env + restart backend + stop pgbouncer.
# =============================================================
set -euo pipefail

BACKEND_DIR="${BACKEND_DIR:-/var/www/backend2}"
ENV_FILE="$BACKEND_DIR/.env"
BOUNCER_PORT="${PG_BOUNCER_PORT:-6432}"

log() { echo -e "\n\033[1;36m◆ $*\033[0m"; }
die() { echo -e "\033[1;31m✗ $*\033[0m" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "ENV file not found: $ENV_FILE"

# --- 1. Extract credentials from POSTGRES_URL (direct Postgres) ----------
PG_URL="$(grep -E '^POSTGRES_URL=' "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
[ -n "$PG_URL" ] || die "POSTGRES_URL not found in $ENV_FILE"

# Parse with urlparse — sed breaks on URLs with passwords ('@' in userinfo).
# TAB-separated so passwords containing spaces survive; re-encode for URLs.
read -r -d '' PY_CODE <<'PY' || true
import sys
from urllib.parse import urlparse, unquote, quote
u = urlparse(sys.argv[1])
pw = unquote(u.password or "")
print("\t".join([
    u.username or "appuser",
    pw,
    u.hostname or "127.0.0.1",
    str(u.port or 5432),
    (u.path.lstrip("/").split("?")[0] or "maxp"),
    quote(pw, safe=""),
]))
PY
IFS=$'\t' read -r DB_USER DB_PASS_DEC DB_HOST DB_PORT DB_NAME DB_PASS < <(python3 -c "$PY_CODE" "$PG_URL") || die "Failed to parse POSTGRES_URL (is python3 available?)"
[ -n "$DB_NAME" ] || DB_NAME="maxp"
[ -n "$DB_PORT" ] || DB_PORT="5432"

log "Postgres target: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# --- 2. Install -----------------------------------------------------------
if ! command -v pgbouncer >/dev/null 2>&1; then
  log "Installing pgbouncer..."
  sudo apt-get update -qq
  sudo apt-get install -y pgbouncer
else
  log "pgbouncer already installed: $(pgbouncer --version | head -1)"
fi

# --- 3. Write userlist.txt (PLAINTEXT password) ---------------------------
# auth_type = scram-sha-256 requires the plaintext password in auth_file:
# Postgres ≥14 stores roles as SCRAM verifiers, so md5 hashing here can never
# authenticate (this exact mismatch caused a "password authentication failed"
# crash loop on 2026-08-31). File is chmod 640 root:pgbouncer.
sudo mkdir -p /etc/pgbouncer
echo "\"$DB_USER\" \"$DB_PASS_DEC\"" | sudo tee /etc/pgbouncer/userlist.txt >/dev/null

# --- 4. Write pgbouncer.ini from the shipped template --------------------
sudo cp "$BACKEND_DIR/deploy/pgbouncer/pgbouncer.ini" /etc/pgbouncer/pgbouncer.ini

# Auto-fill [databases] + admin_users from the parsed credentials.
sudo python3 - "$DB_HOST" "$DB_PORT" "$DB_NAME" "$DB_USER" <<'PY'
import sys
host, port, dbname, user = sys.argv[1:5]
if host in ("localhost", ""):
    host = "127.0.0.1"  # avoid ::1/IPv6 resolution surprises; matches live config
path = "/etc/pgbouncer/pgbouncer.ini"
src = open(path).read()
start = src.index("[databases]")
end = src.index("[pgbouncer]") if "[pgbouncer]" in src else len(src)
new = (
    "[databases]\n"
    "# PgBouncer maps the virtual DB to the real Postgres.\n"
    "{db} = host={h} port={p} dbname={db}\n\n".format(db=dbname, h=host, p=port)
)
src = src[:start] + new + src[end:]
# The template ships 'appuser'; the real role may differ.
src = src.replace("admin_users = appuser", "admin_users = " + user)
src = src.replace("stats_users = appuser", "stats_users = " + user)
open(path, "w").write(src)
print("updated [databases] -> {db} @ {h}:{p}, admin_users={u}".format(db=dbname, h=host, p=port, u=user))
PY

sudo chown pgbouncer:pgbouncer /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/userlist.txt || true
sudo chmod 640 /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/userlist.txt

# --- 5. Start + enable -----------------------------------------------------
sudo systemctl enable pgbouncer
sudo systemctl restart pgbouncer
sleep 2
systemctl is-active pgbouncer >/dev/null || die "pgbouncer failed to start — check: journalctl -u pgbouncer -n 50"

log "pgbouncer listening on 127.0.0.1:$BOUNCER_PORT"

# --- 6. Point backend at the pooler ---------------------------------------
BOUNCER_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${BOUNCER_PORT}/${DB_NAME}"

if grep -q '^PG_BOUNCER_URL=' "$ENV_FILE"; then
  sudo sed -i "s|^PG_BOUNCER_URL=.*|PG_BOUNCER_URL=\"${BOUNCER_URL}\"|" "$ENV_FILE"
else
  echo "PG_BOUNCER_URL=\"${BOUNCER_URL}\"" | sudo tee -a "$ENV_FILE" >/dev/null
fi

# DIRECT_URL already points at real Postgres (added by deploy). If missing, add it.
if ! grep -q '^DIRECT_URL=' "$ENV_FILE"; then
  echo "DIRECT_URL=\"$PG_URL\"" | sudo tee -a "$ENV_FILE" >/dev/null
fi

log "PG_BOUNCER_URL added to .env (backend restart needed)"

# --- 7. Smoke test the pooled connection -----------------------------------
if command -v PGPASSWORD >/dev/null 2>&1; then :; fi
PGPASSWORD="$DB_PASS_DEC" psql -h 127.0.0.1 -p "$BOUNCER_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 'pgbouncer-ok'" >/dev/null 2>&1 \
  || die "Pooled connection smoke test FAILED (try: PGPASSWORD=... psql -h 127.0.0.1 -p $BOUNCER_PORT -U $DB_USER -d $DB_NAME)"

log "✅ Pooled connection verified: psql via 127.0.0.1:$BOUNCER_PORT"

# --- 8. Restart backend through PM2 -----------------------------------------
if command -v pm2 >/dev/null 2>&1; then
  log "Restarting maxp-backend + webhook-worker through pooler..."
  pm2 restart maxp-backend --update-env || true
  pm2 restart maxp-webhook-worker --update-env || true
  sleep 5
  curl -fsS --max-time 20 "http://127.0.0.1:$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2-)/api/v1/health" >/dev/null \
    && log "✅ Backend healthy after PgBouncer switch" \
    || log "⚠️ Backend health check failed — check: pm2 logs maxp-backend"
fi

log "DONE. Backend now routes queries through PgBouncer (transaction pooling)."
echo
echo "To roll back:  sudo sed -i '/^PG_BOUNCER_URL=/d' $ENV_FILE && pm2 restart maxp-backend --update-env && sudo systemctl stop pgbouncer"