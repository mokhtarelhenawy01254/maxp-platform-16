# Facebook Ads Report Builder UI - 2026-05-08

## Scope

- Replaced the `/advertising/facebook-ads/decision-reports` redirect with a real frontend report builder.
- The page lets operators choose ad account, report mode, Meta Insights level, date preset or custom date range, fields, and breakdowns.
- Async mode uses the existing frontend service methods:
  - `facebookAdsService.createAsyncReport`
  - `facebookAdsService.getAsyncReportStatus`
  - `facebookAdsService.getAsyncReportResults`
- Sync preview mode uses the existing `getPerformanceBreakdownReport` frontend method and the existing backend `performance-breakdown` contract.

## Behavior Notes

- Async runs show report run ID, Meta job status, percent completion, row count, table results, and CSV export.
- The status panel explicitly surfaces Meta Marketing API v25 async error fields: `error_code`, `error_message`, and `error_subcode`.
- Sync preview remains intentionally narrower than async reports because the current backend sync endpoint accepts one supported breakdown and a custom `startDate` / `endDate` range.

## Backend Changes

None. The UI only consumes existing routes and service methods.

## Remaining Backend Opportunities

- Add a generic synchronous Insights endpoint that accepts the same `level`, `fields`, `date_preset`, `time_range`, and `breakdowns` payload as async reports.
- Add pagination support for async results beyond the current backend result limit.
- Persist report runs server-side so history survives browser refresh and can be audited.
