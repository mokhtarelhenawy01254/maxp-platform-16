# Landing Pages Bundle Integration

## Overview

Super admin landing pages (`/lp/*`) can now be linked to marketplace bundles. The super admin UI at `/super-admin/landing-pages` allows selecting a bundle and activation type per page.

## Database

The `lp_pages` table (raw SQL, not Prisma) has two new columns:
- `bundleSlug` TEXT (nullable) — references `app_bundles.slug`
- `activationType` TEXT (default `'both'`) — `'free'`, `'paid'`, or `'both'`

## Public API

`GET /api/v1/public/lp-pages/:slug` — returns LP page data + resolved bundle from catalog:

```json
{
  "id": "...",
  "slug": "messaging",
  "title": "Messaging",
  "bundleSlug": "messaging-bundle",
  "activationType": "both",
  "bundle": {
    "slug": "messaging-bundle",
    "name": "Messaging Bundle",
    "monthlyPrice": 999,
    "discount": 69,
    "appSlugs": ["unified-inbox", "ai-chat-basic", "whatsapp-business"]
  }
}
```

## Activation Endpoints

### Free Activation
`POST /api/v1/platform-subscription/lp-activate` (auth required)
- Body: `{ bundleSlug: "messaging-bundle" }`
- Creates/upserts PlatformSubscription as ACTIVE
- Installs bundle apps as CompanyApp records
- Returns `{ success: true, data: { trialDays: 7 } }`

### Paid Checkout
`POST /api/v1/platform-subscription/lp-checkout` (auth required)
- Body: `{ bundleSlug: "messaging-bundle" }`
- Creates billing history record (PENDING)
- Creates Kashier payment session
- Returns `{ success: true, data: { sessionUrl: "...", billingId: "..." } }`
- On webhook success, bundle apps are installed

## Auto-Created Default Agent

After any free bundle activation (lp-activate, messaging-checkout, or marketplace bundle subscribe), a default agent is automatically spawned via `POST /admin/agents/spawn` for the company. This is non-blocking — failure to create the agent does not prevent activation.

The template used is configurable via `SystemSettings` (`systemName='defaultAgentTemplate'` → `config.templateSlug`). Falls back to `support-agent`. Set from `/super-admin/ai-templates`.

Affected endpoints:
- `POST /api/v1/platform-subscription/messaging-checkout` — `messagingCheckout()`
- `POST /api/v1/platform-subscription/lp-activate` — `lpActivate()`
- `POST /api/v1/marketplace/bundles/ai-inbox-bundle/subscribe` — `subscribeToBundle()`

Super admin API:
- `GET /api/v1/super-admin/agents/default-template` — returns current `{ templateSlug }`
- `PUT /api/v1/super-admin/agents/default-template` — set with `{ templateSlug }`

## Frontend

- `MessagingLanding.tsx` and `AiInboxLanding.tsx` fetch `GET /api/v1/public/lp-pages/:slug` on mount
- Display buttons based on activationType:
  - `free`: "جرب مجانا" button → calls lp-activate
  - `paid`: "اشترك ب X ج.م" button → calls lp-checkout
  - `both`: shows both buttons
- Unauthenticated users are redirected to `/auth/register` with return URL
