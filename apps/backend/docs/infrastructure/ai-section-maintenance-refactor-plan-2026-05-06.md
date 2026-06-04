# Plan: AI Section Maintenance Refactor

**Generated**: 2026-05-06  
**Estimated Complexity**: High  
**Scope**: AI section only: Core AI, legacy/modern agent paths, provider routing, RAG, telemetry, evaluation, queues, and customer-facing channel adapters.

## Overview

The current AI section is working, but it is difficult to maintain because it has accumulated several overlapping paths over time. `CoreAIAgent` is the current production brain for the most sensitive customer-facing flows, while `aiAgentService`, `LegacyAgent`, `ModernAgent`, older helper modules, telemetry services, evaluators, and queue code still coexist.

This plan does not start with deletion or a rewrite. The safe approach is:

1. Map the current production paths.
2. Add regression protection around the flows that already work.
3. Mark old paths clearly before removing anything.
4. Extract responsibilities from `CoreAIAgent` gradually into small domain modules.
5. Move toward one observable, testable AI runtime.

## Safety Rules

- Do not delete AI code in the first cleanup cycle.
- Do not replace `CoreAIAgent` with `ModernAgent`, LangGraph, OpenAI Agents SDK, or any new runtime during this plan.
- Do not change Facebook Messenger production routing until a scenario suite proves behavior is preserved.
- Any legacy path must first be classified as `production`, `fallback`, `test-only`, `unused`, or `unknown`.
- Any proposed removal requires:
  - route/code search evidence,
  - tests proving no production usage,
  - one release cycle as deprecated,
  - rollback instructions.
- Any behavior change must include focused tests and documentation.
- Merge conflicts must be resolved or isolated before AI refactoring starts.

## Prerequisites

- Worktree conflict inventory:
  - `git status --short`
  - `git diff --name-only --diff-filter=U`
- Current AI documentation reviewed:
  - `backend/docs/ai-system-review-2026-05-02.md`
  - `backend/docs/ai-agent-service-usage-review-2026-05-02.md`
  - `backend/docs/ai-production-readiness-gate-2026-05-02.md`
  - `backend/docs/infrastructure/ai-agent-deep-debug-goals-execution-plan-2026-05-06.md`
- Baseline test commands available:
  - `npm run check:syntax` in `backend`
  - focused Jest for `CoreAIAgent`
  - `node scripts/verify-docs.js` from repo root

## Sprint 0: Stabilize The Worktree

**Goal**: Start from a known-safe repository state so AI cleanup does not mix with unrelated conflicts.

**Demo/Validation**:
- No unresolved merge conflicts.
- No AI refactor is started before the baseline is clean or isolated in a separate worktree.

### Task 0.1: Inventory Current Conflicts

- **Location**: repo root
- **Description**: Record all unresolved `UU`, `AA`, and `MM` files and classify whether they affect AI.
- **Dependencies**: none
- **Acceptance Criteria**:
  - Conflict list is documented.
  - AI-related and non-AI conflicts are separated.
  - Decision is made: resolve in current branch or create clean worktree.
- **Validation**:
  - `git status --short`
  - `git diff --name-only --diff-filter=U`

### Task 0.2: Choose Safe Working Strategy

- **Location**: repo/worktree management
- **Description**: If conflicts are unrelated to AI, create a clean AI cleanup worktree/branch instead of touching unrelated user work.
- **Dependencies**: Task 0.1
- **Acceptance Criteria**:
  - AI work happens in a clean branch/worktree.
  - Existing user changes are not reverted.
- **Validation**:
  - `git status --short` in the chosen workspace

## Sprint 1: Map The AI Runtime

**Goal**: Build a truthful map of every AI entrypoint and mark which ones are production-critical.

**Demo/Validation**:
- A routing map exists showing every channel and its runtime path.
- Every path is classified before refactoring.

### Task 1.1: Map Customer-Facing Channels

