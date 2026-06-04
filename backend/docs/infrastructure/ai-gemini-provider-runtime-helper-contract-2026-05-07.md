# AI Gemini Provider Runtime Helper Contract - 2026-05-07

## Scope

This note captures the shared Gemini runtime-helper seam that now lives in:

- `backend/services/aiAgent/geminiProviderRuntimeService.js`

Focused contract coverage for that seam lives in:

- `backend/tests/services/geminiProviderRuntimeService.test.js`

## Shared Helper Surface

The shared helper should own the Gemini-specific primitives that are reused across more than one runtime path:

- env and key resolution:
  - `getGeminiApiKeyFromEnv()`
  - `resolveGeminiApiKey(prisma, companyId)`
  - `resolveGeminiApiKeyCandidates(prisma, companyId)`
- model discovery and candidate shaping:
  - `extractGeminiModelNamesFromModelsListResponse(...)`
  - `fetchGeminiModelsFromEndpoint(apiKey, generationMethod)`
  - `getGeminiVisionModelCandidates(additionalModels)`
  - `getGeminiTextModelCandidates(preferredModel, additionalModels)`
- shared failure handling:
  - `describeGeminiModelError(error)`
  - `isRetriableGeminiError(error)`
  - `isCredentialGeminiError(error)`
  - `isUnsupportedGeminiModelError(error)`
  - `isGeminiQuotaError(error)`
  - `isGeminiModelNotFoundError(error)`
  - `extractGeminiRetryAfterMs(error)`
  - `handleGeminiVisionAttemptFailure(attempt, companyId, error, phase)`
- shared vision-attempt planning:
  - `resolveGeminiVisionAttempts(prisma, companyId, apiKeyOverride)`

This helper may read env vars, Prisma Google-key records, Google `models.list`, and `aiRuntimeService` / `modelManager` hooks. It should not build prompts, format customer replies, score catalog matches, or choose non-Google provider fallbacks.

## Boundary Between Services

- `CoreAIAgent.js`
  - owns top-level orchestration, constructor wiring, compatibility wrappers, and call-site sequencing
  - should keep passing the shared helper into downstream services, but should not remain the long-term home for duplicated Gemini key/model/error helpers
  - today it already delegates `getGeminiApiKeyFromEnv`, `resolveGeminiApiKey`, `resolveGeminiApiKeyCandidates`, and `resolveGeminiVisionAttempts` to the shared helper, while still carrying local copies of other Gemini helper methods; that duplication is the remaining extraction debt

- `providerGenerationService.js`
  - owns text-generation routing: message parts, system instruction, history shaping, configured-provider primary path, direct Gemini generation, and safe fallback envelope assembly
  - should consume the shared helper for generic Gemini facts such as env key lookup, endpoint-discovered models, candidate ordering, and error classification
  - should not own its own regex classifiers or endpoint-model cache

- `catalogImageGroundingService.js`
  - owns image-analysis prompting, payload normalization, catalog-image comparison, search-hint shaping, and ranking logic
  - should consume the shared helper for Gemini vision-attempt planning, shared error descriptions, and 404/429 failure bookkeeping
  - should not own Gemini key lookup or model-list parsing

## Why This Split Matters

- keeps Gemini API behavior testable in one place instead of re-proving the same rules through large `CoreAIAgent` suites
- lets `providerGenerationService` and `catalogImageGroundingService` share the same key/model/error semantics without importing each other's higher-level logic
- shrinks future Core edits to wiring only, which is safer in a busy worktree where other agents may be changing adjacent runtime paths

## Focused Coverage In This Pass

The new Jest slice pins the shared helper contract around:

- env-key precedence across current and legacy Google env vars
- company/central/env Gemini key candidate ordering and dedupe
- `models.list` pagination, generate-content filtering, and positive/negative caching
- preferred text-model ordering for Google-hosted `gemini-*` and `gemma-*` ids
- shared error description, credential/retry classification, and retry-delay parsing
- override-based vision attempt construction for the catalog image path
