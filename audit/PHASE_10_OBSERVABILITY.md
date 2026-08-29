# PHASE 10 — OBSERVABILITY / OPERATIONS AUDIT

## 10.1 Ranked gaps

| # | Sev | Class | Gap | Evidence |
|---|---|---|---|---|
| O1 | CRITICAL | CONFIRMED | Winston logger is DEAD CODE (1 require repo-wide); real logging = ~11,425 raw console.* statements; prod monkey-patches console to regex-filter noise (installProductionLogFilter.js); PM2 logs unrotated + `pm2 flush` on deploy deletes history | utils/logger.js:60-104 unused; workers/webhookWorker.js:8-21; deploy.yml:358 |
| O2 | CRITICAL | CONFIRMED | Failed webhook jobs vanish silently: no BullMQ failed-event alert, no DLQ, removeOnFail evicts after 1000; ingestion-level EMPTY catches guarantee some events never reach the queue (webhookController.js:365-367 log commented out, :375-376 empty, :397-407 empty) while 200 OK already returned to provider; enqueue failure console-only (webhookQueue.js:36) | Facebook customer messages can be dropped with zero trace |
| O3 | CRITICAL | CONFIRMED | No error tracking service in backend (no Sentry dep); telegramAlertService covers only uncaughtException/unhandledRejection (server.js:127,157) + HTTP 500s (:1409-1413). Background jobs/crons/workers/syncs uncovered | |
| O4 | HIGH | CONFIRMED | All 19 crons: catch → console only. No success heartbeat, no missed-run detection, no alert. A nightly cron failing for months = invisible | leadFollowUpCron.js:9-14; statsScheduler.js:14-26; taskDeadlineCron.js:16+ |
| O5 | HIGH | CONFIRMED | No metrics pipeline at all (no prom-client/bull-board); performanceMonitor middleware only sets X-Response-Time header + console.warn >1s / console.error >3s (performanceOptimization.js:40-44) | |
| O6 | HIGH | CONFIRMED | Silent swallows in state-critical paths beyond Phase 6 list: taskNotificationService.js:212-214,324-326 (deadline reminders never sent, silently); turboStatusSyncService.js:175-177,297-299 (courier metadata parse → `{}`); WhatsAppManager.js:4458,6056,6154,6161 (empty catches in session lifecycle); payrollService.js:133 | |
| O7 | MED-HIGH | CONFIRMED | DB health doesn't notify: circuit-breaker transitions have commented-out logs (optimizedSharedDatabase.js:76,86); integrity alert calls NONEXISTENT `sendIntegrityAlert()` method wrapped in `.catch(()=>{})` (sharedDatabase.js:432-441) — the one DB alert that exists always fails silently; no pool-exhaustion (P2024) handling/alerting | Pool exhaustion currently "handled" by PM2 restart (max_memory_restart 1200M, nightly 4am recycle) |
| O8 | MEDIUM | CONFIRMED | Prisma slow-query monitoring disabled on production client (`log:['error']`, sharedDatabase.js:182); slow-query hook exists only in dev/dead client | |
| O9 | MEDIUM | CONFIRMED | CI has no test gate (full jest never runs pre-deploy; syntax checks only, deploy.yml:74-77,199-204); schema applied via `db push --accept-data-loss` server-side (deploy-remote.sh:487,494); post-deploy health check good but NO auto-rollback | |

## 10.2 Operations that fail silently today (consolidated inventory)
1. Facebook message processing failures pre-queue (O2)
2. Webhook queue enqueue failures (200 already sent)
3. BullMQ jobs exhausting retries → Redis eviction
4. Wallet credit/cashback/notification swallows (Phase 6 T9/T8/WALLET-3)
5. Cron failures of any kind
6. DB integrity alerts (nonexistent method)
7. Task deadline notifications
8. WhatsApp session lifecycle errors
9. Turbo courier payload misparses

## 10.3 Positives to keep
- Post-deploy `/api/v1/health` polling with retries (deploy-remote.sh:560-607) + marketplace/nginx smoke checks.
- Telegram fatal-crash + API-error alerting channel.
- PM2 memory caps + nightly restart as outage mitigation.
- Per-file try/catch discipline in crons (structure exists — just needs an alert sink).
