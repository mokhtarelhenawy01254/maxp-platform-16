# Facebook Page Sync and Reconnect - 2026-04-30

## Problem

The secure OAuth screen at `/settings/facebook-oauth` and the Facebook settings screen at `/settings/facebook` were not fully synchronized:

- bulk selection did not exist on the OAuth screen
- disconnected pages could not be reconnected directly from the OAuth screen
- OAuth reconnects could leave a page marked as `disconnected` if the stored page token did not change
- changes made on one screen were not reflected immediately on the other open screen/tab

## Backend changes

- `backend/routes/facebookOAuthRoutes.js`
  - added shared page-loading logic so the OAuth status response now includes connected and disconnected pages
  - added `POST /api/v1/facebook-oauth/reconnect`
  - changed bulk disconnect to keep page records and mark them `disconnected` instead of losing reconnect context
  - fixed the OAuth callback background save path so same-company pages are always restored to `connected`, even when the token value is unchanged
  - made live token validation opt-in with `?validateTokens=true` so loading the OAuth page does not block on hundreds of Facebook Graph token checks or mark healthy pages as reconnect-needed because of request timeouts
  - made reconnect restore the saved page to `connected` when a stored token exists, while treating Facebook token validation / webhook subscription failures as warnings instead of blocking the internal reconnect toggle
- `backend/controller/facebookIntegration.js`
  - kept Facebook page records on disconnect instead of deleting them when webhook unsubscribe fails
  - included `disconnectedAt` in page responses and sorted connected pages first

## Frontend changes

- `frontend/src/pages/settings/FacebookOAuth.tsx`
  - added per-row selection and `select all`
  - added bulk disconnect and bulk reconnect actions
  - added reconnect buttons for disconnected / attention-needed pages
  - surfaced disconnected timestamps and reconnect health messages
- `frontend/src/pages/settings/FacebookSettings.tsx`
  - now listens for page-sync events and refreshes automatically
  - shows disconnected timestamps
  - routes disconnected pages toward the secure reconnect screen
  - limits blocked-customer page selection to currently connected pages
- `frontend/src/utils/facebookPageSync.ts`
  - new small sync utility using `CustomEvent` + `localStorage` so separate tabs/screens update each other immediately

## Verification

- `node --check backend/routes/facebookOAuthRoutes.js`
- `node --check backend/controller/facebookIntegration.js`
- `npx esbuild frontend/src/pages/settings/FacebookOAuth.tsx --bundle --platform=browser --format=esm`
- `npx esbuild frontend/src/pages/settings/FacebookSettings.tsx --bundle --platform=browser --format=esm`
- `npx esbuild frontend/src/utils/facebookPageSync.ts --bundle --platform=browser --format=esm`
- `npm run build` in `frontend/`
- authenticated production smoke test using temporary Facebook page records, then cleanup
- authenticated production browser smoke test for select all, page reconnect, and `/settings/facebook` refresh behavior
- follow-up production reconnect test against a real previously failing disconnected page returned `success: true`, `reconnectedCount: 1`, and a Facebook permission warning; the page was restored to its original state after the test to avoid changing customer data without explicit approval

## Operational notes

- Normal OAuth status reads saved state only. Use `?validateTokens=true` only for diagnostics because companies can have hundreds of pages and live Facebook validation can be slow.
- A reconnect warning means MaxP restored the saved page state, but Facebook may still need fresh page permissions before webhook subscription or token validation is fully healthy.
