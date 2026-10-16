# Plan: MCP-as-Capability-Gateway Implementation

**Generated**: 2026-06-07
**Estimated Complexity**: High
**Owner**: opencode + parallel sub-agents

## Overview

Transform the MaxP platform from "tools defined in JS files, MCP is dev-only"
into the documented target architecture: **MCP is the capability gateway for
the customer-facing AI agent**. The Python AI service already imports
`MCPSkillsSource` and `AggregatingSkillsSource` (see
`apps/ai-service/src/agents/base.py:32`); this plan wires them to real MCP
servers and closes the JS security gap.

The architecture decision (Microsoft Agent Framework + MCP) is already made
and documented in `docs/agentic_ai_planning/node-to-python-unification-plan.md`.
This plan executes Sprint 2.2 ("Wire up MCP properly") and the security
follow-up to `AUDIT_AGENTS_SDK_GAP.md`.

## Prerequisites

- `apps/ai-service` Python service running locally (or `uv` installable)
- Node 18+ for the JS tests
- Local Postgres + Redis (already required for `apps/ai-service` tests)
- `pip install agent-framework==1.8.0` already in `pyproject.toml`
- `@modelcontextprotocol/sdk ^1.0.1` already in `apps/backend/package.json`

## Architecture after this plan

```
Customer (WhatsApp/Facebook)
  -> messagingController.js
  -> aiServiceRouter (mode = pilot/primary)
  -> apps/ai-service POST /chat
     -> run_orchestration()
     -> MAF Agent
          ├── MCPSkillsSource(client=catalog-mcp via streamable_http)
          ├── MCPSkillsSource(client=skills-mcp via streamable_http)
          ├── AggregatingSkillsSource(...)
          └── FunctionTool(s) (Pydantic-wrapped local tools)
     -> backend bridge /api/v1/ai-bridge/tools/execute (Node)
  -> response
```

The Node fallback path is also fixed: MCP tools no longer bypass
`agentToolGatewayService.execute()` and must pass injection scan, role-scope
check, param sanitization, intent relevance, write-conflict guard, and HITL
approval.

---

## Sprint 0: Security Fix (Sequential, P0)

**Goal**: Stop the JS agent from calling MCP tools via a path that bypasses
every safety layer.

**Demo/Validation**:
- `cd apps/backend && npx jest tests/services/aiAgent/test_mcp_gateway_safety.test.js`
- Manual: trace `toolExecutionEngine.js:466-475` and confirm the new branch
  routes through `agentToolGatewayService.execute()`

### Task 0.1: Refactor MCP dispatch through the gateway

- **Location**: `apps/backend/legacy-ai-agent/aiAgent/executors/toolExecutionEngine.js:466-475`
- **Description**: Replace the direct `mcpTool.handler(companyId, params)` call
  with a call to `agentToolGatewayService.execute({...})` that passes a
  synthesised "agent" object. The gateway already handles `mcp_` tools
  because `TOOLS[toolName]` lookup will fail for them; the gateway needs a
  new code path that:
  1. Resolves the tool from `McpServerRegistry`
  2. Runs the same injection + role + sanitization + intent + conflict checks
  3. Emits the same audit log entries
  4. On approval-required write tools, pauses via the same HITL flow
- **Dependencies**: None
- **Acceptance Criteria**:
  - An MCP tool call without a matching `TOOLS[toolName]` entry is still
    rejected by `_enforceRoleScope` and `agent.canUseTool`
  - An MCP tool call with prompt injection in the user message is rejected
    with `INJECTION_BLOCKED` audit entry
  - An MCP write tool that requires approval pauses the run and sends a
    merchant notification
- **Validation**:
  - New regression test `test_mcp_gateway_safety.test.js` with three
    scenarios: injection block, role block, happy path read

### Task 0.2: Add audit + metrics parity

- **Location**: `apps/backend/legacy-ai-agent/aiAgent/agentToolGatewayService.js`
- **Description**: Ensure the new MCP branch in the gateway emits
  `AGENT_TOOL_REQUEST` and `AGENT_TOOL_RESULT` audit events with the same
  shape as the existing path. Add a `tool_origin: 'mcp'` metadata field so
  the audit log distinguishes MCP tools from JS-defined ones.
- **Dependencies**: Task 0.1
- **Validation**: `agentAuditTrailService` test asserts two audit entries
  per MCP call.

