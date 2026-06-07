# Plan: AI Decision Unification - Node.js to Python Migration

**Generated**: 2026-06-07
**Estimated Complexity**: High
**Target**: Clean Node.js from AI logic, unify in Python, use SDK properly for 2026

---

## Overview

**Goal**: Migrate remaining AI decision logic from Node.js to Python, unify on a single AI runtime, and leverage proper SDK patterns for 2026.

**Current State**:
- Python AI service (`apps/ai-service`) is the primary AI runtime
- Node.js (`apps/backend/legacy-ai-agent/aiAgent`) still contains AI components that should move
- **SDK Used**: Microsoft Agent Framework (`agent-framework >= 1.0`) - NOT OpenAI Agents SDK
- **OpenAI Agents SDK**: NOT used (appears in `uv.lock` as transitive dep only)

**Recommendation**: Keep `agent-framework` (Microsoft) since it's already deeply integrated, but leverage its full SDK capabilities for 2026 patterns (MCP, Magentic orchestration, handoffs, guardrails, sessions).

---

## SDK Analysis (2026 Standards)

| Feature | Microsoft Agent Framework | OpenAI Agents SDK | Recommendation |
|---------|---------------------------|-------------------|----------------|
| Agent abstraction | ✅ `Agent` class | ✅ `Agent` class | Keep existing `BaseAgent` wrapper |
| Multi-agent orchestration | ✅ `MagenticBuilder` | ✅ `Runner` + manual | Use `MagenticBuilder` (already in codebase) |
| MCP support | ✅ `agent_framework_mcp` | ✅ Built-in MCP | Use `agent_framework_mcp` |
| Handoffs | ✅ `Agent.as_tool()` | ✅ `Handoff` class | Keep current pattern |
| Guardrails | ✅ Via guardrails module | ✅ Via `Guardrail` class | Keep/enhance current |
| Sessions/Memory | ✅ `AgentSession`, `Redis` | ✅ `Session` + Redis | Keep current |
| Human-in-loop | ✅ Via pause/resume | ✅ Via `PauseInfo` | Keep current |
| Sandboxes | ❌ No native sandbox | ✅ `SandboxAgent` | **Adopt if needed** |
| Tracing | ✅ `OBSERVABILITY_SETTINGS` | ✅ Built-in tracing | Enhance |
| **OpenAI Agents SDK migration** | **NOT recommended** | - | Too costly to rewrite |

**Decision**: Stay with **Microsoft Agent Framework** - it's production-ready, has MCP support, and rewriting to OpenAI Agents SDK would be massive with no clear benefit.

---

## Sprint 1: Migrate Pure Logic Components (No AI Runtime)

**Goal**: Move algorithmic/data-only components to Python with zero AI dependencies.

### Task 1.1: Migrate `intentClassificationSchema.js` → Python
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/intentClassificationSchema.js` → `apps/ai-service/src/intent/schema.py`
- **Description**: Move 39 intent enums and confidence schemas to Python as shared constants
- **Dependencies**: None (pure data)
- **Acceptance Criteria**: Python can import all intents, Node.js imports from shared schema
- **Validation**: `pytest tests/intent/`

### Task 1.2: Migrate `DAGPlannerExecutor.js` → Python
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/DAGPlannerExecutor.js` → `apps/ai-service/src/planning/dag_planner.py`
- **Description**: Port topological sort, concurrent execution layers, dynamic replanning
- **Dependencies**: None (pure algorithm)
- **Acceptance Criteria**: Same behavior, all tests pass
- **Validation**: `pytest tests/planning/`

### Task 1.3: Migrate `policyEnforcementEngine.js` → Python
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/policyEnforcementEngine.js` → `apps/ai-service/src/policy/engine.py`
- **Description**: Port deterministic policy guardrails (max discount %, refund limits, approval thresholds)
- **Dependencies**: Prisma DB (port to SQLAlchemy)
- **Acceptance Criteria**: Policy enforcement works same as before
- **Validation**: `pytest tests/policy/`

---

## Sprint 2: Enable Full SDK Patterns

**Goal**: Use agent-framework SDK features already available but not fully utilized.

### Task 2.1: Enable MagenticBuilder Orchestration by Default
- **Location**: `apps/ai-service/src/workflows/magentic_orchestration.py`
- **Description**: Flip `enable_magentic_orchestration` to default, use `MagenticBuilder` for CEO → Specialist orchestration
- **Dependencies**: Task 1.x complete
- **Acceptance Criteria**: Multi-agent handoffs work via SDK, not manual `as_tool()`
- **Validation**: Integration tests pass

### Task 2.2: Wire Up MCP Properly
- **Location**: `apps/ai-service/src/mcp/`
- **Description**: Ensure `agent_framework_mcp` is properly configured for tool exposure
- **Dependencies**: Existing MCP server in `mcp-server/`
- **Acceptance Criteria**: MCP tools accessible to agents
- **Validation**: `pytest tests/mcp/`

### Task 2.3: Add SDK-Native Tracing
- **Location**: `apps/ai-service/src/observability/`
- **Description**: Use `enable_instrumentation()` for full trace visibility
- **Dependencies**: `OBSERVABILITY_SETTINGS`
- **Acceptance Criteria**: All agent runs traced

---

## Sprint 3: Migrate Budget Ledger

**Goal**: Move budget enforcement to Python for unified AI decisions.

### Task 3.1: Migrate `providerBudgetLedgerService.js` → Python
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/providerBudgetLedgerService.js` → `apps/ai-service/src/billing/ledger.py`
- **Description**: Port RPM/RPD/TPM/TPD limits, cost calculation, budget allocation
- **Dependencies**: Redis state (port to Python Redis client), Prisma (port to SQLAlchemy)
- **Acceptance Criteria**: Budget enforcement same as Node.js
- **Validation**: `pytest tests/billing/`

