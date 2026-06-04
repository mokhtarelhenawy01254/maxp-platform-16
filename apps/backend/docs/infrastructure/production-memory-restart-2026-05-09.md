# Production Backend Memory Restarts - 2026-05-09

## Symptom

Production `maxp-backend` was restarting repeatedly under PM2. The PM2 daemon log showed restarts caused by `max_memory_restart`, not application crashes:

`Process 2 restarted because it exceeds --max-memory-restart value`

## Cause

The backend normally starts with a large memory baseline because it loads the dashboard API, AI runtime, Telegram, WhatsApp sessions, and media proxy paths in one process. On 2026-05-09, active WhatsApp/Facebook inbox traffic added repeated conversation polling, notification polling, frontend console-error logging, and failed Facebook avatar proxy fetches. The PM2 limit was still `1G`, so routine traffic pushed RSS beyond the configured threshold and PM2 recycled the backend every few minutes.

There was also a PM2 module override at `/root/.pm2/module_conf.json` pinning `maxp-backend:max_memory_restart` to `1G`, so changing only `ecosystem.config.js` did not update the live process.

## Fix

- Raised the production backend PM2 memory restart threshold to `2G`.
- Added production log filtering for noisy WhatsApp router, notifications, and repeated avatar proxy warnings.
- Suppressed empty frontend `Console Error` pings, which had no stack and created high-volume noise.
- Added short-lived in-process negative caches for failed remote image fetches and customer avatar resolution, so repeated Facebook 404/400 avatar failures return the fallback instead of repeatedly fetching/logging the same failed asset.

## Verification

After the live PM2 override was updated with `pm2 set maxp-backend:max_memory_restart 2G`, `pm2 describe maxp-backend` reported `max_memory_restart 2G`, PM2 stayed online, and `http://127.0.0.1:3008/api/v1/health` returned OK.
