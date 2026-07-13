# Plan: Config-Driven Agent Architecture Migration

**Generated**: 2026-06-02
**Estimated Complexity**: High
**Reference**: OpenAI Agents SDK pattern (config objects, not classes)

## Overview

Migrate from class-based specialist agents (SAS_SalesAgent, SalesAgent, SupportAgent) to **config-driven agents** where `BaseAgent` is the only class needed. Each agent's behavior is defined by its template files (`agent.json`, `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `PERSONA.md`) loaded at runtime.

**Why**: Faster iteration, no deploy for new agents, single source of truth, fewer bugs.

## Prerequisites

- All agent templates exist in `backend/agents/*/`
- `agentProfileLoaderService` already loads templates from disk
- Tests must pass after each sprint

## Sprint 1: Enrich Templates (Parallel Work)

**Goal**: Make templates self-describing so they don't need JS classes
**Demo/Validation**:
- `agentProfileLoaderService.loadProfile('sas-sales-agent')` returns personaMeta, guardrails, PERSONA.md content
- All 7 templates have PERSONA.md

### Task 1.1: Create PERSONA.md for all templates
- **Location**: `backend/agents/*/PERSONA.md`
- **Description**: Write identity, voice, dialect, guardrails, handoff rules per agent
- **Dependencies**: None (parallel across all templates)
- **Templates**: sas-sales-agent, sales-agent, support-agent, manager-ceo, marketing-agent, inventory-pricing-agent, facebook-sales-support-agent
- **Acceptance Criteria**:
  - Each file has: Identity, Voice/Dialect Policy, Guardrails, Handoff Rules
  - Language appropriate to template role
- **Validation**: `loadProfile()` includes `instructions.persona`

### Task 1.2: Enrich agent.json with new fields
- **Location**: `backend/agents/*/agent.json`
- **Description**: Add `personaMeta`, `guardrails`, `instructions.persona` to each manifest
- **Dependencies**: Task 1.1 (to know what fields to reference)
- **Acceptance Criteria**:
  - `"instructions": {"agents": "...", "soul": "...", "tools": "...", "persona": "PERSONA.md"}`
  - `"personaMeta": {"language": "...", "dialect": "...", "tone": "...", "formality": "..."}`
  - `"guardrails": {"requireDraftOrders": true/false, ...}`
- **Validation**: All agent.json files are valid JSON

### Task 1.3: Refactor agentProfileLoaderService to load PERSONA.md
- **Location**: `backend/services/aiAgent/agentProfileLoaderService.js`
- **Description**: Read PERSONA.md referenced in manifest.instructions.persona
- **Dependencies**: Task 1.1, 1.2
- **Acceptance Criteria**:
  - `loadProfile(slug)` returns `instructions.persona` (markdown text)
- **Validation**: Console.log shows persona content loaded

## Sprint 2: Refactor BaseAgent (The Core)

**Goal**: `BaseAgent` becomes the universal agent class, driven entirely by config
**Demo/Validation**:
- `BaseAgent.fromTemplate('sas-sales-agent', 'comp1')` creates fully functional agent
- System prompt includes persona, guardrails, rules from template

### Task 2.1: Add `BaseAgent.fromTemplate()` factory
- **Location**: `backend/services/aiAgent/BaseAgent.js`
- **Description**: Static factory that loads template via `agentProfileLoaderService` and builds config
- **Dependencies**: Sprint 1 complete
- **Acceptance Criteria**:
  - `BaseAgent.fromTemplate(templateSlug, companyId, overrides)` works
  - Returns instance with correct role, tools, model, persona, instructions
- **Validation**: Unit test creates SAS_SALES agent via factory

### Task 2.2: Template-driven `_getSystemPrompt()`
- **Location**: `backend/services/aiAgent/BaseAgent.js`
- **Description**: Build prompt from `this._instructions.*` (loaded from template) instead of `_getSystemPromptAppendix()` hook
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Prompt includes: [الروح], [الشخصية], [القواعد], [تعليمات الأدوات], [الأدوات المتاحة]
  - No hardcoded Arabic strings (use template markdown)
  - No `_getSystemPromptAppendix()` hook needed
- **Validation**: Prompt text contains persona instructions loaded from template

## Sprint 3: Refactor Provisioning & Sandbox (Parallel)

**Goal**: Remove all hardcoded role→class mappings
**Demo/Validation**:
- `spawn()` creates agents via factory, not switch
- `aiSandboxController` uses `BaseAgent.fromTemplate()`