### Task 3.2: Create Budget API in Python
- **Location**: `apps/ai-service/src/api/billing.py`
- **Description**: Expose budget endpoints for Node.js to call
- **Dependencies**: Task 3.1
- **Acceptance Criteria**: Node.js can query budget status via API

---

## Sprint 4: Consolidate Model Management

**Goal**: Move model management to Python (biggest remaining component).

### Task 4.1: Migrate `modelManager.js` Logic → Python
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/modelManager.js` → `apps/ai-service/src/llm/manager.py`
- **Description**: Port 3026 lines of model lifecycle, key rotation, health checks, fallback chains
- **Dependencies**: Redis (model state), Prisma (keys), multiple providers
- **Acceptance Criteria**: Model selection/failover works identically
- **Validation**: `pytest tests/llm/` + manual testing with each provider

### Task 4.2: Create Model Management API
- **Location**: `apps/ai-service/src/api/models.py`
- **Description**: Expose model management endpoints
- **Dependencies**: Task 4.1
- **Acceptance Criteria**: Node.js uses Python for all model decisions

---

## Sprint 5: Remove Dual AI Runtime

**Goal**: Eliminate `AI_SERVICE_MODE` routing - Python is always primary.

### Task 5.1: Remove AI Service Router in Node.js
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/aiServiceRouter.js`
- **Description**: Remove `off/shadow/pilot/primary` modes - always call Python
- **Dependencies**: Tasks 1-4 complete
- **Acceptance Criteria**: All AI decisions happen in Python

### Task 5.2: Remove `aiServiceKeyBridge.js`
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/aiServiceKeyBridge.js`
- **Description**: Remove dual-write bridge - Python manages keys
- **Dependencies**: Task 4.x

### Task 5.3: Clean Up Legacy Agent Files
- **Location**: `apps/backend/legacy-ai-agent/aiAgent/`
- **Description**: Remove migrated files, keep only tool execution
- **Dependencies**: Tasks 1-5

---

## Testing Strategy

```bash
# After each sprint
cd apps/ai-service
pytest tests/evals/ -v  # Hallucination, quality, unification tests

# Integration
cd apps/backend
npm test -- --testPathPattern=aiDecisionUnification

# Full validation
./scripts/run-ai-evaluation-suite.sh
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/intent/schema.py` | Migrated intent enums |
| `src/planning/dag_planner.py` | Migrated DAG planner |
| `src/policy/engine.py` | Migrated policy engine |
| `src/billing/ledger.py` | Migrated budget ledger |
| `src/llm/manager.py` | Migrated model manager |
| `src/api/billing.py` | Budget API |
| `src/api/models.py` | Model management API |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/config.py` | Add budget, model settings |
| `src/workflows/orchestration_flow.py` | Use MagenticBuilder by default |
| `src/workflows/magentic_orchestration.py` | Enable by default |
| `src/agents/base.py` | Remove Node.js references |

---

## Files to Remove (After Migration)

| File | When |
|------|------|
| `aiAgent/intentClassificationSchema.js` | Sprint 1 |
| `aiAgent/DAGPlannerExecutor.js` | Sprint 1 |
| `aiAgent/policyEnforcementEngine.js` | Sprint 1 |
| `aiAgent/providerBudgetLedgerService.js` | Sprint 3 |
| `aiAgent/modelManager.js` | Sprint 4 |
| `aiAgent/aiServiceRouter.js` | Sprint 5 |
| `aiAgent/aiServiceKeyBridge.js` | Sprint 5 |
| `aiAgent/BaseAgent.js` | Sprint 5 |
| `aiAgent/CEOAgent.js` | Sprint 5 |

---

## Potential Risks & Gotchas

1. **3026-line `modelManager.js`** - Split into smaller services during port (health checks, key rotation, fallback, cache, metrics)
2. **Prisma → SQLAlchemy** - Budget ledger uses Prisma, need to port schema
3. **Redis state** - Model state in Redis, need Python Redis client
4. **Breaking changes** - Migration changes API contracts between Node/Python
5. **Testing gap** - New Python code needs tests before removing Node.js

**Mitigation**: Run dual-mode during migration, validate Python before removing Node.js.

---

## Rollback Plan

If migration fails at any sprint:
1. Set `AI_SERVICE_MODE=off` to revert to Node.js-only
2. Keep migrated files but disable imports
3. Revert to previous state

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Node.js AI LOC remaining | 0 (after Sprint 5) |
| Python AI coverage | 100% of AI decisions |
| SDK usage (MagenticBuilder) | Default enabled |
| MCP tool exposure | All tools via MCP |
| Test pass rate | 100% on evaluation suite |
| Response latency | No regression |