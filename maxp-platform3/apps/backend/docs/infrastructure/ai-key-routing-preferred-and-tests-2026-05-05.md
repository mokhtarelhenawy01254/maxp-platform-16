# AI Key Routing Preferences And Live Tests - 2026-05-05

## Summary

Super admin AI provider management now supports manual key routing and live key diagnostics without adding a database migration.

## Runtime Behavior

- `GlobalAiConfig.settings.preferredAiKeyIds` stores provider-specific preferred key IDs.
- Selecting a preferred key also switches `GlobalAiConfig.defaultProvider` to that key provider, so the selected key participates in real routing immediately.
- `ModelManager.getNextKeySimple` and `previewNextKeySimple` try the preferred key first when it matches the active provider and is not cooling down.
- If the preferred key is unavailable, routing falls back to the existing primary provider rotation and then failover behavior.
- `AiKey.usage.routing` stores the latest live-test result: timestamp, status, provider, model, latency, error, and test count.

## Super Admin API

- `POST /api/v1/super-admin/ai/keys/:id/test` live-tests a key with its active model and never returns the raw API key.
- `POST /api/v1/super-admin/ai/keys/:id/preferred` makes a key the preferred active route for its provider.
- `DELETE /api/v1/super-admin/ai/preferred-key/:provider` clears a provider preference and returns it to automatic rotation.
- `POST /api/v1/super-admin/ai/routing-preview` includes `preferredKeyId` and `manualOverride` so the UI can show which key would currently be used.

## UI Notes

The `/super-admin/ai-providers` table shows:

- the current routed key from dry-run routing preview,
- the manually preferred key,
- the last key that successfully handled a real request,
- the latest live test status, model, latency, and sanitized error,
- actions to test a key, prefer a key, or return the active provider to automatic rotation.
