# AI Customer Reply Finalization Service - 2026-05-07

## What changed

- Added `services/aiAgent/customerReplyFinalizationService.js` as a live Core dependency.
- Moved the duplicated post-generation finalization pipeline out of the three main `CoreAIAgent` entrypoints.
- Added focused Jest coverage in `tests/services/customerReplyFinalizationService.test.js`.

## Extracted seam

The service now owns the shared reply-finalization flow that used to repeat inside:

- `processMessage(...)`
- `processMessageForReplyOnly(...)`
- `processMessageForTest(...)`

That shared flow includes:

- post-generation response polishing orchestration
- embedded-image preparation and stripping
- deterministic image-reply fallback wiring
- authoritative fallback wiring for sanitization
- customer-safe sanitization and question shaping
- final reply guardrail evaluation

## Responsibility boundary

- `customerReplyHardeningService` owns zero-price safety and grounded fallback shaping.
- `shippingPricingService` owns shipping-blueprint/math enforcement.
- `customerReplyFinalizationService` owns the orchestration layer that composes those lower-level helpers into one shared post-generation pipeline.

## Verification

- `npx jest --runTestsByPath tests/services/customerReplyFinalizationService.test.js --runInBand --testTimeout=30000`
- `node --check services/aiAgent/customerReplyFinalizationService.js`
