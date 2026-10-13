---
name: postgresql-database-mastery
description: High-performance PostgreSQL database engineering, schema design, multi-tenant isolation (companyId), query optimization, indexing strategies (B-Tree, GIN, BRIN), connection pooling, transactions, JSONB operations, and zero-downtime migrations for Node.js/Express backends. Use whenever designing tables, optimizing slow queries, writing migrations, debugging database deadlocks, or auditing tenant data isolation.
---

# PostgreSQL Database Mastery & Multi-Tenant Architecture

## Core Architectural Rules

### 1. Mandatory Multi-Tenant Segregation
- **Always Scope by `company_id` (or `companyId`):** Every multi-tenant table (orders, customers, products, payments, transactions, audit logs) MUST include a tenant identifier column.
- **Index Composite Keys:** Always create composite indexes with `company_id` as the leading column:
  ```sql
  CREATE INDEX idx_orders_company_status ON orders (company_id, status, created_at DESC);
  ```
- **Defense Against Cross-Tenant Leakage:** Ensure repository and service layers strictly inject `company_id` into all `WHERE`, `UPDATE`, and `DELETE` clauses.

### 2. Mandatory Secret Storage Law (`public.ai_keys`)
- **Zero AI Keys in `.env`:** All AI provider keys (Google, Gemini, OpenAI, Anthropic, Veo, etc.) MUST be stored in `public.ai_keys`:
  ```sql
  SELECT key, provider, priority 
  FROM public.ai_keys 
  WHERE is_active = true 
    AND (company_id = $1 OR key_type = 'CENTRAL')
  ORDER BY priority ASC, created_at ASC;
  ```
- **Connection Isolation:** Query keys dynamically per request/job with short-lived cache (30-60s) to enable immediate key rotation without service restarts.

### 3. Query Optimization & Indexing Strategies
- **B-Tree:** Default for equality (`=`), range (`<`, `>`, `BETWEEN`), and sorting (`ORDER BY`).
- **GIN (Generalized Inverted Index):** Mandatory for `JSONB` document attributes and array columns:
  ```sql
  CREATE INDEX idx_products_metadata_gin ON products USING gin (metadata jsonb_path_ops);
  CREATE INDEX idx_ad_campaign_targeting_gin ON ad_campaigns USING gin (targeting);
  ```
- **Partial Indexes:** Use for sparse states (e.g., active orders, unhandled webhooks, failed syncs):
  ```sql
  CREATE INDEX idx_orders_pending_sync ON orders (id, updated_at) 
  WHERE sync_status = 'PENDING';
  ```
- **Covering Indexes (`INCLUDE`):** Include frequently selected columns in the index leaf pages to enable Index-Only Scans:
  ```sql
  CREATE INDEX idx_inventory_lookup ON inventory (product_id, warehouse_id) 
  INCLUDE (quantity_on_hand, reserved_quantity);
  ```

### 4. Connection Pooling & Node.js Hygiene
- **Never Allocate Unbounded Connections:** Use `pg.Pool` or PgBouncer with strict sizing:
  - Max connections per Node instance: `10 - 20`
  - Connection timeout: `5000ms`
  - Idle timeout: `10000ms`
- **Always Release Clients in `finally`:**
  ```javascript
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // operations...
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  ```

### 5. Safe Zero-Downtime Migrations
- **Never Add Columns with Volatile Defaults:**
  - In PostgreSQL 11+, `DEFAULT <constant>` without `NOT NULL` is instantaneous (metadata only).
  - For `NOT NULL DEFAULT <constant>`, add column as nullable first, backfill in batches, then `SET NOT NULL`.
- **Add Indexes Concurrently:**
  ```sql
  CREATE INDEX CONCURRENTLY idx_customer_phone ON customers (phone);
  ```
- **Lock Timeouts:** Always set short lock timeouts in migration scripts:
  ```sql
  SET lock_timeout = '3s';
  ```

### 6. JSONB Performance Best Practices
- Use `jsonb_path_ops` when querying with `@>` containment operators.
- Extract scalar values with `->>` for text comparison, but cast explicitly: `(metadata->>'price')::numeric`.
- Avoid storing frequently updated counters inside JSONB; keep them in typed scalar columns to avoid entire JSONB document rewriting (WAL amplification).
