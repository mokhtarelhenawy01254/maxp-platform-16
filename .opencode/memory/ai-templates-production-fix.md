# AI Templates Production Fix (2026-06-21)

## Problem
AI templates page at /super-admin/ai-templates showed "جاري التحميل..." because ai-service DB table `ai.agent_templates` was empty.

## Root Cause
Production ai-service runs via **PM2** (`/var/www/ai-service`), **not Docker**. The `AGENTS_TEMPLATES_ROOT` env var was missing from the active `.env` file. The main deploy script at `.github/workflows/deploy.yml` restores the old `.env` after syncing files, so `.env.production` changes are ignored.

## Fix Applied on Server (153.92.223.119)
1. Appended `AGENTS_TEMPLATES_ROOT=/var/www/backend2/agents` to `/var/www/ai-service/.env`
2. Restarted: `pm2 restart maxp-ai-service --update-env`
3. 12 templates auto-seeded into DB via FastAPI lifespan

## Key Details
- PM2 cwd: `/var/www/ai-service`
- Script: `/root/.local/bin/uv run uvicorn src.main:app --host 0.0.0.0 --port 8000`
- Auth token: `f0b49b31cf42dd8d15a2e250e47588adadac6ca805a38f0d01ad6a61835eac97`
- Templates count: 12 (verified via GET /admin/agent-templates)
- To reseed manually: `POST /admin/templates/seed` (not `/admin/agent-templates/seed`)

## Long-term Fix Needed
Update `.github/workflows/deploy.yml` to copy `.env.production` → `.env` during deployment, instead of restoring the old `.env`.
