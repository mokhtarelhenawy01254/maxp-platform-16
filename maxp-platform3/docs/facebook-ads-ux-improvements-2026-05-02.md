# Facebook Ads UX Improvements - 2026-05-02

## What changed

- Reworked the Facebook Ads dashboard from a raw campaign list into a decision cockpit.
- Added scoped campaign search, status filtering, objective filtering, sorting, and progressive loading.
- Added decision metrics: active campaigns, active daily budget, sales campaigns, and campaigns needing review.
- Added safer campaign actions with explicit confirmation for pause/resume and typed confirmation for delete.
- Improved the reports page with a date-range control, campaign sorting by spend/ROAS/purchases/CPA/CTR, zero-row hiding, and media-buyer summary cards.
- Kept CSV async reports visible after creation instead of clearing the local report run list during summary refresh.
- Added accessible labels and richer option text to the ad-account selector.
- Fixed the ad wizard budget currency display to use the selected ad account currency instead of hard-coded USD/$.
- Redirected successful full-ad creation back to the dashboard with the selected `adAccountId` preserved.

## Verification

- `npm exec eslint -- src/pages/advertising/FacebookAdsDashboard.tsx src/pages/advertising/AsyncReports.tsx src/components/advertising/FacebookAdsAccountContextPanel.tsx src/pages/advertising/CreateAdWizard.tsx --ext .ts,.tsx`
- `npm --prefix frontend run build`

## Known project-level caveats

- Full `tsc --noEmit` still fails because of existing unrelated TypeScript debt across the app, especially API response typing, WhatsApp/Inbox components, missing homepage registry imports, and web-vitals API changes.
- Vite production build succeeds, but still prints existing warnings about Windows minification defaults, unresolved Geist font file references, and a circular vendor chunk.
- The temporary untracked file `tmp-adaccounts-response.network-response` remains untouched.

## Recommended next UX iteration

- Add real pagination or virtualization if campaign counts continue to grow past hundreds.
- Add campaign detail drill-down for ad sets and ads with the same account-scoped guardrails.
- Add configurable benchmark thresholds for CPA, ROAS, CTR, and frequency per product/category.
- Add action recommendations that explain why to scale, pause, or test creative variants.
- Add visual trend charts for spend, purchases, CPA, ROAS, and frequency over the selected period.
- Add a non-destructive action queue for pause/resume/delete so operators can review multiple changes before applying.
