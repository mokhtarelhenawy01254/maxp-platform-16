# Production Release - 2026-04-28 - Facebook Ads Activation + Meta API v24

## Scope

- Backend Facebook Ads controllers and services
- Facebook OAuth callback routing
- Frontend Facebook Ads create-campaign / create-ad flows
- Meta Business SDK dependency refresh

## What changed

### 1. Meta SDK and Graph API version alignment

- Updated `facebook-nodejs-business-sdk` from `^22.0.0` to `^24.0.1`
- Normalized direct Graph API usage to `v24.0` across the Facebook Ads, OAuth, CAPI, catalog, audience, and related helper services

### 2. Local and production-safe Facebook OAuth callback handling

- Replaced hardcoded callback defaults with `envConfig.backendUrl` / `envConfig.frontendUrl`
- Added explicit callback builders for:
  - page OAuth callback
  - pixel OAuth callback
- Expanded allowed frontend origins to include `127.0.0.1` local variants
- Removed the old development redirect assumption that pointed at `localhost:3000`

### 3. Ad account activation is now part of the real create-ad flow

- The backend no longer depends only on an already-saved active ad account
- Selected remote ad accounts can now be:
  - matched whether they arrive as `123...` or `act_123...`
  - saved locally on demand
  - promoted to the single active account for the company
- Pixels can now be loaded for the explicitly selected ad account
- Full-ad creation now accepts `adAccountId` and activates/hydrates the selected account when needed

### 4. Wizard UX now matches backend requirements

- The create-ad wizard now loads remote ad accounts and saved ad accounts together
- Users can activate the desired ad account inside the wizard before page/pixel-dependent steps
- The create-campaign flow now prefers the active account when one is already known

### 5. Facebook page selection is now diagnosable and safer

- `GET /facebook-ads/pages` now merges:
  - pages visible from the current Meta user token
  - pages already connected to the current company inside Max P
- Each page option now exposes whether it is:
  - ready for use
  - visible in Meta but not linked to the company
  - linked to the company but missing from the current Meta token
- The response now includes page-level diagnostics:
  - company-aware counts
  - granted permissions
  - missing recommended permissions such as `pages_show_list` and `business_management`
  - a primary warning that explains the likely integration gap
- The create-ad wizard now:
  - auto-selects only company-ready pages
  - shows grouped options for ready, unlinked, and unavailable pages
  - surfaces warnings before a user accidentally publishes with an unrelated Facebook page

### 6. Pixel OAuth refreshes Ads/Pixel access only

- Correction applied on 2026-04-29: Pixel OAuth must not write to `facebookUserAccessToken`.
- The pixel OAuth callback writes the newest granted token to:
  - `facebookPixelAccessToken`
  - `facebookAdsAccessToken`
- Page OAuth remains the only flow that writes to `facebookUserAccessToken`.
- This prevents Messenger/page repair from being pinned to an ads-only token after a fresh pixel reconnect
- `GET /facebook-oauth/pixels` now tries the available company Facebook tokens in order instead of failing on one stale field
- If a dedicated pixel token is stale but a newer Ads/Page token is valid, pixel discovery can continue without forcing a false negative reconnect loop

### 7. Ads-only tokens no longer endanger page and messaging flows

- Facebook page discovery inside `GET /facebook-ads/pages` now prefers the company `facebookUserAccessToken`
- Ads endpoints continue to prefer the company `facebookAdsAccessToken`
- This allows an ads-only token to be stored for ad account / pixel work without forcing page lookup onto a token that lacks page permissions
- `FacebookAdsService.getAdAccounts()` now retries with a reduced field set when Meta rejects Business Manager specific fields such as `business`
- Ad account activation now uses a Prisma transaction callback instead of the array form that could fail during `saveAdAccount` on production
- This makes ads-only tokens usable for account discovery even when `business_management` is not granted, while leaving Messenger/page repair logic pinned to the page-capable user token
## Why this release matters

Before this release, the Facebook Ads pages looked operational but could fail in real use because:

- local OAuth callback targets were misaligned with the current ports
- pages/pixels depended on a previously saved active ad account
- the create-ad flow could not reliably activate the chosen account end-to-end
- page selection could silently fall back to a page exposed by Meta that was not actually linked to the current company
- ads-only troubleshooting could accidentally contaminate page discovery if the same token field was reused for both concerns

This release closes those gaps so a real Meta account can be connected and used from the live workflow.

## Verification performed locally

- `backend: npm run check:syntax`
- `backend: npx jest tests/controller/facebookAdsController.facebookPages.test.js tests/services/facebookAdsService.getAdAccounts.test.js --runInBand`
- `frontend: npx eslint src/pages/advertising/CreateAdWizard.tsx src/pages/advertising/CreateCampaign.tsx src/services/facebookAdsService.ts`
- Meta SDK version verified locally after install: `24.0.1`

## Live verification still required after deploy

- Complete Facebook OAuth with a real account
- Confirm ad account list loads in the live UI
- Confirm page list and pixel list resolve for the selected ad account
- Create one real campaign/ad flow in the production environment
