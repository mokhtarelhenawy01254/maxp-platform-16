# Plan: maxp-ai-service

**Generated**: 2026-06-02
**Status**: Draft v1
**Owner**: MaxP Engineering
**Estimated Complexity**: High
**Estimated Duration**: 12 weeks (3 months) to v1.0
**Repository**: `H:\maxp-ai-service` (new repo, separated from MaxP)

---

## Overview

بناء خدمة Python مستقلة (`maxp-ai-service`) باستخدام **Microsoft Agent Framework** كـ AI brain لمشروع MaxP. الخدمة هتتكلم مع MaxP (Node.js) عبر HTTP فقط، هتشتغل في container مستقل، وهتستخدم نفس Postgres instance مع schema منفصل.

### Motivation
- MaxP's homegrown agent runtime (36 services) شغال، بس كل ما نحتاج feature جديد بنبني من الصفر
- Microsoft's Agent Framework (April 2026 GA) بيدّي HITL + OWASP + A2A + multi-provider native
- فصل الـ AI layer يخلي التجريب آمن على production، ويسهّل استبدال framework مستقبلياً

### Scope
- **In scope (v1.0)**: Support Agent + Approval workflow + Multi-tenant isolation
- **Out of scope (v1.0)**: Marketing/Inventory/Pricing agents، CEO orchestrator، vision/multimodal، A2A interop

---

## Goals & Non-Goals

### Goals
1. **Pilot on 1 tenant** بـ Support Agent + approval flow خلال 3 أسابيع
2. **Match MaxP's existing quality**: tenant isolation, audit trail, i18n
3. **Production-grade**: durable execution, checkpointing, observability
4. **Zero disruption to MaxP**: MaxP's existing support-agent يفضل شغال للـ tenants التانية
5. **Framework-agnostic boundary**: أي يوم نقدر نستبدل MAF بـ framework تاني

### Non-Goals (v1.0)
- ❌ استبدال MaxP's existing services
- ❌ بناء UI جديدة
- ❌ Offline / on-prem deployment
- ❌ Multi-region
- ❌ A2A protocol implementation (later phase)
- ❌ Custom MCP servers (استهلاك فقط)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  MaxP (Node.js) - H:\maxp                                │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐             │
│  │ Facebook │  │ WhatsApp │  │  Dashboard  │             │
│  │ Webhook  │  │ Webhook  │  │     UI      │             │
│  └────┬─────┘  └────┬─────┘  └──────┬──────┘             │
│       └──────────────┴───────────────┘                    │
│                       │                                  │
│              aiSdkClient (HTTP)                          │
│                       │                                  │
│       ┌───────────────▼──────────────────────┐           │
│       │  Existing tool registry              │           │
│       │  product.search, discount.create,    │           │
│       │  order.lookup, etc.                  │           │
│       └──────────────────────────────────────┘           │
└──────────┬───────────────────────────────────────────────┘
           │  HTTP
           │  X-Company-Id: comp_xyz
           │  X-Customer-Id: cust_123
           │  thread_id: comp_xyz:cust_123
           ▼
┌──────────────────────────────────────────────────────────┐
│  maxp-ai-service (Python) - H:\maxp-ai-service           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  FastAPI server                                   │   │
│  │  ├── POST /chat                                   │   │
│  │  ├── POST /resume                                 │   │
│  │  ├── POST /tools/execute                          │   │
│  │  ├── GET  /health                                 │   │
│  │  └── GET  /admin/threads/:id                      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Microsoft Agent Framework                        │   │
│  │  ├── Support Agent (ChatAgent)                    │   │
│  │  ├── ApprovalInterceptor (workflow executor)      │   │
│  │  └── PostgresCheckpointStore                      │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Postgres (maxp_ai schema)                        │   │
│  │  ├── ai.threads                                   │   │
│  │  ├── ai.checkpoints                               │   │
│  │  ├── ai.tool_calls (audit)                        │   │
│  │  └── ai.approvals (link to maxp.drafts)           │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Choice | Rationale |
|---|---|---|
| **Language** | Python 3.12 | Required by MAF |
| **Framework** | Microsoft Agent Framework 1.0+ | User decision |
| **LLM Provider** | Anthropic Claude Sonnet 4.6 (primary) + OpenAI GPT-4o (fallback) | Multi-provider via MAF |
| **Web server** | FastAPI 0.115+ | Async, OpenAPI auto, Pydantic native |
| **Database** | PostgreSQL 16 (shared with MaxP, separate schema) | Already in MaxP's stack |
| **ORM** | SQLAlchemy 2.0 + Alembic | Standard Python stack |
| **Checkpointing** | MAF's PostgresCheckpointStore | Built-in, durable |
| **Migrations** | Alembic | Standard for SQLAlchemy |
| **Testing** | pytest + httpx + respx | Async, mocking HTTP |
| **Container** | Docker (python:3.12-slim) | Consistent with MaxP |
| **Observability** | OpenTelemetry → Jaeger (local) | MAF native |
| **Package manager** | uv | Fast, modern |
| **CI/CD** | GitHub Actions | Same as MaxP |

