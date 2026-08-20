# TikTok Integrations (2026-08-13)

Built the official TikTok feature set for MaxP via 5 parallel agents + orchestrator wiring.

## Features shipped

| Feature | Route mount | Backend | Frontend |
|---|---|---|---|
| Content Posting (Direct Post) | `/api/v1/tiktok/publish` | `services/tiktok/tiktokPublishService.js` + `controller/tiktokPublishController.js` | `/tiktok/publish` |
| TikTok Shop (Partner API v2, HMAC-signed) | `/api/v1/tiktok/shop` | `services/tiktok/tiktokShopService.js` | `/tiktok/shop` |
| Login Kit (storefront customer OAuth) | `/api/v1/tiktok/auth` | `controller/tiktokAuthController.js` | button on `CustomerRegister.tsx` |
| Embed / Display API | `/api/v1/tiktok/display` | `services/tiktok/tiktokDisplayService.js` | `TikTokEmbed.tsx` + `TikTokFeedSection` (blueprint section) |
| Events API (pixel) | `/api/v1/tiktok/events` | `services/tiktok/tiktokEventsManager.js` | `TikTokEventsSettingsCard` on `/tiktok/settings` |

## Shared foundation

- `prisma/schema/tiktok.prisma`: `TikTokAccount`, `TikTokSettings`, `TikTokPost`, `TikTokShopAccount`, `TikTokPixelConfig` (scalar companyId refs).
- `services/tiktok/tiktokOAuthService.js`: OAuth token exchange / refresh / user-info helpers used by all features.
- `Customer.tiktokId` added (unique per company) in `products.prisma`.

## Purchase tracking

`publicOrdersRoutes.js` (storefront order creation) fires `tiktokEventsManager.trackPurchaseForCompany(...)` right after the existing Facebook CAPI block ΓÇö best-effort, never throws, respects `TikTokPixelConfig.trackPurchase`, shares the frontend pixel event-id for dedup.

## Configuration

`.env.example` documents (fallbacks; per-company overrides live in `tiktok_settings`):

```
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_REDIRECT_URI=https://<domain>/api/v1/tiktok/auth/callback
TIKTOK_EVENTS_API_ENDPOINT=https://business-api.tiktok.com/open_api/v1.3/event/track/
TIKTOK_EVENTS_ACCESS_TOKEN=...
TIKTOK_EVENTS_PIXEL_ID=...
```

## Security notes

- `tiktokEventsController` strips `accessToken` from all responses.
- Embed `videoId` is URL-encoded.
- Login Kit places the customer JWT in the redirect query string (known limitation; a fragment/POST token-exchange is a follow-up).
- TikTok Shop credentials are user-supplied (appKey/appSecret/accessToken) and stored per company; sanitized on read.