- **Location**:
  - `backend/utils/allFunctions.js`
  - `backend/services/CoreAIAgent.js`
  - `backend/services/facebookCoreAdapter.js`
  - `backend/controller/testChatController.js`
  - `backend/services/whatsapp`
  - `backend/routes/*ai*`
- **Description**: Trace Messenger, Facebook comments, test chat, WhatsApp, manual suggestions, and background AI flows.
- **Dependencies**: Sprint 0
- **Acceptance Criteria**:
  - Each channel has a documented entrypoint, service path, and final delivery path.
  - Each channel is marked `CORE`, `LEGACY`, `MODERN`, or `UNKNOWN`.
- **Validation**:
  - Code search for `CoreAIAgent`, `processMessage`, `processMessageForReplyOnly`, `processCustomerMessage`, `ModernAgent`, and `LegacyAgent`.

### Task 1.2: Classify Legacy And Modern Paths

- **Location**:
  - `backend/services/aiAgentService.js`
  - `backend/services/aiAgent/legacy/LegacyAgent.js`
  - `backend/services/aiAgent/modern/ModernAgent.js`
  - `backend/services/aiAgent/AgentFactory.js`
- **Description**: Determine which paths are active, fallback-only, test-only, or unused.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - No file is called "dead" without evidence.
  - `ModernAgent` limitations are documented, especially keyword-based tool selection.
- **Validation**:
  - Route/controller/service search results linked in the doc.

### Task 1.3: Document Current AI Responsibilities

- **Location**:
  - `backend/services/CoreAIAgent.js`
  - `backend/services/aiRuntimeService.js`
  - `backend/services/ragService.js`
  - `backend/services/productionEvaluatorService.js`
  - `backend/services/aiTelemetryService.js`
- **Description**: List which component owns intent, memory, RAG, grounding, provider selection, generation, sanitization, evaluation, and delivery.
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Responsibility map identifies overlaps and unclear ownership.
  - Top maintenance pain points are documented.
- **Validation**:
  - Review map against current tests and recent incident docs.

## Sprint 2: Build Regression Protection

**Goal**: Protect existing customer behavior before changing architecture.

**Demo/Validation**:
- A scenario matrix can be run before and after each AI change.
- Critical behavior failures block refactors.

### Task 2.1: Define Golden Customer Scenarios

- **Location**:
  - `backend/scripts/run-core-agent-capability-scenarios.js`
  - `backend/scripts/run-core-agent-channel-scenarios.js`
  - `backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`
- **Description**: Define required scenarios for greetings, product price, product variants, shipping, total calculation, image requests, post-linked product questions, complaints, order data collection, order confirmation, and prompt injection.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Each scenario has input, expected output, forbidden output, and severity.
  - Prompt/reasoning leak, wrong price, wrong shipping total, premature order collection, duplicate order, and image burst are blocking failures.
- **Validation**:
  - Scenario script reports pass/fail with clear reason.

### Task 2.2: Add Channel-Specific Smoke Tests

- **Location**:
  - `backend/tests/services/facebookMessengerCorePath.test.js`
  - `backend/tests/controller/*conversation*`
  - channel scenario scripts
- **Description**: Prove Messenger and test chat use the intended runtime.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Messenger path is locked to the current production Core route.
  - Test chat behavior is close enough to production or differences are documented.
- **Validation**:
  - Focused Jest and scenario script.

### Task 2.3: Strengthen Evaluator Fail Conditions

- **Location**:
  - `backend/services/productionEvaluatorService.js`
  - `backend/tests/services/*evaluator*`
- **Description**: Ensure evaluation fails for known high-risk failures instead of marking them `PASS`.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Internal reasoning markers fail.
  - English visual reasoning markers fail when customer-facing.
  - Wrong grounded price/shipping fail.
  - Premature order confirmation fails.
- **Validation**:
  - Focused evaluator tests.

