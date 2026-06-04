# AI Configured Provider Fallback Service - 2026-05-07

## Summary

Extracted the configured-provider fallback seam from
`backend/services/CoreAIAgent.js` into
`backend/services/aiAgent/configuredProviderFallbackService.js`.

## What moved

- provider-fallback prompt construction for production and `/test-chat`
- configured-provider resolution through `aiRuntimeService.getModelManager()`
- centralized configured-provider generation call with bounded attempts/timeouts
- usage/cost normalization for provider-generated fallback replies
- unsafe zero-price rejection and grounded fallback substitution
- authoritative blueprint enforcement for provider replies

## Why it matters

- shrinks `CoreAIAgent` without changing public entrypoints
- keeps provider fallback rules testable in isolation
- prepares a cleaner follow-up extraction for the full Gemini generation seam

## Verification

- `npx jest tests/services/configuredProviderFallbackService.test.js --runInBand --testTimeout=30000`
- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run check:syntax`
- `npm run test:ai:architecture`
