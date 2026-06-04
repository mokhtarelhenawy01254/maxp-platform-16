# AI Section Runtime Hardening Plan - 2026-05-06

## Goal

Make the AI section maintainable enough to support site-wide AI features without
breaking the current production reply paths.

The current feeling that the section is hard to maintain is valid. The codebase has
one dominant core path, several old/experimental paths, and cross-cutting concerns
mixed together inside large services. The plan below avoids deletion first and moves
toward a smaller, observable, testable runtime.

## Phase 0 - Stabilize Work

Status: started.

- Work in a clean branch/worktree instead of the currently conflicted main workspace.
- Add read-only inventory tooling.
- Document current runtime routes before refactoring.
- Do not change production behavior in this phase.

Exit criteria:

- Clean git status except intentional files.
- Inventory script runs.
- Runtime map exists.

## Phase 1 - Map and Classify AI Paths

Status: started with a regression guard.

- Classify every AI entry point as `production`, `admin/test`, `legacy`, `experimental`, or `dead-candidate`.
- Build a caller table for CoreAIAgent, aiAgentService, LegacyAgent, ModernAgent, RAG, queues, and telemetry.
- Identify duplicated behavior: provider routing, retrieval, prompt assembly, response validation, human escalation, channel send.
- Mark delete candidates only after caller proof and regression tests.

Current classification emitted by `backend/scripts/ai-runtime-inventory.js`:

| Surface | Classification |
| --- | --- |
| Facebook Messenger inbound | `production` |
| Facebook comment reply-only adapter | `production-adapter` |
| Test chat Core path | `admin-test` |
| Test chat forced core mode | `admin-test-guard` |
| Core test message runner | `admin-test-support` |
| WhatsApp Core usage | `channel-follow-up` |
| Legacy customer-message router | `legacy-candidate` |
| Modern ToolRegistry usage | `experimental` |

Exit criteria:

- A complete map for AI entry points and side effects.
- Delete candidates are documented, not removed.

## Phase 2 - Regression Protection

Status: started.

- Run existing CoreAIAgent scenario scripts.
- Add fixtures for price, shipping, product recommendation, unclear question, media/image, escalation, and disabled-auto-reply flows.
- Add tests that prove Messenger/comment/test-chat keep their expected routes.
- Capture failure examples as evaluation fixtures.

Implemented first architecture gate:

```powershell
npm run test:ai:architecture
```

This currently runs:

- `test:ai:trace`
- `test:ai:tools`
- `test:ai:guardrails`
- `test:ai:policy`
- `test:ai:approval`
- `test:ai:idempotency`
- `test:ai:ledger`
- `test:ai:orchestrator`
- `test:ai:core-tool-planning`
- `test:ai:queue`
- `test:ai:runtime-inventory`
- `facebookMessengerCorePath.test.js`

Scenario-runner validation is now worktree-safe as well:

- `backend/scripts/load-local-env.js` loads `.env` / `.env.local` from the
  current backend first, then falls back to the main workspace backend when the
  branch is running from a `*_worktrees` clone.
- `npm run test:ai:capabilities` runs the Core capability matrix against the
  real company catalog instead of stale hard-coded product names.
- `npm run test:ai:channels:orders` runs the cross-channel adapter matrix with
  order creation enabled.
- `npm run test:ai:messenger-facebook` runs a local Messenger smoke pass through
  `CoreAIAgent.processMessageForReplyOnly`.
- `npm run test:ai:full-validation` chains the architecture gate plus the three
  scenario runners into one repeatable command.

Latest local green run on May 6, 2026:

- Capabilities: 16 pass / 0 review / 0 fail
- Channels (with order creation enabled): 5 pass / 0 review / 0 fail
- Messenger smoke: 9 pass / 0 review / 0 fail

Exit criteria:

- AI cleanup has a reliable test gate.
- Common previous mistakes become repeatable tests.

## Phase 3 - AgentRun Trace and Observability

Status: started.

- Introduce one trace id per AI request.
- Record channel, company, conversation, provider, model, retrieval sources, tool calls, guardrail decisions, output, latency, and escalation.
- Keep payload redaction and company isolation explicit.
- Connect traces to evaluation failures and support review.

Implemented first slice:

- `backend/services/aiAgentRunTraceService.js` creates fail-safe AgentRun traces using existing `AiTrace` and `AiTraceStep` models.
- `CoreAIAgent` starts/completes traces in Messenger, reply-only adapters, and test-chat entrypoints.
- Telemetry/evaluation metadata now carries `agentRunTraceId` where the Core entrypoint has a trace.
- `backend/tests/services/aiAgentRunTraceService.test.js` covers trace lifecycle, fail-safe storage behavior, truncation, and unserializable metadata.

Run:

```powershell
npm run test:ai:trace
```

Exit criteria:

- A single AI response can be inspected end-to-end.
- Debugging no longer depends on scattered logs.

## Phase 4 - Durable Execution

Status: started.

- Identify side effects that must be queued: sends, tool actions, long retrieval/indexing, evaluations, follow-ups.
- Add idempotency keys for customer message handling and outbound sends.
- Define retry/dead-letter behavior.
- Avoid duplicate replies on webhook retries.

