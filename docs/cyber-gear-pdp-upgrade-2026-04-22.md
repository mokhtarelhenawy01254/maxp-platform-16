# Cyber Gear PDP Upgrade - 2026-04-22

## Why This Change

`Cyber Gear` already had a differentiated home, shop, checkout, sale, and collections journey, but its product page was still falling back to a generic PDP composition. That made the theme weaker at the exact point where gaming and setup-heavy stores usually need the strongest merchandising.

The local `public-store-builder` skill now requires:

- fresh page composition instead of shallow cloning
- at least one brand-new `variant` for every new theme push
- stronger PDP detail, trust, and conversion framing

## Review Findings

- `cyber-gear` had no dedicated PDP override in `frontend/src/storefront/themes/experienceOverrides.ts`.
- The runtime `product-detail` layout in `frontend/src/storefront/engine/PageComposer.tsx` favors a strong gallery + buy-box pair with companion discovery sections below, so the theme was underusing the engine.
- The default Cyber Gear PDP was not giving enough space to configuration, quick facts, bundle logic, or review-led reassurance.

## Implemented Improvements

- Added a brand-new `product-gallery` variant: `neon-showcase`
- Added a brand-new `product-info` variant: `gear-loadout`
- Registered both variants in:
  - `frontend/src/storefront/variants/registry.ts`
  - `frontend/src/storefront/sections/manifest.ts`
- Added a dedicated `cyber-gear` PDP override with `layoutHint: product-detail`
- Rebuilt the PDP composition to use:
  - `product-gallery: neon-showcase`
  - `product-info: gear-loadout`
  - `bought-together: compact`
  - `reviews: editorial`
  - `related-products: glass`
- Upgraded the `cyber-glitch` hero from a simple centered block into a fuller cyber control-panel composition used by `home` and `shop`
- Aligned `manifest.ts` with implemented storefront variants so `hero-banner`, `offer-bento`, and `related-products` no longer under-report supported variants

## What The New PDP Does Better

- keeps product media visually distinct with a cyber-styled hero frame, numbered thumbnails, and clearer active-state feedback
- gives the buy area a stronger setup flow with status chips, quick facts, configuration framing, and a dedicated commerce panel
- keeps shipping, support, and trust copy visible instead of burying them in a generic accordion
- extends the page after the buy box with bundle, review, and related-product discovery so the PDP does not end too early

## What The Hero / Discovery Layer Does Better

- makes `Cyber Gear` look intentionally gaming-first on both `home` and `shop`, instead of relying on a thinner text-only hero
- gives the hero a denser control-panel panel so the store explains bundles, catalog flow, and trust posture before users enter the grid
- reduces validation drift by declaring implemented variants in the manifest rather than leaving branded sections to appear unsupported

## Live Preview Follow-Up

- Opened the real preview in-browser for `home`, `collections`, and `pdp` using a live company and verified the updated `Cyber Gear` experience visually instead of relying on config review alone
- Replaced the broken PDP blank state caused by blocked external media with a branded cyber fallback inside `ProductGallery`, so the hero slot now stays intentional even when a remote image is unavailable
- Added manual `featured-collections` data plus local cyber placeholder art so `home` and `collections` no longer fall back to the generic shoe-category cards during preview
- Re-checked browser issues after the update; the form-field accessibility warning did not reproduce again, while one remaining CORB/CORS-style image issue still appears for external remote assets outside the new fallback path
- Cleaned shopper-facing copy after the live review so `Cyber Gear` no longer exposes template/implementation language like `Glass`, `Campaign Rail`, `Preview Mode`, or merchandising/debug-style descriptions inside the storefront UI

## Marketplace Preview Catalog Follow-Up

- Added a dedicated marketplace preview sample dataset for `cyber-gear` in `frontend/src/storefront/preview/themePreviewData.ts`
- The preview dataset now supplies:
  - `Cyber Gear` store/company branding
  - theme-matched categories
  - sample products, related picks, and bought-together bundles
  - local placeholder product art under `frontend/public/placeholders/cyber-gear/products/`
- Wired marketplace preview data into:
  - `useStorefrontSettings`
  - `useProducts`
  - `useProduct`
  - `useCategories`
  - `GlobalConversionHost`
  - `RelatedProducts`
  - `BoughtTogetherSection`
  - `StorefrontBootstrap`
- Result: preview mode no longer overlays `Cyber Gear` on top of a shoes catalog when opened from the marketplace theme flow
- Added focused helper coverage in `frontend/src/storefront/preview/__tests__/themePreviewData.test.ts`

## Validation

- Passed: `npx vitest run src/storefront/__tests__/themeExperienceOverrides.test.ts`
- Passed: `npx vitest run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/manifest.test.ts`
- Passed: `npx vitest run src/storefront/__tests__/variantEnforcement.test.ts`
- Passed: `npx vitest run src/storefront/preview/__tests__/themePreviewData.test.ts`
- Passed: `npm run validate:blueprints`
- Passed: `npm run validate:themes`
- Passed: `npm run build`
- Closed the last remaining repo storefront validation debt by replacing unsupported `electronics-demo` entries (`stats-bar` and `product-info:split`) with supported theme data (`features-bar` and `product-info:specs-grid`)

## External Guidance Used

- Shopify design guidance emphasizes a prominent title, price, and buy button, discoverable secondary info, and a fast mobile-first path to checkout: [Designing Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/design/index)
- Shopify product media guidance supports richer product media and thumbnail-driven navigation patterns: [Product media](https://shopify.dev/docs/storefronts/themes/product-merchandising/media) and [Product media UX guidelines](https://shopify.dev/docs/storefronts/themes/product-merchandising/media/media-ux)
- Shopify accessibility guidance reinforces proper media controls and meaningful image alt behavior: [Accessibility best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/accessibility)
- Shopify performance guidance keeps PDP media decisions grounded in performance expectations: [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- Google recommends merchant product markup in initial HTML for more reliable shopping crawls: [Product snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- Baymard's current product-page UX benchmark continues to show weak PDP execution across many ecommerce sites, especially on mobile, which supports investing more effort in the PDP decision flow: [Product Page UX Best Practices 2026](https://baymard.com/blog/current-state-ecommerce-product-page-ux)
