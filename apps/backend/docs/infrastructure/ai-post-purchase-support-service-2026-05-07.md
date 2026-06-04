# AI Post-Purchase Support Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/postPurchaseSupportService.js` extracts the
post-purchase support and contextual follow-up cluster from `CoreAIAgent`.

The service now owns:

- order-modification intent detection;
- tracking/order-link and order-status follow-up detection;
- recent conversation scans for support, shipping, price, and order context;
- support-context follow-up classification;
- explicit support-policy question detection;
- support-flow sales-artifact suppression;
- contextual follow-up intent routing;
- order-modification selection parsing;
- deterministic support replies for post-purchase/support flows;
- deterministic order-modification replies.

## Why It Was Extracted

Before this slice, `CoreAIAgent` still mixed:

- low-level post-purchase detectors,
- recent-conversation follow-up heuristics,
- support-flow reply shaping,
- order-modification reply shaping.

Moving them into one service keeps the Core closer to an orchestrator and gives
the support/post-purchase rules a dedicated home with focused tests.

## Key Dependencies

The service stays pure and works through injected helpers for:

- text normalization;
- shipping/support/order/image intent primitives;
- recent image context;
- shipping-governorate context;
- conversation-summary product state;
- policy-knowledge selection;
- grounded product display labels;
- Arabic list formatting.

## Verification

Focused coverage lives in:

- `backend/tests/services/postPurchaseSupportService.test.js`

This slice is also covered by the shared AI gates:

- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run test:ai:architecture`