---

## Sprint 1: Production MCP Server `catalog-mcp` (Parallel track A)

**Goal**: Build the first real production-grade MCP server that exposes
catalog/inventory tools via MCP. This is the reference implementation
for all future MCP servers in MaxP.

**Demo/Validation**:
- `cd apps/mcp-servers/catalog-mcp && uv run pytest -v` -> all green
- `uv run python -m apps.mcp_servers.catalog_mcp` -> server starts on :7100
- `curl -X POST http://localhost:7100/mcp -d '{...initialize...}'` -> valid JSON-RPC
- `curl -X POST http://localhost:7100/mcp -d '{...tools/list...}'` -> returns
  3 tools: `search`, `inventory_check`, `product_get`

### Task 1.1: Scaffold `catalog-mcp` package

- **Location**: `apps/mcp-servers/catalog-mcp/`
- **Description**: New Python package with:
  - `pyproject.toml` (hatchling, depends on `mcp[cli]>=1.2`, `httpx`, `pydantic`)
  - `src/maxp_mcp_catalog/__init__.py` -> `serve()` entry point
  - `src/maxp_mcp_catalog/server.py` -> FastMCP server
  - `src/maxp_mcp_catalog/tools.py` -> 3 Pydantic-validated tool functions
  - `src/maxp_mcp_catalog/backend_client.py` -> httpx client to MaxP backend
  - `tests/test_server.py` -> stdio + streamable_http round-trip tests
  - `README.md` -> 5-line usage
- **Dependencies**: None
- **Acceptance Criteria**:
  - Package is installable with `uv pip install -e .`
  - `python -m maxp_mcp_catalog` starts a Streamable HTTP server on `:7100`
  - Tools are advertised correctly via `tools/list`
  - All 3 tools return Pydantic-validated responses

### Task 1.2: Implement the 3 catalog tools