Implemented first durable-execution slice:

- `backend/services/aiAgent/idempotencyKeyService.js` builds stable inbound, outbound, and queue-job idempotency keys without exposing raw customer content.
- `CoreAIAgent` records inbound/outbound idempotency summaries in trace/evaluation/telemetry metadata for Messenger, reply-only adapters, and test chat.
- `backend/utils/allFunctions.js` passes the saved Messenger `Message.id` and platform `messageId` into Core.
- `backend/services/facebookCoreAdapter.js` passes the saved comment message id and `commentId` into Core.
- `backend/services/queueService.js` accepts `idempotencyKey` and maps it to BullMQ `jobId`, while lazy-loading BullMQ only when queues are actually configured.
- `backend/prisma/schema/ai_analytics.prisma` and `backend/prisma/migrations/20260506_add_ai_runtime_ledger/migration.sql` add `AiRuntimeLedger` / `ai_runtime_ledger` as a persisted run reservation table.
- `backend/services/aiAgent/runtimeLedgerService.js` reserves Core AI runs by inbound idempotency key, suppresses duplicate successful/running runs, reopens failed/expired locks, and fails open when storage or generated Prisma client support is unavailable.
- `CoreAIAgent` now reserves runtime ledger entries before Messenger, reply-only adapter, and test-chat processing; duplicate adapter/test calls return a silent duplicate response, while duplicate Messenger processing exits before delivery.
- `backend/services/customerBlocklistService.js` now fails open when local test
  databases do not have `customer_block_settings` / `customer_block_rules`
  tables, so optional blocklist storage does not break AI order creation during
  validation.
- `backend/tests/services/aiIdempotencyKeyService.test.js` covers stable keys, external-id priority, privacy, outbound keys, and queue job keys.
- `backend/tests/services/aiRuntimeLedgerService.test.js` covers reservation, duplicate suppression, reopen behavior, fail-open behavior, trace attachment, completion statuses, and silent duplicate responses.
- `backend/tests/services/queueService.test.js` covers `idempotencyKey` -> `jobId` behavior.

Run:

```powershell
npm run test:ai:idempotency
```

```powershell
npm run test:ai:ledger
```

```powershell
npm run test:ai:queue
```

Exit criteria:

- Background work is durable where needed.
- Replayed events do not double-send.

## Phase 5 - Extract Runtime Modules

Status: started.

Refactor behind the current CoreAIAgent API first so callers do not break:

- `InputNormalizer`
- `CompanyPolicyResolver`
- `RetrievalContextBuilder`
- `PromptComposer`
- `ProviderRouter`
- `ToolOrchestrator`
- `GuardrailPipeline`
- `ResponseFinalizer`
- `ChannelDeliveryAdapter`

Implemented first extraction:

- `backend/services/aiAgent/guardrailPipelineService.js` centralizes the final customer-facing reply decision after sanitization.
- `CoreAIAgent` now calls the pipeline for Messenger, reply-only adapters, and test chat final replies.
- The service preserves the existing silent reason for unsafe/empty replies.
- `backend/tests/services/aiGuardrailPipelineService.test.js` covers clean replies, empty replies, internal reasoning leaks, and behavior-compatible silent responses.

Implemented company policy resolver slice:

- `backend/services/aiAgent/companyPolicyResolverService.js` normalizes company and AI settings into a safe policy contract.
- Explicit `false` settings are preserved instead of being overwritten by default truthy fallback behavior.
- `AiSetting` now has explicit `writeToolScopes` and `humanApprovalRequiredForWrite` fields so company-level tool permissions have a real home in configuration instead of ad hoc code paths.
- Current Core integration records policy summary metadata and a `company_policy_resolved` trace step only; it does not change reply behavior or prompts yet.
- `backend/tests/services/aiCompanyPolicyResolverService.test.js` covers fallback behavior, false-boolean preservation, read-only tool scopes, JSON parsing safety, database failure safety, and metadata redaction.

Implemented tool orchestrator slice:

- `backend/services/aiAgent/toolOrchestratorService.js` adds one production-oriented preflight/execute layer on top of the tool registry.
- The orchestrator resolves company policy, derives permission scopes, supports dry-run planning, normalizes blocked/failed/timed-out results, and records a `tool_call` trace step when an `agentRunTrace` is available.
- `CoreAIAgent` now calls the orchestrator from Messenger, reply-only adapter, and test-chat entrypoints immediately after policy resolution, but only in read-only `dryRun` planning mode.
- That planning path records a `tool_planning_summary` trace step and carries `toolPlanning` metadata through trace completion, telemetry, evaluator metadata, and adapter/test return payloads.
- It intentionally does not change live Core reply behavior or execute customer-facing tool actions yet; this slice prepares the safe execution contract before wiring tools into customer-facing flows.
- `backend/tests/services/aiToolOrchestratorService.test.js` covers allowed read tools, missing scopes, human approval for write tools, dry-run planning, not-found/input validation decisions, policy-aware tool listing, and handler timeouts.
- `backend/tests/services/CoreAIAgent.toolPlanning.test.js` covers safe candidate selection, orchestrator-backed dry-run planning, trace metadata, and proof that Messenger delivery still follows the same outward reply flow.

