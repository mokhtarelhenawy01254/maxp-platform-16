# AI provider priority routing

## What changed

Super Admin AI routing now stores the ordered Core customer-AI provider list in `GlobalAiConfig.settings.providerPriority`.

The Super Admin API exposes the setting through:

- `GET /api/v1/super-admin/ai/provider-priority`
- `POST /api/v1/super-admin/ai/provider-priority`

`POST` accepts `providerPriority` (also compatible with `priority` / `order`) and optional `enableFailover`. The controller normalizes provider names, preserves unrelated `settings` values, updates `defaultProvider` to the first priority entry, and clears `aiRuntimeService.getModelManager().clearAllCaches()` so routing changes are visible immediately.

## Runtime behavior

`ModelManager` resolves key order from `settings.providerPriority`, not only `defaultProvider`. Company and central key pools are sorted by provider rank first, then existing scope/priority rules. If failover is disabled, only the first provider pool is eligible, and `getProviderPriorityOrder()` exposes only that first provider to generation callers.

`providerGenerationService` attempts generation in the resolved provider-priority order. It tries configured model/tool generation for each provider, uses direct Gemini generation for `GOOGLE`, honors the failover-disabled single-provider order, and only returns the customer-facing authoritative blueprint after all eligible provider-priority attempts are exhausted.

## Regression coverage

- `tests/services/modelManagerKeySource.test.js`
- `tests/services/modelManager.centralProviderRouting.test.js`
- `tests/services/providerGenerationService.test.js`
- `tests/controller/superAdminAiController.groqKey.test.js`
