# Facebook Ads Account Scope and Delivery Status

## Context

Swan operators reported that campaign lists felt mixed across ad accounts because the UI showed a flat ad account selector and campaign rows did not expose the selected Business/Ad Account path. The previous dashboard also treated `status` as the active/running signal, but Meta's Marketing API exposes delivery separately via `effective_status`.

## Change

- Campaign sync now requests `account_id`, `configured_status`, `effective_status`, `start_time`, and `stop_time` from Meta.
- Sync skips and reports any campaign whose returned `account_id` does not match the selected ad account.
- Campaign metadata is stored inside the existing `FacebookCampaign.settings.meta` object to avoid a production schema migration.
- Campaign list and performance summary responses expose normalized `metaAccountId`, `configuredStatus`, `effectiveStatus`, and Meta timestamps for the frontend.
- The operator UI now presents the hierarchy as Business -> Ad Account -> Campaigns, groups ad accounts by Business, and filters/sorts campaigns by delivery status.
- Sync now imports the selected account's Meta ad sets and ads under each campaign. Ad set sync keeps targeting, promoted object, and budget fields; ad sync intentionally uses lightweight Meta fields in bulk so large accounts do not fail with Graph API "reduce data" errors. Deep creative payloads should be fetched lazily for a specific ad when the UI needs them.
- Campaign detail insights now fall back to Meta campaign insights for the selected campaign when local ad/adset insight rows are empty, so synced Ads Manager campaigns do not show zero performance in details.
- Adding an ad to an existing local/Meta ad set now accepts the same page, carousel-card, URL tag, and creative-enhancement fields used by the full-ad wizard. The controller uploads carousel card image URLs before calling Meta and persists the resulting card payload in `FacebookAd.carouselImages`/`creative`, which lets operators split a product's full image set across multiple carousel ads under one ad set and one budget.
- Campaign creation now sends `is_adset_budget_sharing_enabled:false` when campaign-budget optimization is disabled. Meta v24 requires an explicit true/false value for this field when budget lives on the ad set.
- Non-CBO campaign creation no longer sends campaign-level `bid_strategy`; the bid strategy is applied at the ad-set level instead. Meta rejects campaign-level bid strategy when the campaign itself has no budget.

## Product Behavior

The dashboard should now make three scopes explicit:

- Business scope: the Business Portfolio returned by Meta for each ad account, when the token has access.
- Ad account scope: the selected ad account ID that drives sync, reporting, and creation flows.
- Campaign delivery scope: `effective_status` is used for "active" counts and delivery filters, while configured `status` remains visible when it differs.

## Operational Notes

- No database migration is required for this release.
- Existing campaigns will gain the richer Meta metadata after the next sync from Ads Manager.
- Existing campaigns will gain local `FacebookAdset` and lightweight `FacebookAd` children after the next sync from Ads Manager, scoped to the selected ad account.
- Locally created campaigns have configured/effective status seeded from their creation status until Meta sync refreshes them.
- If Meta omits Business fields due to token permissions, accounts are grouped under "Business not visible" while still preserving ad account isolation.
- If Meta denies ad set/ad creative fields, campaign sync still succeeds and returns `structureSyncWarnings` so operators can see that campaign-level data is fresh but deeper structure may be partial.
- Campaign detail loading is intentionally independent from the report date-range variables; the date filter belongs to `/campaigns/:campaignId/insights`, not `/campaigns/:id`.
- Meta carousel ads should still be kept reasonably small. When a product has more images than one carousel should carry, create multiple paused carousel ads inside the same ad set so the budget remains consolidated while all product angles are available for creative testing.
- If Meta rejects campaign creation with subcode `4834011`, verify that non-CBO payloads include `is_adset_budget_sharing_enabled` before retrying.
- If Meta rejects non-CBO campaign creation with subcode `1885737`, verify that `bid_strategy` is not being sent on the campaign payload unless CBO/campaign budget is enabled.
