# aiAgentService Usage Review - 2026-05-02

## Summary

`aiAgentService` used to do two different jobs:

1. Legacy/modern customer-message routing through `processCustomerMessage`.
2. Shared AI runtime infrastructure: model/key rotation, provider fallback, settings, context helpers, order extraction, response generation, and debug/monitoring helpers.

The shared runtime layer has now been extracted into `backend/services/aiRuntimeService.js`. Production/Core paths should depend on `aiRuntimeService`; `aiAgentService` is now treated as the legacy customer-message router and should not be used for new active reply paths.

## Implementation Update

The first migration step is now implemented:

- Added `CoreAIAgent.processMessageForReplyOnly(...)` as a channel adapter. It runs the Core context, catalog, order, fallback-provider, polish, and image pipeline, then returns the reply payload without sending anything to Facebook or another channel.
- Migrated WhatsApp auto-reply generation in `backend/services/whatsapp/WhatsAppAIIntegration.js` from `aiAgentService.processCustomerMessage(...)` to the Core reply adapter.
- Kept WhatsApp delivery unchanged: `sendAIResponse(...)` still owns sending text/images through the WhatsApp socket.
- Migrated Facebook comment auto replies in `backend/controller/commentController.js` from `aiAgentService.processCustomerMessage(...)` to the Core reply adapter.
- Added `backend/services/facebookCoreAdapter.js` so both comment controller jobs and webhook utilities share the same Facebook comment -> Core adapter.
- Facebook comment processing now resolves/creates the Facebook customer, conversation, and inbound comment message before calling Core, so comments use the same conversation memory path as the rest of the system.
- Migrated the live webhook utility path in `backend/utils/allFunctions.js` away from `aiAgentService.processCustomerMessage(...)` for both Facebook comment AI replies and the remaining Messenger fallback branch.
- Closed the `/test-chat` legacy branch: `agentMode` now normalizes to Core only, even if a legacy value is sent.
- Moved `backend/routes/conversationAIRoutes.js` smart suggestions to `aiRuntimeService` instead of the old `aiAgentService` import.
- Added `backend/services/aiRuntimeService.js` as the shared runtime facade for model/key rotation, provider generation, settings, context helpers, image helpers, order extraction, and monitoring helpers.
- Updated `CoreAIAgent`, `/test-chat`, comment moderation, AI settings/debug routes, super-admin provider routes, quota monitoring, server preload, RAG/vector/multimodal helpers, quality evaluator, dev-task AI, and return AI analysis to use `aiRuntimeService` instead of `aiAgentService`.
- `aiRuntimeService` intentionally does not expose `processCustomerMessage`, so active code cannot accidentally route replies through the legacy customer-message system.

Focused WhatsApp smoke result:

- Company: `maxp`
- Entry point: `WhatsAppAIIntegration.generateAIResponse(...)`
- Core mode: `CORE`
- Provider: `OPENROUTER`
- Model: `CoreAIAgent + openai/gpt-oss-20b:free`
- Intent: `product_inquiry`
- Result: reply generated successfully through the Core adapter.

Focused Facebook comment smoke result:

- Company: `maxp`
- Entry point: `commentController.applyPostResponseMethod(...)`
- Safety setup: synthetic local comment with `pageId = null`, so no Facebook API send could occur.
- Result: one pending comment processed, response persisted, Facebook customer/conversation created, inbound comment message stored, and the reply was generated through `CoreAIAgent`.

Focused shared adapter smoke result:

- Entry point: `facebookCoreAdapter.generateFacebookCommentCoreReply(...)`
- Safety setup: synthetic local comment with `pageId = null`, so no Facebook API send could occur.
- Result: Core reply generated through OpenRouter, customer created, and a `FACEBOOK` conversation created.

Known local warning: the Redis instance is still `3.2.100`, while BullMQ requires Redis `>= 5.0.0` for queue jobs. This does not block the chat reply path, but it still affects queued AI logs/workers.

## Customer-Facing Reply Paths

