# Facebook Ads Ad Account Token Scope - 2026-05-09

## Context

Sparkle Sneakers creative testing exposed a Meta Graph permission failure while adding ads to an existing ad set. The company-level Facebook tokens can become stale or lose ad-account scope while the selected `FacebookAdAccount.accessToken` remains valid for the ad account.

## Change

- Account-scoped Meta write paths now prefer the stored ad-account token when it is available, falling back to the company ads/user token only when needed.
- The affected paths are campaign creation, full-ad publish, and adding an ad to an existing ad set.
- The `CreateAd` page now calls the frontend service with the required `adSetId` route parameter.

## Verification

- Added controller coverage to assert full-ad publish and existing-ad-set ad creation use the stored ad-account token.
- Aligned the full-ad regression suite with the current flexible creative behavior so deploy checks cover persisted variation payloads instead of expecting rejection.
- Use focused controller tests before deploy:

```bash
npm test -- --runTestsByPath tests/controller/facebookAdsController.fullAd.test.js
```
