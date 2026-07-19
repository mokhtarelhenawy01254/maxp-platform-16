# AI Deterministic Commerce Reply Service - 2026-05-07

## Purpose

Extract the deterministic commerce reply builders from `CoreAIAgent` so catalog,
price, availability, and variant-answer shaping stop living inline in the core
runtime file.

## Owns

- product attribute-map building from variant attributes
- largest-size question detection and resolution
- canonical price amount formatting
- catalog browse price-entry extraction
- nearest response price-match lookup for browse answers
- deterministic variant replies
- deterministic grounded product-summary replies
- deterministic grounded price replies
- deterministic ungrounded price-clarification replies
- deterministic price-comparison replies
- deterministic availability preview replies

## Inputs / Dependencies

The service stays pure except for injected helper dependencies:

- `normalizeAttributeKey`
- `appendShippingFactsToVariantReply`
- `matchesSemanticIntent`
- `normalizeSearchText`
- `getPreferredPricedVariant`
- `buildGroundedProductDisplayLabel`
- commerce/safety intent predicates
- price-format/display helpers
- `escapeRegExp`

It also uses `resolveVariantAttributes` from
`backend/utils/productNormalizationUtils.js`.

## Why This Boundary

These builders are deterministic formatting/selection logic, not orchestration.
Moving them out of `CoreAIAgent` reduces file size, makes pricing/catalog reply
tests focused, and gives later seams a stable place to depend on without reaching
back into Core for commerce-specific answer shaping.