| Area | File | Current AI path | Status | Migration note |
| --- | --- | --- | --- | --- |
| Facebook Messenger webhook | `backend/utils/allFunctions.js:2176` | `CoreAIAgent.processMessage(...)` | Already Core | Keep as reference behavior. |
| `/test-chat` normal messages | `backend/controller/testChatController.js` | `CoreAIAgent.processMessageForTest(...)` | Core only | Legacy mode requests are ignored and normalized to Core. |
| `/test-chat` quick test | `backend/controller/testChatController.js` | `CoreAIAgent.processMessageForTest(...)` | Core only | Legacy mode requests are ignored and normalized to Core. |
| WhatsApp auto replies | `backend/services/whatsapp/WhatsAppAIIntegration.js` | `CoreAIAgent.processMessageForReplyOnly(...)` | Migrated to Core | Delivery logic remains in the WhatsApp service. |
| Facebook comment auto replies | `backend/controller/commentController.js` | `CoreAIAgent.processMessageForReplyOnly(...)` | Migrated to Core | Public delivery remains owned by the comment controller. |
| Facebook webhook comment auto replies | `backend/utils/allFunctions.js` | `facebookCoreAdapter.generateFacebookCommentCoreReply(...)` | Migrated to Core | Public delivery remains owned by the webhook utility. |
| Facebook Messenger fallback branch | `backend/utils/allFunctions.js` | `CoreAIAgent.processMessageForReplyOnly(...)` | Migrated to Core | Keeps the existing save/send/socket logic but uses Core for generation. |
| Facebook negative-comment filtering | `backend/controller/commentController.js` | `aiRuntimeService.getContextManager().analyzeSentimentAI(...)` | Runtime helper | Separate from reply migration; it can hide/delete comments depending settings. |

## Test And Legacy Tools

| File | Usage | Migration note |
| --- | --- | --- |
| `backend/services/coreTestMessageRunner.js` | Shared Core-only harness for old one-off test tools. | New helper; it creates/reuses a `TEST` conversation and calls `CoreAIAgent.processMessageForTest(...)`. |
| `backend/scripts/analyzeAndFixAITest.js`, `backend/scripts/quickAITest.js`, `backend/scripts/testAIIntelligence.js`, `backend/scripts/verify_ai_response.js` | Previously called `processCustomerMessage`. | Migrated to the Core test helper. |
| `backend/services/quick-test.js`, `backend/services/run-ai-intelligence-test.js` | Previously called `processCustomerMessage`. | Migrated to the Core test helper. |
| `backend/utils/allFunctions_ai.js` / `backend/utils/allFunctions_maxp2.js` | Legacy copied utility files still contained `processCustomerMessage`. | Deleted after import search confirmed no runtime imports. |
| `backend/services/aiAgentService.js`, `backend/services/aiAgent/messageProcessor.js`, `backend/services/aiAgent/legacy`, `backend/services/aiAgent/modern` | Own the legacy/modern router implementation. | Keep only until legacy scripts are retired, then remove as a single legacy stack. |

## Runtime Infrastructure

These are not customer reply systems. They now go through `aiRuntimeService`:

| Area | File | Dependency |
| --- | --- | --- |
| Core provider fallback | `backend/services/CoreAIAgent.js` | `aiRuntimeService.generateAIResponse(...)` |
| Core response polish | `backend/services/CoreAIAgent.js` | `enhanceResponseWithConversationState(...)` |
| Core order extraction/summary helper | `backend/services/CoreAIAgent.js` and `backend/controller/testChatController.js` | `getOrderProcessor()` |
| Core Gemini/vision quota tracking | `backend/services/CoreAIAgent.js` | `getModelManager()` and `markModelAsExhaustedFrom429(...)` |
| Core legacy intent helper | `backend/services/CoreAIAgent.js` | `getContextManager()` |
| Super Admin AI provider page | `backend/controller/superAdminAiController.js` | `getModelManager().clearAllCaches()` |
| Quota monitoring | `backend/controller/adminQuotaMonitoringController.js` | `getModelManager()` |
| Company AI settings | `backend/controller/aiController.js` | `updateSettings`, prompt reload, settings cache invalidation |
| Debug AI routes | `backend/controller/debugController.js`, `backend/routes/debugAIRoutes.js` | error handler and active model lookup |
| Reply suggestions route | `backend/routes/conversationAIRoutes.js` | settings/context helpers and smart suggestions |
| RAG/embeddings/image analysis | `backend/services/ragService.js`, `backend/services/postgresVectorService.js`, `backend/services/multimodalService.js`, `backend/services/rag/ragEvaluator.js` | key/model selection and prompt helpers |
| AI quality/dev/returns tools | `backend/services/aiQualityEvaluator.js`, `backend/services/aiDevTaskService.js`, `backend/services/returnAIService.js` | provider/model selection and generation helpers |
| System toggles/cache invalidation | `backend/services/systemManager.js` | quality monitor and model-manager cache invalidation |

