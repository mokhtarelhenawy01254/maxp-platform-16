# Facebook OAuth Token Isolation - 2026-04-29

## Context

Facebook page messaging depends on `Company.facebookUserAccessToken` being a
page-capable OAuth session. Pixel and ads reconnect flows can receive tokens
that are valid for ads or pixel discovery but do not include the merchant's
Messenger pages.

## Fix

- Pixel OAuth updates now write to `facebookPixelAccessToken` and
  `facebookAdsAccessToken` only.
- Ads-only OAuth updates are kept in `facebookAdsAccessToken`.
- Page OAuth remains the only flow that updates `facebookUserAccessToken`.
- Page and Pixel OAuth URLs now include `auth_type=rerequest` so Meta prompts
  again for permissions that were previously declined.

This prevents a Pixel or Ads reconnect from replacing the page OAuth session
used to refresh stale `FacebookPage.pageAccessToken` values.

## Verification

- Added `tests/utils/facebookOAuthTokenFields.test.js`.
- Targeted test command:
  `npx jest tests/utils/facebookOAuthTokenFields.test.js --runInBand`.
