# maxp-ai-service

AI-powered customer support service for MaxP e-commerce platform. Built with Microsoft Agent Framework 1.7+ and FastAPI.

## Architecture

```
Customer -> MaxP (Node.js) -> maxp-ai-service (Python) -> Anthropic/OpenAI
                              |
                          PostgreSQL (ai schema)
                              |
                          MaxP Tool API
```

## Quick Start

### Prerequisites
- Python 3.12+
- uv package manager
- PostgreSQL 16 (or Docker)
- Anthropic API key (Claude Sonnet 4.6+)

### Setup

```bash
# Clone & install
git clone <repo>
cd maxp-ai-service
uv sync
uv sync --group dev

# Environment
cp .env.example .env
# Edit .env with your settings

# Database
alembic upgrade head

# Run
uvicorn src.main:app --reload
```

### Docker

```bash
docker compose up -d
# Or for production:
docker compose -f docker-compose.prod.yml up -d
```

## API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/health` | No | Service health check |
| GET | `/ready` | No | Readiness check (LLM key must be set) |
| GET | `/metrics` | No | Prometheus metrics |
| POST | `/chat` | Yes | Customer chat message |
| POST | `/resume` | Yes | Resume paused approval workflow |
| GET | `/` | No | Service info |

### Headers

| Header | Required For | Description |
|--------|-------------|-------------|
| `X-Company-Id` | `/chat`, `/resume` | Tenant identifier |
| `X-Customer-Id` | `/chat` | Customer identifier |
| `Authorization: Bearer <token>` | `/chat`, `/resume` | Service auth token |

### POST /chat

```json
// Request
{ "message": "عايز اعرف سعر المنتج", "thread_id": null }

// Response (normal)
{ "status": "ok", "thread_id": "comp1:cust1:chat", "reply": "...", "tool_calls": [] }

// Response (awaiting approval)
{ "status": "awaiting_approval", "thread_id": "...", "draft_id": "draft_123", "reply": "..." }

// Response (error)
{ "status": "error", "thread_id": "...", "reply": "...", "tool_calls": [] }
```

### POST /resume

```json
// Request
{ "thread_id": "comp1:cust1:chat", "draft_id": "draft_123", "approved": true }

// Response
{ "status": "ok", "reply": "تمت الموافقة وتنفيذ الطلب", "thread_id": "..." }
```

## Configuration

| Env Var | Required | Default | Description |
|---------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | Postgres connection URL |
| `MAXP_API_URL` | ✅ | - | MaxP backend API URL |
| `MAXP_SERVICE_TOKEN` | ✅ | - | Service auth shared secret |
| `ANTHROPIC_API_KEY` | ✅* | - | Anthropic API key |
| `OPENAI_API_KEY` | - | - | OpenAI API key (fallback) |
| `GOOGLE_API_KEY` | - | - | Google Gemini API key (fallback + prompt caching) |
| `ENVIRONMENT` | - | `development` | `development`, `staging`, `production` |
| `DEFAULT_LLM_PROVIDER` | - | `anthropic` | `anthropic`, `openai`, or `google` |
| `DEFAULT_MODEL` | - | `claude-sonnet-4-6` | Model name |
| `OTLP_ENDPOINT` | - | - | OpenTelemetry endpoint |
| `SENTRY_DSN` | - | - | Sentry DSN |
| `REDIS_URL` | - | `redis://localhost:6379/0` | Redis for queue/cache (optional, falls back to in-memory) |
| `MCP_SERVERS` | - | - | JSON list of MCP server configs (e.g. `[{"name":"catalog","url":"http://..."}]`) |
| `PROMPT_CACHE_TTL` | - | `1800` | Gemini prompt cache TTL in seconds |
| `ENABLE_PG_VECTOR` | - | `true` | Use pgvector for similarity search |
| `ENABLE_MAGENTIC_ORCHESTRATION` | - | `false` | Use Magentic multi-agent orchestration |

\* At least one LLM API key required in staging/production

## Architecture

### Tools
- **Read tools** (no approval): `product_search`, `order_lookup`
- **Write tools** (require approval): `discount_create`, `order_cancel`, `message_broadcast`

### Approval Flow
1. Customer requests write action -> Agent creates draft -> MaxP creates draft request
2. Merchant approves/rejects via MaxP dashboard
3. MaxP calls `POST /resume` -> action executed or cancelled

## Testing

```bash
pytest                    # All tests
pytest -v                 # Verbose
pytest tests/api/         # API tests only
pytest tests/security/    # Security/tenant isolation tests
```

## Observability

- **Metrics**: `/metrics` endpoint (Prometheus format)
- **Logs**: Structured JSON via structlog
- **Tracing**: OpenTelemetry (configure `OTLP_ENDPOINT`)
- **Errors**: Sentry (configure `SENTRY_DSN`)

## 2026 Features

This service implements several 2026 best-practice patterns. All features are enabled by default with graceful fallbacks (e.g. Redis-free mode still works in dev).

### 1. pgvector — Native Vector Search

Embeddings stored as `vector(768)` in PostgreSQL using the `pgvector` extension. Uses IVFFlat index with cosine distance for sub-millisecond similarity search over millions of facts.

```sql
-- Migration: migrations/versions/0006_enable_pgvector.py
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE ai.agentic_memory_fact ADD COLUMN embedding vector(768);
CREATE INDEX ix_agentic_memory_fact_embedding
  ON ai.agentic_memory_fact USING ivfflat (embedding vector_cosine_ops);
```

