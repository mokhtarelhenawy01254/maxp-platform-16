# Analytics Store Dashboard

## What Changed
- Rebuilt `/analytics/store` as an executive-style dashboard with stronger hierarchy, clearer storytelling, and better RTL/mobile rhythm.
- Replaced the all-or-nothing loading model with partial section recovery so one failed endpoint no longer collapses the whole page.
- Moved fragile product-image parsing out of render-time `JSON.parse(...)` and into safe helpers with tests.
- Separated funnel math from funnel visuals so rates above 100% can be shown honestly without breaking the bar widths.
- Added an explicit data-health layer so the page now warns when purchases or product views exist without recorded visits, instead of quietly showing misleading `0%` conversion.
- Simplified the top of the page by removing one redundant KPI strip and turning the hero summary into three actionable chips: revenue, purchases, and data-health state.
- Added compatibility for legacy top-product payloads that still return `sales` instead of `purchases`.
- Fixed the custom date range flow so `تطبيق الفترة` can read the live date inputs even if React state is one step behind the visible field values.
- Changed the default report window from `آخر 30 يوم` to `اليوم` so the page opens on the most actionable daily view by default.
- Simplified the funnel so `/analytics/store` now reads as `visit -> product view -> started order -> purchase`, while cart additions stay a supporting signal instead of breaking the linear story for quick-order stores.

## Implementation Notes
- Data fetching now uses `Promise.allSettled` in `frontend/src/pages/Analytics/StoreAnalyticsDashboard.tsx`.
- Funnel construction, data-health detection, legacy purchase fallback, and safe product-image parsing live in `frontend/src/pages/Analytics/storeAnalyticsDashboard.utils.ts`.
- Regression coverage lives in `frontend/src/pages/Analytics/__tests__/storeAnalyticsDashboard.utils.test.ts`.
- Custom-range regression coverage now also lives in `frontend/src/pages/Analytics/__tests__/StoreAnalyticsDashboard.test.tsx`.
- The dashboard's initial filter state now boots with period value `1` (`اليوم`) for both the visible selector and the first data fetch.

## Design Direction
- Treat the page as a briefing surface, not a table-first admin report.
- Keep the existing shell palette and typography, but push the page toward a calmer premium look with fewer generic equal-weight cards.
- Show data quality caveats in-context so the UI earns trust instead of pretending every metric is perfectly linear.
- Keep the funnel aligned with the actual storefront journey: cart is important, but it is not mandatory in stores that support direct quick order.
- Prefer explicit "tracking needs review" language over silently converting broken upstream telemetry into neat-looking but false dashboard certainty.

## Follow-Up
- If the team wants stronger interaction polish next, the next safe step is adding a browser pass for spacing/motion tuning on real viewport sizes.
- Full workspace `type-check` is still blocked by existing repo-wide configuration/type issues outside this page, so focused validation remains the practical check for this change set.
