# Facebook App Config Token Health

## Context

Swan Facebook Pixel, CAPI, Messenger, and Ads tokens were operational, but
production token-health smoke checks using `debug_token` failed because
`FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in `.env` can contain placeholder
values.

The OAuth flow already had a working stored/default app credential path, so the
runtime issue was isolated to code paths that read the placeholder environment
values directly.

## Change

- Added a shared Facebook app config resolver in `backend/config/facebookAppConfig.js`.
- The resolver ignores known placeholder values such as
  `your-production-facebook-app-id` and falls back to the same OAuth app
  credentials used by the Facebook OAuth routes.
- Facebook OAuth routes, Facebook integration diagnostics, and Messenger webhook
  signature verification now use the shared resolver.

## Operational Notes

- This change does not rotate or replace Page, Ads, Pixel, or CAPI access
  tokens.
- Messenger and Ads API calls continue to use their existing stored tokens.
- Token-health diagnostics should no longer misreport valid tokens because of a
  placeholder App ID/Secret in the environment.
