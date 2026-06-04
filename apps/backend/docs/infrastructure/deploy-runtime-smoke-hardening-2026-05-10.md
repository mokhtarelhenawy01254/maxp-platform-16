# Deploy Runtime Smoke Hardening

Date: 2026-05-10

## Incident

One production deploy reported `Nginx storefront HTML returned HTTP 502` while the backend had just reloaded. Fresh production checks immediately after the run showed PM2 online, backend health OK, and the public storefront domains returning HTTP 200, so the failure was consistent with a short reload window during the Nginx storefront smoke.

The same window also logged stale frontend chunk errors on `/company-assistant/chat`:

`TypeError: $.listWebChatSessions is not a function`

The deployed frontend service chunk already contained `listWebChatSessions`, so this was treated as an old browser/runtime asset mismatch rather than a missing production API.

## Fix

- The production deploy workflow now retries backend and Nginx storefront HTML smoke checks up to six times before failing, with a five second pause between attempts.
- The Company Assistant chat page now verifies the expected web-chat service methods before polling. If a stale chunk is missing the web-chat API, the page performs one session-scoped refresh instead of repeatedly logging the same frontend error.

## Verification

Expected checks after deployment:

- `/api/v1/health` on the active PM2 port returns 200.
- `https://maxp.online/`, `https://swan.maxp.online/`, and `https://antigravity-test.maxp.online/` return 200.
- Current `CompanyAssistantChat` and `companyAssistantService` assets both include the web-chat session methods.
