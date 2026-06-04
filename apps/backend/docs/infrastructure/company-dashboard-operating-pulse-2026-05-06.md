# Company Dashboard Operating Pulse - 2026-05-06

## Summary

`/company-dashboard` now prioritizes the current operating state instead of opening with a large completion banner and horizontal KPI rail.

## Behavior

- The completed activation state no longer renders a ready-to-operate strip; once all launch checks are complete, the dashboard moves directly into operating metrics.
- The date range toolbar sits below the onboarding and activation context so filters feel attached to the reporting surface.
- A new operating pulse panel summarizes what needs attention now:
  - open orders
  - new customer and conversation activity
  - cancelled and returned orders only when there is a non-zero issue count
- The operating pulse CTA opens `/orders`.
- Business KPI cards use the existing `BusinessMetricsStrip` grid mode on mobile instead of a horizontal overflow rail.
- Dashboard density was tightened with a moderate compact size: page padding, panel padding, toolbar controls, operating pulse cards, and KPI cards are shorter without becoming micro-sized.
- Empty top-product content is omitted until there is real product data to show.
- Repeated period text was removed from the date toolbar; the selected range is shown by the control itself.
- Repeated period text was also removed from the operating pulse header; the toolbar is the single period indicator.

## UI Scope

- Page-level overflow is constrained to prevent sideways scrolling from dashboard cards.
- Dashboard KPI cards are slightly denser so Arabic labels and values fit better in the current app viewport.
- The new panel uses existing dashboard API fields: `orderHealth` and `recentActivity`.
- Metric subtitles are hidden in this dashboard context so the cards focus on the title and value only.
- Operating pulse cards avoid repeating KPI metrics; they focus on action-oriented signals such as open orders, new activity, and non-zero issues.

## Verification

- Verified the current local page in the in-app browser at `http://127.0.0.1:3000/company-dashboard` after logging in with the saved local development account.
- Checked Arabic layout in the app browser: the date filters, operating pulse panel, and KPI grid render without horizontal scrolling in the visible viewport.
- Rechecked after removing the completed activation strip: the `4/4` ready banner is gone while the date range toolbar and operating pulse panel remain visible.
- Ran focused frontend lint for `CompanyDashboard.tsx`; it completed without errors, with existing unrelated hook dependency warnings elsewhere in `src`.
- Ran a focused diff whitespace check for the touched dashboard files.

## Residual Note

During browser reload, the local backend still logged API/socket failures unrelated to the visual dashboard pass. The dashboard rendered from available client state, but backend health should be checked separately if live data stops updating.
