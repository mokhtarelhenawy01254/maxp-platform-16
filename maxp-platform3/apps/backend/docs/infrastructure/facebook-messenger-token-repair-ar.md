# Facebook Messenger Token Repair

## Summary

- Incident date: `2026-04-25`
- Affected page: `Swan EG` (`376103368924946`)
- Symptom: Core AI recognized the product correctly from the customer image, saved the generated text/images to the local conversation, but Facebook never delivered the reply to the customer.

## What actually failed

- The first failure happened on the primary text reply, before any catalog image attachment was sent.
- Facebook returned OAuth `190` with the message that the app must be granted `pages_messaging` or related page permissions before impersonating the page.
- The old implementation then kept trying direct-upload + URL-send for every product image, producing a long cascade of identical failures.

## Root cause

- The stored `facebookPage.pageAccessToken` for `Swan EG` was no longer valid for Messenger send operations.
- Core AI reused that stale token directly inside `deliverResponse`.
- Because the failure was labeled as `INVALID_ACCESS_TOKEN`, the logs hid the more specific reality: the page token no longer had the required page/Messenger permissions.

## Code changes

### `backend/utils/production-facebook-fix.js`

- Added explicit classification for Facebook's "impersonating a user's page" OAuth `190` responses:
  - `PAGE_MESSAGING_PERMISSION_MISSING`
- Direct media upload now stops immediately on that terminal permission error instead of retrying URL send with the same broken token.

### `backend/services/CoreAIAgent.js`

- Core AI now records failed Facebook delivery metadata on the saved AI message:
  - `sentToFacebook: false`
  - `facebookSendError`
  - `facebookSendErrorMessage`
- If the primary text reply fails, Core AI skips the image-attachment loop entirely.
- If an image send fails after text delivery, the image message is marked with failure metadata and the loop stops after the first failed attachment.

## Operational note

- This code fix prevents noisy failure cascades and makes the root cause visible immediately.
- A separate operational repair may still be required whenever a page token itself becomes stale or loses Messenger permissions:
  - refresh the page token from a valid Facebook OAuth session that can access the page
  - or reconnect the page from the correct Facebook account
