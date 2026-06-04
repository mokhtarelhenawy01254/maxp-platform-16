# ADR-001: Multi-Agent Orchestration with CEO Pattern

**Date:** 2026-06-03  
**Status:** Accepted  
**Deciders:** MaxP Engineering

## Context

The AI service needs to handle diverse customer requests (product search, order management, discount approvals, cancellations) with varying complexity and permission levels. A single monolithic agent would mix concerns and make it harder to enforce tenant isolation, approval flows, and cost caps per action type.

## Decision

Use a **CEO Orchestrator** pattern:

- `CEO Agent` — analyses intent and routes to the correct specialist agent
- `Support Agent` — product search, general inquiries (read tools)
- `Order Agent` — order tracking, modification, cancellation (read + write tools with approval)

Specialist agents are surfaced to the CEO as tools via `agent.as_tool()`. The framework handles delegation transparently.

## Consequences

**Positive:**
- Clear separation of concerns per agent
- Write actions are isolated to specific agents, making approval enforcement simpler
- CEO can be swapped/upgraded without touching specialist logic

**Negative:**
- Additional LLM call overhead for routing through CEO
- CEO must have a capable model (Claude Sonnet+) for reliable intent classification

---

# ADR-002: Human-in-the-Loop Approval for Write Actions

**Date:** 2026-06-03  
**Status:** Accepted

## Context

Write actions (discount creation, order cancellation, broadcast messages) are irreversible or costly. The AI should never execute these without merchant approval.

## Decision

Write tool implementations return `{"status": "awaiting_approval", ...}` instead of executing. The API layer intercepts this response, creates a draft via MaxP backend, and stores it in `ai.approvals`. The `POST /resume` endpoint enforces:

1. Draft lookup in DB
2. Cross-tenant check (request's `X-Company-Id` must match the draft)
3. Only approved drafts can be executed

## Consequences

**Positive:**
- Zero trust: AI cannot execute write actions directly
- All approvals are audited in `ai.approvals` with timestamps and decider info

**Negative:**
- Requires the MaxP backend to be available for draft creation/execution
- Adds latency for write flows (two round-trips: draft + resume)

---

# ADR-003: PostgreSQL with Async SQLAlchemy

**Date:** 2026-06-03  
**Status:** Accepted

## Context

The service needs durable storage for conversations, checkpoints, approvals, and audit logs. It must handle high concurrency without blocking the event loop.

## Decision

- **Database:** PostgreSQL 16 (same ecosystem as MaxP backend)
- **Driver:** `asyncpg` (native async, fastest async Postgres driver)
- **ORM:** SQLAlchemy 2.0 async with `DeclarativeBase`
- **Migrations:** Alembic with auto-generation
- **Schema:** All AI tables under `ai` schema for clean separation

## Consequences

**Positive:**
- Full async I/O — no thread pool contention
- SQLAlchemy provides type safety via Mapped annotations
- Alembic gives reliable migration history

**Negative:**
- Async SQLAlchemy has a different API than sync (e.g., `await session.execute`)
- ORM overhead compared to raw SQL for complex queries

---

# ADR-004: Tenant Isolation at the Middleware Layer

**Date:** 2026-06-03  
**Status:** Accepted

## Context

Multiple companies (tenants) use the same AI service. One tenant's data must never leak to another.

## Decision

Enforce tenant isolation via **FastAPI middleware**, not in application logic:

1. `TenantMiddleware` — extracts `X-Company-Id` and `X-Customer-Id` from headers into `request.state`
2. `ServiceAuthMiddleware` — validates `Authorization: Bearer <token>` against shared secret
3. All DB queries filter by `company_id`
4. `POST /resume` checks `approval.company_id != company_id` → HTTP 403

## Consequences

**Positive:**
- Developers can't forget to check tenant — middleware enforces it upstream
- Testable independently (test_tenant_isolation.py)
- Cross-tenant access raises a clear 403 at the API boundary, not a data leak

**Negative:**
- Tenant context is in `request.state` — need to pass it explicitly to background tasks
- Rate limiting is per-company, which increases memory footprint for the in-memory bucket

---

# ADR-005: Multi-Provider LLM with Failover

**Date:** 2026-06-03  
**Status:** Accepted

## Context

The service cannot have a single point of failure at the LLM provider level. If Anthropic is rate-limited or down, the system should degrade gracefully.

## Decision

The `LLMFallbackProvider` returns the first available client in priority order:

1. Anthropic (Claude Sonnet 4.6+) — primary
2. Google Gemini (Gemma 4) — secondary
3. OpenAI (GPT-4o) — tertiary

Each agent factory (`create_support_agent`, etc.) checks `settings.default_llm_provider` and constructs the appropriate client. The admin API (`/admin/keys`, `/admin/config`) allows dynamic API key management.

## Consequences

**Positive:**
- Zero-downtime LLM provider switching
- Provider priority can be updated at runtime via admin API
- Prometheus metrics track per-provider call counts and token usage

**Negative:**
- Different providers have different tool-calling capabilities — behavior may vary
- Cost tracking requires per-provider pricing tables

---

# ADR-006: OpenTelemetry for Unified Observability

**Date:** 2026-06-03  
**Status:** Accepted

## Context

The production service must have metrics, traces, structured logs, and error tracking — without coupling to any single vendor.

## Decision

- **Tracing:** OpenTelemetry SDK with OTLP HTTP exporter (compatible with Jaeger, Grafana Tempo, Datadog)
- **Metrics:** Prometheus client library at `/metrics` endpoint
- **Logging:** structlog with JSONRenderer and context vars
- **Errors:** Sentry SDK with FastAPI integration
- **Audit:** Custom `AuditMiddleware` logs all tool calls to `ai.tool_calls` table with PII redaction

## Consequences

**Positive:**
- Vendor-agnostic — switch backends by changing OTLP_ENDPOINT
- Structured logs + metrics + traces are correlated via thread_id and company_id
- PII is redacted at the logging boundary (pii.py handles deep recursive redaction + Arabic patterns)

**Negative:**
- OpenTelemetry adds ~5-10ms per request for span export
- Running OTLP collector adds infrastructure overhead