## Sprint 3: Add Unified Agent Run Tracing

**Goal**: Make one customer message traceable from inbound event to final reply.

**Demo/Validation**:
- For a single test message, support can see the selected product, provider/model, fallback attempts, sanitizer outcome, and evaluator status.

### Task 3.1: Define `AgentRun` Shape

- **Location**:
  - existing `AiInteraction`, `AiTrace`, `AiTraceStep` models
  - `backend/services/aiTelemetryService.js`
  - `backend/services/CoreAIAgent.js`
- **Description**: Decide whether to extend existing trace tables or add a dedicated run abstraction in service code first.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Trace includes `conversationId`, `messageId`, `companyId`, channel, agent mode, provider, model, key, grounding, delivery status, and evaluation status.
  - No secrets or raw API keys are stored.
- **Validation**:
  - Unit test for trace payload redaction and required fields.

### Task 3.2: Instrument Core Steps

- **Location**:
  - `backend/services/CoreAIAgent.js`
  - `backend/services/ragService.js`
  - `backend/services/aiRuntimeService.js`
- **Description**: Log structured steps for context prep, RAG/product grounding, provider attempt, sanitizer, image selection, order decision, and final response.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Trace is written even when the reply is silent or fails.
  - Trace can identify why a reply was blocked or skipped.
- **Validation**:
  - Focused tests with mock Prisma.
  - Manual local `/test-chat` trace review.

### Task 3.3: Connect Trace To Admin Diagnostics

- **Location**:
  - AI admin/controller routes
  - Super Admin AI Providers UI, later phase only
- **Description**: Expose recent AI run traces in a read-only diagnostic endpoint before building UI polish.
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - Super admin can fetch recent runs by company/conversation.
  - Sensitive fields are redacted.
- **Validation**:
  - Controller test and API smoke.

## Sprint 4: Make Execution Durable And Idempotent

**Goal**: Reduce lost messages, duplicate replies, and duplicate order creation.

**Demo/Validation**:
- Restart/retry does not send duplicate replies or create duplicate orders for the same customer message.

### Task 4.1: Inventory Current Queue Behavior

- **Location**:
  - `backend/services/queueRoutes.js`
  - `backend/services/queueService.js`
  - Messenger webhook flow
- **Description**: Identify which queues are in-memory and which are BullMQ-backed.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Every customer-facing async path is classified as durable or volatile.
  - Known restart/reload risk is documented.
- **Validation**:
  - Code review plus tests where available.

### Task 4.2: Add Idempotency Keys

- **Location**:
  - Messenger handling path
  - Core reply delivery path
  - order creation path
- **Description**: Add idempotency based on platform message id, conversation id, batch id, and order intent.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Same inbound platform message cannot create two AI replies.
  - Same confirmed order data cannot create duplicate orders during retry.
- **Validation**:
  - Replay tests with duplicate webhook payloads.

### Task 4.3: Move Messenger Batch Processing Toward BullMQ

- **Location**:
  - `backend/services/queueService.js`
  - `backend/services/queueRoutes.js`
  - worker process
- **Description**: Keep current behavior but persist message batches as jobs before processing.
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - In-memory state is no longer the only source of queued customer messages.
  - Failed jobs retain enough debug info without storing secrets.
- **Validation**:
  - Worker/unit tests.
  - Local restart simulation.

## Sprint 5: Extract Core Domain Modules Safely

**Goal**: Reduce `CoreAIAgent` size and risk without changing behavior.

**Demo/Validation**:
- Existing Core scenario suite remains green after each extraction.

### Task 5.1: Extract Reply Guard Module

- **Location**:
  - from `backend/services/CoreAIAgent.js`
  - to `backend/services/aiCore/replyGuard.js`
- **Description**: Move sanitization, leak detection, degenerate output detection, and forbidden follow-up checks.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - No customer-facing sanitizer behavior changes unless covered by tests.
  - Existing prompt leak regression tests still pass.
