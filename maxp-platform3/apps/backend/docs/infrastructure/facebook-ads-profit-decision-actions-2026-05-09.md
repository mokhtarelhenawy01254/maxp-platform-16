# Facebook Ads Profit Decision Actions - 2026-05-09

## Summary

This change upgrades the Facebook Ads decision layer from ROAS-only guidance into a profit-aware decision workflow.

## What Changed

- The ad decision engine now reads profitability inputs from:
  - `Company.settings.facebookAdsDecision`
  - `Product.metadata.facebookAdsDecision`
  - delivered order history
  - default delivery option fallback when no order history exists
- Decisions now account for:
  - product cost
  - expected shipping
  - payment or collection fees
  - expected return reserve
  - required net profit
  - configured Max CPA
- `SCALE` is blocked when product cost is only an estimated fallback.
- Delivered order history no longer treats `OrderItem.basePrice` as COGS. Order
  item cost is considered reliable only from `merchantPrice`, `Product.cost`, or
  `ProductVariant.cost`.
- Ad detail UI shows compact economics: current CPA, Max CPA, break-even ROAS, estimated profit, returns reserve, payment fees, shipping source, and profitability readiness.
- The dashboard now includes a compact decision center with filters for `SCALE`, `KILL`, `FIX`, `LEARNING`, and `WATCH`.
- Safe decision actions were added:
  - preview pause ad
  - preview ad set budget scale
  - execute only after explicit confirmation
- WhatsApp budget alerts now support decision-alert metrics:
  - `DECISION_KILL_CANDIDATE`
  - `DECISION_SCALE_CANDIDATE`

## Safety Notes

- No action is executed automatically from a decision.
- Budget scale is capped to 5-30% in preview/execution.
- Pausing or scaling requires a POST execution call with `confirm: true`.
- Decision alerts notify operators only; they do not change Meta delivery.

## Verification

- `npx jest tests/services/facebookAdsBudgetAlertService.test.js tests/services/facebookAdsDecisionService.test.js tests/routes/facebookAdsRoutes.tools.test.js --runInBand --testTimeout=30000`
- `node --check` on changed Facebook Ads backend files.
- `npm run schema:generate` from `backend/`.
- `npm run build` from `frontend/`.
- Local Playwright smoke against `http://127.0.0.1:5174` verified:
  - dashboard decision center
  - decision WhatsApp alert metric labels
  - ad details profitability facts
  - scale action preview and confirmation gate