Implemented human approval queue slice:

- `backend/services/aiAgent/toolApprovalService.js` adds a fail-safe approval-request queue for future write tools with deterministic request keys, pending/approved/rejected states, input/preview snapshots, and metadata summaries.
- `backend/prisma/schema/ai_analytics.prisma` and `backend/prisma/migrations/20260506_add_ai_tool_approval_requests/migration.sql` add `AiToolApprovalRequest` / `ai_tool_approval_requests`.
- `toolOrchestratorService` can now create or reuse a pending approval request when a write tool is blocked for human approval, and it can resolve an approved request by `approvalRequestId` before execution.
- `backend/controller/aiApprovalController.js`, `backend/routes/aiApprovalRoutes.js`, and `backend/server.js` now mount `/api/v1/ai-approvals` for operator list/detail/review access under the same authenticated `ai-chat-basic` guard used by AI learning routes.
- `frontend/src/services/aiApprovalService.ts`, `frontend/src/pages/ai/AIToolApprovals.tsx`, `frontend/src/App.tsx`, and `frontend/src/config/sidebar.ts` now expose the operator workflow in the dashboard at `/ai-approvals`.
- This still does not expose live write-tool behavior in Core; it only gives the runtime a formal human-in-the-loop contract before future tool expansion.
- `backend/tests/services/aiToolApprovalService.test.js` covers request creation, dedupe/reuse, listing filters, approval decisions, metadata, and fail-open behavior.
- `backend/tests/integration/aiApprovalRouteMount.test.js` keeps the approval routes mounted and discoverable.

Implemented approval execution slice:

- `backend/services/aiAgent/toolApprovalExecutionService.js` now claims approved requests, starts a dedicated execution trace, runs the tool through the shared orchestrator, and writes the final execution snapshot back onto the approval request.
- `AiToolApprovalRequest` now stores execution state separately from approval state (`executionStatus`, start/finish timestamps, executor, execution trace, and result snapshot) so review state and runtime state do not get mixed together.
- `backend/controller/aiApprovalController.js` and `backend/routes/aiApprovalRoutes.js` now expose `POST /api/v1/ai-approvals/requests/:id/execute` for operator-triggered execution after approval.
- `frontend/src/services/aiApprovalService.ts` and `frontend/src/pages/ai/AIToolApprovals.tsx` now let operators trigger execution directly from the approval workspace and inspect the last execution snapshot.
- `backend/tests/services/aiToolApprovalExecutionService.test.js` covers the orchestration path for approved execution plus conflict protection when a request is already running.

Implemented approval request producer slice:

- `backend/services/aiAgent/toolApprovalRequestProducerService.js` adds a shared admin-safe producer path for governed write intents. It starts a trace, validates that the requested tool is an approval-gated write contract, routes the proposal through the shared orchestrator with `createApprovalRequest: true`, and only succeeds when a persisted approval request exists.
- `backend/controller/aiApprovalController.js` and `backend/routes/aiApprovalRoutes.js` now expose `POST /api/v1/ai-approvals/requests` for operator/admin creation of governed tool approval requests without touching the live customer reply path.
- `frontend/src/services/aiApprovalService.ts` now includes a typed `createRequest(...)` client helper, and `frontend/src/pages/ai/AIToolApprovals.tsx` now exposes an inline governed-request composer so the existing approval workspace can generate `order.cancel` / `order.update_details` requests without inventing another admin path.
- `backend/tests/services/aiToolApprovalRequestProducerService.test.js` covers happy-path creation, unsafe-tool rejection, invalid-input rejection, and fail-open approval persistence errors.

Implemented test-chat governed suggestion slice:

- `backend/services/aiAgent/governedToolSuggestionService.js` adds a deterministic admin/test helper that looks for safe `ORD-...` identifiers plus explicit cancel/update intent and proposes `order.cancel` / `order.update_details` drafts without executing anything.
- `backend/controller/testChatController.js` now attaches `governedActionSuggestions` to the existing test-chat response payload after extraction, keeping the live customer runtime untouched.
- `frontend/src/services/testChatService.ts` now types those governed suggestions, and `frontend/src/pages/testChat/AITestChat.tsx` renders approval-request cards that call the shared `/api/v1/ai-approvals/requests` producer path directly from test chat.
- `frontend/src/pages/testChat/AITestChat.tsx` now also loads conversation-scoped approval requests and lets operators approve, reject, execute, and retry governed requests inline from the same admin/test surface, rather than bouncing between suggestion and approval screens.
- `backend/tests/services/governedToolSuggestionService.test.js` covers cancel suggestions, update-detail suggestions, and conservative no-suggestion cases.

Implemented queued approval execution slice:

