# Facebook Ads Decision Engine Plan - 2026-05-08

## Goal

Build a read-only decision layer that helps operators decide whether to scale, pause, watch, or fix an ad using Meta performance, local product economics, local order attribution, and tracking health.

## Version 1 - Shipped In This Slice

- Add a backend decision service for ad-level decisions.
- Calculate target CPA, break-even ROAS, estimated profit, attribution confidence, and tracking gaps.
- Add `GET /api/v1/facebook-ads/reports/decision-summary` for compact account-level decision cards.
- Add `decision` to `GET /api/v1/facebook-ads/ads/:adId/details`.
- Sanitize nested Facebook ad account payloads so decision/detail responses never expose stored Meta access tokens.
- Keep all decisions read-only. No campaign, ad set, or ad status changes are applied automatically.
- Fix profit analytics to read `Product.cost`, `ProductVariant.cost`, and `orderItems`.
- Persist `productId` when creating a full ad from the wizard.
- Add default Meta URL tags in product-launch ad creation to improve future attribution.

## Decision Rules

- `SCALE`: enough purchases, CPA is below target CPA, and ROAS is above target ROAS.
- `KILL`: spend passed the product-margin test without purchases, or CPA is above break-even.
- `FIX_TRACKING`: sales/conversion campaign has weak Pixel context.
- `FIX_LANDING`: clicks are not becoming landing page views.
- `FIX_CREATIVE`: impressions are present but CTR is weak.
- `FIX_OFFER`: spend exists without purchases after basic delivery.
- `LEARNING`: sample size is too small.
- `WATCH`: no clear action is safe yet.

## UI Rules

- Keep decision surfaces compact and operational.
- Prefer one dense row/strip over tall cards.
- Use small labels, short reasons, and only the metrics needed for action.
- Avoid empty vertical space, oversized headings, and decorative sections.
- Keep controls familiar and close to the data they affect.

## Next Slice

- Add an approval-based action queue for scale/pause actions.
- Add WhatsApp alerts for high-priority decisions.
- Add dashboard filters by decision status.
- Add tests for edge cases: missing product cost, missing Pixel, no purchases, profitable ads, weak landing page rate.
