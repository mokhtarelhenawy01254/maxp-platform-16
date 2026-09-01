# Multi-Tenant AST Isolation & Connection Pool Hardening (2026-09-01)

## Context & Problem
- In prior iterations, tenant isolation was implemented by wrapping every single query in an interactive `client.$transaction(async (tx) => ...)` that executed `SELECT set_config('app.current_company_id', ...)`.
- Under PgBouncer transaction pooling (`pool_mode = transaction`), interactive transactions hold dedicated pool connections across client round-trips.
- PostgreSQL lacked `idle_in_transaction_session_timeout` and `statement_timeout`, resulting in hanging transactions holding pool connections hostage and causing 30s timeouts (`query_wait_timeout`) and cascading memory leaks.

## Architecture Solution (2026 Standard)
1. **Prisma AST Auto-Tenant Extension:**
   - Single-query AST injection inside Prisma Client `$extends`:
     - Reads: Injects `where.companyId`.
     - `findUnique`: Routed to scoped `findFirst` to prevent unique index constraint errors.
     - Writes: Injects `data.companyId` and `where.companyId`.
   - Global models (`GLOBAL_MODELS`: Company, User, PlatformSetting, Dev models) are bypassed automatically.
   - Zero transaction overhead for standard reads and single writes.
2. **Tenant Context Bypass Support:**
   - Added `tenantContext.bypass(callback)` and `tenantContext.isBypassed()` for administrative and cross-tenant workloads.
3. **Database & Pooler Hardening:**
   - PostgreSQL: `idle_in_transaction_session_timeout = '20s'`, `statement_timeout = '30s'`.
   - PgBouncer: `default_pool_size = 60`, `max_db_connections = 120`, `min_pool_size = 10`, `reserve_pool_size = 10`, `client_idle_timeout = 60`.
   - Matched `MAX_CONCURRENT_QUERIES = 40` with `DATABASE_CONNECTION_LIMIT = 40`.

## Verification & Metrics
- Unit tests: `tests/services/sharedDatabase.tenant.test.js` & `tests/services/sharedDatabase.rls.test.js` pass 100%.
- PgBouncer transaction duration (`avg_xact_time`) dropped from 12.65s to 11ms (1150x improvement).
- Connection queue wait time dropped from 2.81s to 1.7ms.
- Health endpoint response latency: 10ms.
