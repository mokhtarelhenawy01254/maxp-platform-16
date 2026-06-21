# MaxP AI Service — Server Deployment Guide

> **One script. One command. Done.** This guide targets a fresh Ubuntu 22.04/24.04 server that already runs the MaxP Node.js backend (PM2 on port 3007).

## Recent Changes

- **2026-06-21 — Fix AiSetting schema mismatch**: Added `__table_args__ = {"schema": "ai"}` to `AiSetting` ORM model and replaced raw-SQL GET endpoints with ORM queries. Run `alembic upgrade head` to create `ai.ai_settings` table.
- **2026-06-21 — Model visibility lockdown**: Model selection moved entirely to super-admin side (`/super-admin/ai-templates`). Company clients no longer see or control the AI model. Agent files PUT no longer accepts `model` from company requests. Super-admin `apply-template` endpoint now accepts `model` parameter.

## 0. Prerequisites (one-time, on the existing server)

You need **exactly one** A-record in DNS:

| Type | Name | Value |
|------|------|-------|
| A    | `ai`  | `<SERVER_IP>` (under parent domain `maxp-ai.pro`) |

> The parent `*.maxp-ai.pro` wildcard already points to the same server (used by the main site). The wildcard SSL cert at `/etc/letsencrypt/live/maxp-ai.pro-0001/` already covers `ai.maxp-ai.pro` — no new cert needed.

If your DNS panel is **Cloudflare**, do **one** of these:

- **Easiest**: add the A record above and set proxy status to **DNS only** (grey cloud). Caddy/Nginx will obtain/renew the cert via HTTP-01.
- **Or**: set proxy to **Proxied** (orange cloud) — works, but the cert is from Cloudflare (full strict), not Let's Encrypt.

> No new SSL cert is needed because the existing wildcard already covers `ai.maxp-ai.pro`.

## 1. One-shot bootstrap (run as root)

Paste this into an SSH session as root:

```bash
# Optional: pre-set API keys so .env is populated automatically
export GOOGLE_API_KEY="AIzaSy..."
export ANTHROPIC_API_KEY="sk-ant-..."  # optional fallback

curl -sSL https://raw.githubusercontent.com/elhenawym124-ops/maxp-ai-service/main/scripts/bootstrap.sh | sudo bash
```

The script will:
1. Install Docker (if missing) + base packages
2. Create `maxp_ai` Postgres database + `ai_service` user + `ai` schema
3. Clone the repo into `/opt/maxp-ai-service`
4. Generate `.env` with random secrets
5. Run Alembic migrations
6. Build & start the Docker container
7. Patch `/var/www/backend2/.env` to add `AI_SERVICE_URL` + `MAXP_SERVICE_TOKEN` + `AI_SERVICE_ENABLED_COMPANIES=*`
8. `pm2 restart maxp-backend`
9. Verify `/health` locally and publicly

You'll be prompted for the DB password if not pre-set.

## 2. Apply the nginx config (one-time per server)

The AI service needs an `ai.maxp-ai.pro` server block. **We already added it** to `nginx_configs/maxp-ai.pro.conf` in the MaxP repo. To deploy it, either:

### Option A — Trigger the existing deploy workflow
Push a no-op commit to `max_p_new` main, or manually run the `deploy.yml` workflow. The CI will rsync `nginx_configs/` and reload nginx.

### Option B — Manual one-liner (fastest)
```bash
# On the server, as root
sudo cp /var/www/backend2/../nginx_configs/maxp-ai.pro.conf /etc/nginx/sites-available/maxp-ai.pro.conf
# (path depends on how CI deploys it — usually /var/www/ is a symlink)
sudo nginx -t && sudo systemctl reload nginx
```

The `ai.maxp-ai.pro` block in the new config is at the **top** of the file, so nginx matches it before the existing wildcard block.

## 3. Verify

```bash
# Local
curl http://localhost:8000/health
# → {"status":"ok",...}

# Public
curl https://ai.maxp-ai.pro/health
# → {"status":"ok",...}

# End-to-end (with token from /opt/maxp-ai-service/.env)
TOKEN=$(grep '^SERVICE_AUTH_TOKEN=' /opt/maxp-ai-service/.env | cut -d= -f2)
curl -X POST https://ai.maxp-ai.pro/chat \
  -H "Content-Type: application/json" \
  -H "X-Company-Id: company-1" \
  -H "X-Customer-Id: test" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"مرحبا","thread_id":"t1"}'
```

## 4. Day-to-day operations

```bash
# View logs
cd /opt/maxp-ai-service && docker compose -f docker-compose.prod.yml logs -f

# Restart
cd /opt/maxp-ai-service && docker compose -f docker-compose.prod.yml restart

# Update code
cd /opt/maxp-ai-service && git pull && docker compose -f docker-compose.prod.yml up -d --build

# Update API keys
nano /opt/maxp-ai-service/.env
cd /opt/maxp-ai-service && docker compose -f docker-compose.prod.yml restart

# DB shell
PGPASSWORD=$(grep -oP 'postgresql\+asyncpg://[^:]+:\K[^@]+' /opt/maxp-ai-service/.env) \
  psql -h localhost -U ai_service -d maxp_ai

# Re-run bootstrap (idempotent)
cd /opt/maxp-ai-service && sudo bash scripts/bootstrap.sh
```

## 5. Architecture

```
Customer message
        │
        ▼
┌──────────────────────┐
│  Nginx (port 443)    │
│  *.maxp-ai.pro       │  ◀── wildcard SSL covers ai.maxp-ai.pro
│  ┌────────────────┐  │
│  │ ai.maxp-ai.pro │──┼──► :8000 (maxp-ai-service)  ◀── you are here
│  └────────────────┘  │
│  *.maxp-ai.pro       │──► :3007 (Node.js backend)  ◀── MaxP main
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│  maxp-ai-service     │
│  (FastAPI / MAF)     │
│  ┌────────────────┐  │
│  │  CEO agent     │  │
│  │  └ order spec  │  │
│  │  └ pay spec    │  │
│  │  └ ship spec   │  │
│  └────────────────┘  │
│  Tools: product,     │
│  order, refund, etc. │
└──────────────────────┘
        │
        │  httpx + Bearer token
        ▼
┌──────────────────────┐
│  MaxP Node backend   │
│  (port 3007)         │
│  /api/v1/...         │
└──────────────────────┘
```

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `502 Bad Gateway` on `ai.maxp-ai.pro` | Container not running: `docker ps`. Check `docker logs maxp-ai-service` |
| `404 Not Found` on `ai.maxp-ai.pro` | Nginx not reloaded with the new config. `sudo nginx -t && sudo systemctl reload nginx` |
| SSL error on first request | Wait ~60s for Certbot renewal; check `sudo certbot certificates` |
| Backend can't reach AI service | Check `AI_SERVICE_URL` in `/var/www/backend2/.env`; `pm2 logs maxp-backend` |
| `500` from AI service | Check `docker logs maxp-ai-service`; usually missing `GOOGLE_API_KEY` |
| Migrations fail | Check DB password in `.env` matches `ai_service` user's password |

For detailed architecture, see [the README](../../README.md) in the repo.
