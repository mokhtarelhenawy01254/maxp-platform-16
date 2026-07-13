# Plan: Agent Architecture Refactor — BaseAgent Pipeline + CEOAgent Orchestration Only

**Generated**: 2026-06-02
**Estimated Complexity**: High
**Status**: In Progress
**Decision Context**: CEOAgent currently wraps ALL agents (anti-pattern). Each specialist agent should inherit from BaseAgent directly, with CEOAgent adding only orchestration features.

---

## Overview

**Current Problem:**
- `CEOAgent.js` (589 lines) contains the FULL pipeline (resolveIntent → routeToTools → executeTools → validateReply)
- All specialist agents (sales, support, sas-sales) are created as `BaseAgent` instances but then wrapped in `CEOAgent` in the Sandbox
- This causes persona drift, tool scope leakage, and incorrect behavior

**Target Architecture:**
```
BaseAgent
  ├── LLM Engine (generateWithLLMResult)
  ├── Pipeline Runner (processTask with stages)
  ├── Tool Scoping (allowedTools)
  └── Persona Loader (SOUL.md per template)
  
  ├── CEOAgent extends BaseAgent
  │   ├── Multi-Agent Orchestration (discussWithAgent)
  │   ├── Task Decomposition
  │   └── Sub-Agent Delegation
  │
  ├── SalesAgent extends BaseAgent
  │   └── Pipeline optimized for: Product Search → Order Draft → Reply
  │
  ├── SAS_SalesAgent extends BaseAgent  
  │   └── Pipeline optimized for: Facebook Messenger + Catalog + Order Flow
  │
  └── SupportAgent extends BaseAgent
      └── Pipeline optimized for: Order Lookup → Shipping Check → Reply
```

**Non-Goals:**
- Not rewriting the tool handlers themselves
- Not changing the Prisma schema
- Not changing the frontend UI (except Sandbox SOUL loading fix)

---

## Prerequisites

- [x] All existing tests pass (except 1 pre-existing fail)
- [x] AGENTS.md rules understood (no hardcoded replies, i18n for UI, English tool keys)
- [ ] Backup of `CEOAgent.js` before refactoring
- [ ] New test files ready for each sprint

---

## Sprint 1: Fix Immediate Issues (Emergency Patch)
**Goal**: Make `sas-sales-agent` usable in Sandbox TODAY without breaking anything.
**Risk Level**: LOW — only config changes, no structural refactoring.

### Task 1.1: Fix ROLE_TOOL_MAP for SAS_SALES
- **Location**: `backend/services/aiAgent/agentProvisioningService.js`
- **Current (WRONG)**:
  ```javascript
  SAS_SALES: ['googlesheets.searchProducts', 'googlesheets.submitOrder', 'googlesheets.readProducts', 'facebook.reply', 'agent.handoff'],
  ```
- **Target (CORRECT)**:
  ```javascript
  SAS_SALES: ['product.search', 'inventory.check', 'order.create_draft', 'order.lookup', 'shipping.rates', 'facebook.reply', 'agent.handoff'],
  ```
- **Acceptance Criteria**:
  - `agentProvisioningService.spawn('company_123', {role: 'SAS_SALES'})` returns agent with Local DB tools
  - Agent CANNOT see `googlesheets.*` tools in its allowedTools
- **Validation**: Unit test asserting `agent.canUseTool('product.search') === true` and `agent.canUseTool('googlesheets.searchProducts') === false`

### Task 1.2: Fix Sandbox to Load Agent-Specific SOUL.md
- **Location**: `backend/controller/aiSandboxController.js`
- **Current Issue**: `createSandboxRuntimeAgent` builds `CEOAgent` with generic `loadSoul(companyId)` which loads company-level SOUL, not agent template SOUL
- **Fix**: Pass `soulInstructions` from the agent template's `SOUL.md` into the `CEOAgent` persona:
  ```javascript
  const sandboxAgent = new CEOAgent(companyId, {
    // ...existing config...
    persona: {
      ...(runtimeAgent.persona || {}),
      soulInstructions: runtimeAgent.persona?.soulInstructions || '', // from template
      modelPolicy,
    },
  });
  ```
