# Implementation Plan: AI Agent Routing Improvements

## Overview

Implementing three improvements to the AI agent routing system:

1. **Parallel Tool Execution** - Execute independent tools simultaneously
2. **Capability-based Agent Routing** - Dynamic agent selection with scoring
3. **Feedback Loop & Metrics** - Track routing decisions and optimize

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Use `asyncio.gather()` for parallel execution | Already async, minimal code change |
| Score-based routing over role-based | Dynamic, learns from feedback |
| Add metrics to existing observability layer | Reuse Prometheus infrastructure |

---

## Task List

### Phase 1: Parallel Tool Execution

#### Task 1: Add Tool Dependency Classification

**Description:** Classify tools as `independent` (safe to run in parallel) vs `dependent` (must wait for results).

**Acceptance criteria:**
- [ ] `TOOL_DEPENDENCIES` map exists in `src/tools/registry.py`
- [ ] Read tools classified as `independent`
- [ ] Write tools classified as `dependent` on reads (when same entity)
- [ ] `is_independent(tool_name)` helper function exists

**Files likely touched:**
- `apps/ai-service/src/tools/registry.py`

**Estimated scope:** Small

---

#### Task 2: Refactor execute_tools.py for Parallel Execution

**Description:** Replace sequential `if/await` blocks with `asyncio.gather()` for independent tools.

**Acceptance criteria:**
- [ ] `determine_execution_batches()` function splits tools into parallel batches
- [ ] Independent tools execute in parallel via `asyncio.gather()`
- [ ] Dependent tools execute sequentially after their dependencies
- [ ] All results correctly aggregated into `ctx.tool_context`
- [ ] Existing sequential behavior preserved for dependent tools

**Verification:**
- [ ] Manual test: call with multiple independent read tools → verify parallel execution
- [ ] Existing tests pass

**Files likely touched:**
- `apps/ai-service/src/pipeline/stages/execute_tools.py`
- `apps/ai-service/src/intent/planner.py` (add batch building)

**Estimated scope:** Medium

---

#### Task 3: Add Timing Metrics for Tool Execution

**Description:** Track parallel vs sequential execution timing.

**Acceptance criteria:**
- [ ] `TOOL_BATCH_EXECUTION_TIME` metric added
- [ ] `tool_batch_size` label (how many tools in batch)
- [ ] `parallel_speedup_ratio` computed and logged

**Files likely touched:**
- `apps/ai-service/src/observability/metrics.py`
- `apps/ai-service/src/pipeline/stages/execute_tools.py`

**Estimated scope:** Small

---

### Phase 2: Capability-based Agent Routing

#### Task 4: Add Agent Scoring Service

**Description:** Create `src/services/agent_scorer.py` with scoring logic for agent selection.

**Acceptance criteria:**
- [ ] `AgentScorer` class with `score_agent(agent, intent, context)` method
- [ ] Scoring factors: intent_match, success_rate, latency_score, capability_overlap
- [ ] Scores cached in-memory with TTL
- [ ] `get_best_agent(company_id, intent, context)` returns top-scored agent

**Files likely touched:**
- `apps/ai-service/src/services/agent_scorer.py` (new file)

**Estimated scope:** Medium

---

#### Task 5: Integrate Scorer into Agent Registry

**Description:** Modify `agent_registry.py` to support score-based selection.

**Acceptance criteria:**
- [ ] `get_best(company_id, intent)` method added to `AgentRegistry`
- [ ] Fallback to role-based if no scoring data
- [ ] `list_agents()` returns agents with scores

**Files likely touched:**
- `apps/ai-service/src/services/agent_registry.py`

**Estimated scope:** Small

---

#### Task 6: Add Tool Selection Score to ToolPlan

**Description:** Populate the existing unused `selectionScore` field in `ToolPlan`.

**Acceptance criteria:**
- [ ] `planner.py` calculates `selectionScore` based on:
  - Tool confidence (from policy)
  - Historical success rate for this intent
  - Estimated latency
- [ ] Score passed through to `route_to_tools.py`

**Files likely touched:**
- `apps/ai-service/src/intent/planner.py`
- `apps/ai-service/src/intent/schema.py`

**Estimated scope:** Small

---

### Phase 3: Feedback Loop & Metrics

#### Task 7: Add Routing Decision Logger

**Description:** Log every routing decision with context for analytics.

**Acceptance criteria:**
- [ ] `RoutingDecision` model/log entry with:
  - `intent`, `selected_agent`, `selected_tool`, `score_breakdown`
  - `timestamp`, `company_id`, `thread_id`
- [ ] Log emitted after every routing decision
- [ ] Backward compatible (no breaking changes)

**Files likely touched:**
- `apps/ai-service/src/pipeline/stages/route_to_tools.py`
- `apps/ai-service/src/observability/audit.py`

**Estimated scope:** Small

---

#### Task 8: Add Agent Performance Metrics

**Description:** Track per-agent success rates and latency.

**Acceptance criteria:**
- [ ] `AGENT_SUCCESS_RATE` gauge with labels: `agent_id`, `role`, `intent`
- [ ] `AGENT_LATENCY_P50` histogram with same labels
- [ ] Metrics updated after each tool execution

**Files likely touched:**
- `apps/ai-service/src/observability/metrics.py`
- `apps/ai-service/src/pipeline/stages/execute_tools.py`

**Estimated scope:** Small

---

#### Task 9: Add Feedback Aggregation Job

**Description:** Periodic job to compute aggregate scores from recent interactions.

**Acceptance criteria:**
- [ ] `update_agent_scores_from_history()` function
- [ ] Called by scheduler every 15 minutes
- [ ] Computes rolling success rate from last 100 interactions
- [ ] Updates in-memory scoring cache

**Files likely touched:**
- `apps/ai-service/src/services/agent_scorer.py`
- `apps/ai-service/src/observability/routing_stats.py` (new file)

**Estimated scope:** Medium

---

## Checkpoints

### Checkpoint: After Phase 1
- [ ] Tools execute in parallel when independent
- [ ] No regression in existing tests
- [ ] Measured speedup on multi-tool requests

### Checkpoint: After Phase 2
- [ ] Agent scoring works for known intents
- [ ] Fallback to role-based for unknown intents
- [ ] `selectionScore` field actively used

### Checkpoint: After Phase 3
- [ ] Routing decisions logged
- [ ] Agent metrics visible in Prometheus
- [ ] Feedback loop updates scores

---

## Dependencies

| Task | Depends On |
|------|------------|
| Task 2 (Parallel Execution) | Task 1 (Dependency Classification) |
| Task 5 (Integrate Scorer) | Task 4 (Scorer Service) |
| Task 6 (Tool Selection Score) | Task 4 (Scorer Service) |
| Task 8 (Agent Metrics) | Task 4 (Scorer Service) |
| Task 9 (Feedback Aggregation) | Task 7 (Routing Logger), Task 8 (Agent Metrics) |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Parallel execution breaks tool order dependency | High | Only parallelize explicitly marked independent tools |
| Scoring cache grows unbounded | Medium | TTL + LRU eviction |
| Feedback loop introduces latency on writes | Low | Async updates, eventual consistency |

---

## Open Questions

1. Should parallel execution be enabled for all tools or gated by feature flag?
2. Should we track per-customer-agent affinity in scoring?
3. Minimum data threshold before scoring affects routing?