- **Validation**:
  - Focused Core tests.

### Task 5.2: Extract Catalog Grounding Module

- **Location**:
  - from `CoreAIAgent`
  - to `backend/services/aiCore/catalogGrounding.js`
  - interacts with `ragService` and product resolvers
- **Description**: Move product/post/context grounding decisions into one module.
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - Product price and post-linked product scenarios keep identical behavior.
  - Grounding metadata becomes clearer in trace.
- **Validation**:
  - Catalog/variant/post grounding tests.

### Task 5.3: Extract Shipping And Total Module

- **Location**:
  - from `CoreAIAgent`
  - to `backend/services/aiCore/shippingGrounding.js`
- **Description**: Move governorate extraction, shipping quote usage, and total calculation guards.
- **Dependencies**: Task 5.2
- **Acceptance Criteria**:
  - Wrong shipping total scenarios fail before release.
  - Shipping follow-up does not override color/variant questions.
- **Validation**:
  - Focused shipping and variant follow-up tests.

### Task 5.4: Extract Order Flow Module

- **Location**:
  - from `CoreAIAgent`
  - to `backend/services/aiCore/orderFlow.js`
- **Description**: Move order-data collection, confirmation gates, and order creation decision logic.
- **Dependencies**: Task 5.3 and Sprint 4 idempotency
- **Acceptance Criteria**:
  - No order is created before explicit confirmation.
  - Known data is not repeatedly requested.
  - Duplicate order replay is blocked.
- **Validation**:
  - Order-flow scenario tests.

### Task 5.5: Extract Media/Image Module

- **Location**:
  - from `CoreAIAgent`
  - to `backend/services/aiCore/mediaReply.js`
- **Description**: Move image request detection, image cap, attachment recovery/proxying, and product image selection.
- **Dependencies**: Task 5.2
- **Acceptance Criteria**:
  - Image gallery bursts are blocked.
  - Customer image messages do not trigger unrequested product galleries.
- **Validation**:
  - Image request and attachment regression tests.

## Sprint 6: Consolidate Legacy Paths

**Goal**: Remove ambiguity without risky deletion.

**Demo/Validation**:
- Developers can tell which AI paths are production, fallback, experimental, or deprecated.

### Task 6.1: Add Runtime Warnings To Deprecated Paths

- **Location**:
  - `backend/services/aiAgentService.js`
  - `backend/services/aiAgent/legacy/LegacyAgent.js`
  - `backend/services/aiAgent/modern/ModernAgent.js`
- **Description**: Add low-noise structured warnings when non-Core production-like paths are used.
- **Dependencies**: Sprint 1 and Sprint 3
- **Acceptance Criteria**:
  - Warnings include channel and caller context.
  - Warnings do not spam normal production logs.
- **Validation**:
  - Tests or local smoke proving warning only appears on legacy path.

### Task 6.2: Add Deprecation Documentation

- **Location**:
  - `backend/docs/infrastructure/ai-runtime-routing-map-YYYY-MM-DD.md`
- **Description**: Document which paths must not be expanded and what replaces them.
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Each deprecated path has owner, replacement, and removal criteria.
- **Validation**:
  - `node scripts/verify-docs.js`

### Task 6.3: Remove Only After One Safe Cycle

- **Location**: deprecated files only after proof
- **Description**: Remove unused code only after production traces show no use and tests cover replacement.
- **Dependencies**: Task 6.2
- **Acceptance Criteria**:
  - Separate PR/commit for removal.
  - Rollback commit is straightforward.
  - No customer-facing behavior changes.
- **Validation**:
  - Full AI scenario suite.
  - Production trace review from previous release cycle.

## Sprint 7: Prepare Typed Tools

**Goal**: Get ready for real tool-calling later without using it prematurely.

**Demo/Validation**:
- Tools have typed contracts and tests, but production routing still remains stable.

### Task 7.1: Define Internal Tool Interfaces

