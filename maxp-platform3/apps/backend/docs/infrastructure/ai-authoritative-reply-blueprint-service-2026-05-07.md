# AI Authoritative Reply Blueprint Service - 2026-05-07

## Scope

This note documents the extraction of the deterministic authoritative reply
blueprint seam out of `CoreAIAgent.js` into:

- `backend/services/aiAgent/authoritativeReplyBlueprintService.js`

Focused contract coverage for this seam lives in:

- `backend/tests/services/authoritativeReplyBlueprintService.test.js`

## Service Surface

The extracted service currently exposes three public helpers:

- `buildNoCatalogMatchReply(contextBag, userMessage)`
- `buildDeterministicProductCategoryClarificationReply(contextBag, userMessage)`
- `buildAuthoritativeReplyBlueprint(contextBag, userMessage, messageType)`

`CoreAIAgent` keeps the same outward methods, but the decision chain now lives
behind the dedicated service boundary.

## What The Service Owns

The new service now owns the deterministic reply-blueprint seam that used to be
embedded directly inside `CoreAIAgent`, including:

- no-catalog-match handling for grounded-but-missing product requests
- deterministic product-category clarification replies
- greeting and gratitude/closing short-circuits before the larger builder chain
- normalized message-type handling for text vs image blueprint decisions
- the ordered fallback chain across privacy, repair, shipping, support, image,
  variant, product-summary, order-collection, and price builders

## Boundary With Neighboring Services

- `deterministicIntentReplyBuildersService` still owns many of the lower-level
  canned reply builders that this service orchestrates.
- `commerceContextHeuristicsService` and `intentReplyHeuristicsService` still
  provide the predicate signals used to decide which blueprint branch is valid.
- `customerReplyFinalizationService` stays downstream and applies final
  sanitization/hardening after the authoritative blueprint returns.

## Covered Decision Paths

The focused Jest slice pins a few high-value invariants:

- plain greetings still get the short opening reply unless they include an
  explicit actionable request
- gratitude/closing replies still short-circuit before the heavier builder
  chain
- the deterministic fallback chain still stops at the first truthy builder
- image-oriented branches receive normalized uppercase message types so the
  downstream image clarification builders stay stable
