# Facebook OAuth Settings Sync Fallback - 2026-05-03

## Problem

`/settings/facebook-oauth` and `/settings/facebook` were reading Facebook page state from different endpoints. OAuth reconnect/disconnect actions updated the saved Facebook page rows correctly, but the Messenger settings screen could still show `0` pages.

In production, `/api/v1/integrations/facebook/connected` returned `403` because the `crm-basic` app subscription was expired. The OAuth screen continued to work because it reads `/api/v1/facebook-oauth/status`.

## Fix

- `frontend/src/pages/settings/FacebookSettings.tsx` still tries `/integrations/facebook/connected` first.
- If that request fails or returns an unsuccessful payload, the screen now falls back to `/facebook-oauth/status`.
- OAuth page payloads are normalized into the settings screen row model so connected and disconnected pages render consistently.
- Successful fallback loads clear stale error and retry state.
- The touched API calls now use explicit response types instead of `unknown` response data.

## Production Verification

- Built frontend successfully with `npm run build`.
- Focused TypeScript check for `FacebookSettings.tsx` returned no file-specific errors.
- Verified in browser on `https://maxp.online/settings/facebook-oauth`:
  - `MAX-P` reconnected successfully.
  - The page showed `MAX-P` as `متصل`.
- Verified in browser on `https://maxp.online/settings/facebook`:
  - The page showed `4` Facebook rows.
  - `MAX-P` appeared as connected after reconnect.
- Verified OAuth disconnect from `/settings/facebook-oauth`:
  - `MAX-P` changed to `غير متصل`.
  - `/settings/facebook` reflected the disconnected state and showed the `إعادة الربط` action.
- Restored the test page row timestamps in the production database after QA.
- Production backend health check returned `OK`.

## Known Constraint

The full frontend `npm run type-check` still fails due to pre-existing repo-wide TypeScript debt unrelated to this fix, especially `companyAwareApi`/API response typing in other screens. The changed file itself has no focused TypeScript errors.

## 2026-05-04 Production Reconnect Regression

After the product/WhatsApp/Turbo source-sync deploy, the Facebook reconnect button stopped appearing for some pages that were still eligible to refresh their Facebook token.

Root cause: the working production behavior depended on a local `FacebookOAuth.tsx` condition that had not been included in the previous commit. The GitHub deploy rebuilt the page from `main`, where reconnect still required `status !== "connected"` or `needsReconnect`.

The backend status contract already exposes `canReconnect`. The UI now uses that field as the display and bulk-action gate:

- selected reconnectable pages: `page.canReconnect !== false`
- row reconnect button: `page.canReconnect !== false`

This keeps reconnect available for connected pages when the backend says the reconnect flow is allowed, and only hides it when the backend explicitly sends `canReconnect: false`.
