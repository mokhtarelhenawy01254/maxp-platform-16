# AI Search Utility Service - 2026-05-07

## What changed

- Extracted the shared normalization/search helper cluster from `backend/services/CoreAIAgent.js` into `backend/services/aiAgent/searchUtilityService.js`.
- `CoreAIAgent` now delegates search normalization, semantic-intent scoring, search-token building, catalog alias expansion, shipping-noise stripping, and product/category fuzzy scoring through the new service.

## Responsibilities now owned by the service

- `normalizeSearchText`, `normalizeSummaryText`, and `normalizeDigits`
- cache-backed generic/product/attribute term sets and semantic-intent examples
- `tokenizeForSearch`, `buildProductSearchPhrases`, and `expandCatalogSearchTokens`
- shipping-noise token handling for product-search extraction
- Levenshtein/string-similarity helpers plus product/category candidate scoring
- semantic metadata fragment extraction for product/category matching

## Why this was safe

- The extracted methods were already pure or closure-cache-backed helpers with no database, queue, or network side effects.
- Existing service contracts still call the same `CoreAIAgent` wrapper names, so production entry points did not need new calling code.
- Focused coverage now validates normalization, token stripping, alias expansion, semantic-intent matching, and fuzzy product scoring directly at the service boundary.

## Verification

- `npx jest tests/services/searchUtilityService.test.js --runInBand --testTimeout=30000`
- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run check:syntax`
- `npm run test:ai:architecture`
