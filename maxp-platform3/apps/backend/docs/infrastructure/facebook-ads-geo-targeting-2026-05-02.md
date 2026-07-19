# Facebook Ads Geo Targeting Update - 2026-05-02

## Summary

The Facebook Ads creation flow now supports location targeting below country level. Operators can choose either whole-country targeting or detailed Meta geo targets such as Egyptian governorates and cities.

## What Changed

- Added Meta geo-location search support through `/api/v1/facebook-ads/targeting/search` using `type=adgeolocation`, `countryCode`, and `locationTypes`.
- Updated the Meta targeting builder so region/city targeting does not also send the parent country. This prevents Meta's "locations overlap" rejection.
- Added a reusable frontend selector for country vs governorate/city targeting.
- Default detailed geo targeting uses `location_types=["home"]` for stricter local delivery, while country targeting keeps the previous `["home","recent"]` behavior.
- Added `/api/v1/facebook-ads/reports/geo-performance` for account-scoped Meta Insights by `region` or `country`.
- Added a dashboard geo-performance card so media buyers can compare spend, purchases, CPA, ROAS, and CTR by governorate/country without leaving MaxP.
- Added a compatibility route for `/advertising/facebook-ads/create-full-ad` so old saved links still open the full ad wizard instead of dropping operators back on the dashboard.

## Operator Rules

- Use whole-country mode when the store can sell and ship nationally.
- Use governorate/city mode when shipping, stock, or media-buying strategy is local.
- Do not combine `EG` with Cairo, Giza, Alexandria, or other child locations in the same ad set.
- Use reach estimate before launching narrow city targeting when budgets are small.
- Use the geo-performance report after delivery starts; do not split small budgets across many governorates before there is enough data.

## Verification

- Backend unit coverage checks city/region payloads and confirms countries are omitted when local geo targets are present.
- Geo search uses Meta's targeting search endpoint and returns only the data array, not paging URLs or access tokens.
- Backend service coverage checks account-scoped geo Insights requests and the selected breakdown.
- Controller coverage checks that geo rows are aggregated by selected ad account and include derived CPA/ROAS metrics.