### Task 3.1: Refactor agentProvisioningService
- **Location**: `backend/services/aiAgent/agentProvisioningService.js`
- **Description**:
  - Remove `ROLE_TOOL_MAP` (use template tools)
  - Remove `getAgentClass()` switch
  - Remove `instantiateAgent()`
  - Replace with `createAgentFromConfig()` that uses `BaseAgent.fromTemplate()`
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - No `ROLE_TOOL_MAP` constant
  - No `getAgentClass()` function
  - `spawn()` returns `BaseAgent.fromTemplate(...)` for all non-CEO roles
- **Validation**: All existing tests still pass (or updated)

### Task 3.2: Refactor aiSandboxController
- **Location**: `backend/controller/aiSandboxController.js`
- **Description**:
  - Remove imports: `SAS_SalesAgent`, `SalesAgent`, `SupportAgent`
  - Replace switch in `createSandboxRuntimeAgent()` with factory
  - CEO stays special, everything else → `BaseAgent.fromTemplate()`
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Only imports: `CEOAgent`, `BaseAgent`
  - Switch replaced with `if (role === 'CEO') else BaseAgent.fromTemplate()`
- **Validation**: Browser smoke test with SAS_SALES works

## Sprint 4: Cleanup & Testing

**Goal**: Remove dead code, consolidate tests
**Demo/Validation**:
- All tests pass
- No `SAS_SalesAgent.js`, `SalesAgent.js`, `SupportAgent.js` in repo
- Single test file covers all config-driven agents

### Task 4.1: Remove specialist classes
- **Location**: `backend/services/aiAgent/agents/`
- **Delete**:
  - `SAS_SalesAgent.js`
  - `SalesAgent.js`
  - `SupportAgent.js`
- **Acceptance Criteria**: Files gone, no imports reference them
- **Validation**: `npm test` doesn't fail with missing module

### Task 4.2: Remove old tests, add unified test
- **Location**: `backend/tests/services/agents/`
- **Delete**:
  - `SAS_SalesAgent.test.js`
  - `SalesAgent.test.js`
  - `SupportAgent.test.js`
- **Create**:
  - `configDrivenAgent.test.js` (tests all templates)
  - `spawn.test.js` (update to verify factory pattern)
  - `criticalFixes.test.js` (keep, may need minor updates)
- **Acceptance Criteria**: 6 tests cover all roles, all pass
- **Validation**: `npm test` green

### Task 4.3: Update CEOAgent to use template-driven prompt
- **Location**: `backend/services/aiAgent/CEOAgent.js`
- **Description**: CEO keeps orchestration logic but prompt comes from template
- **Acceptance Criteria**: CEOAgent still has decomposeGoal/orchestrate, but prompt built by BaseAgent
- **Validation**: CEO sandbox still works

## Sprint 5: DB Migration & Admin UI (Future)

### Task 5.1: Create agent_roles table migration
- **Script**: `backend/scripts/migrateAgentRoles.js`
- Upserts roles from template files into DB
- Syncs company_agents allowedTools with canonical template

### Task 5.2: Admin UI for role management
- New page or modify existing to show/edit roles from DB
- Checkbox grid for tools per role

## Testing Strategy

1. **Per Sprint**: Run `npm test -- tests/services/agents/` before moving on
2. **Smoke Test**: Open AI Sandbox, test SAS_SALES, SALES, SUPPORT agents
3. **Regression**: Ensure existing sessions and company_agents still load
4. **Arabic strings check**: Run `node scripts/check-arabic-strings.js` — violations should only be in template markdown files (allowed)

## Potential Risks & Gotchas

- **Risk**: Template `agent.json` files may be stale vs what classes currently enforce
  - *Mitigation*: Audit each template's `allowedTools` against current ROLE_TOOL_MAP before removing
- **Risk**: `BaseAgent.fromTemplate()` may fail if template doesn't exist on disk
  - *Mitigation*: Add fallback to default template + warning log
- **Risk**: `_getSystemPrompt()` rewrite may break existing prompt formatting
  - *Mitigation*: Snapshot old prompt, compare after refactor
- **Risk**: CEOAgent inheritance change may break orchestration
  - *Mitigation*: Keep CEOAgent as separate class, only change prompt loading

## Rollback Plan

- Keep `git stash` of specialist classes before deletion
- Each sprint is independently committable
- If tests fail, revert individual file changes
