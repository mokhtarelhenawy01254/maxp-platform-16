# AI Gemini Provider Runtime Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/geminiProviderRuntimeService.js` centralizes the
shared Gemini runtime helper layer that was previously spread across
`CoreAIAgent`, `providerGenerationService`, and the vision/image-grounding path.

## Responsibilities

- Resolve Gemini API keys from environment variables and active `aiKey` records.
- Build deduplicated Gemini key candidate lists for fallback and vision flows.
- Discover Gemini models from the `models.list` endpoint with cached results.
- Classify Gemini runtime failures:
  - credential failures
  - retriable failures
  - unsupported-model failures
  - quota / retry-after failures
- Build text/vision model candidate lists from env plus discovered endpoint models.
- Track quota/model failures for vision attempts through the shared model manager.
- Build Gemini vision attempt envelopes from explicit overrides, active DB keys,
  and legacy fallback keys.

## Boundaries

This service does **not**:

- generate customer replies,
- build authoritative reply prompts,
- perform multimodal configured-provider JSON generation,
- finalize customer-facing replies.

Those responsibilities stay with:

- `providerGenerationService`
- `configuredProviderFallbackService`
- `catalogImageGroundingService`
- `customerReplyFinalizationService`

## Integration

`CoreAIAgent` now instantiates the Gemini runtime helper once and:

- delegates its old Gemini helper methods through thin wrappers,
- passes the shared helper service into `providerGenerationService`,
- passes the shared helper service into `catalogImageGroundingService`.

That keeps the Core public surface stable while removing another large runtime
cluster from the monolith.