- **Location**:
  - `backend/services/aiCore/tools`
- **Description**: Define schemas for catalog lookup, shipping quote, order draft, order creation, memory lookup, media lookup, and reply validation.
- **Dependencies**: Sprint 5
- **Acceptance Criteria**:
  - Tools can be called directly from JS with typed input/output contracts.
  - Sensitive tools have explicit permission checks.
- **Validation**:
  - Unit tests for each tool.

### Task 7.2: Replace Keyword Tool Selection Experiment

- **Location**:
  - `backend/services/aiAgent/modern/ModernAgent.js`
- **Description**: Do not promote `ModernAgent`; instead, document its current limitations and optionally point it to internal tool contracts in test-only mode.
- **Dependencies**: Task 7.1
- **Acceptance Criteria**:
  - No production route silently switches to `ModernAgent`.
  - Any experiment is feature-flagged and disabled by default.
- **Validation**:
  - Routing tests.

## Sprint 8: Release Gate And Operations

**Goal**: Make AI changes safe to ship repeatedly.

**Demo/Validation**:
- AI release checklist blocks unsafe deployments.

### Task 8.1: Create AI Release Checklist

- **Location**:
  - `backend/docs/infrastructure/ai-release-checklist.md`
- **Description**: Define required checks for AI code changes.
- **Dependencies**: Sprints 2-4
- **Acceptance Criteria**:
  - Checklist includes syntax, focused Jest, scenario matrix, docs verification, trace spot-check, and provider health check.
- **Validation**:
  - Checklist used in one AI bugfix cycle.

### Task 8.2: Add CI Hook For AI Scenarios

- **Location**:
  - `.github/workflows`
  - `backend/scripts`
- **Description**: Add or document a CI job that runs critical AI scenarios on AI-related changes.
- **Dependencies**: Task 8.1
- **Acceptance Criteria**:
  - AI-related file changes trigger focused AI checks.
  - Failures are high signal and not flaky.
- **Validation**:
- CI dry run or workflow dispatch.

## Architecture Capability Checklist

This section tracks whether the architecture already accounts for the core capabilities needed before AI expands into every product area.

| Capability | Current State | Gap | Required Direction |
| --- | --- | --- | --- |
| Orchestration / runtime brain | Partial | `CoreAIAgent` is the current production brain, but legacy and modern paths still coexist. There is no single explicit `AgentRuntime` contract yet. | Keep `CoreAIAgent` as production brain initially, then wrap it with a clear runtime contract: input, context, tools, decision, reply, trace. |
| Tool Registry | Partial / immature | `ModernAgent` has a small tool registry, but it is not the trusted production tool layer and tool selection is keyword-based. | Build internal domain tools first: catalog, shipping, order draft/create, media, memory, reply guard. Add permission levels before model-driven tool calling. |
| Memory | Partial | Conversation memory and summaries exist, but memory ownership and pollution repair are spread across services. | Define memory types: short conversation memory, customer facts, order state, company policy facts, learning corrections. Add read/write rules and trace every memory write. |
| Guardrails | Partial | Many guards exist in `CoreAIAgent` and evaluator code, but they are accumulated and not centralized. | Centralize reply safety into `ReplyGuard`: prompt leak, provider leak, price mismatch, premature order flow, unsupported claims, privacy/system refusal. |
| Observability | Partial | `AiInteraction`, `AiTrace`, `AiResponseEvaluation`, notifications, and logs exist, but the end-to-end story is fragmented. | Add `AgentRun`/`AgentStep` service abstraction on top of existing tables and make every AI reply traceable. |
| Evaluation Suite | Partial | Tests and production evaluator exist, but historical issues show bad replies can still pass. | Build golden scenario matrix and strengthen deterministic fail checks for P0/P1 failures. |
| Human-in-the-loop | Partial | Correction queue and review/apply flow exist; human override policy is not yet centralized across channels. | Add one central policy for assist mode, human takeover, complaints, low confidence, external actions, and order creation. |
| Queues / Background Jobs | Partial | BullMQ exists, but customer message batching has in-memory state. | Move customer-facing AI jobs toward durable queue processing with idempotency and conversation locks. |
| RAG / Vector Data | Partial | RAG and embeddings exist, but embeddings are stored as strings and much retrieval state is in memory. | Add ingestion lifecycle, retrieval audit, versioning, company isolation checks, and a clearer vector storage strategy. |
| Company-specific behavior | Partial | AI settings, prompts, response rules, few-shot, and provider keys exist. | Formalize a company AI policy layer: tone, allowed actions, products, order flow rules, escalation rules, forbidden behaviors, and tool permissions. |
| Learning loop | Partial | Production evaluator, correction queue, few-shot, and response rules exist. | Make learning gated: detect issue, create correction, human approves, apply as rule/few-shot, rerun scenarios, measure recurrence. Never let the model silently self-edit production behavior. |

