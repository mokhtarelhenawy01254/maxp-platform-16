# Facebook Ads Dashboard Media Buyer Audit - 2026-05-01

## Production Snapshot

- Synced Meta ad account: `swan` / `1120545302307751`
- Local ad account row: `cmoml598y0bw6julrbqv0oyzv`
- Synced campaigns: `339`
- Campaigns with Meta performance rows in current summary: `47`
- Campaigns without Meta performance rows in current summary: `292`
- Current summary totals:
  - Spend: `276,263.02 EGP`
  - Impressions: `5,638,757`
  - Clicks: `142,991`
  - CTR: `2.54%`
  - CPC: `1.93 EGP`
  - Meta purchases: `2,084`
  - Meta purchase value: `1,219,526.75 EGP`
  - Meta ROAS: `4.41x`

## Internal Attribution Snapshot - Last 30 Days

- Total orders: `492`
- Tracked orders: `294`
- Campaign-tagged orders: `277`
- Unattributed orders: `198`
- Tracking coverage: `59.76%`
- Total order revenue: `310,492 EGP`
- Delivered revenue currently reported: `0 EGP`
- Cancelled orders: `66`

## Current Strengths

- The app can now import existing Ads Manager campaigns from the active Swan ad account, not just campaigns created from MaxP.
- Campaign list and performance summary endpoints are expected to stay scoped to the active/requested ad account. This prevents multi-account tenants from mixing Swan results with campaigns imported from other ad accounts.
- The reports page is available in the advertising sidebar and has a manual sync action.
- Campaign-level Meta insights are shown with spend, impressions, clicks, CTR, CPC, purchases, purchase value, and ROAS.
- MaxP already has a separate order attribution analytics page that reads `metadata.attribution` and can group orders by source, campaign ID, ad set ID, and ad ID.

## Current Weaknesses

- Campaign sync imports campaign records only. It does not yet import the full tree: campaign -> ad set -> ad -> creative.
- The Facebook Ads reports dashboard is campaign-level only. It cannot yet rank ad sets, ads, creatives, placements, devices, age, gender, or daily trend.
- Meta performance and MaxP order revenue are not joined in one dashboard, so a media buyer cannot see true net performance after cancellations, returns, delivery rate, and actual order value.
- About 40% of recent orders are unattributed, which weakens scaling decisions.
- Delivered revenue is currently `0` in the attribution report, so delivery/status mapping needs validation before using delivered revenue as the main profit KPI.
- Async reports are not persisted. Report runs appear only in the current browser state after creation, and results are fetched with a single page limit.
- Recommendations are rule-of-thumb only and not tied to account targets, break-even ROAS, gross margin, inventory, or product availability.
- There is no background sync job, so manual sync can become slow as the account grows.

## Target Dashboard For Scaling Decisions

### Executive Summary

- Spend, revenue, delivered revenue, gross profit estimate, MER, ROAS, CPA, AOV, conversion rate.
- Orders split by pending, confirmed, delivered, cancelled, returned.
- Tracking coverage and unattributed order share.
- Daily trend for spend, purchases, revenue, CPA, ROAS, delivery rate.

### Campaign Table

- Campaign name, status, objective, budget, budget level CBO/ABO, spend, impressions, CPM, clicks, CTR, CPC, link clicks, landing page views, purchases, CPA, purchase value, ROAS.
- MaxP orders, confirmed orders, delivered orders, cancelled orders, returned orders, delivered revenue, estimated profit.
- Decision badge: Scale, Watch, Reduce, Pause, Fix Tracking.

### Drilldown Views

- Campaign -> Ad Set -> Ad -> Creative tree.
- Ad set level: audience, placements, optimization goal, attribution setting, budget, learning status if available.
- Ad level: creative preview, primary text, headline, CTA, URL, product, thumbnail, spend, CTR, hook rate/video metrics, CPA, ROAS.
- Creative fatigue: frequency, CTR trend, CPM trend, CPA trend, days since launch.

### Breakdowns

- Platform: Facebook, Instagram, Audience Network, Messenger.
- Placement: Feed, Stories, Reels, Marketplace, Search, etc.
- Device platform.
- Age and gender.
- Region/city when available.
- Product/landing page.

### Media Buyer Actions

- Increase budget by controlled percentage on winners.
- Reduce budget or pause losers.
- Duplicate winner into a test campaign/ad set.
- Create new creative test from winning product.
- Add note and action history per campaign/ad/ad set.
- Export CSV and schedule daily report.

## Recommended Next Phases

1. Import the full Meta ads tree for the active ad account: campaigns, ad sets, ads, creatives.
2. Pull daily insights at campaign/adset/ad level with pagination and persist them locally.
3. Join Meta spend with MaxP order attribution by campaign/adset/ad IDs and UTM values.
4. Fix attribution coverage by standardizing URL parameters on created ads and detecting `fbclid`.
5. Validate order status mapping so delivered revenue and return/cancel rates are reliable.
6. Build a media buyer dashboard with scaling labels, drilldowns, breakdowns, and trend charts.
7. Add background sync jobs and cached report snapshots instead of relying on manual sync.
8. Add target settings per company: break-even ROAS, gross margin, acceptable CPA, minimum sample size, and scale/pause thresholds.

## Meta References

- Meta official Postman Marketing API workspace: https://www.postman.com/meta/facebook-marketing-api/overview
- Meta official Postman Insights API folder: https://www.postman.com/meta/facebook-marketing-api/folder/zzd6d5p/insights-api
- Meta Conversions API overview: https://www.facebook.com/business/help/AboutConversionsAPI
