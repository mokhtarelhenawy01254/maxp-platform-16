# Legacy Default Old Copy

## Reference

- Source storefront reviewed: `https://defalut-theme-old.myeasyorders.com/collections/watches`
- Goal: reproduce the old EasyOrders black-and-white retail rhythm inside the current storefront engine.

## Delivered Direction

- New preset id: `legacy-default-old`
- New header/footer variant: `legacy-default-old`
- New hero variant: `HeroBanner.legacy-image-slider`
- New category variant: `FeaturedCollections.legacy-circle-categories`
- New merch variant: `ProductGrid.legacy-compact-listing`

## Composition Notes

- Home follows the same broad order as the reference: image-first slider, circular categories, `NEW ARRIVAL`, single banner, and `BBEST SELLER`.
- Collection routing now supports direct pages like `/collections/watches` through a dedicated storefront route instead of only query-string filtering.
- The collections page includes explicit title overrides so `watches` resolves to `MINI EDDY`, matching the referenced storefront naming even if store data uses a different category label.
- PDP keeps the current engine but leans into the reference behavior through `BUY IT NOW`, inline PDP checkout, reviews, and related products.
- Refined the legacy copy again after comparing the live reference storefront pages directly:
  - header now keeps the full desktop-style nav rhythm with `MINI EDDY`, `SHOES`, `CLOTHES`, `BAGS`, `Shipping-policy`, `Refund-policy`, plus `Search` and the cart copy
  - footer now mirrors the original legal-link order and restores visible phone, email, and address rows before the `Powered By easyorders` line
  - home `More` links now point to the matching collection routes instead of generic shop pages
  - PDP now exposes separate shipping and return/exchange accordions instead of a generic guarantees block
  - the theme now uses theme-owned SVG artwork under `frontend/public/assets/themes/legacy-default-old/` instead of borrowed imagery from other presets or the original reference storefront
  - the preview dataset is no longer sparse: the legacy theme has product-specific reviews, media-backed reviews, multi-image color galleries, and selector modes that combine buttons, color swatches, and picture thumbnails
  - language direction was re-checked against the storefront type: this preset stays `ltr` because its navigation, UI copy, and merchandising pattern are English-first

## Store Pages

- Added theme-owned policy pages:
  - `/privacy-policy`
  - `/shipping-policy`
  - `/refund-policy`
  - `/terms-and-conditions`
- Added internal content pages used by the PDP accordions:
  - `/shipping`
  - `/returns`

## Validation Targets

- `npm run validate:themes`
- `npx vitest run src/storefront/__tests__/variantSelector.test.tsx src/storefront/__tests__/productGallery.test.tsx src/storefront/__tests__/themeCatalog.test.ts`
- `npm run build`

## 2026-04-28 Follow-up

- Rechecked language direction against storefront type and locked the preset to an explicit English-first `ltr` experience.
- Added document-level direction/language syncing so the active storefront now updates `html[dir]`, `html[lang]`, and body direction from the resolved theme instead of only relying on component wrappers.
- Replaced the legacy theme preview, hero, and category imagery with local JPG assets under `frontend/public/assets/themes/legacy-default-old/` so the preset no longer reads like a direct visual copy of the original reference.
- Switched the preview dataset away from the old SVG-only legacy image pack:
  - watches now use the local `style-store-eg` watch photography set
  - shoes now use local `style-store-eg` sneaker sets
  - bags now use local `style-store-eg` bag photography
  - sportswear now borrows local `cutline-club` and `closet-os` image sets for fuller multi-image galleries
- Updated the marketplace-card preview mapping so `legacy-default-old` now surfaces its own `preview.jpg` instead of borrowing another preset's preview image.
- Validation re-run after this pass:
  - `npx vitest run src/storefront/__tests__/themeResolver.test.ts src/storefront/__tests__/themeCatalog.test.ts`
  - `npm run validate:themes`
  - `npm run build`
