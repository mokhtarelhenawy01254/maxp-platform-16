# Facebook Ads Isolated Connection - 2026-05-09

## Summary

Facebook Ads now has a dedicated connection surface at
`/advertising/facebook-ads/connection`.

The new flow starts from `/api/v1/facebook-oauth/ads-authorize`, stores the Ads
OAuth token in `Company.facebookAdsAccessToken`, and syncs accessible ad
accounts into `FacebookAdAccount.accessToken`.

## Isolation Rules

- Ads reconnects do not update `Company.facebookUserAccessToken`.
- Ads reconnects do not update `FacebookPage.pageAccessToken`.
- Messenger/page replies continue to use the stored page token.
- Ads write/read tools can inspect the new connection status through
  `/api/v1/facebook-ads/connection/status` without exposing token values.
- AI Builder pixel discovery can use the saved `FacebookAdAccount.accessToken`
  when the company-level Ads token is missing, so isolated account tokens unlock
  both account selection and pixel selection.

## Verification Scope

- The frontend route is mounted in the Facebook Ads module navigation.
- The backend status payload reports token presence and saved account health
  without returning raw access tokens.
- The OAuth state is signed before leaving the app, callbacks reject unsigned or
  forged Ads states before token exchange, and only manager/admin roles can
  start the isolated Ads OAuth flow.
