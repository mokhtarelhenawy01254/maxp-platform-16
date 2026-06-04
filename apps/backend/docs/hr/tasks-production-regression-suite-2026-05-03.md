# Tasks Production Regression Suite - 2026-05-03

## Command

Run from `frontend/`:

```bash
npm run test:tasks-production-smoke
```

The command writes a stable latest report to:

- `artifacts/tasks-production-regression-latest.md`
- `artifacts/tasks-production-regression-latest.json`

Each run also gets its own timestamped directory under `artifacts/tasks-production-regression-*`.

## Coverage

- Creates temporary external Tasks API credentials and revokes them during cleanup.
- Verifies invalid keys and disabled keys are rejected.
- Verifies read-only keys can read and cannot write.
- Verifies write-only keys cannot read and can write.
- Verifies read/write keys can read, create, move a task to `IN_PROGRESS`, complete it, and clean up the created task.
- Runs the production Tasks UI smoke suite across the main task sections.
- Runs the production Tasks UI write-flow suite with WhatsApp notification sending suppressed.
- Runs the production Tasks UI lifecycle suite with create, start, complete, delete, and browser/API error checks.

## Safety

- The runner does not print API secrets in reports.
- UI scripts suppress the WhatsApp send endpoint so production contacts are not notified by smoke tests.
- Temporary tasks are deleted through the internal Tasks API.
- Temporary credentials are revoked through the integrations API.

## Required Context

The runner can generate a short-lived local JWT when it is run in this repository with the backend environment files available.
In other environments, provide `TASK_REGRESSION_AUTH_TOKEN` or `TASK_UI_AUTH_TOKEN`.

## CI Integration

The production `Deploy to Server` workflow runs this suite after the deployment script completes successfully.
The workflow generates a short-lived JWT from `/var/www/backend2` over SSH, masks it in the GitHub log, runs the regression command from the GitHub runner, and uploads the generated reports as a workflow artifact.

If the regression suite fails, the deployment has already been applied but the GitHub Actions run is marked failed so the release needs follow-up.
