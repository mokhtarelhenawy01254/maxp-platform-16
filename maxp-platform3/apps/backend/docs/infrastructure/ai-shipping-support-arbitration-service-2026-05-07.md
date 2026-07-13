# AI Shipping Support Arbitration Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/shippingSupportArbitrationService.js` extracts the
shared arbitration rules that decide whether a message should keep flowing
through shipping enrichment, be suppressed in favor of support, or be routed to
policy/RAG knowledge handling.

The service now owns:

- current shipping-governorate signal detection;
- contextual shipping follow-up detection;
- shipping-context suppression rules;
- knowledge-intent resolution for support vs shipping policy retrieval;
- policy/FAQ RAG line formatting;
- relevant policy-entry selection.

## Why It Was Extracted

Before this slice, `CoreAIAgent` still carried the arbitration handshake that
sat between:

- `prepareContextEnrichmentService`
- `shippingPricingService`
- `postPurchaseSupportService`
- policy/FAQ retrieval

That logic is shared, behavior-sensitive, and easy to drift when left inline in
the Core. Moving it into a dedicated service makes the shipping/support boundary
explicit and testable.

## Verification

Focused coverage lives in:

- `backend/tests/services/shippingSupportArbitrationService.test.js`

Shared AI gates:

- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run test:ai:architecture`