## Future AI Everywhere: Design Constraints

Before AI is embedded across all site tools, every new AI-powered workflow should declare:

- **Action level**: read-only, draft suggestion, internal write, external send, financial/order action, or admin/system action.
- **Approval policy**: automatic, user confirm, admin confirm, or never automatic.
- **Data boundary**: company-scoped, user-scoped, customer-scoped, public, or super-admin only.
- **Trace requirement**: every AI action must write an `AgentRun` with tool calls and outputs.
- **Idempotency key**: required for any write, send, order, sync, import, or billing action.
- **Rollback path**: required for any action that mutates business data.
- **Evaluation coverage**: required golden scenarios for customer-facing or money/order-impacting workflows.
- **Tool permission**: AI should call narrow tools, not raw controllers, shell scripts, or unrestricted database writes.

The safe direction is to make AI a controlled orchestration layer over existing business services, not a second hidden backend that bypasses product permissions and workflows.

## Testing Strategy

- **Before any refactor**:
  - `backend: npm run check:syntax`
  - focused `CoreAIAgent` Jest suite
  - existing channel scenario scripts
  - docs verification
- **During extraction**:
  - one extracted module at a time
  - old tests must pass before moving to the next module
  - add tests around the extracted module's public contract
- **Before production**:
  - AI scenario matrix green
  - Messenger route smoke
  - provider/key health smoke
  - trace spot-check for one recent run
  - no unresolved conflicts

## Potential Risks & Gotchas

- `CoreAIAgent.js` is large and behavior-rich; extracting too much at once can create subtle regressions.
- Some apparent legacy paths may still be used by admin tooling or tests.
- In-memory queue behavior may hide duplicate/restart bugs locally.
- Evaluator improvements can create noisy review queues if thresholds are too aggressive.
- RAG failures may be data quality issues, not code issues.
- Provider routing failures can look like prompt bugs unless traces show provider/model/key attempts.
- Sanitizer hardening can accidentally remove valid Arabic replies if rules are too broad.
- Current worktree conflicts must not be mixed with AI cleanup.

## Rollback Plan

- Keep each task atomic and separately committable.
- Avoid deleting files until a later removal-only commit.
- For extraction tasks, keep original tests green and preserve old public function signatures.
- If behavior changes unexpectedly, revert only the last extraction commit and keep the regression test that exposed the issue.
- Feature-flag any new routing or tool-calling experiment off by default.
- Keep `CoreAIAgent` as the production path until a replacement passes the full scenario matrix.

## Open Decisions

1. Should the first cleanup cycle focus only on Facebook Messenger and `/test-chat`, or include WhatsApp too?
2. Should tracing use the existing `AiTrace`/`AiTraceStep` tables first, or introduce a clearer `AgentRun` service abstraction on top of them?
3. Should we create a clean worktree for AI cleanup before touching anything because the current workspace has unrelated conflicts?
