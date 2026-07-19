# Facebook Messenger Inventory Variant Check - 2026-05-25

## Context

The Facebook/Messenger customer scenario suite expects the sales/support agent to answer size and color availability explicitly, for example "هل مقاس 42 متاح؟". The previous `inventory.check` runtime tool could only read generic product stock, so a product with stock could be reported as available even when the requested size or color was missing.

## Change

- `backend/services/aiAgent/agentToolRegistry.js` now makes `inventory.check` variant-aware.
- The tool schema now requires `productNameOrSku` and accepts optional `productSize` and `productColor`.
- The handler reads active `ProductVariant` rows and returns:
  - available sizes and colors,
  - requested size/color,
  - `القيد_متاح`,
  - `نتيجة_القيد`.
- `backend/agents/_shared/tool-registry.json` now matches the runtime handler input contract instead of exposing stale `productId`/`threshold` inputs.
- `backend/tests/services/agentInventoryTool.test.js` covers the native tool schema and variant-specific availability behavior.

## Follow-Up Hardening

- `backend/services/aiAgent/agentIntentRelevanceService.js` now strips test markers such as `اختبار كودكس ...:` before classifying the customer's actual intent.
- Product availability messages with a product/SKU plus size or color are marked as a trusted local read route to `inventory.check`; this avoids depending on an LLM classifier when the request is a low-risk stock read.
- `backend/services/aiAgent/CEOAgent.js` parses `productNameOrSku`, `productSize`, and `productColor`, executes `inventory.check`, and can produce a customer-facing reply directly from the tool result without a post-tool model call.
- `backend/services/aiAgent/agentReplyNormalizer.js` and `backend/services/aiAgent/agentToolCallParser.js` now treat leaked tool names and parameter keys such as `inventory.check`, `productNameOrSku`, and `productSize` as internal runtime traces.
- `backend/tests/services/agentInventoryDeterministicReply.test.js` covers deterministic routing and customer replies for Messenger-style size availability questions.

## Why It Matters

This aligns the live Messenger agent with the 2026 agent pattern of structured tool schemas matching real tool handlers, grounding customer answers in current system state, and failing safely when a requested variant is unavailable instead of relying on generic product stock.

## Verification

- `node --check services/aiAgent/agentToolRegistry.js`
- `npx jest tests/services/agentInventoryTool.test.js --runInBand --testTimeout=30000`
- `npx jest tests/services/agentNativeTooling.test.js tests/services/facebookAiAutoReply.test.js tests/services/agentReplyNormalizer.test.js --runInBand --testTimeout=30000`
- `npx jest tests/services/agentInventoryDeterministicReply.test.js tests/services/agentReplyNormalizer.test.js tests/services/agentInventoryTool.test.js tests/services/facebookAiAutoReply.test.js --runInBand --testTimeout=30000`
- Live Messenger retest `LIVE-004-TRUSTED-INVENTORY-134056`: the production reply was `Swan High Skotch مقاس 42 غير متاح حالياً. غير متاح: المقاس 42 غير مسجل لهذا المنتج`, with no internal tool syntax leaked.