---

## API Contract (MaxP ↔ maxp-ai-service)

### Request/Response schemas

```python
# POST /chat
class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None       # auto-generated if not provided

class ChatResponse(BaseModel):
    status: Literal["ok", "awaiting_approval", "error"]
    thread_id: str
    reply: str | None = None
    draft_id: str | None = None        # if awaiting_approval
    tool_calls: list[ToolCall] = []

# POST /resume
class ResumeRequest(BaseModel):
    thread_id: str
    approval: ApprovalDecision

class ApprovalDecision(BaseModel):
    approved: bool
    draft_id: str
    reason: str | None = None

class ResumeResponse(BaseModel):
    status: Literal["ok", "error"]
    reply: str
    thread_id: str

# POST /tools/execute (AI service calls MaxP)
class ToolExecuteRequest(BaseModel):
    tool_name: str
    company_id: str
    input: dict
    thread_id: str

class ToolExecuteResponse(BaseModel):
    result: dict
    audit_id: str

# GET /health
class HealthResponse(BaseModel):
    status: str
    version: str
    dependencies: dict[str, str]  # postgres, llm_provider, etc.
```

### Headers
- `X-Company-Id: comp_xyz` (required on all requests)
- `X-Customer-Id: cust_123` (required on /chat, /resume)
- `Authorization: Bearer <service_token>` (MaxP ↔ AI service only)

---

## Data Model

### Database schema: `ai.*`

```sql
-- Conversations / threads
CREATE TABLE ai.threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    channel TEXT NOT NULL,            -- 'facebook' | 'whatsapp' | 'dashboard'
    status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'closed' | 'archived'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    UNIQUE(company_id, customer_id, channel)
);

-- MAF checkpoints (durable state)
CREATE TABLE ai.checkpoints (
    thread_id UUID REFERENCES ai.threads(id) ON DELETE CASCADE,
    checkpoint_id TEXT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_id)
);

-- Audit log of all tool calls
CREATE TABLE ai.tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES ai.threads(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    status TEXT NOT NULL,             -- 'success' | 'error' | 'awaiting_approval'
    error_message TEXT,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals (link AI workflow ↔ MaxP drafts)
CREATE TABLE ai.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES ai.threads(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL,
    draft_id TEXT NOT NULL,           -- references maxp.drafts (FK enforced in code)
    action_type TEXT NOT NULL,        -- 'discount.create' | 'order.cancel' | etc.
    action_args JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
    decided_by TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_threads_company_customer ON ai.threads(company_id, customer_id);
CREATE INDEX idx_tool_calls_thread ON ai.tool_calls(thread_id);
CREATE INDEX idx_approvals_company_status ON ai.approvals(company_id, status);
```

### Multi-tenancy enforcement
- `company_id` extracted from `X-Company-Id` header (validated against thread)
- Every DB query scoped by `company_id` via SQLAlchemy session
- All MaxP API calls include `company_id` in body (not from LLM, from validated header)

---

## Security

| Concern | Mitigation |
|---|---|
| **Tenant isolation** | `company_id` from header → SQLAlchemy session filter; never from LLM output |
| **Service auth** | Shared `MAXP_SERVICE_TOKEN` env var (rotated quarterly); validated on every request |
| **LLM output injection** | Approval interceptor parses LLM tool args via Pydantic, not eval/exec |
| **Secrets** | `.env` (gitignored), secrets in env vars only, never in code |
| **PII logging** | Log tool call inputs/outputs but redact `phone`, `email`, `address` fields |
| **Rate limiting** | FastAPI middleware: 60 req/min per company_id (configurable) |
| **SQL injection** | SQLAlchemy parameterized queries only; no raw SQL |
| **CORS** | None (internal service, not exposed to browser) |

