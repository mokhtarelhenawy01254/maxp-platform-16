# Facebook Ads Tool Routes And Bulk Status - 2026-05-08

## Scope

Worker D exposed backend routes for Meta Ads capabilities that were already implemented in `facebookAdsController.js` / `facebookAdsService.js` but were not reachable from REST:

- `GET /api/v1/facebook-ads/ads/:adId/recommendations`
- `POST /api/v1/facebook-ads/ads/:adId/recommendations/apply`
- `GET /api/v1/facebook-ads/ads/:adId/quality-metrics`
- `POST /api/v1/facebook-ads/creatives/instagram-reels`
- `POST /api/v1/facebook-ads/ads/whatsapp`

All routes still run behind `requireAuth` and resolve the calling user's company Meta token and active ad account through the existing controller helpers.

The production verification pass corrected the v25 Meta calls behind two of those routes:

- Recommendations now validate the existing ad through the ad account `ads` endpoint with `execution_options: ["validate_only", "include_recommendations"]`; the old `/:ad_id/recommendations` edge is not readable on v25.
- Quality/relevance diagnostics now read `quality_ranking`, `engagement_rate_ranking`, and `conversion_rate_ranking` from `/:ad_id/insights`; these are insight fields, not ad-node fields.

## Bulk Ops Guardrail

Added `POST /api/v1/facebook-ads/bulk/status` for conservative batch status transitions only.

Supported payload:

```json
{
  "entityType": "campaign | adset | ad",
  "ids": ["local-record-id"],
  "action": "pause | resume"
}
```

The endpoint also accepts `status: "PAUSED"` or `status: "ACTIVE"`. It deduplicates local IDs, caps each request at 50 records, checks company ownership, calls Meta before updating local records for synced entities, and returns per-item results with `207` when any item fails.

Bulk delete is intentionally rejected. Single-item delete routes still exist, but there is no public batch deletion route in this pass.

## Verification

Focused tests cover:

- REST route registration for recommendations, quality metrics, Reels creative, WhatsApp ads, and bulk status.
- Bulk status controller safety: synced ad status updates call Meta first, bulk delete is rejected, and Meta failures do not update local rows.
- `FacebookAdsService.updateAd` maps status changes to the Meta ad node.
- Recommendation validation uses `validate_only` / `include_recommendations` without creating a duplicate ad.
- Quality metrics are fetched from insights with a `last_30d` window.