- **Location**: `apps/mcp-servers/catalog-mcp/src/maxp_mcp_catalog/tools.py`
- **Description**: Three read-only tools, all Pydantic-validated, all routed
  to the MaxP backend `/api/v1/ai-bridge/tools/execute` so the agent never
  talks to the database directly:
  1. `search(query: str, limit: int = 20)` -> calls `product.search`
  2. `inventory_check(product_id: str)` -> calls `inventory.check`
  3. `product_get(product_id: str)` -> calls `product.get_by_id` (a new
     minimal tool on the backend; for now the tool can return a "not yet
     implemented" stub that's still a valid MCP response)
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - All 3 tools have Pydantic input models
  - All 3 tools return `{"content": [...], "isError": false}` shape
  - The backend client retries once on 5xx and returns an MCP error
    result on 4xx

### Task 1.3: Tests for `catalog-mcp`

- **Location**: `apps/mcp-servers/catalog-mcp/tests/test_server.py`
- **Description**: Use `respx` to mock the MaxP backend. Three test groups:
  1. `test_initialize_and_list_tools` -> exercise JSON-RPC handshake
  2. `test_search_calls_product_search` -> assert URL + payload
  3. `test_inventory_check_returns_structured_result`
  4. `test_error_passes_through_as_is_error`
- **Dependencies**: Task 1.2
- **Validation**: `uv run pytest -v` -> 4 tests pass

---

## Sprint 2: Production MCP Server `skills-mcp` (Parallel track B)

**Goal**: Serve the `apps/ai-service/skills/` directory as MCP resources so
`MCPSkillsSource` can discover them dynamically. The existing test
`apps/ai-service/tests/mcp/test_registry.py:101-175` already validates
the JSON-RPC shape we need to implement; this sprint implements the
server side.

**Demo/Validation**:
- `cd apps/mcp-servers/skills-mcp && uv run pytest -v` -> all green
- `uv run python -m apps.mcp_servers.skills_mcp` -> server starts on :7101
- `resources/read skill://index.json` -> returns JSON index of 15 skills
- `resources/read skill://catalog-search/SKILL.md` -> returns markdown

### Task 2.1: Scaffold `skills-mcp` package

- **Location**: `apps/mcp-servers/skills-mcp/`
- **Description**: Same pattern as catalog-mcp, but for skills resources:
  - `pyproject.toml` -> depends on `mcp[cli]>=1.2`, `watchfiles`
  - `src/maxp_mcp_skills/server.py` -> FastMCP with `resources` capability
  - `src/maxp_mcp_skills/skills_index.py` -> scan skills dir, build index
  - `src/maxp_mcp_skills/skill_resource.py` -> serve individual SKILL.md files
  - `tests/test_server.py`
- **Dependencies**: None (parallel with Sprint 1)
- **Acceptance Criteria**:
  - Server starts on :7101
  - `initialize` returns `{"resources": {}}` capability
  - `resources/list` -> returns index resource URI
  - `resources/read` for a known skill -> returns TextResourceContents

### Task 2.2: Implement skill discovery + serving

- **Location**: `apps/mcp-servers/skills-mcp/src/maxp_mcp_skills/`
- **Description**:
  1. On startup, scan `apps/ai-service/skills/` for subdirs containing
     `skill.json` and `SKILL.md`
  2. Build an in-memory index `{"skills": [{name, type, url}, ...]}`
  3. Expose two resource templates:
     - `skill://index.json` -> the full index
     - `skill://{skill_id}/SKILL.md` -> individual skill
  4. Use `watchfiles` to hot-reload the index when files change
  5. Serve everything as `application/json` for the index and
     `text/markdown` for individual skills (matches the test
     `test_mcp_client_can_feed_agent_framework_mcp_skills_source`)
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - The 15 skills in `apps/ai-service/skills/` are discoverable
  - Adding a new `skill.json` in a hot-reload manner shows up in
    `resources/read skill://index.json` within 2 seconds

### Task 2.3: Tests for `skills-mcp`

- **Location**: `apps/mcp-servers/skills-mcp/tests/test_server.py`
- **Description**: Use the real skills dir (a fixture copies 2 skills to
  a tmp dir). Tests:
  1. `test_initialize_advertises_resources_capability`
  2. `test_resources_read_index_json_lists_all_skills`
  3. `test_resources_read_skill_md_returns_markdown`
  4. `test_hot_reload_picks_up_new_skill` -> use `watchfiles` to trigger
     a reload
- **Dependencies**: Task 2.2
- **Validation**: `uv run pytest -v` -> 4 tests pass

---

## Sprint 3: Wire the MCP servers into the AI service (Sequential, after S1+S2)

**Goal**: Configure the running `apps/ai-service` to connect to both MCP
servers on startup and feed them into `BaseAgent.build()`.

**Demo/Validation**:
- `cd apps/ai-service && uv run pytest tests/mcp tests/agents/test_base.py -v`
- `.env` has `MCP_SERVERS=[{"name":"catalog","url":"http://localhost:7100/mcp"}, ...]`
- `get_mcp_registry().get_all_tools()` returns 3 catalog tools
- `BaseAgent.build().context_providers` contains a `SkillsProvider` built
  from `MCPSkillsSource`s

### Task 3.1: Extend `Settings` with skills_server_url

- **Location**: `apps/ai-service/src/config.py:76-79`
- **Description**: Add `skills_mcp_url: str | None = None` for the
  `skills-mcp` server. Catalog servers are already covered by
  `mcp_servers: list[dict]`.
- **Dependencies**: None
- **Validation**: Settings test passes

### Task 3.2: Auto-register skills-mcp on startup

- **Location**: `apps/ai-service/src/mcp/registry.py:57-67`
- **Description**: After `register_from_config()` finishes, if
  `settings.skills_mcp_url` is set, register a server named `skills`
  with the special-purpose skill-serving URL. Tag it so the
  `get_skill_clients()` only returns the `skills` server (not the
  catalog one, which is a tool server, not a skills server).
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - `get_skill_clients()` returns `[skills_client]` and excludes
    `catalog_client`
  - `get_all_tools()` still includes catalog tools

### Task 3.3: Verify `BaseAgent.build()` wires the skills source

- **Location**: `apps/ai-service/src/agents/base.py:259-267`
- **Description**: Confirm the existing `MCPSkillsSource` + `AggregatingSkillsSource`
  wiring activates when at least one skill client is registered. If
  `get_skill_clients()` is empty, `skills_provider` stays None and
  `context_providers` contains only `MaxPContextProvider`. If at least
  one client is registered, `skills_provider` is built and added.
- **Dependencies**: Task 3.2
- **Validation**: `test_base.py` test asserts the wiring

### Task 3.4: Add `.env.example` entries

- **Location**: `apps/ai-service/.env.example`
- **Description**: Document the new env vars:
  ```
  MCP_SERVERS=[{"name":"catalog","url":"http://localhost:7100/mcp"}]
  SKILLS_MCP_URL=http://localhost:7101/mcp
  ```
- **Dependencies**: None
- **Validation**: Manual review

---

## Sprint 4: E2E verification (Sequential, after Sprint 3)

**Goal**: Prove the whole chain works end-to-end with a real customer
chat request that ends up using an MCP tool.

**Demo/Validation**:
- `bash scripts/test_mcp_e2e.sh` -> 1 integration test green
- Output includes a successful `mcp_catalog_search` tool call in the
  audit log

### Task 4.1: Add an E2E script

- **Location**: `scripts/test_mcp_e2e.sh` (new)
- **Description**: Bash script that:
  1. Starts `catalog-mcp` in background on :7100
  2. Starts `skills-mcp` in background on :7101
  3. Sets `MCP_SERVERS` and `SKILLS_MCP_URL` in the ai-service env
  4. Starts the ai-service
  5. POSTs a sample customer message to `/chat`
  6. Greps the audit log for `tool_origin: mcp`
  7. Exits 0 if found, 1 otherwise
- **Dependencies**: Sprints 1, 2, 3
- **Validation**: Run script and assert exit 0

### Task 4.2: Update `AGENTIC_AI_TRACKER.md`

- **Location**: `docs/agentic_ai_planning/AGENTIC_AI_TRACKER.md`
- **Description**: Add a new entry for Sprint 2.2 ("Wire up MCP properly")
  showing it's now complete, with a link to the E2E test output.
- **Dependencies**: Task 4.1
- **Validation**: Manual review

---

## Testing Strategy

- **Per-sprint unit tests** (Jest for JS, pytest for Python)
- **Per-sprint integration test** for each MCP server
- **Sprint 4 E2E test** for the full customer-reply path
- **Regression tests** for the security fix (Task 0.1)

## Potential Risks & Gotchas

1. **Windows + stdio**: The legacy `mcp-server/` uses stdio; our new
   servers use streamable_http, which is OS-agnostic. We do NOT inherit
   the stdio path.
2. **`/tmp` in `manager-ceo/agent.json`**: The legacy agent template
   points to a Linux-only path. We are not touching that in this plan.
3. **Skill count drift**: If a new skill is added to
   `apps/ai-service/skills/`, `skills-mcp` will hot-reload. The
   `apps/ai-service/tests/mcp/test_registry.py` test only covers the
   JSON-RPC shape, not the live server. Task 2.3 covers the live server.
4. **Audit log noise**: Sprint 0 will start emitting `AGENT_TOOL_REQUEST`
   for MCP tools. If existing dashboards filter on tool name shape, they
   may need to be updated. Mitigation: include `tool_origin: mcp` in the
   metadata so it's filterable.
5. **Backend dependency**: `catalog-mcp` calls
   `/api/v1/ai-bridge/tools/execute`. In dev, this may not be running.
   The tests use `respx` to mock it; the E2E script skips if the
   backend is unreachable.

## Rollback Plan

- Sprint 0: Revert `toolExecutionEngine.js:466-475` change; MCP tools
  go back to bypassing the gateway (back to insecure baseline).
- Sprint 1-2: Delete `apps/mcp-servers/` directories; nothing else
  changes.
- Sprint 3: Remove `skills_mcp_url` from `Settings`; the registry
  falls back to empty.
- Sprint 4: Delete the E2E script.

If the full plan is rolled back, the project is in the same state as
before this plan started.

## Public Exposure & Deployment Status (Updated 2026-10-16)

The public reverse-proxy locations (`/mcp/catalog` and `/mcp/video`) in `nginx_configs/maxp.online.conf` were temporarily removed on 2026-10-16 because the underlying services (`apps/mcp-servers/catalog-mcp:7100` and `video-mcp:7102`) are not deployed in production, causing 502 Bad Gateway responses for public visitors.

**Condition for re-enabling public routes:**
Re-add the nginx proxy blocks ONLY after:
1. `apps/mcp-servers/**` deployment is automated in `scripts/deploy-remote.sh` / `.github/workflows/deploy.yml` and managed via PM2 / systemd.
2. The authentication story (merchant Bearer tokens / API keys) is documented, tested, and enforced at the gateway.