## Notable Bugs Found And Fixed

`backend/routes/conversationAIRoutes.js:269` destructures the default instance incorrectly:

```js
const { aiAgentService } = require('../services/aiAgentService');
```

`backend/services/aiAgentService.js` exports the instance directly, not an object with an `aiAgentService` property. This means the smart suggestions route can resolve `aiAgentService` as `undefined`. The safe fix is:

```js
const aiAgentService = require('../services/aiAgentService');
```

That route now uses `aiRuntimeService`.

`backend/controller/aiController.js` also called `aiAgentService.updateSettings(...)`, but `aiAgentService` did not expose that delegate even though `settingsManager` had it. This is now routed through `aiRuntimeService.updateSettings(...)`, and response-rules cache refresh now invalidates the settings manager cache instead of touching a missing in-memory cache and an undefined `rules` variable.

## Safe Migration Plan

1. Add a Core return-value adapter. **Done**
   - New method or wrapper should return `{ success, content, images, provider, model, agentMode, metadata }`.
   - It must not send Facebook messages directly.
   - WhatsApp/comments can use it without channel-specific delivery side effects.

2. Convert WhatsApp auto replies first. **Done**
   - Replace `aiAgentService.processCustomerMessage(...)` in `WhatsAppAIIntegration`.
   - Keep the existing WhatsApp send logic unchanged.
   - Run a small WhatsApp-shaped smoke using saved test data before real channel testing.

3. Convert Facebook comment auto replies second. **Done**
   - Comments are public, so migrate after WhatsApp proves stable.
   - Keep negative-comment moderation separate until sentiment analysis has a Core replacement.

4. Extract shared runtime infrastructure out of `aiAgentService`. **Done**
   - `modelManager`
   - `responseGenerator`
   - `settingsManager`
   - `contextManager` helpers still used by Core
   - `orderProcessor` helpers still used by Core

5. Deprecate and remove the legacy/modern `processCustomerMessage` router. **Next**
   - Production channels and one-off test helpers no longer call it.
   - Active service/admin utilities no longer require `aiAgentService`.
   - Remaining executable mentions are the legacy implementation itself: `backend/services/aiAgentService.js`, `backend/services/aiAgent/messageProcessor.js`, `backend/services/aiAgent/legacy`, and `backend/services/aiAgent/modern`.
   - `backend/server.js` no longer preloads `aiAgentService`; startup warm-up now points at `aiRuntimeService` instead.
   - `backend/services/aiAgent/messageProcessor.js` now routes through `backend/services/aiAgent/legacyRouterGuard.js`, which emits a one-time deprecation warning and supports a process-level shutdown switch through `DISABLE_LEGACY_AI_ROUTER=true`.
   - `backend/services/aiAgent/legacyAgentModeService.js` now centralizes the leftover `useModernAgent` compatibility flag so admin/company bulk updates and payload metadata stay consistent while the legacy router is quarantined.
   - Other mentions are docs, examples, generated historical reports, and internal constructor variable names.

## Recommendation

Treat `aiAgentService` as the legacy router only. The active reply system is now Core plus `aiRuntimeService`. The next cleanup step is a dedicated deletion/quarantine pass for the old message processor and legacy/modern agent stack, followed by a backend boot smoke and `/test-chat` scenario rerun.
