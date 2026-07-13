# Swan Pixel Purchase Tracking Fix - 2026-05-06

## Context

Swan reported ad spend with weak purchase visibility. A live checkout test on
`https://swan.maxp.online` confirmed that the browser pixel is loading and the
checkout flow can send PageView, ViewContent, InitiateCheckout, and Purchase
requests to Meta.

The diagnostic test orders were `ORD-855345-259` and `ORD-715395-566`. They
were moved to trash after verification, and the deducted product/variant stock
was restored.

## Findings

- Swan storefront settings have `facebookPixelEnabled=true` and pixel id
  `1989842325284174`.
- Swan's Conversions API is currently disabled and not configured.
- Meta live insights for ad account `1120545302307751` do include purchase
  actions for May 2026, while the local stored `facebook_ad_insights` rows are
  stale.
- Meta's browser validator rejects `currency: "EGP"` for standard Purchase
  monetary payloads. A post-deploy browser test showed that switching EGP to
  `fbq("track", "Purchase", ...)` without monetary fields does not produce a
  visible Purchase request either.
- The previous `fbq("trackCustom", "Purchase", ...)` path does produce a
  browser request carrying Swan's value/currency. That is the safest Pixel-only
  path until Swan has server-side CAPI configured.
- The public storefront settings response included CAPI token/test-code fields.
  Swan's token value was empty, but those fields should never be exposed through
  a public endpoint.

## Fix

- Browser Purchase events use standard `fbq("track", "Purchase", ...)` only for
  currencies accepted by Meta's browser validator.
- For EGP and other browser-rejected currencies, the frontend keeps
  `fbq("trackCustom", "Purchase", ...)` so Pixel-only tracking still dispatches
  the request with value/currency.
- Product ids, contents, item count, content type, value, currency, and event
  deduplication id are preserved.
- Public storefront settings no longer expose `facebookConvApiToken` or
  `facebookConvApiTestCode`.

## Follow-up

- Enable CAPI for Swan with a valid server-side token so Meta receives a
  canonical standard Purchase with EGP value/currency and the same event id.
- Refresh or repair the local Meta insights sync for account
  `1120545302307751`; production Meta API data is current, but local stored
  insights were last populated around `2026-04-05`.
