# OpenRouter Vision Fallback

Date: 2026-05-05

## Summary

Customer image understanding now routes through the active AI key system instead of being tied to the older Gemini-only multimodal path.

## Changes

- `OpenRouterProvider` now preserves OpenAI-compatible multimodal message content and can append image inputs as `image_url` parts.
- `multimodalService` now resolves a dedicated vision runtime from `GlobalAIConfig.settings`.
- OpenRouter vision defaults to `openrouter/free`, so central OpenRouter keys can handle customer image messages with free vision-capable models when available.
- Gemini image analysis remains supported as a vision provider.
- Super Admin AI Provider Management now exposes `Vision Provider` and `Vision Model` fields without a schema migration by storing them in `global_ai_configs.settings`.

## Verification

- `node --check` for the modified backend files.
- `npx jest tests/services/openRouterProvider.test.js tests/services/multimodalServiceVisionRuntime.test.js tests/services/modelManagerKeySource.test.js --runInBand`
- Targeted TypeScript compile for `frontend/src/pages/SuperAdminAIProviders.tsx`.
