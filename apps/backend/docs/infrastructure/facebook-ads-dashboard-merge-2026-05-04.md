# Facebook Ads Dashboard Merge - 2026-05-04

## Scope

The Facebook Ads dashboard and decision reports are now one production surface:

- `/advertising/facebook-ads` is the canonical route.
- `/advertising/facebook-ads?view=diagnosis` opens the campaign diagnosis mode.
- `/advertising/facebook-ads/decision-reports` redirects to the canonical dashboard with diagnosis mode enabled and requests the active-only delivery filter once.

## UX Notes

- The module nav no longer includes a separate decision reports item because the reporting workflow lives inside the dashboard.
- The dashboard has two compact modes: campaign operations and campaign diagnosis.
- Diagnosis mode keeps age/gender, placement/platform, and an additional selected breakdown inside each campaign row.
- The delivery filter label for active delivery is `النشط فقط`; the legacy reports route applies it once, then removes the temporary URL hint so later user filter changes can persist normally.
- Campaign creation remains visible from the compact header.
- The global sidebar no longer links to the legacy reports route; only the redirect route remains for old bookmarks.
- Diagnosis breakdown requests retry once on transient 502/503/504 responses because production Meta reporting calls can briefly fail under parallel load.

## Verification

Release verification should cover:

- The old reports route redirects to `/advertising/facebook-ads?view=diagnosis`.
- The diagnosis toggle, campaigns toggle, create-campaign action, active-only filter, age/gender label, and placement label render on the canonical page.
- Production Swan data loads without console errors and keeps the selected account/date/filter state.
- A user-changed delivery filter survives page reloads and is not overwritten after the legacy one-time redirect hint is consumed.
