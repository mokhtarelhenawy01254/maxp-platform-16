# Production Backend Memory Restart Storm + /my-apps 400 - 2026-08-31

## Symptom

`https://maxp.online/marketplace` and `https://maxp.online/my-apps` loaded
intermittently ("مرة تحمل ومرة لأ") and `/my-apps` showed an error toast
("حدث خطأ أثناء تحميل بيانات المتجر" + "⚠️ يجب تحديد الشركة لعرض التطبيقات").

## Root Causes

### 1. Backend restart storm (memory cap too low → nginx connection-refused windows)
- `maxp-backend` had `max_memory_restart: '1200M'`. Baseline RSS of the single
  process (WhatsApp sessions + AI runtime + media proxy + Prisma) fluctuates
  **800-1135MB** under normal traffic, so it kept crossing 1200M and PM2
  recycled it every few minutes (**~250-260 restarts**).
- During each restart, port 3007 is briefly unbound → nginx logs
  `connect() failed (111: Connection refused)` → both pages fail to load.
- This was a recurrence of the documented 2026-05-09 incident
  (`production-memory-restart-2026-05-09.md`); the 2G fix had been reverted to
  a 1200M "recycle" heuristic.

### 2. 27 orphan Node test/debug processes (~1.5GB RSS + ~95 PG connections)
- Leftover `node -e`, `_reverify_final.js`, `_auto_test2.js`, `_verify_sync.js`,
  `_full_test.js`, `retry-delivered-969975.js` etc. from interrupted Aug 24-26
  debug/test sessions were still running, holding memory + Postgres connections
  (191 total vs `max_connections=300`). Swap was 86% used.

### 3. `/api/v1/my-apps` returned 400 for company-less tokens
- `companyAppsController.getMyApps` returned `400 "يجب تحديد الشركة"` when
  `req.user.companyId` was null (SUPER_ADMIN tokens carry `companyId: null`),
  so the page showed error toasts instead of a graceful empty state.

## Fixes

### Immediate (server, applied live)
- Killed all 27 orphan Node processes → freed ~1.5GB + PG connections dropped
  191 → ~32.
- `pm2 set maxp-backend:max_memory_restart 2G` + `pm2 save` (persisted in
  `module_conf.json` + `dump.pm2`).
- Installed `pm2-logrotate` (20M / 7 retained / gzip / daily).

### Code (committed + deployed)
- **`ecosystem.config.js`**: `max_memory_restart: '2G'`; added 2026 PM2
  hardening — `min_uptime: '60s'`, `max_restarts: 20`, `restart_delay: 2000`,
  `exp_backoff_restart_delay: 500`, `kill_timeout: 20000`,
  `listen_timeout: 30000`. Same for `maxp-webhook-worker`.
- **`services/sharedDatabase.js`**: Prisma `connection_limit` 80 → 25
  (configurable via `DATABASE_CONNECTION_LIMIT`). A fixed 80/process kept
  ~190 live connections near the 300 cap and amplified memory pressure.
- **`controller/companyAppsController.js`**: `getMyApps` returns
  `{ success: true, data: [], companyId: null }` (200) instead of 400 when
  `companyId` is absent — company-less (SUPER_ADMIN) sessions see an empty
  list, not an error.

### Recurrence prevention
- **Watchdog cron** (`/usr/local/bin/maxp-watchdog.sh`, every 5 min via
  `/etc/cron.d/maxp-watchdog`): kills orphan test/debug Node processes and
  any `node -e` running > 48h; logs to `logs/watchdog.log`. Never touches
  `server.js` / `webhookWorker`.
- **Auto-heal stuck HistoryImport** (`WhatsAppManager.healStuckHistoryImports`,
  commit `3b2cf6e2`): any `whatsapp_session_history_imports` row stuck in
  `IN_PROGRESS`/`REQUESTED` with `updatedAt` older than **1 hour** is
  force-completed to `COMPLETED` (with an `AUTO-HEALED` note) automatically.
  Runs from both `runHealthCheck` (every 25s, heal cooldown 10 min) and
  `requestReconnect` (before reading import status). This prevents the root
  driver of memory growth: a stuck import made every reconnect enable
  `syncFullHistory=true` (re-downloading full history + profile pics → ~60%
  sustained CPU + unbounded RSS → periodic restarts). Verified live with a
  synthetic 2h-old `IN_PROGRESS` row → healed within 40s.

## Root Cause (deeper, found 2026-08-31 re-check)

The 2G cap + orphan cleanup stopped the restart storm, but re-checking showed
RSS still growing (~100MB/min) with sustained ~60% CPU. Investigation found a
**stuck `whatsapp_session_history_imports` row** (session
`cmt3475qi00dljuivpaex1bev`, company العناية بالسيارات) left `IN_PROGRESS`
since **2026-08-24** (~8 days). Every session reconnect
(`WhatsAppManager.requestReconnect` → `syncFullHistory` derivation) saw that
row as `IN_PROGRESS` → enabled `syncFullHistory=true` → re-downloaded full
history + 402 profile pics every ~12 minutes → the memory/CPU growth.

**Fix applied live**: the stuck row was force-completed manually, and the
auto-heal guard above was added so this can never recur silently.

## Verification
- `pm2 describe maxp-backend` → `max_memory_restart 2G`, process stable.
- PG connections: 191 → 32. Orphan count: 27 → 0.
- `/api/v1/my-apps` → `200 {"success":true,"data":[]}` (was 400).
- `/marketplace` loads 115 apps in browser; `/my-apps` shows clean empty state.
- `maxp.online/api/v1/health` → 200 (database connected).