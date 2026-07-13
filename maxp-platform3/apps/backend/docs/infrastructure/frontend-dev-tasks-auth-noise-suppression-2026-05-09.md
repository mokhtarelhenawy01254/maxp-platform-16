# Frontend Dev Tasks Auth Noise Suppression - 2026-05-09

## Context

The error-only tracker showed repeated `frontend.dev_tasks_403` signatures from browser sessions sitting on `/super-admin/dev-tasks`. The payloads were frontend console captures of expected authorization failures:

- `Console Error`
- URL path `/super-admin/dev-tasks`
- stack line `AxiosError: Request failed with status code 401/403`

These entries were not backend crashes and were already throttled, but stale browser tabs could keep refreshing the same signature into `logs/errors-only.jsonl`.

## Change

The source fix is in `frontend/src/components/layout/SuperAdminLayout.tsx`: the active-users poll now checks the JWT role from `tokenManager` before calling `/system/active-users`. The request only starts when both the hydrated user role and the access-token role are `SUPER_ADMIN`.

`backend/controller/errorController.js` also suppresses only this narrow class of frontend auth noise before it is written to the production error log, which protects against stale browser chunks that were loaded before the frontend fix:

- page path starts with `/super-admin/dev-tasks`
- payload indicates `401`, `403`, `unauthorized`, or `forbidden`

Other frontend errors from the same page, such as `500` responses or runtime exceptions, continue through the existing throttle and are still tracked.

## Verification

Run the focused controller regression:

```bash
npx jest tests/controller/errorController.throttle.test.js --runInBand --testTimeout=30000
```

Run frontend type checking after the active-users guard change:

```bash
npm run type-check
```

After deploy, confirm the report no longer accumulates new `frontend.dev_tasks_403` entries:

```bash
npm run logs:error-report -- --since 30m --limit 10 --no-write-state
```
