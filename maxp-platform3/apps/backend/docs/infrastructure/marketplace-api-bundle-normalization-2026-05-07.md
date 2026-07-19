# Marketplace API Bundle Normalization - 2026-05-07

## What Changed

The live Marketplace audit found two API shape issues:

- `GET /api/v1/marketplace/bundles` returned empty `apps` arrays for DB-backed
  bundles whose `appIds` were stored as app slugs or JSON strings.
- DB-backed app payloads exposed mixed serialized values, especially `features`
  and `requiredApps`, depending on how the row was seeded.

`backend/controller/marketplaceController.js` now normalizes Marketplace app
payloads before API responses and resolves bundle app tokens by either database
`id` or public `slug`.

## API Contract

Marketplace app responses should expose:

- `features` as parsed JSON when the database value is JSON.
- `requiredApps` as an array of app slugs.
- `positioning` and `limitations` as parsed JSON when present.

DB-mode bundle list responses should expose:

- `apps` populated from active, public, non-template Marketplace apps.
- `appIds` rewritten to the resolved database app ids.
- Token order preserved from the bundle definition, whether the source used ids,
  slugs, or a JSON string.

This keeps the bundle list endpoint aligned with the bundle detail endpoint,
which already accepted both app ids and app slugs.

## Verification

Focused coverage lives in:

```text
backend/tests/controller/marketplaceController.hybrid.test.js
```

The targeted test suite checks DB app normalization and DB bundle app resolution.