---

## Observability

| Concern | Tool |
|---|---|
| **Logs** | Structured JSON logs (loguru or structlog) |
| **Traces** | OpenTelemetry → Jaeger (local), Datadog/Honeycomb (prod) |
| **Metrics** | Prometheus endpoint at `/metrics` |
| **LLM call tracing** | MAF built-in OpenTelemetry integration |
| **Cost tracking** | `ai.tool_calls` aggregated daily; alert if daily > $X per tenant |
| **Error tracking** | Sentry SDK |

### Key metrics to track
- Request latency p50/p95/p99
- LLM token usage per tenant
- Approval rate (approved / total approval requests)
- Tool call success rate
- Thread count active
- Checkpoint store size

---

## Sprints

### Sprint 0: Setup (Days 1-2)

**Goal**: Repo skeleton + local dev environment
**Demo/Validation**: 
- `git clone` → `docker compose up` → `curl localhost:8000/health` returns 200
- `pytest` runs 1 dummy test, passes

#### Task 0.1: Create repository
- **Location**: `H:\maxp-ai-service\`
- **Description**: 
  - `git init`
  - Add `.gitignore` (Python)
  - Add `README.md` with setup instructions
  - Add `LICENSE`
- **Acceptance**: Repo initialized, README explains what the service does
- **Validation**: `git status` clean, remote configured

#### Task 0.2: Project structure
- **Location**: `H:\maxp-ai-service\`
- **Description**: Create directory structure:
  ```
  maxp-ai-service/
  ├── src/
  │   ├── api/             # FastAPI routes
  │   ├── agents/          # MAF agent definitions
  │   ├── workflows/       # Workflow executors
  │   ├── tools/           # MaxP API client + approval tools
  │   ├── db/              # SQLAlchemy models
  │   ├── observability/   # Logging, tracing
  │   └── config.py        # Settings (pydantic-settings)
  ├── tests/
  ├── migrations/          # Alembic
  ├── pyproject.toml
  ├── Dockerfile
  ├── docker-compose.yml
  ├── .env.example
  └── README.md
  ```
- **Acceptance**: All directories created with `__init__.py` files

#### Task 0.3: Python environment
- **Location**: `pyproject.toml`
- **Description**: 
  - Use `uv` as package manager
  - Python 3.12
  - Dependencies: `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `sqlalchemy[asyncio]`, `alembic`, `httpx`, `agent-framework`, `anthropic`, `openai`
  - Dev: `pytest`, `pytest-asyncio`, `respx`, `ruff`, `mypy`
- **Acceptance**: `uv sync` completes successfully
- **Validation**: `uv run python -c "import fastapi; print(fastapi.__version__)"` works

#### Task 0.4: Health endpoint
- **Location**: `src/api/health.py`
- **Description**: Implement `GET /health` returning `{"status": "ok", "version": "0.1.0"}`
- **Acceptance**: Returns 200 with expected JSON
- **Validation**: 
  - `pytest tests/api/test_health.py` passes
  - Manual: `curl http://localhost:8000/health`

#### Task 0.5: Docker setup
- **Location**: `Dockerfile`, `docker-compose.yml`
- **Description**: 
  - Multi-stage Dockerfile (builder + runtime)
  - `python:3.12-slim` base
  - Non-root user
  - Health check
- **Acceptance**: `docker compose up` runs container, health check passes

---

### Sprint 1: Foundation (Week 1)

**Goal**: Database + MaxP client + basic API
**Demo/Validation**:
- `POST /chat` returns mock response
- DB migrations apply
- MaxP client can call a tool and get result

#### Task 1.1: Database connection
- **Location**: `src/db/session.py`, `src/config.py`
- **Description**: 
  - `pydantic-settings` for config (DATABASE_URL, MAXP_API_URL, etc.)
  - Async SQLAlchemy engine
  - Session factory
- **Acceptance**: Can connect to Postgres, run `SELECT 1`
- **Validation**: `tests/db/test_session.py`

#### Task 1.2: Alembic setup
- **Location**: `migrations/`, `alembic.ini`
- **Description**: 
  - Configure Alembic
  - Initial migration creating `ai.*` schema (tables from Data Model section)
