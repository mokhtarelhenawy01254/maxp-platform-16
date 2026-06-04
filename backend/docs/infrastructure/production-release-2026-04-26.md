# Production Release Notes - 2026-04-26

## Scope

This release bundles the current storefront expansion work together with the in-progress WhatsApp admin workspace refresh and the supporting backend API changes required by those surfaces.

## Storefront platform changes

- Expanded the storefront theme library with new marketplace-ready theme families and preview assets, including the current reference-driven work for `perfume-eg`, `style-store-eg`, `rose-boutique-eg`, `vela-fashion-eg`, and the `Elessi` pack.
- Hardened the storefront shell and shared sections so theme-specific headers, footers, mobile docks, PDP layouts, cart/checkout states, and thank-you flows no longer collapse back to the same generic presentation.
- Added wider preview data coverage and regression checks around marketplace previews, preview orders, sample data, registry wiring, and theme resolution.
- Added the storefront centering audit entrypoint so ultra-wide layout drift can be rechecked quickly before future releases.

## WhatsApp admin workspace changes

- Added new super-admin WhatsApp pages for overview, companies, company analytics, notifications, settings, logs, workspace, and automations.
- Added backend admin WhatsApp controller/router wiring to support the new super-admin surfaces.
- Continued the shared WhatsApp workspace migration so analytics, notifications, settings, and shell-level navigation stay aligned with the new admin experience.

## Supporting backend/runtime changes

- Extended public/storefront and subscription-related backend flows across auth, membership, billing, public customer routes, store pages, and platform subscription handling.
- Updated Prisma enums/schema fragments required by the latest marketing and subscription behavior.
- Kept the public analytics security allow-list in sync so storefront/public tracking endpoints continue to work after deploy.
- Fixed daily storefront analytics fallback so guest-order purchases are not dropped when day-range bucketing crosses local day or DST boundaries.
- Updated the storefront validation workflow and marketplace/frontend integration points to reflect the current release surface.

## Release checks expected for this batch

- Frontend: type-check, targeted storefront tests, and production build.
- Backend: syntax validation plus template validation for storefront-related changes.
- Deployment follow-up: watch `Deploy to Server`, then verify `maxp-backend` and `maxp-webhook-worker` on the production VPS and inspect the fresh PM2/file logs.
