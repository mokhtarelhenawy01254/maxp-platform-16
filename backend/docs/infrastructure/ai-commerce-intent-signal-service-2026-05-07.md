# Commerce Intent Signal Service

- Date: 2026-05-07
- Service: `backend/services/aiAgent/commerceIntentSignalService.js`

## Purpose

Extract the shared commerce-intent signal predicates that were still living
inline on `CoreAIAgent`:

- semantic-intent score passthrough
- semantic-intent threshold matching
- price-intent detection
- price-comparison detection
- variant-intent detection

## Why this seam

These predicates were still acting like a dependency hub inside `CoreAIAgent`.
Multiple extracted services consumed them through bootstrap binds, so moving them
behind a dedicated service reduces Core fan-out and keeps routing signals in one
low-level place.

## Wiring

- Constructed in `backend/services/aiAgent/coreAIAgentBootstrapService.js`
- Exposed on the Core instance as `commerceIntentSignalService`
- `CoreAIAgent` keeps compatibility wrappers for the original helper names
- Bootstrap now injects the service directly into reply shaping, context
  preparation, blueprint selection, post-purchase support, shipping arbitration,
  tool planning, and image handling flows

## Validation

- `backend/tests/services/commerceIntentSignalService.test.js`
- `backend/tests/scripts/aiRuntimeInventory.test.js`
