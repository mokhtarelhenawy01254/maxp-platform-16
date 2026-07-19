# Facebook Connected Account Feature Documentation

## Overview
This documentation describes the feature that displays which Facebook personal account is currently authenticated for a company on the Facebook OAuth settings page.

## System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Vite Frontend  │ ──────> │  Express Backend │ ──────> │   Meta API   │
│ (FacebookOAuth) │         │  (OAuth status)  │         │   (/me)      │
└─────────────────┘         └──────────────────┘         └──────────────┘
```

1. **Frontend Request**: The `FacebookOAuth.tsx` component calls `/facebook-oauth/status?companyId=...` on mount.
2. **Backend Query**: The backend fetches the `facebookUserAccessToken` stored in the `Company` record.
3. **Meta Graph Request**: If token is present, backend calls Graph API `GET https://graph.facebook.com/v19.0/me?fields=id,name,picture` with the access token.
4. **Response**: If successful, user's `name` and profile `picture` URL are appended to `facebookUser` object in status response.
5. **UI Rendering**: The frontend displays a profile card with the user's avatar and name.

## Code Modifications
- **Backend API**: [facebookOAuthRoutes.js](file:///h:/maxp-platform/apps/backend/routes/facebookOAuthRoutes.js) inside `router.get("/status")`.
- **Frontend Page**: [FacebookOAuth.tsx](file:///h:/maxp-platform/apps/frontend/src/pages/settings/FacebookOAuth.tsx) inside the status check render blocks.
