# Facebook Ads v25 and Ad Library Upgrade - 2026-05-08

## Summary

- Centralized Meta Graph API versioning through `backend/config/metaApi.js`.
- Default Facebook Ads, OAuth, Catalog, Audiences, CAPI, and ad upload requests now use Graph/Marketing API `v25.0`.
- Added a dedicated Meta Ad Library / Ads Archive search backend service and route.
- Added a frontend Ad Library research page under `/advertising/facebook-ads/ad-library`.

## Compatibility Notes

- The `facebook-nodejs-business-sdk` npm package remains at `24.0.1` because that is the latest package version currently published on npm.
- Legacy ASC/AAC creation fields are no longer sent by the Advantage+ Shopping flow because Marketing API `v25.0` blocks creating/updating those legacy campaign APIs.
- Async report status now requests and exposes `error_code`, `error_message`, and `error_subcode`.

## Verification Targets

- Backend service tests cover Ads Archive parameter normalization and v25 URL usage.
- Existing Facebook Ads service tests were updated from v24 URL expectations to v25.
- Frontend type checking/build should include the new Ad Library page and routes.
