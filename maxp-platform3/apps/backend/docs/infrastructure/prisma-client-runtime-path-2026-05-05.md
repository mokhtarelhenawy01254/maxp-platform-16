# Prisma Client Runtime Path - 2026-05-05

## Context

Production runs against PostgreSQL. The deployment workflow excludes generated clients from the backend tarball, then runs `prisma generate --schema=prisma/schema` on the server and writes the active PostgreSQL client to `backend/prisma/generated/postgresql_v2`.

The repository can also contain `backend/generated/verify_client`, but that generated client may be tied to the legacy MySQL schema and must not be used for PostgreSQL runtime connections.

## Change

- `services/sharedDatabase.js` resolves Prisma client paths from the active database URL.
- PostgreSQL tries `prisma/generated/postgresql_v2` first, then `node_modules/.prisma/client`, then `@prisma/client`.
- PostgreSQL deliberately skips `generated/verify_client` so stale MySQL clients cannot be loaded against a PostgreSQL `DATABASE_URL`.
- MySQL routing still uses `@prisma/client`.
- Added `tests/services/sharedDatabase.clientPath.test.js` to lock this path selection down.

## Operational Impact

This prevents deploy scripts such as marketplace catalog sync from loading a stale MySQL Prisma client while production is configured for PostgreSQL. If `prisma/generated/postgresql_v2` is missing after deploy, the fix belongs in the deploy generation step, not in switching runtime code to `generated/verify_client`.
