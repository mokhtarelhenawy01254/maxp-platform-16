# Core AI Messenger Routing And Telemetry

Date: 2026-05-05

## Summary

The Facebook Messenger webhook now uses `CoreAIAgent.processMessage` as the
single production dispatch path for saved customer messages. The old forced
branch and shadow `allFunctions_*` copies were removed so future maintenance
does not split fixes across inactive code paths.

Core AI replies now write interaction telemetry through `aiTelemetryService`.
The telemetry normalizes Gemini/OpenAI-style usage payloads and stores prompt,
completion, total tokens, cost metadata, provider, model, key information, and
grounding context in the existing `AiInteraction` schema.

## Guardrails

- Messenger production should have one Core dispatch from `backend/utils/allFunctions.js`.
- `processMessageForReplyOnly` remains available for reply adapters, not the
  Messenger webhook production path.
- The final customer reply is logged once at the Core layer; internal provider
  fallback calls pass `skipInteractionLog` to avoid duplicate rows.
- Shipping replies may use model phrasing only when the reply keeps the
  deterministic base price, shipping fee, and final total.
- Short post-scoped follow-ups can resolve products from source post images
  against catalog images when no explicit post product mapping exists.

## Regression Scenario

The release was verified with a customer-facing AI scenario that covers:

1. A Messenger customer asks to browse casual shoes and vector-ranked catalog
   results become the browse source.
2. A customer asks for a product plus governorate and Gemini phrases the answer
   while preserving deterministic price, shipping, and total facts.
3. A customer replies with only area plus governorate after a recent shipping
   prompt and the system resolves the shipping quote instead of treating it as
   support noise.
4. A short post-scoped message resolves the product by comparing source post
   images against catalog images when the post has no featured product mapping.

## Verification

Commands run locally:

```powershell
node --check backend\services\CoreAIAgent.js
npm test -- --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js
npm test -- --runTestsByPath tests/services/aiTelemetryService.test.js tests/services/facebookMessengerCorePath.test.js
git diff --check -- backend\services\CoreAIAgent.js backend\services\aiAgent\responseGenerator.js backend\services\aiTelemetryService.js backend\workers\logWorker.js backend\utils\allFunctions.js backend\tests\services\aiTelemetryService.test.js backend\tests\services\facebookMessengerCorePath.test.js
```

Results:

- Core AI catalog and shipping suite: 101 passed.
- Telemetry and Messenger path tests: 5 passed.
- Scoped whitespace check: passed.
