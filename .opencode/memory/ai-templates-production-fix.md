# AI Templates Production Fix (2026-06-21)

## Problem
AI templates page at /super-admin/ai-templates showed "جاري التحميل..." because ai-service DB table `ai.agent_templates` was empty.

## Root Cause (v1)
Production ai-service runs via **PM2** (`/var/www/ai-service`), **not Docker**. The `AGENTS_TEMPLATES_ROOT` env var was missing from the active `.env` file. The main deploy script at `.github/workflows/deploy.yml` restores the old `.env` after syncing files, so `.env.production` changes are ignored.

## Fix Applied (v1 - 2026-06-21, earlier session)
1. Appended `AGENTS_TEMPLATES_ROOT=/var/www/backend2/agents` to `/var/www/ai-service/.env`
2. Restarted: `pm2 restart maxp-ai-service --update-env`
3. 12 templates auto-seeded into DB via FastAPI lifespan

## Root Cause (v2 - Settings still being overwritten on restart)
Even with AGENTS_TEMPLATES_ROOT correctly set, **every restart overwrote all template fields** from filesystem `agent.json` files. The `seed_templates()` function in `src/agents/loader.py` did a full `for key, value in data.items(): setattr(template, key, value)` on every FastAPI lifespan startup.

With maxp-ai-service having **2708 restarts** (PM2 uptime ~22m), user edits via the super-admin UI were silently reverted every ~22 minutes.

## Fix Applied (v2 - 2026-06-22, this session)
1. Modified `apps/ai-service/src/agents/loader.py` — `seed_templates()` now **skips existing templates** instead of overwriting them
2. Applied directly to production: SCP'd fixed `loader.py` to `/var/www/ai-service/src/agents/loader.py`
3. Restarted: `pm2 restart maxp-ai-service --update-env`
4. Committed to repo: `3c1d98e1`

## Key Details
- PM2 cwd: `/var/www/ai-service`
- Script: `/root/.local/bin/uv run uvicorn src.main:app --host 0.0.0.0 --port 8000`
- Auth token: `f0b49b31cf42dd8d15a2e250e47588adadac6ca805a38f0d01ad6a61835eac97`
- Templates count: 13 (12 original + 1 Blank created via UI)
- Server IP: `153.92.223.119`
- SSH user: `root`
- SSH key: `C:\Users\mokhtar\.ssh\id_ed25519`

## Related Issues Not Yet Fixed
1. `.github/workflows/deploy.yml` still restores old `.env` instead of copying `.env.production`
2. `seed_skills()` in `apps/ai-service/src/skills/__init__.py` has the same overwrite-on-restart pattern
