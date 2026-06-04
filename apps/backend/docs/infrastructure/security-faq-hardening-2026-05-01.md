# Security and FAQ Hardening - 2026-05-01

## Summary

This release hardens authentication, webhook verification, WhatsApp automation access, and public FAQ rendering. It closes the security review findings around unauthenticated WhatsApp send/debug endpoints, JWT verification fallback behavior, unsigned webhook payloads, unsafe JWT secret fallback, and stored FAQ HTML rendering.

## Backend Changes

- JWT signing and verification now fail closed when `JWT_SECRET` is missing instead of silently falling back to a built-in secret.
- WhatsApp automation and debug routes now require authenticated access through the global security middleware.
- Invalid JWTs on WhatsApp automation paths are rejected instead of being accepted through `jwt.decode`.
- Facebook and WhatsApp Meta webhook handlers now verify request signatures and fail closed when signatures or app secrets are missing.
- Raw request body capture was added where needed so webhook signature verification can validate the exact payload bytes.
- FAQ public routes remain accessible without login, while admin FAQ mutation paths still require protected access.

## Frontend Changes

- Public FAQ answers are sanitized before being rendered so stored scripts, event handlers, and unsafe markup cannot execute in the browser.
- FAQ rendering preserves normal formatting such as line breaks after sanitization.
- The FAQ route remains available to public users.

## Verification

- Full backend Jest suite passed locally before the original release commit: 83 suites, 457 tests.
- Full frontend Jest suite passed locally before the original release commit: 34 suites, 106 tests.
- Frontend production build passed locally before the original release commit.
- After rebasing onto the latest `origin/main`, focused backend regression tests passed:
  - `tests/auth/globalSecurity.whatsappAccess.test.js`
  - `tests/auth/globalSecurity.publicSupportFaq.test.js`
  - `tests/utils/jwtSecret.test.js`
  - `tests/utils/webhookSignature.test.js`
- Focused frontend FAQ sanitization test passed:
  - `src/pages/support/__tests__/faqHtml.test.ts`

## Operational Notes

- Production deploys should still confirm PM2 health for `maxp-backend` and `maxp-webhook-worker`.
- Fresh production logs should be checked after deploy for JWT secret, webhook signature, FAQ, and WhatsApp route errors.
- If webhook signature checks reject legitimate Meta traffic, verify that the production Meta app secret environment variables are configured correctly before relaxing any validation.