- **Acceptance**: `alembic upgrade head` creates all tables
- **Validation**: `psql -c "\dt ai.*"` shows 4 tables

#### Task 1.3: SQLAlchemy models
- **Location**: `src/db/models/`
- **Description**: Models for `Thread`, `Checkpoint`, `ToolCall`, `Approval`
- **Acceptance**: Models match DB schema
- **Validation**: `tests/db/test_models.py` (CRUD tests)

#### Task 1.4: MaxP API client
- **Location**: `src/tools/maxp_client.py`
- **Description**: 
  - HTTP client with `company_id` injection
  - Retry logic (3 attempts, exponential backoff)
  - PII redaction in logs
  - Methods: `call_tool(tool_name, company_id, input)`, `get_product()`, `get_order()`
- **Acceptance**: Can call MaxP's `product.search` and parse response
- **Validation**: `tests/tools/test_maxp_client.py` (mocked with `respx`)

#### Task 1.5: Chat endpoint (mock)
- **Location**: `src/api/chat.py`
- **Description**: 
  - `POST /chat` with header validation (`X-Company-Id`, `X-Customer-Id`)
  - Service token auth middleware
  - Mock response (return echo)
  - Latency logging
- **Acceptance**: `POST /chat` with valid headers returns 200, invalid returns 401
- **Validation**: `tests/api/test_chat.py`

#### Task 1.6: Tenant isolation middleware
- **Location**: `src/api/middleware.py`
- **Description**: 
  - Extract `company_id` from header
  - Attach to request state
  - Reject missing/invalid
