# Error-only server log

## Context

Production log review on May 8, 2026 found that PM2/Nginx logs mix deploy reload noise,
frontend console reports, optional integration warnings, image proxy fallbacks, and genuine
backend errors. This made triage slow because the useful error signal was spread across
`err-*.log`, `out-*.log`, `combined.log`, and Nginx logs.

## Change

- Added `backend/utils/errorOnlyLog.js`.
- In production, backend and webhook worker processes now mirror `console.error`,
  uncaught exceptions, and unhandled rejections into `logs/errors-only.jsonl`.
- The error-only log redacts common secret fields and bearer/query tokens.
- The file rotates with `ERROR_ONLY_LOG_MAX_BYTES` and `ERROR_ONLY_LOG_MAX_FILES`
  defaults of 20 MB and 3 retained rotated files.
- PM2 now uses `merge_logs: true` so the configured app log paths stay stable instead
  of switching to process-id suffixes such as `err-2.log`.
- Repeated Facebook profile lookups that return Graph API code `100` / `No matching user
  found` are treated as expected negative lookups and cached briefly instead of spamming
  production error logs.

## Operations

Use this for focused error triage:

```bash
cd /var/www/backend2
tail -n 200 logs/errors-only.jsonl
```

Use the broader PM2/Nginx logs only when the error-only stream points to an upstream,
deploy, or request-routing issue.

## Error signature tracker

Use the signature report when the raw JSONL file starts to grow:

```bash
cd /var/www/backend2
npm run logs:error-report -- --limit 20
```

The report scans `logs/errors-only.jsonl` plus rotated siblings, groups volatile
copies of the same problem into one signature, and writes
`logs/error-signature-state.json` so the next run can show new entries since the
previous check.

Useful variants:

```bash
npm run logs:error-report -- --since 6h --limit 30
npm run logs:error-report -- --json --no-write-state
node scripts/report-error-signatures.js --file logs/errors-only.jsonl --max-rotated 3
```

Current classifiers include Prisma/runtime database issues, deploy/upstream gaps,
AI provider failures, Facebook Graph errors, browser notification failures,
frontend auth noise, uncaught exceptions, and unhandled rejections. Frontend
`suppressedDuplicates` values are counted as additional occurrences so throttled
browser noise is still visible in aggregate without flooding the log.

## Follow-up: recurring frontend noise

The first production entries in `logs/errors-only.jsonl` showed two high-volume
frontend errors:

- `/super-admin/dev-tasks` was logging a 403 every 30 seconds from the Super Admin
  active-users background poll. The poll now treats 401/403 as a silent background
  miss and still resets the badge count.
- The backend `/api/v1/errors/log` endpoint now throttles identical production
  frontend errors for five minutes and reports the suppressed duplicate count on
  the next logged copy. This keeps stale browser tabs from flooding the
  error-only ledger while preserving the signal for follow-up.
- Mobile Facebook/WhatsApp inbox sessions could throw `Illegal constructor. Use
  ServiceWorkerRegistration.showNotification() instead.` when using the browser
  `Notification` constructor. Shared browser notification handling now falls back
  to `ServiceWorkerRegistration.showNotification()` when required, and the inbox
  pages route through that shared helper.

## Follow-up: deploy reload gap

The error-only log also captured short-lived startup failures during deploy:
`@prisma/client did not initialize yet`. Nginx showed matching `connect() failed`
bursts while PM2 recovered.

The deploy workflow now avoids deleting live `node_modules` during backend file
sync, uses an incremental production install on the server instead of `npm ci`,
keeps generated Prisma output out of the destructive rsync path, and normalizes the
preserved production `.env` to `PORT=3008`. This keeps the currently running app's
dependencies available until the final PM2 reload. Run metadata and deployment
secrets are passed into the long SSH script as environment variables so GitHub's
workflow expression parser does not reject the script block for expression length.

## Follow-up: guest order customer creation

After the error-only log quieted the repeated frontend entries, it exposed a
storefront guest-order path failing with `PrismaClientValidationError: Argument
company is missing`. Customer creation in `publicOrdersRoutes.js` now connects the
required `company` relation instead of relying on unchecked `companyId` writes, and
keeps `lastName` as an empty string rather than `null` for the required field.

The workflow syntax was validated after this change and the follow-up deploy run
is used to confirm GitHub Actions can execute the updated deployment path.
