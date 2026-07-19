# Facebook Ads Connection Sources - 2026-05-09

## Context

Merchants can connect Meta Ads from more than one Facebook personal account. The ads OAuth token must stay isolated from Facebook page and Messenger tokens so reconnecting ads never breaks inbox replies.

## Change

- Added `facebook_ads_connection_sources` to store each Facebook account used for Ads OAuth.
- Linked saved ad accounts to `connectionSourceId` so the UI can show which Facebook account provided each ad account.
- Ads OAuth now reads `/me` for the connecting Facebook identity, stores the source, syncs ad accounts, and records sync errors on the source.
- The ads connection status API now returns:
  - connected Facebook account sources
  - source-level Meta API checks
  - saved ad account source attribution
  - page/Messenger protection status
- Added a delete endpoint for disconnecting one ads source without touching page OAuth or Messenger tokens.
- The connection page now has a compact source list, source attribution in the ad-account table, and a source disconnect action.
- The Facebook pages loader now asks Meta for a smaller `/me/accounts` payload and retries with minimal fields if Graph returns "reduce the amount of data"; the AI Builder defaults to any selectable page returned by the backend instead of requiring `READY` only.
- When Meta page discovery hits the known `/me/accounts` payload-size error, the pages API now keeps connected company pages selectable as a stored fallback with a warning, instead of blocking AI Builder page selection.
- Full-ad publishing uses the same stored-page fallback for that specific payload-size error, so a draft selected from the AI Builder does not fail later in the readiness check for the same external Meta issue.
- If the service succeeds only after the reduced 25-page retry, it marks the result as payload-reduced; company-connected stored pages stay selectable and Meta-visible pages that are not connected to the company are shown as diagnostics only.
- The AI Builder now surfaces compact page warnings from the pages API beside the page selector, so fallback or reconnect states are visible before draft generation/publishing.
- Handled Meta payload-size page discovery failures are logged as warnings instead of error-only entries, because the stored-page fallback is now the expected recovery path.

## Safety Notes

- `facebookUserAccessToken` is still only updated by page OAuth.
- Ads OAuth only updates `facebookAdsAccessToken`, source tokens, and synced ad-account tokens.
- Disconnecting a source clears only that source token and the ad-account tokens linked to it.
- If the disconnected source was the company-level ads token, the backend falls back to another connected ads source when available.
- Page loading should not request page access tokens through the Ads UI; Messenger/page OAuth remains the owner of page tokens.
- Stored page fallback is only used for the Meta payload-size failure. If Meta successfully returns no matching connected pages, or if the failure looks like a token/permission problem, the API still marks company-only pages as unavailable so users reconnect the correct Facebook account.
- Full-ad publishing still requires the selected page to be connected to the current company. Meta-visible pages that are not connected to the company are not valid publish choices.

## Files

- `backend/prisma/schema/marketing.prisma`
- `backend/prisma/schema/core.prisma`
- `backend/prisma/schema/migrations/20260509100000_add_facebook_ads_connection_sources/migration.sql`
- `backend/routes/facebookOAuthRoutes.js`
- `backend/routes/facebookAdsRoutes.js`
- `backend/controller/facebookAdsController.js`
- `backend/services/facebookAdsService.js`
- `backend/tests/services/facebookAdsService.pages.test.js`
- `frontend/src/services/facebookAdsService.ts`
- `frontend/src/pages/advertising/FacebookAdsConnection.tsx`
- `frontend/src/pages/advertising/FacebookAdsAiBuilder.tsx`
