# Swan KHEMET Luxe Storefront Fixes - 2026-05-01

## Scope

- Kept the fixes template-level where the behavior should benefit every KHEMET Luxe merchant.
- Left company-specific content, product copy, offer setup, and brand assets configurable from the existing storefront/theme settings.

## Changes

- Mapped legacy footwear menu tokens such as `sneakers` and `flats` to Swan-style transliterated footwear slugs, including `a7dhya-7rymy`, so header category links do not open an empty shop page.
- Added a Swan-scoped legacy product slug alias for `kotshy-soan` so old ad/product links land on the current Swan sneaker product instead of a partial PDP with 404 product data, including suppressing the stale PDP render during the redirect and resolving product data requests through the alias.
- Kept KHEMET product-page add-to-cart behavior on the cart drawer path and verified the existing regression coverage.
- Made KHEMET cart drawer wider on desktop and enabled cart related-product upsells by default for the theme.
- Improved KHEMET related-card price wrapping so sale and compare prices do not collide on narrow mobile cards.
- Localized the KHEMET checkout progress labels for RTL stores.
- Replaced missing default `og-image.png`, `twitter-image.png`, and Vite favicon references with existing static assets to avoid 404s before runtime SEO settings take over.

## Verification

- `npx vitest run src/storefront/__tests__/productSlugAliases.test.ts src/storefront/__tests__/catalogCategories.test.ts src/storefront/__tests__/khemetHeaderInteractions.test.tsx src/storefront/__tests__/productInfoConversionModules.test.ts src/storefront/__tests__/checkoutPageCart.test.tsx`
- `npm run build`
