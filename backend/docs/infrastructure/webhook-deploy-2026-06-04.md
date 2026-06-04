# Webhook-Based Deployment Infrastructure

**Date:** 2026-06-04  
**Author:** Engineering Team  
**Status:** Production

---

## Overview

Replaced SSH-push deployment with a **webhook-pull** model to bypass Hostinger cloud firewall restrictions that blocked GitHub Actions runners from SSH-ing into the production server.

## Architecture

```
GitHub Actions (ubuntu-latest)
  │
  │  1. Run CI checks (docs, arabic strings, file size)
  │  2. Run backend tests (jest)
  │  3. Build & validate frontend
  │
  │  4. POST /deploy  ──► http://153.92.223.119:9001
  │     (HMAC-SHA256 signed)
  │
  ▼
Deploy Webhook Server (port 9001, PM2: maxp-deploy-webhook)
  │
  │  5. Verify HMAC signature
  │  6. Spawn deploy.sh in background
  │
  ▼
server-deploy.sh
  ├── git pull origin main (using GITHUB_TOKEN)
  ├── npm run build (frontend)
  ├── rsync frontend/dist → /var/www/frontend2/dist
  ├── rsync backend → /var/www/backend2
  ├── npm ci --omit=dev
  ├── prisma generate + db push
  ├── pm2 startOrReload ecosystem.config.js
  └── Health check (curl /api/v1/health)
```

## Files

| File | Location | Purpose |
|------|----------|---------|
| `deploy-webhook-server.js` | `scripts/` + `/opt/deploy-webhook/server.js` | HTTP webhook listener (Node.js, no deps) |
| `server-deploy.sh` | `scripts/` + `/opt/deploy-webhook/deploy.sh` | Full server-side deploy script |
| `setup-deploy-webhook.sh` | `scripts/` | One-time server setup helper |
| `upload-github-secrets.js` | `scripts/` | Encrypt + upload GitHub repo secrets |
| `.github/workflows/deploy.yml` | `.github/workflows/` | Updated CI/CD pipeline |

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `DEPLOY_WEBHOOK_URL` | `http://<SERVER_IP>:9001` |
| `DEPLOY_WEBHOOK_SECRET` | HMAC-SHA256 shared secret for request signing |
| `MAXP3_CHECKOUT_TOKEN` | GitHub PAT for private repo checkout |

## Server Setup

Webhook server runs as PM2 process `maxp-deploy-webhook` on port `9001`.  
UFW allows `9001/tcp` from anywhere.  
Logs: `/var/log/maxp-deploy-webhook.log` and `/var/log/maxp-deploy.log`

## Why Not SSH?

Hostinger's cloud-level firewall (hPanel) blocks inbound connections from GitHub Actions runner IPs (which change every run) to port 22. The UFW inside the server allows port 22 from anywhere, but the Hostinger cloud firewall sits in front of the VPS and cannot be modified programmatically.

The webhook approach inverts the connection direction:
- ❌ GitHub → Server (SSH) — blocked by Hostinger
- ✅ GitHub → Server (HTTP POST port 9001) — allowed  
- ✅ Server → GitHub (git pull) — always works

## Security

- All webhook requests are verified with HMAC-SHA256 using a shared secret
- The deploy script runs with the server's own user permissions
- GitHub token stored in `/opt/deploy-webhook/.env` (root-only readable)
- Deployment log captures all output for audit trail
