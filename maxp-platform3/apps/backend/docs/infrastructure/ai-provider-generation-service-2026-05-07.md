# AI Provider Generation Service - 2026-05-07

## Scope

This note documents the provider/Gemini generation seam that is being pulled out of `CoreAIAgent.js` into:

- `backend/services/aiAgent/providerGenerationService.js`

Focused contract coverage for that seam lives in:

- `backend/tests/services/providerGenerationService.test.js`

## Service Surface

The extracted service currently exposes small helper APIs around the same seam:

- `resolveGeminiApiConfig(contextBag, configuredProvider)`
- `buildGeminiMessageParts({ contextBag, userMessage, messageType, attachments })`
- `buildSystemInstruction(contextBag, authoritativeReplyBlueprint)`
- `buildNormalizedHistory(contextBag, normalizedUserMessage)`
- `thinkAndGenerateResponse(contextBag, userMessage, messageType, attachments)`

`thinkAndGenerateResponse(...)` remains the main contract that Core should delegate to for reply-generation routing.

## Decision Contract

`thinkAndGenerateResponse(...)` should return an envelope object, not mutate Core state directly:

- always includes `content` (`string` or `null`)
- includes `llmGenerationMetadata` when Gemini succeeds
- includes `providerFallbackMetadata` plus `providerFallbackSource` when the configured-provider path is used

Core can then merge those metadata fields back into `contextBag` after the service returns.

## Covered Decision Paths

The focused Jest slice pins these behaviors:

- a non-Google configured provider is attempted before Gemini and, when it succeeds, Gemini is skipped
- a failed non-Google `TEXT` route without an authoritative blueprint returns a silent null envelope instead of bypassing into legacy Gemini
- a Google-configured provider uses the selected key/model for Gemini, then records usage/routing metadata
- Gemini model failure falls back through `configuredProviderFallbackService` before Core gives up

## Boundary With Neighboring Services

- `configuredProviderFallbackService` owns provider-resolution plus bounded provider-fallback generation
- `providerGenerationService` owns the higher-level decision tree that chooses between configured-provider primary, Gemini direct generation, and post-Gemini fallback
- reply hardening/finalization should stay outside this slice and run after the envelope comes back to Core