- **Acceptance**: Cross-tenant requests rejected
- **Validation**: `tests/api/test_middleware.py` (try to access other tenant's data)

---

### Sprint 2: First MAF Agent (Week 2)

**Goal**: Support Agent working with read tools only
**Demo/Validation**:
- Customer message → Support Agent → calls `product.search` → replies
- Thread persists across requests
- Audit log captures all tool calls

#### Task 2.1: MAF installation + setup
- **Location**: `pyproject.toml`
- **Description**: Install `agent-framework`, verify import
- **Acceptance**: `uv run python -c "import agent_framework; print('ok')"`
- **Validation**: Import test in `tests/test_setup.py`

#### Task 2.2: First ChatAgent
- **Location**: `src/agents/support.py`
- **Description**: 
  - `ChatAgent` with `ChatAnthropic` client (Claude Sonnet 4.6)
  - Instructions in Arabic + English
  - System prompt explains: "you are a customer support agent, reply in Arabic"
- **Acceptance**: Agent can be created and `run()` called
- **Validation**: `tests/agents/test_support.py` (mocked LLM)

#### Task 2.3: Read-only tool wrapper
- **Location**: `src/tools/registry.py`, `src/agents/support.py`
- **Description**: 
  - `product.search` exposed as `@ai_function` 
  - `order.lookup` exposed as `@ai_function`
  - Tool annotations: `sideEffects="read"`, `requiresApproval=False`
- **Acceptance**: Agent chooses correct tool based on message
- **Validation**: `tests/agents/test_support_tools.py`

#### Task 2.4: Workflow builder
- **Location**: `src/workflows/support_flow.py`
- **Description**: 
  - `WorkflowBuilder` with Support Agent node
  - Postgres checkpoint store
  - Thread configuration
- **Acceptance**: Workflow can be compiled and run
- **Validation**: `tests/workflows/test_support_flow.py`

#### Task 2.5: Wire workflow to /chat
- **Location**: `src/api/chat.py`
- **Description**: Replace mock with actual workflow invocation
- **Acceptance**: Real LLM call happens, reply returned
- **Validation**: Manual test with curl + integration test

#### Task 2.6: Checkpoint persistence
- **Location**: `src/workflows/checkpoints.py`
- **Description**: 
  - Configure `PostgresCheckpointStore`
  - Thread ID = `companyId:customerId:channel`
  - Verify state persists across requests
- **Acceptance**: Multi-turn conversation maintains context
- **Validation**: 
  - Integration test: send message, send follow-up, verify context remembered
  - Manual: kill service, restart, continue conversation

#### Task 2.7: Audit logging
- **Location**: `src/observability/audit.py`
- **Description**: 
  - Middleware/interceptor captures every tool call
  - Writes to `ai.tool_calls` table
  - Includes: company_id, thread_id, tool_name, input, output, latency
  - PII redaction
- **Acceptance**: All tool calls logged
- **Validation**: `tests/observability/test_audit.py`

---

### Sprint 3: Approval Flow (Week 3)

**Goal**: Write tools require human approval
**Demo/Validation**:
- Customer asks for discount → AI creates draft → merchant approves → AI replies
- Draft persisted, can be reviewed in MaxP's existing approval UI
- Rejection flow also works

#### Task 3.1: Approval interceptor
- **Location**: `src/workflows/approval.py`
- **Description**: 
  - Custom `Executor` that intercepts write tool calls
  - Creates draft via MaxP API
  - Pauses workflow using `ctx.request_info()`
- **Acceptance**: Write tool calls pause workflow
- **Validation**: `tests/workflows/test_approval.py`

#### Task 3.2: Draft creation
- **Location**: `src/tools/maxp_client.py` (extend)
- **Description**: 
  - `create_draft(company_id, action_type, action_args, thread_id)` 
  - Calls MaxP's `POST /api/v1/agent/approvals/draft`
  - Returns draft_id
- **Acceptance**: Draft created in MaxP DB
- **Validation**: Integration test against real MaxP or mock

#### Task 3.3: /resume endpoint
- **Location**: `src/api/resume.py`
- **Description**: 
  - `POST /resume` with `thread_id` + `approval` decision
  - Calls `workflow.continue_with(approval)`
  - On approved: executes write tool, returns success
  - On rejected: returns rejection message
- **Acceptance**: Resume works for both approve and reject
- **Validation**: `tests/api/test_resume.py`

#### Task 3.4: Approval row creation
- **Location**: `src/db/models/approval.py`
- **Description**: 
  - On draft creation: insert `ai.approvals` row with status `pending`
  - On decision: update status + `decided_by` + `decided_at`
- **Acceptance**: Approval state tracked
- **Validation**: `tests/db/test_approval_model.py`

#### Task 3.5: Write tool registry
- **Location**: `src/tools/registry.py`
- **Description**: 
  - Define write tools: `discount.create`, `order.cancel`, `message.broadcast`
  - Each marked with `sideEffects="write"`, `requiresApproval=True`
  - Approval interceptor handles all
- **Acceptance**: All write tools go through approval
- **Validation**: `tests/tools/test_registry.py`

#### Task 3.6: End-to-end approval test
- **Location**: `tests/integration/test_approval_flow.py`
- **Description**: 
  - Start with customer message asking for discount
  - AI pauses → returns draft_id
  - Simulate merchant approval
  - AI resumes → executes → replies
- **Acceptance**: Full flow works
- **Validation**: `pytest tests/integration/ -v` passes

---

### Sprint 4: Pilot on Real Tenant (Week 4)

**Goal**: Deploy to staging + pilot with 1 real tenant
**Demo/Validation**:
- Service running in staging
- 1 real tenant using Support Agent for 1 week
- MaxP's existing support-agent still runs for other tenants

#### Task 4.1: Deployment setup
- **Location**: `Dockerfile`, `docker-compose.prod.yml`
- **Description**: 
  - Multi-stage production build
  - Health check endpoint
  - Graceful shutdown
  - Non-root user
- **Acceptance**: Image builds in <2 min, runs in <500ms
- **Validation**: `docker build`, `docker run`, hit health endpoint

#### Task 4.2: Environment configuration
- **Location**: `.env.example`, `src/config.py`
- **Description**: 
  - Document all env vars: DATABASE_URL, MAXP_API_URL, MAXP_SERVICE_TOKEN, ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.
  - Validate on startup (fail fast if missing)
- **Acceptance**: Service fails to start with clear error if config missing
- **Validation**: Manual test with invalid env

#### Task 4.3: MaxP client integration
- **Location**: MaxP repo: `backend/services/aiSdkClient.js`
- **Description**: 
  - Create HTTP client in MaxP
  - Feature flag: `USE_AI_SERVICE` per company
  - On flag enabled, route support messages to AI service
  - On flag disabled, use existing support agent
- **Acceptance**: Per-tenant toggle works
- **Validation**: Manual test with 2 tenants (one on, one off)

#### Task 4.4: Approval UI integration
- **Location**: MaxP repo: `backend/routes/agentApprovalRoutes.js` (extend)
- **Description**: 
  - Approve/reject buttons call `/resume` on AI service
  - Display AI-generated summary of request
- **Acceptance**: Merchant can approve/reject from existing UI
- **Validation**: Manual test

#### Task 4.5: Observability
- **Location**: `src/observability/`, deployment config
- **Description**: 
  - OpenTelemetry traces flowing to Jaeger (local) / Datadog (prod)
  - Structured JSON logs
  - Prometheus metrics endpoint
  - Sentry error tracking
- **Acceptance**: Can see traces for LLM calls, tool calls, DB queries
- **Validation**: Manual check of observability tools

#### Task 4.6: Pilot deployment
- **Location**: staging environment
- **Description**: 
  - Deploy to staging
  - Pick 1 internal tenant for pilot
  - Run for 5-7 days
  - Monitor: latency, errors, LLM costs, approval rate, customer satisfaction
- **Acceptance**: 5+ days uptime, <2% error rate
- **Validation**: Daily check of metrics dashboard

---

### Sprint 5: Hardening & Iteration (Weeks 5-6)

**Goal**: Fix pilot issues + add basic safety
**Demo/Validation**:
- 99% uptime over 2 weeks
- <1% hallucination rate (measured via merchant feedback)
- Tenant isolation verified

#### Task 5.1: Error handling hardening
- **Location**: various
- **Description**: 
  - Retry logic for LLM transient errors
  - Fallback to alternative LLM on rate limit
  - Graceful degradation when MaxP API down
  - Better error messages to merchants
- **Acceptance**: Service stays up when dependencies flaky
- **Validation**: Chaos test (kill Postgres, kill MaxP API)

#### Task 5.2: Rate limiting
- **Location**: `src/api/middleware.py`
- **Description**: 
  - Per-company rate limit (60 req/min default)
  - Per-thread concurrency limit (1 active request per thread)
  - 429 response with retry-after
- **Acceptance**: Burst traffic handled gracefully
- **Validation**: Load test with `locust` or `k6`

#### Task 5.3: PII redaction
- **Location**: `src/observability/`
- **Description**: 
  - Detect and redact phone, email, address in logs
  - Don't store PII in tool_calls unless explicitly needed
  - GDPR-style data export/delete
- **Acceptance**: PII not in logs
- **Validation**: `grep` logs for phone patterns

#### Task 5.4: Cost controls
- **Location**: `src/observability/cost.py`
- **Description**: 
  - Track token usage per company per day
  - Soft cap: warn at $5/day per company
  - Hard cap: pause at $20/day per company
  - Daily report to merchants
- **Acceptance**: Cost overruns prevented
- **Validation**: Synthetic test with high-volume tenant

#### Task 5.5: Tenant isolation audit
- **Location**: `tests/security/test_tenant_isolation.py`
- **Description**: 
  - Attempt cross-tenant data access
  - Verify rejection at API + DB layer
  - Document findings
- **Acceptance**: No cross-tenant leaks possible
- **Validation**: Penetration test

#### Task 5.6: Documentation
- **Location**: `README.md`, `docs/`
- **Description**: 
  - API reference (auto-generated from FastAPI)
  - Architecture diagram
  - Runbook for common operations
  - Onboarding guide for new devs
- **Acceptance**: New dev can set up in <1 hour
- **Validation**: Fresh clone + follow README

---

### Sprint 6: Expansion (Weeks 7-8) [OPTIONAL for v1.0]

**Goal**: Add Marketing + Inventory agents
**Demo/Validation**:
- Marketing agent can draft Facebook ads (with approval)
- Inventory agent can flag low stock
- CEO orchestrator can coordinate them

#### Task 6.1: Marketing agent
- **Location**: `src/agents/marketing.py`
- **Description**: 
  - ChatAgent specialized in ad copy
  - Tools: `campaign.list`, `audience.get`, `facebook_ad.create_draft`
  - Arabic + Egyptian dialect support
- **Acceptance**: Generates ad copy drafts
- **Validation**: `tests/agents/test_marketing.py`

#### Task 6.2: Inventory agent
- **Location**: `src/agents/inventory.py`
- **Description**: 
  - ChatAgent for stock queries
  - Tools: `product.stock_check`, `inventory.low_stock_report`
  - Read-only, no approval needed
- **Acceptance**: Identifies low stock
- **Validation**: `tests/agents/test_inventory.py`

#### Task 6.3: CEO orchestrator
- **Location**: `src/workflows/ceo_orchestrator.py`
- **Description**: 
  - Multi-agent workflow
  - Routes to specialist agents based on goal
  - Synthesizes results
- **Acceptance**: CEO can delegate to 2+ specialists
- **Validation**: `tests/workflows/test_ceo.py`

#### Task 6.4: Multi-agent integration test
- **Location**: `tests/integration/test_multi_agent.py`
- **Description**: 
  - CEO delegates marketing task to Marketing Agent
  - CEO delegates inventory check to Inventory Agent
  - Synthesizes combined response
- **Acceptance**: Full multi-agent flow works
- **Validation**: `pytest tests/integration/test_multi_agent.py`

---

### Sprint 7: Production Rollout (Weeks 9-10) [OPTIONAL for v1.0]

**Goal**: 50% of tenants using AI service
**Demo/Validation**:
- 5+ tenants on AI service for 2+ weeks
- Cost per tenant trending stable
- Performance SLA met (p95 <5s)

#### Task 7.1: Gradual rollout
- **Location**: MaxP repo: feature flag system
- **Description**: 
  - 10% → 25% → 50% → 100% rollout
  - Monitor metrics at each step
  - Rollback button ready
- **Acceptance**: Smooth rollout
- **Validation**: Check metrics dashboard

#### Task 7.2: SLA monitoring
- **Location**: `src/observability/sla.py`
- **Description**: 
  - Alert if p95 latency > 5s
  - Alert if error rate > 2%
  - Alert if cost per request > $X
- **Acceptance**: Alerts configured
- **Validation**: Synthetic load test triggers alerts

#### Task 7.3: Disaster recovery
- **Location**: ops docs
- **Description**: 
  - Backup strategy for checkpoints
  - Failover plan
  - Document recovery time
- **Acceptance**: Can restore from backup in <1 hour
- **Validation**: Tabletop exercise

---

### Sprint 8: v1.0 GA (Weeks 11-12) [OPTIONAL for v1.0]

**Goal**: Production-ready for all tenants
**Demo/Validation**:
- 100% tenants on AI service
- 99.9% uptime over 30 days
- Documentation complete

#### Task 8.1: Performance optimization
- **Location**: various
- **Description**: 
  - Profile bottlenecks
  - Add caching where appropriate
  - Optimize checkpoint queries
- **Acceptance**: p95 <3s
- **Validation**: Load test

#### Task 8.2: Final security review
- **Location**: various
- **Description**: 
  - Penetration test
  - OWASP compliance check
  - Dependency audit
- **Acceptance**: No high-severity issues
- **Validation**: External audit

#### Task 8.3: GA release
- **Location**: release process
- **Description**: 
  - Version tag `v1.0.0`
  - Release notes
  - Migration guide for tenants
- **Acceptance**: 1.0.0 released
- **Validation**: All 100% tenants migrated

---

## Testing Strategy

### Test pyramid
```
       /\
      /  \      E2E tests (5%)
     /────\     - Full flow with real MaxP
    /      \    
   / Integ. \   Integration tests (25%)
  /   tests  \  - API + DB + mocked LLM
 /────────────\ 
/   Unit tests  \ Unit tests (70%)
/________________\ - Tools, models, utilities
```

### Per-sprint testing
- **Sprint 0-1**: Unit tests only
- **Sprint 2-3**: + Integration tests with mocked LLM
- **Sprint 4+**: + E2E tests with real MaxP (staging)

### Test infrastructure
- `pytest` + `pytest-asyncio` for async
- `respx` for HTTP mocking
- `testcontainers` for Postgres
- `freezegun` for time-based tests

### Coverage targets
- **Unit**: 80%+
- **Integration**: All API endpoints covered
- **E2E**: All critical user flows

### CI pipeline
1. `ruff check` + `mypy` (lint + type)
2. `pytest tests/unit/` (fast)
3. `pytest tests/integration/` (with test DB)
4. `docker build` (build check)
5. `pytest tests/e2e/` (only on main)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **MAF immaturity** (newer than LangGraph) | Medium | High | Build framework-agnostic abstraction layer; easier to swap later |
| **Multi-tenant data leak** | Low | Critical | Tenant isolation tests in CI; security review before any tenant migration |
| **LLM cost explosion** | Medium | High | Cost controls in Sprint 5; daily reports; hard caps |
| **Approval flow bypass** | Low | Critical | All write tools must go through ApprovalInterceptor; lint rule |
| **Checkpoint store failure** | Low | High | Backups, monitoring, recovery docs |
| **MaxP API downtime** | Medium | Medium | Graceful degradation; AI service returns friendly error |
| **Bad LLM output reaches customer** | Medium | High | Output guardrails in Sprint 5; merchant can override |
| **Arabic dialect support** | Medium | Medium | Use Claude (better Arabic); test with real customers; iterate |
| **i18n violations** | Low | Medium | Customer replies always LLM-generated; no hardcoded templates |
| **Slow pilot** | Medium | Low | Pick motivated tenant; 1-week cycles |

---

## Rollback Plan

### If pilot fails (per tenant)
1. Toggle `USE_AI_SERVICE=false` for that tenant in MaxP DB
2. AI service goes idle for that tenant
3. MaxP's existing support agent takes over
4. Investigate logs, fix, retry

### If full rollback needed
1. Stop maxp-ai-service container
2. MaxP detects missing service, returns to existing support agent
3. No data loss (threads/approvals in Postgres remain for future re-enable)
4. Document lessons learned

### Rollback triggers
- Error rate >5% for 1 hour
- Latency p95 >10s for 30 minutes
- Cost exceeds $X/day
- Security incident

---

## Open Questions

These should be resolved before/during execution:

1. **LLM Provider**: Claude Sonnet 4.6 confirmed? Or also try GPT-4o? → Decide in Sprint 2
2. **Pilot tenant**: Which one? → Decide in Sprint 4
3. **Cost caps per tenant**: What's the budget? → Decide in Sprint 5
4. **Checkpoint retention**: How long? 30 days? 90 days? → Decide in Sprint 2
5. **Approval UI**: Reuse existing MaxP approval UI? Or new? → Decide in Sprint 3
6. **i18n languages**: Arabic + English only? Or more? → Confirm now
7. **Channels in pilot**: Facebook only? Or all? → Decide in Sprint 4
8. **On-call rotation**: Who responds to alerts? → Decide before Sprint 4

---

## Success Metrics (KPIs)

| Metric | Target (v1.0) | Measurement |
|---|---|---|
| Uptime | 99.5% | Prometheus + alertmanager |
| p95 latency | <5s | Prometheus |
| Error rate | <2% | `ai.tool_calls.status` |
| Approval rate | 60-80% | `ai.approvals` (too high = AI not creative, too low = bad recommendations) |
| Cost per conversation | <$0.50 | Aggregated from tool_calls |
| Tenant isolation violations | 0 | Security tests |
| Customer satisfaction (merchant feedback) | >4/5 | Manual survey |
| Time saved per merchant | >30 min/day | Merchant self-report |

---

## Assumptions

These are assumptions I made to draft this plan. **Please confirm or correct**:

1. **Team**: 1-2 developers available part-time
2. **MaxP runs in production** with real customers (multi-tenant)
3. **Postgres is already available** as the shared database
4. **Docker is the deployment target** (Kubernetes or similar not yet)
5. **Pilot tenant**: willing to test, internal or friendly
6. **No new LLM provider contracts needed** (Claude + OpenAI already accessible)
7. **Customer replies**: Arabic primary, English secondary
8. **Approval UI**: reuse existing MaxP approval UI
9. **Channels in pilot**: Facebook Messenger + Dashboard (WhatsApp later)
10. **Compliance**: standard SaaS multi-tenancy; no specific GDPR/CCPA features needed yet

---

## Related Documents

- `docs/agentic_ai_planning/ai_agent_architecture_master_plan.md` - MaxP's overall AI strategy
- `docs/agentic_ai_planning/agent_manager_file_system_requirements.md` - Paperclip-style control plane
- `docs/agentic_ai_planning/AGENTIC_AI_TRACKER.md` - Implementation tracker
- [Microsoft Agent Framework docs](https://learn.microsoft.com/en-us/agent-framework/) - Framework reference
- `backend/services/aiAgent/toolRegistryService.js` - MaxP's existing tool registry (to integrate with)
- `backend/services/aiAgent/agentAuditTrailService.js` - MaxP's existing audit service

---

## Revision History

| Date | Version | Author | Changes |
|---|---|---|---|
| 2026-06-02 | 1.0 | Planner | Initial draft |