- `backend/services/aiAgent/toolApprovalExecutionQueueService.js` adds an optional async enqueue path for approved write requests. It validates approval/execution state, builds deterministic queue job ids from the request state, and queues the work only when BullMQ/Redis is actually available.
- The same queue service now exposes an explicit dead-letter retry path, so operators requeue exhausted requests through a dedicated `retryDeadLetterRequest(...)` contract instead of silently reusing the initial enqueue path.
- Async approval execution now derives BullMQ attempts/backoff from each tool contract's retry policy instead of relying on one queue-wide default, so governed write tools can stay conservative until their idempotency story is proven.
- `backend/workers/aiToolApprovalExecutionWorker.js` consumes the dedicated `ai-tool-approval-execution` queue and delegates each job back into the shared `toolApprovalExecutionService`, so async execution still reuses the same orchestrator, trace, and approval-completion logic.
- The worker now classifies queue failures as transient vs permanent using both default heuristics and tool-level retry policy (`retryableErrorCodes` / `nonRetryableErrorCodes`). Permanent failures skip further automatic retries and go straight to dead-letter state with explicit disposition metadata.
- `backend/controller/aiApprovalController.js` and `backend/routes/aiApprovalRoutes.js` now expose both `POST /api/v1/ai-approvals/requests/:id/execute-async` and `POST /api/v1/ai-approvals/requests/:id/retry-async` so operator background execution and exhausted-request retries stay explicit.
- `frontend/src/services/aiApprovalService.ts` now exposes both `queueExecutionRequest(...)` and `retryExecutionRequest(...)`, while `frontend/src/pages/ai/AIToolApprovals.tsx` and `frontend/src/pages/testChat/AITestChat.tsx` render a dedicated `إعادة جدولة بالخلفية` action when a request has reached `DEAD_LETTER`.
- `backend/services/aiAgent/toolApprovalService.js` now persists `queueExecution` metadata on approval requests with explicit `QUEUED` / `RETRYING` / `DEAD_LETTER` / `PROCESSED` states plus retry-policy/failure-disposition details, and both `frontend/src/pages/ai/AIToolApprovals.tsx` and `frontend/src/pages/testChat/AITestChat.tsx` now surface queue status, policy, failure context, retry visibility, and lightweight polling for queued/running requests so operators can watch background execution progress from the existing admin surfaces.
- The operator-facing admin surfaces now prefer `execute-async` as the primary action, while synchronous execution remains available only behind explicit diagnostic disclosure and is tagged as `diagnostic_sync` in execution metadata/traces for troubleshooting.
- `backend/server.js` no longer preloads `aiAgentService` during startup warm-up; shared preload now points at `aiRuntimeService` plus the shared AI infrastructure modules, and `backend/services/aiAgent/messageProcessor.js` now passes through `backend/services/aiAgent/legacyRouterGuard.js` so the legacy router has a one-way deprecation barrier plus an opt-in kill switch via `DISABLE_LEGACY_AI_ROUTER=true`.
- `backend/services/aiAgent/legacyAgentModeService.js` now centralizes the remaining `useModernAgent` compatibility toggle. Both bulk-update controllers now share one canonical upsert-all-companies path (instead of mixed `updateMany` vs per-company loops), company/admin payloads expose `legacyAiRouting` metadata, and Super Admin surfaces now label this as a deprecated legacy-router toggle rather than the live AI runtime.
- `backend/services/aiAgent/testChatRoutingModeService.js` now centralizes `/test-chat` compatibility-mode semantics. The controller persists `requestedAgentMode` versus `normalizedAgentMode`, and `frontend/src/pages/testChat/AITestChat.tsx` now labels the second option as legacy compatibility instead of a live runtime choice.
- `backend/services/aiAgent/conversationSummaryService.js` now owns the conversation-summary normalization/extraction/signals/missing-fields cluster that used to live inline inside `CoreAIAgent`. Core still owns order execution and high-level orchestration, but this slice is now delegated through one dedicated service so future extraction of order-collection flow can build on a smaller surface.
- `backend/services/aiAgent/catalogVariantService.js` now owns the catalog/variant grounding helper cluster that used to live inline inside `CoreAIAgent`, including variant-value aliasing, requested-filter extraction, variant matching, canonical filter merging, display-price resolution, and grounded product display labels.
- `backend/services/aiAgent/catalogRetrievalService.js` now owns the catalog retrieval/browse orchestration cluster that used to live inline inside `CoreAIAgent`, including product-scope expansion, catalog/category fallback fetches, explicit-name matching, vector-search grounding, browse-reply shaping, and product-with-variants lookup.
- `backend/services/aiAgent/productGroundingService.js` now owns the product-grounding memory/post/RAG cluster that used to live inline inside `CoreAIAgent`, including conversation-memory resolution, stable Facebook post-id candidate building, featured post/product grounding, and matched-product RAG shaping for grounded replies.
- `backend/services/aiAgent/catalogImageGroundingService.js` now owns the catalog-image grounding cluster that used to live inline inside `CoreAIAgent`, including low-level image-analysis parsing/scoring/search-phrase helpers, configured vision analysis bridging, conversation-post image comparison, catalog reference-image candidate analysis, image-match scoring, and final catalog product resolution.
- `backend/services/aiAgent/intentReplyHeuristicsService.js` now owns the low-level intent/reply heuristic cluster that used to sit inline inside `CoreAIAgent`, including greeting/support/order/shipping/privacy/out-of-scope/repair detection and conservative canned guard replies.
- `backend/services/aiAgent/deterministicIntentReplyBuildersService.js` now owns the deterministic guard-reply builders that used to sit inline inside `CoreAIAgent`, including gratitude/privacy/out-of-scope/repair replies plus price-objection and shipping/data explanation replies.
- `backend/services/aiAgent/deterministicCommerceReplyService.js` now owns the deterministic commerce reply-builders that used to sit inline inside `CoreAIAgent`, including variant-answer shaping, grounded product-summary replies, grounded/ungrounded price replies, price-comparison replies, browse-price matching, and availability preview replies.
- `backend/services/aiAgent/replyPreviewExecutionService.js` now owns the shared non-delivery reply pipeline that used to be duplicated inline across `processMessageForReplyOnly` and `processMessageForTest`, including idempotency/ledger/trace scaffolding, context-policy-summary setup, confirmed-order/gratitude/LLM draft routing, optional provider fallback, final reply guardrail handling, outbound idempotency, evaluation, and preview payload shaping.
- `backend/services/aiAgent/coreAIAgentBootstrapService.js` now owns the constructor-time service graph assembly that used to sit inline inside `CoreAIAgent`, including the ordered creation of search/summary/catalog/image/context/reply/delivery/order services plus the per-instance caches used by image analysis and Gemini model discovery.
- `backend/services/aiAgent/readOnlyToolPlanningService.js` now owns the read-only tool-planning seam that used to sit inline inside `CoreAIAgent`, including conversation-memory shaping, safe order-number extraction, candidate selection for dry-run tool planning, summary shaping, and the orchestrator-backed planning trace step.
- `backend/services/aiAgent/messengerLiveExecutionService.js` now owns the live Facebook Messenger execution seam that used to sit inline inside `CoreAIAgent.processMessage(...)`, including idempotency/ledger/trace scaffolding, typing orchestration, context/policy/tool-planning setup, confirmed-order/gratitude routing, human-override silent exits, final reply guardrail handling, delivery, production evaluation, and telemetry.
- `backend/services/aiAgent/responsePriceValidationService.js` now owns the grounded response-price validation seam that used to sit inline inside `CoreAIAgent._validateResponsePrices(...)`, including browse/product/shipping/total price correction before the final zero-price and shipping-grounding hardening pass.
- `backend/services/aiAgent/coreRuntimeSupportService.js` now owns the remaining runtime bookkeeping seam that used to stay on `CoreAIAgent`, including idempotency summaries, runtime-ledger reservation summaries, ledger completion payload shaping, company-policy trace resolution, enablement checks, and shadow production-evaluation recording shared by the live Messenger and reply-preview/test execution paths.
- `backend/services/aiAgent/learningPromptSupportService.js` now owns the prompt-time applied-learning/few-shot seam that used to stay on `CoreAIAgent`, including approved-correction normalization/loading, applied-learning prompt assembly, and few-shot prompt generation shared by context preparation plus provider fallback/generation services.
- `backend/services/aiAgent/textLocaleSupportService.js` now owns the remaining Arabic/text-locale leaf seam that used to stay on `CoreAIAgent`, including loose Arabic normalization, lightweight customer-name gender detection, Arabic list formatting, and governorate extraction shared by summary, shipping, context, and reply-shaping services.
- `backend/services/aiAgent/commerceIntentSignalService.js` now owns the shared commerce intent-signal seam that used to stay on `CoreAIAgent`, including semantic-intent passthrough plus the reusable price-intent, price-comparison, and variant-intent predicates consumed by shaping, context, blueprint, support, arbitration, and tool-planning services.
- `backend/services/aiAgent/commerceContextHeuristicsService.js` now owns the commerce-context heuristic cluster that used to sit inline inside `CoreAIAgent`, including image-intent checks, ambiguous product references, category questions, recent-image context checks, and contextual short follow-up detection.
- `backend/services/aiAgent/channelReplyDeliveryService.js` now owns the reply-delivery helper cluster that used to sit inline inside `CoreAIAgent`, including grounding metadata, outbound message payload shaping, conversation patch shaping, socket payload shaping, and conservative image-delivery gating.
- `backend/services/aiAgent/customerReplyShapingService.js` now owns the customer-facing reply shaping cluster that used to live inline inside `CoreAIAgent`, including leaked-reasoning cleanup, customer-name suppression, premature order-data prompt stripping, authoritative blueprint fallback checks, and follow-up-question shaping for customer-safe replies.
- `backend/services/aiAgent/customerReplyHardeningService.js` now owns the post-generation customer-reply hardening seam that used to live inline inside `CoreAIAgent`, including unsafe zero-price detection, grounded zero-price fallback shaping, and the final grounded-response hardening wrapper that delegates shipping-math correction.
- `backend/services/aiAgent/customerReplyFinalizationService.js` now owns the duplicated post-generation finalization seam that used to live inline across `CoreAIAgent` entrypoints, including response polishing orchestration, embedded-image preparation, authoritative fallback wiring, customer-safe sanitization, and final reply guardrail evaluation.
- `backend/services/aiAgent/configuredProviderFallbackService.js` now owns the configured-provider fallback seam that used to live inline inside `CoreAIAgent`, including provider-fallback prompt construction, configured-provider resolution, bounded provider generation attempts, usage/cost normalization, unsafe zero-price rejection, and authoritative-blueprint enforcement for fallback replies.
- `backend/services/aiAgent/geminiProviderRuntimeService.js` now owns the shared Gemini runtime helper seam that used to live inline inside `CoreAIAgent`, including env/DB key resolution, candidate-key expansion, model-discovery caching, text/vision model candidate selection, Gemini error classification, retry-after parsing, quota/not-found handling, and shared vision-attempt tracking for both text-generation and catalog-image analysis paths.
- `backend/services/aiAgent/providerGenerationService.js` now owns the Gemini/provider generation-routing seam that used to live inline inside `CoreAIAgent`, including deterministic availability short-circuiting, provider-first vs Gemini-first branching, Gemini key resolution from env or `aiKey` records, inline image attachment prep for customer images, model rotation/telemetry, and the final fallback handoff through `configuredProviderFallbackService`.
- `backend/services/aiAgent/shippingPricingService.js` now owns the shipping-pricing helper cluster that used to live inline inside `CoreAIAgent`, including shipping-class defaults/config parsing, product shipping-class resolution, governorate-aware product pricing context, deterministic shipping replies, variant-reply shipping fact appends, and grounded shipping-blueprint/math enforcement.
- `backend/services/aiAgent/prepareContextEnrichmentService.js` now owns the shipping/policy enrichment seam from `prepareContextBag`, including text-run shipping context resolution, pricing-context persona nudges, and policy/FAQ knowledge appends.
- `backend/services/aiAgent/contextPreparationService.js` now owns the top-level `prepareContextBag` orchestration seam from `CoreAIAgent`, including recent-message bootstrap, persona/intent prompt shaping, recovered customer-image context, product/catalog/post/vector grounding orchestration, enrichment handoff, applied-learning/few-shot prompt augmentation, and final context-bag assembly.
- `backend/services/aiAgent/orderCollectionService.js` now owns the order-collection/order-confirmation decision helpers that used to sit inline in `CoreAIAgent`, including deterministic collection replies, order-confirmation detection, duplicate-signature helpers, and confirmed-order payload/reply shaping. Core still owns the side-effecting create-order transaction, but the decision/reply cluster now sits behind a dedicated service boundary.
- `backend/services/aiAgent/confirmedOrderExecutionService.js` now owns the side-effecting confirmed-order execution flow that used to live inline in `CoreAIAgent`, including metadata-backed duplicate detection, `EnhancedOrderService` calls, persistence of `coreAi.lastCreatedOrder`, and the final confirmation handler that checks for human override before replying. This leaves Core delegating both the order decision cluster and the order execution cluster through dedicated services instead of mixing them into the monolith body.
- `backend/services/aiAgent/heuristicIntentRoutingService.js` now owns the higher-level heuristic intent routing/arbitration seam that used to sit inline in `CoreAIAgent`, including legacy conversation-memory shaping, context-manager resolution, quick-intent fallback order, local greeting/privacy/support/product heuristics, and the enhanced-context fallback handoff.
- `backend/services/aiAgent/authoritativeReplyBlueprintService.js` now owns the authoritative reply blueprint seam that used to sit inline in `CoreAIAgent`, including no-catalog-match replies, product-category clarification replies, greeting/gratitude short-circuits, normalized message-type handling, and the ordered deterministic fallback chain that chooses the final canned blueprint.
- `backend/services/queueService.js` now returns the queued BullMQ job handle (or `null` on failure/disabled queue) so higher-level AI services can make explicit decisions instead of fire-and-forget assumptions.
- `backend/tests/services/aiToolApprovalExecutionQueueService.test.js`, `backend/tests/services/queueService.test.js`, and `backend/tests/integration/aiApprovalRouteMount.test.js` cover deterministic queue ids, unavailable queue handling, approval-state guards, queue-service return values, and route registration.

