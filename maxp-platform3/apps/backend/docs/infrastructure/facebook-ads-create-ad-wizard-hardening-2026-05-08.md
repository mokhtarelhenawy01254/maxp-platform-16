# Facebook Ads Create Ad Wizard Hardening - 2026-05-08

## Context

Production creation of a paused Meta ad exposed two high-impact gaps in the full-ad wizard:

- Traffic/link-click ad sets can fail on Meta v25 when the wizard sends a broad conversion attribution window.
- Several targeting controls were visible in the wizard but were not included in the `/facebook-ads/full-ad` payload.

## Changes

- Normalized wizard bid strategy values before calling the backend:
  - `LOWEST_COST_WITHOUT_CAP` is sent as `LOWEST_COST`.
  - `LOWEST_COST_WITH_BID_CAP` is sent as `BID_CAP`.
  - Capped strategies now require a bid/cost value in the UI and API.
- Traffic objectives now force `1d_click` attribution before the Meta API call.
- Traffic objectives also strip accidental Pixel/conversion fields so an auto-selected Pixel does not turn a link-click ad set into an offsite-conversions ad set.
- The wizard now includes active targeting selections in the full-ad payload:
  - Meta interest search selections.
  - Custom audiences.
  - Lookalike audiences.
  - Excluded audiences.
  - Locales, device platforms, relationship status, and education status.
- `createAdSet` now uses the advanced targeting builder so these payload fields reach Meta.
- The wizard no longer immediately redirects after success. It shows the created local and Meta IDs, with actions to open ad details or return to the dashboard.
- Frontend budget validation now mirrors the production EGP minimum budget guard.

## Verification

Focused tests were added/updated for:

- Frontend wizard helper payload normalization.
- Backend controller full-ad delivery normalization.
- Backend service v25-safe attribution and advanced targeting payloads.
