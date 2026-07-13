# AI Customer Reply Hardening Service - 2026-05-07

## What changed

- Added `services/aiAgent/customerReplyHardeningService.js` as a live Core dependency for the next low-risk `CoreAIAgent` split.
- Moved the unsafe zero-price / grounded fallback hardening seam behind that service and wired `services/CoreAIAgent.js` to delegate to it.
- Added focused Jest coverage in `tests/services/customerReplyHardeningService.test.js`.

## Extracted cluster

The service now owns the post-generation hardening rules that were still coupled inside `CoreAIAgent`:

- unsafe zero-money detection
- grounded zero-price fallback reply shaping
- final grounded-response hardening wrapper

`shippingPricingService` remains the owner of shipping-blueprint preservation and grounded shipping-math correction. `customerReplyHardeningService` delegates to that shipping-math layer instead of duplicating it.

## Why this is isolated

This pass keeps the responsibilities narrow: `customerReplyHardeningService` owns zero-price safety and grounded fallback shaping, while `shippingPricingService` still owns shipping math/blueprint logic. The Core wiring becomes a thin delegation layer instead of another big inline block.

## Verification

- `npx jest tests/services/customerReplyHardeningService.test.js --runInBand --testTimeout=30000`
- `node --check services/aiAgent/customerReplyHardeningService.js`