Run:

```powershell
npm run test:ai:guardrails
```

```powershell
npm run test:ai:policy
```

```powershell
npm run test:ai:orchestrator
```

```powershell
npm run test:ai:core-tool-planning
```

```powershell
npm run test:ai:approval
```

Exit criteria:

- CoreAIAgent becomes a thin orchestrator/facade.
- Existing production entry points still call the same public methods.

## Phase 6 - Tool Registry

Status: started.

- Replace ad hoc tool behavior with typed tool definitions.
- Each tool must define name, input schema, output schema, permissions, side effects, idempotency, approval requirement, timeout, retry policy, and audit labels.
- Start read-only with product, order lookup, shipping estimate, FAQ/RAG retrieval.
- Gate write actions behind human approval first.

Implemented first slice:

- `backend/services/aiAgent/toolRegistryService.js` adds a production-oriented registry contract.
- Default read-only contracts exist for `product.search`, `shipping.quote`, `faq.retrieve`, and `order.lookup`.
- The first write-tool contract now exists as `order.cancel`, still behind `orders:write` scope plus human approval, and it respects the existing order workflow instead of bypassing it.
- A second governed write-tool contract now exists as `order.update_details`, also behind `orders:write` plus human approval, for customer contact/address/notes changes on both regular and guest orders.
- Approved write tools can now be executed from the operator approval queue through the same orchestrator contract instead of needing a one-off admin code path.
- Those default contracts now resolve through the existing production-safe services (`ProductCatalogResolver`, `shippingService`, `ragService`, and `enhancedOrderService`) via lazy handlers instead of placeholder-only definitions.
- The write contract resolves through `orderService.updateOrderStatus(...)` using the approved reviewer identity when present, and surfaces downstream workflow-pending state instead of forcing cancellation through.
- The order-detail update contract resolves through the extracted shared service `backend/services/orderDetailsUpdateService.js`, which now owns the previously route-local update logic, phone validation, guest/regular branching, metadata merge, shipping-address merge, and Turbo shipment resync.
- Default tool outputs are intentionally sanitized before leaving the registry so catalog results stay compact and order lookup does not leak customer email/phone/address or internal status-history notes.
- The registry blocks missing permission scopes, requires human approval for write tools, validates a JSON-schema subset, and does not expose handlers in public definitions.
- Local capability-scenario execution now resolves product fixtures from the real company catalog with shoe/sneaker-first weighting, so P0 scenarios no longer depend on stale hard-coded `Running Sneakers`-style examples.
- `backend/services/postgresVectorService.js` no longer depends on a database-side `cosine_similarity(...)` helper when pgvector is unavailable; it now parses stored embeddings and computes cosine similarity in JavaScript, then falls back to text search if no valid embeddings are present.
- `backend/tests/services/aiToolRegistryService.test.js` covers default contracts, duplicate guards, schema validation, permission checks, approval checks, handler hiding, and sanitized default handler execution for catalog/shipping/FAQ/order lookups plus the governed write-tool handlers.
- `backend/tests/services/orderDetailsUpdateService.test.js` covers the extracted shared order-detail update path for regular orders, guest orders, Turbo resync, and validation failures.
- `backend/tests/services/postgresVectorService.test.js` covers JSON/postgres-array embedding parsing plus the JS cosine-ranking fallback path so the no-pgvector mode does not regress silently.
- `CoreAIAgent.inferHeuristicIntent(...)` now short-circuits plain greeting /
  Messenger CTA messages and prompt-or-secret disclosure requests into
  deterministic heuristic intents first, which keeps local validation from
  waiting on unavailable Gemini keys before hitting the authoritative fallback.
