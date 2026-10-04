# Deploy Schema Guard — 2026-10-04

## Context

Production schema sync runs `prisma db push --accept-data-loss` automatically inside
`scripts/deploy-remote.sh` (Step 3) whenever `PRISMA_CHANGED=true` (from `deploy.yml`)
or the schema hash changed since the last deploy. This is fast, but the
`--accept-data-loss` flag could silently apply destructive changes (dropped
columns/tables) to production.

## Change

Two guardrails added around the existing db push (no behavior change for
non-destructive deploys):

1. **Pre-push schema guard** — before the push, the script builds
   `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel <combined schema>`
   and counts destructive statements (`DROP TABLE/COLUMN/SCHEMA/INDEX/CONSTRAINT`).
   - Zero destructive ops → prints `🛡️ SCHEMA GUARD: drift reviewed — zero destructive operations` and proceeds.
   - Destructive ops found → prints the offending statements and **refuses the push
     (exit 1)** unless the deploy is explicitly re-run with `ALLOW_SCHEMA_DROPS=true`,
     in which case it warns loudly and continues.
   - Diff unavailable (missing DATABASE_URL / diff failure) → proceeds unguarded with a
     loud warning (deploy availability is never gated on the guard tooling itself).
2. **Post-push report** — after the push, the same diff is re-run; it must report
   `✅ POST-PUSH REPORT: database schema fully matches prisma/schema — zero residual
   drift.` or print the residual statements as a warning for manual follow-up.

## Deliberately unchanged

- The superseded-skip logic in `deploy.yml` (build job `Skip if superseded by a newer
  commit`, deploy job `Skip deploy if superseded while waiting in queue`) is intentional
  rolling-deploy design: when commits race on `main`, only the newest run deploys and the
  older run exits green to avoid redundant work. These skips should not be turned into
  hard failures — doing so would flag healthy races as broken deploys.

## Operational notes

- `ALLOW_SCHEMA_DROPS=true` is the explicit escape hatch for intentional destructive
  migrations (e.g., approved column removal). It must be set deliberately per deploy.
- `prisma db push` does not record applied changes in `_prisma_migrations`; that table
  only reflects historical manual `migrate deploy` runs (last: 2026-07-14). The post-push
  report is now the authoritative "schema matches" signal in deploy logs.
- The `prisma/schema/migrations/` directory is an archive of hand-applied SQL history and
  is NOT applied by the pipeline (single hardcoded exception: the 20261001 legacy-plans
  cleanup executed via `db execute` before the push).
