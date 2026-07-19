# Response Price Validation Service - 2026-05-07

## Purpose

Extract the grounded response-price correction seam from `CoreAIAgent` so final
reply price validation becomes a leaf service instead of another inline block in
the Core facade.

## What moved

- grounded product price correction
- browse-response scoped price correction
- shipping fee correction
- shipping-class fee correction
- total price correction
- final handoff into zero-price and shipping grounding hardening

## Why this cut helps

- keeps `_validateResponsePrices(...)` as a thin compatibility wrapper for
  existing spies/direct calls
- moves a pure response-transform seam out of the Core without touching runtime
  orchestration
- isolates a historically sensitive pricing block behind dedicated tests

## Validation

- `npx jest tests/services/responsePriceValidationService.test.js --runInBand --testTimeout=30000`
- `npm run test:ai:tools`
