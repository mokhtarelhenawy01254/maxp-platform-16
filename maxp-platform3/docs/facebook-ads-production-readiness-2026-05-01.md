# Facebook Ads Production Readiness - 2026-05-01

## Scope

Prepare Max P to create a Meta ad from the in-app wizard for:

- Page: Swan
- Ad account: Swan
- Pixel: swam-maxp
- Initial supported formats: single image, single video, carousel

## Implemented In This Pass

- Prevented unsupported `FLEXIBLE` creatives from being submitted by the wizard.
- Added full-step validation before final submit, including media/card validation.
- Fixed backend full-ad local persistence to use the real Prisma columns on `FacebookAd`.
- Kept required `FacebookAdset.budgetType` and `budgetAmount` populated even when CBO is enabled.
- Passed `pageId` into creative creation and added first-pass carousel payload support.
- Uploads image/video/carousel media before campaign creation to reduce partial remote objects.
- Added local performance summary endpoint with spend, CTR, CPC, purchases, ROAS, and recommendations.
- Enriched insight sync from Meta `actions`, `action_values`, `cost_per_action_type`, and `purchase_roas`.

## E2E Test Checklist

- Log in with the Facebook account that owns or manages the Swan app/account.
- Confirm the app token has Ads permissions and the Swan ad account is selectable.
- In the wizard, choose Swan ad account.
- Confirm Swan page appears as ready/selectable.
- Confirm pixel `swam-maxp` is selected for sales/conversion objective.
- Create the first test ad as `PAUSED`.
- Confirm the campaign, ad set, creative, and ad appear in Meta Ads Manager.
- Confirm local dashboard has campaign, ad set, and ad records.
- Run insights sync after Meta starts returning data.
- Review the reports page recommendations before increasing budget.

## Known Risks

- Meta can still reject ads for policy, creative, destination URL, payment, or account quality reasons.
- Pixel attribution can show zero purchases if `swam-maxp` is not firing Purchase with value/currency.
- Upload from local files is still not implemented in this wizard; use direct public media URLs for now.
- Async reports can be created and downloaded by report id, but there is no persisted report-history table yet.
- Real delivery verification requires an authenticated Facebook session and a valid live access token.

## Next Hardening Items

- Add upload-to-storage flow for local image/video files before sending to Meta.
- Persist async report runs locally so the reports page can list historical exports after reload.
- Add token-health diagnostics for Ads token, Page token, and Pixel/CAPI token separately.
- Add a preflight endpoint that validates page, ad account, pixel, and destination URL before creation.
- Add campaign/adset/ad rollback or cleanup guidance for remote partial failures.