- `backend/tests/services/heuristicIntentRoutingService.test.js` covers the extracted heuristic-intent seam, including greeting/privacy/product classification, safe legacy-memory shaping, and the quick-intent -> heuristic -> enhanced fallback order.
- `backend/tests/services/authoritativeReplyBlueprintService.test.js` covers the extracted authoritative blueprint seam, including greeting/gratitude short-circuits, deterministic-chain short-circuiting, no-catalog-match helper behavior, and normalized image message-type handling.
- `backend/services/aiAgent/searchUtilityService.js` now owns the shared normalization/search utility cluster from `CoreAIAgent`, including text normalization, cache-backed generic/product/attribute term sets, semantic-intent example caches, search tokenization, shipping-noise stripping, alias expansion, and fuzzy product/category scoring.
- `backend/tests/services/searchUtilityService.test.js` covers the extracted search utility seam directly, including Arabic normalization, shipping-noise-aware tokenization, search-phrase building, alias expansion, semantic-intent matching, and fuzzy product candidate scoring.
- `backend/services/aiAgent/postPurchaseSupportService.js` now owns the post-purchase support and contextual follow-up seam from `CoreAIAgent`, including order-modification/status detectors, recent support/shipping/price/order context scans, support-policy question detection, contextual follow-up intent routing, and deterministic support/order-modification reply shaping.
- `CoreAIAgent` now bootstraps its service graph through `backend/services/aiAgent/coreAIAgentBootstrapService.js`, so shrinking the facade no longer requires keeping hundreds of lines of constructor wiring inline.
- `CoreAIAgent` now also delegates read-only tool-planning through `backend/services/aiAgent/readOnlyToolPlanningService.js`, so dry-run planning heuristics and summary logging no longer live inline beside the live Messenger orchestration path.
- `CoreAIAgent` now also delegates the live Messenger customer path through `backend/services/aiAgent/messengerLiveExecutionService.js`, so `processMessage(...)` matches the facade style already used by the reply-preview/test entrypoints instead of keeping the full live-run orchestration inline.
- `CoreAIAgent` now also delegates `_validateResponsePrices(...)` through `backend/services/aiAgent/responsePriceValidationService.js`, keeping the public method name for compatibility while removing another pure transformation block from the facade.
- `backend/tests/services/postPurchaseSupportService.test.js` covers the extracted seam directly, including order-modification detection, recent-conversation context scans, contextual follow-up routing, support-flow artifact suppression, policy replies, and deterministic order-modification reply shaping.
- `backend/services/aiAgent/shippingSupportArbitrationService.js` now owns the shipping/support arbitration seam from `CoreAIAgent`, including governorate-signal detection, contextual shipping follow-up rules, shipping-context suppression, knowledge-intent resolution, policy RAG-line formatting, and relevant policy-entry selection.
- `backend/tests/services/shippingSupportArbitrationService.test.js` covers the extracted seam directly, including governorate detection, support-vs-shipping arbitration, shipping-context suppression, knowledge-intent routing, and policy-entry ranking.
- `backend/services/aiAgent/customerImageHandlingService.js` now owns the customer-image handling seam from `CoreAIAgent`, including deterministic image replies, unmatched-image clarification, stored-message attachment extraction, recent customer-image recovery, comparable URL normalization, and image fingerprint deduplication.
- `backend/tests/services/customerImageHandlingService.test.js` covers the extracted seam directly, including image candidate deduplication, attachment/image extraction, recent-image recovery for follow-up text, and deterministic image reply shaping.
- `backend/services/aiAgent/conversationStateService.js` now owns the conversation-state seam from `CoreAIAgent`, including recent grounding extraction, conversation grounding lookup, repaired summary-context lookup, summary metadata building/persistence, and last-grounded-message recovery from stored AI replies.
- `backend/tests/services/conversationStateService.test.js` covers the extracted seam directly, including recent grounding extraction, metadata grounding lookup, repaired summary context, persisted summary updates, and latest grounded-message recovery.
- `backend/services/aiAgent/productImageAssetService.js` now owns the product/variant image asset seam from `CoreAIAgent`, including product gallery extraction, variant metadata/gallery extraction, merged variant image resolution, and preference for variant-specific images over generic product images.
- `backend/tests/services/productImageAssetService.test.js` covers the extracted seam directly, including product gallery extraction, variant metadata aliases, merged variant image lists, and variant-specific image preference.
- `backend/services/aiAgent/responseDeliveryExecutionService.js` now owns the outbound delivery execution seam from `CoreAIAgent`, including text/image persistence, Facebook Messenger text/image send orchestration, socket broadcasts, image-loop control, and typing-indicator transport.
- `backend/tests/services/responseDeliveryExecutionService.test.js` covers the extracted seam directly, including local-only delivery persistence, grounded conversation metadata persistence, successful/failed Facebook text sends, image-loop success/break behavior, socket broadcasts, and typing sender-action transport.
- `backend/services/aiAgent/humanOverrideGuardService.js` now owns the human-intervention guard seam from `CoreAIAgent`, including latest-outbound human detection, trigger-time comparison, earlier-human fallback lookup, and fail-open error handling.
- `backend/tests/services/humanOverrideGuardService.test.js` covers the extracted seam directly, including missing Prisma, latest-human-message detection, earlier-human fallback detection, null-`senderId` AI/system-message immunity, and error logging behavior.
- `backend/services/aiAgent/textPatternUtilityService.js` now owns the shared regex escape helper from `CoreAIAgent`, and the extracted summary/reply/shipping/commerce seams consume it directly instead of routing through a facade helper.
- `backend/services/aiAgent/productClarificationReplyService.js` now owns the remaining product-clarification reply builder from `CoreAIAgent`, preserving the existing Arabic copy while removing the last inline clarification block from the facade.
- `backend/services/aiAgent/replyPreviewConfigService.js` now owns the duplicated reply-preview/test config assembly from `CoreAIAgent`, keeping the public adapter entrypoints but removing the repeated preview-input/config shaping from the facade.
- `backend/services/aiAgent/providerGenerationService.js` now also owns generation-result metadata application, so `CoreAIAgent.thinkAndGenerateResponse(...)` is reduced to a compatibility wrapper around one service boundary.
- At this point the remaining code in `backend/services/CoreAIAgent.js` is intentionally dominated by constructor composition and public entrypoint/wrapper methods. Additional extraction would mostly trade a readable facade for indirection without meaningful runtime separation.

Run:

```powershell
npm run test:ai:tools
```

Exit criteria:

- Tools are discoverable, testable, and permissioned per company.

## Phase 7 - Memory, RAG, and Learning

Status: pending.

- Separate conversation memory, customer facts, company knowledge, and reviewed correction examples.
- Define what can be learned automatically and what requires human approval.
- Convert mistakes into evaluation cases before changing live behavior.
- Add RAG freshness and retrieval-quality checks.

Exit criteria:

- The system can improve without silently teaching itself bad behavior.

## Phase 8 - Expand AI Across Site Tools

Status: pending.

Before AI enters every tool in the website:

- All actions need permission scopes.
- Every write action needs preview/approval or a very narrow safe mode.
- Every tool call needs traceability.
- Company policy must control tone, allowed workflows, escalation, and data access.
- Evaluation should include cross-tool flows, not only chat replies.

Exit criteria:

- New AI features plug into the same runtime instead of creating another parallel path.