API:
```python
from src.memory.episodic_memory import episodic_memory_service

await episodic_memory_service.store_episode(
    session=session,
    company_id="comp1",
    customer_id="cust1",
    content="customer prefers XL",
)

results = await episodic_memory_service.search_similar(
    session=session,
    company_id="comp1",
    customer_id="cust1",
    query_text="size preference",
    top_k=5,
)
# returns: [{"id": ..., "content": ..., "similarity": 0.92, "metadata": ...}]
```

Setup requirement: pgvector extension must be installed at the PostgreSQL server level (`apt install postgresql-16-pgvector` or use `pgvector/pgvector` Docker image).

### 2. Google Gemini Prompt Caching

Reduces LLM cost by 75-90% on cached system prompts via Google's `cachedContent` API. Auto-applied to all system prompts in `LLMFallbackProvider` when `GOOGLE_API_KEY` is configured.

```python
from src.services.prompt_cache_service import prompt_cache_service

cached = await prompt_cache_service.get_or_create_cached_prompt(
    company_id="comp1",
    prompt_type="system",
    instructions="You are a helpful MaxP support agent...",
)
# returns CachedPrompt(cache_key, cached_content_name, is_fresh, instructions)
```

TTL is configurable via `PROMPT_CACHE_TTL` env var (default: 1800s = 30 min). Cache is invalidated per-company+prompt_type via `prompt_cache_service.invalidate(...)`.

### 3. Microsoft Agent Framework Orchestrations (Magentic)

Optional multi-agent orchestration using `MagenticBuilder` from `agent-framework-orchestrations`. A CEO agent coordinates sub-agents (e.g. support, sales) registered in `AgentRegistry`.

Disabled by default — enable via env:
```env
ENABLE_MAGENTIC_ORCHESTRATION=true
```

Usage:
```python
from src.workflows.magentic_orchestration import MagenticOrchestrator

orchestrator = MagenticOrchestrator()
result = await orchestrator.run(
    message="هل ممكن الغي الطلب؟",
    company_id="comp1",
    customer_id="cust1",
    thread_id="comp1:cust1:chat",
)
```

When disabled, requests fall through to the standard `PipelineRunner` automatically.

### 4. Background Task Queue (Redis + RQ pattern)

Replaces the Node.js BullMQ pattern with a lightweight Redis sorted-set priority queue. Falls back to in-memory storage when Redis is unavailable (dev mode).

API:
```python
from src.workers.agent_worker import (
    enqueue_agent_task,
    start_worker,
    TASK_HANDLERS,
)
from src.services.queue_service import QueuePriority

# enqueue
job_id = await enqueue_agent_task(
    task_type="memory.consolidate",
    payload={"company_id": "comp1", "user_id": "u1"},
    priority=QueuePriority.HIGH,
)

# start worker (typically in a separate process or background task)
asyncio.create_task(start_worker(poll_interval=0.5))
```

Built-in task types: `memory.consolidate`, `rag.backfill`, `agent.scheduled_task`. Register custom handlers by adding to `TASK_HANDLERS` in `src/workers/agent_worker.py`.

Jobs have automatic retry: `max_attempts=3`, with decreasing priority on re-queue.

### 5. Python MCP Protocol Support

Native Model Context Protocol (MCP) client using StreamableHTTP transport (MCP 2026 standard). Discovers tools from registered MCP servers and makes them available to agents.

```env
MCP_SERVERS=[{"name": "catalog", "url": "http://localhost:3000", "api_key": "..."}]
```

API:
```python
from src.mcp.registry import get_mcp_registry

registry = get_mcp_registry()
await registry.register_from_config()  # registers all servers from env

# list all discovered tools
tools = registry.get_all_tools()
# [{"name": "mcp_catalog_search_products", "description": "...", "input_schema": {...}}]

# invoke a tool
result = await registry.call_tool("mcp_catalog_search_products", {"q": "shoes"})

# cleanup
await registry.disconnect_all()
```

Tools are automatically registered in the `ai.checkpoints` table for traceability.

### 6. Active Pipeline Checkpointing

Every pipeline stage saves state to `ai.checkpoints` for fault tolerance. If the process crashes, the next run resumes from the last successful stage.

Stages saved:
- `intent_resolved`
- `knowledge_retrieved`
- `tools_routed`
- `tools_executed`
- `reply_validated`
- `pipeline_done` (final)

API:
```python
from src.pipeline.checkpointer import PipelineCheckpointer

checkpointer = PipelineCheckpointer(session)
checkpoint_id = await checkpointer.save_checkpoint(
    ctx=context,
    stage_name="tools_executed",
    status="completed",
)

# restore on retry
restored_ctx = await checkpointer.get_latest_checkpoint(thread_id)
```

The `RunStateManager` (`src/services/run_state_manager.py`) is used for cross-process resumption — if the worker restarts mid-pipeline, it picks up from the last `final_reply` if one was cached.

## Migration Guide

### From Node.js aiAgent to Python ai-service

The Node.js `apps/backend/services/aiAgent/` is being replaced by `apps/ai-service/` (Python). The Node service remains in place during the transition and is controlled by `AI_SERVICE_MODE` in the Node backend:

| Mode | Behavior |
|------|----------|
| `off` | Node pipeline runs as before (no AI service) |
| `shadow` | Node + Python both run; Python logs only |
| `pilot` | Python used for specific companies (feature flag) |
| `primary` | Python is the single source of truth; Node bypassed |

To switch a deployment to primary mode:
```env
AI_SERVICE_MODE=primary
AI_SERVICE_URL=http://localhost:8000
```

Run new migrations: `alembic upgrade head` will apply `0006_enable_pgvector.py` (pgvector + embedding column).