- **Acceptance Criteria**:
  - When selecting `sas-sales-agent` in Sandbox, system prompt includes SOUL.md content from `backend/agents/sas-sales-agent/SOUL.md`
  - Agent replies reflect Egyptian Arabic dialect, short messages, no emojis
- **Validation**: Test that `_getSystemPrompt()` contains text from the template SOUL.md

### Task 1.3: Update sas-sales-agent/agent.json Allowed Tools
- **Location**: `backend/agents/sas-sales-agent/agent.json`
- **Ensure consistency** with ROLE_TOOL_MAP
- **Acceptance Criteria**: `agent.json` allowedTools exactly matches ROLE_TOOL_MAP[SAS_SALES]

### Sprint 1 Demo/Validation
- [ ] Open Sandbox, select `sas-sales-agent`
- [ ] Send: "عندك إيه منتجات"
- [ ] Verify agent replies in Egyptian Arabic dialect (short, warm)
- [ ] Verify agent mentions it CAN search products (even if sandbox doesn't execute)
- [ ] Run: `npm test -- agentProvisioningService.test.js`

---

## Sprint 2: Extract Pipeline from CEOAgent to BaseAgent
**Goal**: Make BaseAgent the true base class with pipeline execution. CEOAgent will extend it.
**Risk Level**: MEDIUM — touches core execution path.

### Task 2.1: Move Pipeline Imports and Execution to BaseAgent
- **Location**: `backend/services/aiAgent/BaseAgent.js`
- **Description**:
  - Add pipeline imports:
    ```javascript
    const pipeline = require('./pipeline');
    const resolveIntent = require('./pipeline/stages/resolveIntent');
    const routeToTools = require('./pipeline/stages/routeToTools');
    const executeTools = require('./pipeline/stages/executeTools');
    const handleFallback = require('./pipeline/stages/handleFallback');
    const validateReply = require('./pipeline/stages/validateReply');
    ```
  - Move `processTask()` implementation from CEOAgent to BaseAgent
  - Keep BaseAgent's current `processTask()` as `processTaskSimple()` fallback for non-pipeline usage
- **Acceptance Criteria**:
  - `BaseAgent.processTask()` runs the 5-stage pipeline
  - Returns `{agentId, role, status, result: {reply, summary}}` format
- **Validation**: Unit test with mock stages

### Task 2.2: Move System Prompt Builder to BaseAgent
- **Location**: `backend/services/aiAgent/BaseAgent.js`
- **Description**:
  - Move `_getSystemPrompt()` from CEOAgent to BaseAgent
  - Make it use `this.persona.soulInstructions` FIRST, then fallback to `loadSoul(companyId)`
  - Add `_getAllowedToolsList()` helper
- **Acceptance Criteria**:
  - `BaseAgent` instances can generate system prompts with their own SOUL
  - Template SOUL takes priority over company-level SOUL
- **Validation**: Test that prompt contains template SOUL text

### Task 2.3: Move Utility Functions to Shared Module
- **Location**: `backend/services/aiAgent/utils/agentPromptUtils.js` (NEW)
- **Description**:
  - Extract shared utilities from CEOAgent:
    - `_stripToolCalls()`
    - `_cleanBlock()`
    - `_formatSkillInstructions()`
    - `_formatPoliciesForPrompt()`
    - `_formatRelevancePrompt()`
  - Import in both BaseAgent and CEOAgent
- **Acceptance Criteria**:
  - No code duplication
  - Both classes use same formatting logic
- **Validation**: Unit tests for each utility

### Sprint 2 Demo/Validation
- [ ] Create a plain `BaseAgent` instance, call `processTask()`
- [ ] Verify it runs pipeline stages correctly
- [ ] Verify system prompt uses agent-specific SOUL
- [ ] Run: `npm test -- BaseAgent.test.js`

---

## Sprint 3: Refactor CEOAgent to Extend BaseAgent (Orchestration Only)
**Goal**: CEOAgent adds ONLY multi-agent orchestration, not the full pipeline.
**Risk Level**: HIGH — touches CEOAgent which is used everywhere.

### Task 3.1: Strip Pipeline from CEOAgent
- **Location**: `backend/services/aiAgent/CEOAgent.js`
- **Description**:
  - Remove pipeline imports (keep only orchestration imports)
  - Remove `_getSystemPrompt()` (now in BaseAgent)
  - Remove `processTask()` override (now in BaseAgent)
  - Keep ONLY:
    - `discussWithAgent()`
    - `reviewAndRefine()`
    - `orchestrateMultiAgentWorkflow()`
    - `buildCEOAgentConfig()` (factory)
    - `_failedReply()`
    - `getTaskLog()`
- **Acceptance Criteria**:
  - CEOAgent < 200 lines (was 589)
  - CEOAgent extends BaseAgent properly
- **Validation**: Syntax check, no missing references

### Task 3.2: Ensure CEOAgent Preserves All Orchestration Features
- **Description**:
  - Verify `discussWithAgent()` still works with `agentConversationBroker`
  - Verify `orchestrateMultiAgentWorkflow()` still calls `planSynthesisEngine`
  - Verify CEOAgent can still spawn sub-agents via `agent.spawn`
- **Acceptance Criteria**:
  - `multiAgentOrchestration.test.js` still passes
  - `aiChatServiceOrchestration.test.js` still passes
- **Validation**: Run full orchestration test suite

### Sprint 3 Demo/Validation
- [ ] Run: `npm test -- multiAgentOrchestration.test.js`
- [ ] Run: `npm test -- aiChatServiceOrchestration.test.js`
- [ ] Verify CEOAgent can still create plans with multiple agents

---

## Sprint 4: Create Specialist Agent Classes
**Goal**: Each specialist agent has its own class with role-optimized pipeline.
**Risk Level**: MEDIUM — new files, existing behavior preserved.

### Task 4.1: Create SAS_SalesAgent Class
- **Location**: `backend/services/aiAgent/agents/SAS_SalesAgent.js` (NEW)
- **Description**:
  ```javascript
  const BaseAgent = require('../BaseAgent');
  
  class SAS_SalesAgent extends BaseAgent {
    constructor(companyId, config = {}) {
      super({
        ...config,
        role: 'SAS_SALES',
        // Optimized for Facebook Messenger + Catalog
      });
    }
    
    // Override _getSystemPrompt to inject Facebook-specific rules
    async _getSystemPrompt() {
      const basePrompt = await super._getSystemPrompt();
      return basePrompt + `
      
      [Facebook Messenger Rules]
      - Keep replies under 80 words
      - Use Egyptian Arabic dialect
      - Always confirm order details before submission
      - If stock is 0, suggest alternatives immediately
      `;
    }
  }
  ```
- **Acceptance Criteria**:
  - SAS_SalesAgent loads `sas-sales-agent` template SOUL
  - Has Facebook-specific system prompt additions
  - Can use `product.search`, `order.create_draft`, `facebook.reply`

### Task 4.2: Create SalesAgent Class
- **Location**: `backend/services/aiAgent/agents/SalesAgent.js` (NEW)
- **Description**: Extends BaseAgent with sales-optimized defaults

### Task 4.3: Create SupportAgent Class
- **Location**: `backend/services/aiAgent/agents/SupportAgent.js` (NEW)
- **Description**: Extends BaseAgent with support-optimized defaults

### Task 4.4: Update AgentProvisioningService to Use Correct Classes
- **Location**: `backend/services/aiAgent/agentProvisioningService.js`
- **Description**:
  - Import specialist classes
  - In `spawn()`, instantiate correct class based on role:
    ```javascript
    const { SAS_SalesAgent } = require('./agents/SAS_SalesAgent');
    const { SalesAgent } = require('./agents/SalesAgent');
    const { SupportAgent } = require('./agents/SupportAgent');
    
    let agent;
    switch(normalizedRole) {
      case 'SAS_SALES': agent = new SAS_SalesAgent(companyId, config); break;
      case 'SALES': agent = new SalesAgent(companyId, config); break;
      case 'SUPPORT': agent = new SupportAgent(companyId, config); break;
      default: agent = new BaseAgent(config); break;
    }
    ```
- **Acceptance Criteria**:
  - `spawn('company_123', {role: 'SAS_SALES'})` returns `SAS_SalesAgent` instance
  - `spawn('company_123', {role: 'SALES'})` returns `SalesAgent` instance

### Sprint 4 Demo/Validation
- [ ] Test `agentProvisioningService.spawn()` returns correct class for each role
- [ ] Verify `instanceof BaseAgent` is true for all
- [ ] Verify `instanceof SAS_SalesAgent` is true for SAS_SALES role

---

## Sprint 5: Fix Sandbox to Use Correct Agent Classes
**Goal**: Sandbox creates the actual specialist agent class, not CEOAgent wrapper.
**Risk Level**: MEDIUM — affects developer experience.

### Task 5.1: Update createSandboxRuntimeAgent
- **Location**: `backend/controller/aiSandboxController.js`
- **Description**:
  - Instead of always creating `new CEOAgent(...)`, check role and create correct class:
    ```javascript
    const { SAS_SalesAgent } = require('../services/aiAgent/agents/SAS_SalesAgent');
    // ...
    let sandboxAgent;
    if (runtimeAgent.role === 'SAS_SALES') {
      sandboxAgent = new SAS_SalesAgent(companyId, {...});
    } else if (runtimeAgent.role === 'CEO' || runtimeAgent.role === 'MANAGER') {
      sandboxAgent = new CEOAgent(companyId, {...});
    } else {
      sandboxAgent = new BaseAgent({...}); // generic fallback
    }
    ```
- **Acceptance Criteria**:
  - Sandbox with `sas-sales-agent` creates `SAS_SalesAgent` instance
  - Sandbox with `ceo` creates `CEOAgent` instance
  - Both work correctly

### Task 5.2: Ensure Sandbox Still Works for CEO Agent
- **Description**: Verify CEO agent in Sandbox can still do orchestration if needed
- **Acceptance Criteria**: `agent.orchestrate` tool is available for CEO role in Sandbox

### Sprint 5 Demo/Validation
- [ ] Open Sandbox, select `sas-sales-agent`, verify it behaves like Messenger agent
- [ ] Open Sandbox, select `ceo`, verify it can still orchestrate
- [ ] Run: `npm test -- aiSandboxRoutes.security.test.js`

---

## Sprint 6: Testing & Validation
**Goal**: All tests pass, no regressions.
**Risk Level**: LOW — verification only.

### Task 6.1: Write Unit Tests for New Classes
- **Location**: `backend/tests/services/agents/` (NEW folder)
- **Files**:
  - `SAS_SalesAgent.test.js`
  - `SalesAgent.test.js`
  - `SupportAgent.test.js`
  - `BaseAgent.pipeline.test.js`
- **Acceptance Criteria**:
  - Each specialist agent test verifies correct tool scope
  - Each test verifies correct persona/SOUL loading
  - BaseAgent pipeline test verifies 5-stage execution

### Task 6.2: Run Full Regression Suite
- **Commands**:
  ```bash
  cd backend
  npm test -- allPhasesIntegration.test.js
  npm test -- agentManagerRuntimeService.test.js
  npm test -- agentNativeTooling.test.js
  npm test -- multiAgentOrchestration.test.js
  npm test -- aiChatServiceOrchestration.test.js
  ```
- **Acceptance Criteria**:
  - All existing tests pass (except pre-existing 1 fail)
  - New tests pass
  - No syntax errors

### Task 6.3: Manual Sandbox Validation
- **Steps**:
  1. Start backend: `npm run dev`
  2. Open: `http://localhost:3001/admin/ai-agent-sandbox`
  3. Select `sas-sales-agent`
  4. Send messages in Arabic:
     - "عندك إيه منتجات"
     - "عايز أشتري حاجة"
     - "عندك مقاس 42؟"
  5. Verify replies:
     - Egyptian Arabic dialect
     - Short messages (< 80 words)
     - Mentions it can search products / check inventory
     - Doesn't mention Google Sheets

### Sprint 6 Demo/Validation
- [ ] All tests green
- [ ] Sandbox manual test passed
- [ ] Update `AGENTIC_AI_TRACKER.md` with completion status

---

## Testing Strategy

### Unit Tests
- `BaseAgent.pipeline.test.js` — pipeline execution, stage ordering, early return
- `SAS_SalesAgent.test.js` — tool scope, persona loading, Facebook rules
- `SalesAgent.test.js` — sales pipeline, product search flow
- `SupportAgent.test.js` — support pipeline, order lookup flow

### Integration Tests
- `agentProvisioningService.test.js` — verify spawn returns correct class
- `aiSandboxController.test.js` — verify Sandbox creates correct agent class
- `allPhasesIntegration.test.js` — full system regression

### Manual Tests
- Sandbox UI with each agent type
- Verify persona consistency across 5+ messages
- Verify tool descriptions match agent role

---

## Potential Risks & Gotchas

| Risk | Impact | Mitigation |
|------|--------|------------|
| **CEOAgent refactor breaks existing orchestration** | HIGH | Keep orchestration methods untouched. Only remove pipeline duplication. Run orchestration tests after every change. |
| **BaseAgent.processTask() signature changes** | MEDIUM | Ensure backward compatibility. Old callers should still work. Keep old simple processTask as alias if needed. |
| **Specialist agents lose CEO features** | MEDIUM | CEO features (orchestration) are ONLY for CEO role. Specialist agents never needed them. If they do, they can call CEOAgent via delegation. |
| **Sandbox creates wrong agent class** | LOW | Add explicit role check in `createSandboxRuntimeAgent`. Default to BaseAgent if role unknown. |
| **SOUL.md loading fails for new agents** | LOW | Fallback to company-level SOUL if template SOUL missing. Log warning. |
| **Tool scope too restrictive** | MEDIUM | Verify each specialist agent can still perform its core function. Add missing tools to ROLE_TOOL_MAP if needed. |
| **Frontend expects CEOAgent behavior** | LOW | Frontend only cares about API responses, not internal class. No frontend changes needed. |

---

## Rollback Plan

If any sprint causes critical failures:

1. **Sprint 1**: Revert `ROLE_TOOL_MAP` and `agent.json` changes. Config-only, safe to revert.
2. **Sprint 2-3**: Restore `CEOAgent.js` from backup. Revert `BaseAgent.js` changes.
3. **Sprint 4**: Delete new agent class files. Revert `agentProvisioningService.js` to use `new BaseAgent()` for all.
4. **Sprint 5**: Revert `aiSandboxController.js` changes.

**Git Strategy**: Create feature branch `refactor/agent-architecture`. Commit after each sprint.

---

## Decision Log

**Why not full LangGraph/State-Machine refactor?**
- Too complex for current needs. Our pipeline pattern (resolveIntent → routeToTools → executeTools → validateReply) is working.
- LangGraph would require rewriting the entire execution model. Scope creep.

**Why not use dependency injection for pipeline stages?**
- JavaScript prototype-based inheritance is simpler for this use case.
- Each specialist agent can override `processTask()` if they need custom stages.

**Why keep CEOAgent name instead of ManagerAgent?**
- `CEOAgent` is already referenced in 15+ files. Renaming would be a massive search-replace with high regression risk.
- We can add `ManagerAgent` as alias later if needed.

**Why create specialist classes instead of config-only?**
- Classes allow method overriding (e.g., custom `_getSystemPrompt()` for Facebook rules).
- Classes enable `instanceof` checks for debugging and logging.
- Future-proof: can add specialist-specific methods (e.g., `SAS_SalesAgent.calculateOrderTotal()`).

---

## Acceptance Criteria (Overall)

- [ ] `sas-sales-agent` in Sandbox loads its own SOUL.md (Egyptian Arabic, short messages)
- [ ] `sas-sales-agent` has Local DB tools (`product.search`, `order.create_draft`) NOT Google Sheets
- [ ] `CEOAgent` is < 200 lines, only orchestration methods
- [ ] `BaseAgent` has the full pipeline (`processTask` with 5 stages)
- [ ] `SAS_SalesAgent extends BaseAgent` exists and works
- [ ] All existing tests pass (same count as before)
- [ ] New tests exist for specialist agents
- [ ] Manual Sandbox test passed for `sas-sales-agent`
