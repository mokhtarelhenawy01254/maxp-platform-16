# KHEMET Home Sales Refresh - 2026-05-02

## Scope

Home-page sales and discovery refinements for the KHEMET LUXE theme, with a focus on removing oversized demo chrome, making template content safer after apply, and adding more practical women's-shoe buying guidance.

## Changes

- Disabled the large global conversion/free-shipping chrome for the KHEMET theme across all storefront routes instead of only hiding it on the shop page.
- Added a compact KHEMET service rail inside the storefront header so shipping, exchange, and confirmation cues continue across home, shop, and product pages without taking over the first viewport.
- Reworked the home category section from editorial "signature collections" copy into product-category discovery.
- Added `preferRuntimeCategories` to the featured collections section so applied stores use real company categories when available; marketplace preview can still fall back to demo collections.
- Replaced the weak limited-offer copy with a stronger sales campaign: bundle offer, best sellers, and size-availability urgency.
- Rebuilt the `campaign-stack` offer layout into image-led sales cards: a large visual hero offer plus two smaller product-image cards.
- Added KHEMET-specific offer signals so chips mention shoe buying cues such as available sizes, clear photos, popular models, and direct ordering instead of generic product categories.
- Added a new `shoe-fit-finder` section that helps customers pick women's shoes by use case: long errands, work/outings, occasions, and gifts.
- Replaced the internal/designer trust copy with order-focused customer copy that explains how to place a clearer order.
- Updated the newsletter title to include `KHEMET LUXE` so runtime brand replacement can swap it to the applied company/store name.
- Added social-link inputs to the Store Settings footer tab for Instagram, Facebook, TikTok, WhatsApp, and YouTube.
- Updated the storefront footer to prefer runtime/admin social links and hide theme demo social links on applied stores unless real links exist.

## Verification

- `npm run validate:themes` passed for all 60 storefront themes.
- `npx vitest run --environment jsdom src/storefront/__tests__/khemetHeaderInteractions.test.tsx src/storefront/__tests__/manifest.test.ts src/storefront/__tests__/runtimeBrandText.test.ts` passed: 3 files, 10 tests.
- Playwright mobile/desktop smoke passed with no console errors.
- Browser screenshots were written under `artifacts/khemet-home-refresh-2026-05-02/`.
- Offer-card redesign screenshots were written under `artifacts/khemet-offer-cards-2026-05-02/`, with 3 product images rendered on desktop and mobile and no stale generic chips.
- Manual preview was opened at `http://localhost:3011/store?previewTheme=khemet-luxe-eg&previewSource=marketplace`.

## Notes

- The admin social links are currently stored in storefront design tokens, so this avoids a database migration while still giving applied stores their own social URLs.
- Full project TypeScript was not rerun for this pass; previous full type-check attempts are still affected by unrelated project-wide issues outside the KHEMET storefront changes.
