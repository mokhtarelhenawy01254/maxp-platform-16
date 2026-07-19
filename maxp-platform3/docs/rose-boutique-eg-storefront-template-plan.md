# Rose Boutique EG Storefront Plan

## Brief

- theme id: `rose-boutique-eg`
- market: Egypt
- category: women’s boutique fashion
- objective: build a calmer, more classic boutique storefront for homepage-first visual merchandising

## Style Direction

- soft ivory / blush / ink palette
- serif brand voice for headings
- restrained borders and lighter product chrome
- image-led but not noisy
- closer to catalog boutique than sales-heavy fashion retail

## Reusable Library Work

The theme should not depend on one-off hacks. It adds reusable storefront pieces:

1. `boutique-muse` hero for classic portrait-led boutique intros
2. `boutique-shelf` grid + `boutique-air` card for softer catalog shelves
3. `boutique-duo` promo band for two-image editorial commercial banners
4. `journal-strip` for lightweight homepage stories/blog cards
5. `editorial-strip` newsletter for footer-adjacent retention without heavy marketing chrome

## Homepage Composition

1. hero with soft portrait stage
2. first boutique shelf for latest products
3. twin editorial promo banners
4. second boutique shelf for broader merchandising
5. journal/blog strip
6. quiet newsletter strip

## Preview Data

- dedicated marketplace preview dataset wired under:
  - `frontend/src/storefront/preview/roseBoutiqueEgMarketplaceData.ts`
- includes:
  - products
  - variants
  - related/bought-together sets
  - reviews
  - cart seed
  - order seed

## Validation Target

- `npm run validate:themes`
- targeted `vitest` for:
  - variant registry
  - marketplace preview sample data
- live browser screenshot review on local storefront preview

## Autonomous Polish Follow-up

- muted the `conversion-suite` preview chrome for `rose-boutique-eg` inside:
  - `frontend/src/storefront/utils/marketplaceApps.ts`
- disabled the aggressive preview-only modules that were breaking the calm boutique mood:
  - `saleCountdown`
  - `exitIntentPopup`
  - `lowStockNotice`
  - `bulkSavings`
  - `fakeVisitorCounter`
  - `fakeSalePopup`
  - `soldCounter`
  - `estimatedDelivery`
  - `freeShippingBar`
  - `backInStock`
  - `trustedBadges`
  - `purchaseFomo`
  - `inactiveTab`
- kept only the softer commerce helpers active:
  - `crossSell`
  - `boughtTogether`
  - `stickyAddToCart`
- replaced the default large marketplace preview banner with a compact floating preview dock for `rose-boutique-eg` inside:
  - `frontend/src/storefront/StorefrontShell.tsx`
- added test guards for the calmer preview behavior in:
  - `frontend/src/storefront/__tests__/marketplaceApps.test.ts`
  - `frontend/src/storefront/__tests__/storefrontPreview.test.tsx`
- re-reviewed the homepage visually after the preview-shell cleanup on:
  - desktop
  - mobile

## Boutique Shelf Polish Pass

- refined `ProductCard / boutique-air` to read closer to a calm catalog card than a modern high-conversion card:
  - flatter ivory base
  - cleaner border and lighter shadow
  - centered title / price rhythm
  - softer CTA chip instead of a loud cart control
  - quieter wishlist control
- updated the `rose-boutique-eg` preview dataset so the first visible products do not repeat the same image language in the first shelf:
  - re-ordered several gallery cover images inside `roseBoutiqueEgMarketplaceData.ts`
- visually re-reviewed the homepage again after the card/data pass and kept the calmer version

## Split Shelf Library Pass

- extended `ProductGrid` so a section can now curate homepage shelves more intentionally with:
  - `includeProductIds`
  - `excludeProductIds`
- when `includeProductIds` is provided, the grid now preserves the explicit order from the theme instead of falling back to dataset order
- used that new capability in `rose-boutique-eg` so:
  - the first shelf highlights one curated 4-product set
  - the second shelf shows a different 4-product set instead of repeating the first shelf products
- re-reviewed the homepage after the split-shelf pass and kept the new version because the merchandising rhythm now feels more deliberate and less duplicated

## PDP Boutique Pass

- added two new reusable PDP variants to the storefront library:
  - `ProductGallery / boutique-portrait-stage`
  - `ProductInfo / boutique-ledger`
- wired those variants into `rose-boutique-eg` so the product page now reads closer to a calm boutique catalog rather than a generic storefront buybox
- enriched the boutique preview dataset with product-specific fields for the PDP:
  - `editorialBadge`
  - `editorialNote`
  - `fitNote`
  - `stylingNote`
  - `careNote`
  - `styleWith`
  - `boutiqueFacts`
  - `boutiqueProofs`
- adjusted the rose PDP section settings to carry softer service copy:
  - calmer shipping heading
  - boutique-specific guarantee cards
- tested one intermediate buybox layout and rejected it because it nested a second wide desktop grid inside a PDP that was already split into gallery + info columns
- kept the second version because it preserved the boutique mood without crushing the content into narrow sub-columns
- final PDP choices kept after review:
  - portrait-led gallery with softer thumbnail rail
  - single-column boutique ledger buybox
  - proof cards above the buy surface
  - editorial related-products variant instead of the gap-producing `closet-pairings`
- revalidated with:
  - `frontend: node ./node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts`
  - `frontend: node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/variantRegistry.test.ts src/storefront/preview/__tests__/marketplaceSampleData.test.ts src/storefront/__tests__/storefrontPreview.test.tsx`
- final screenshot reviewed and approved locally:
  - `H:/max_p_new/tmp-rose-boutique-pdp-final.png`

## Shop Boutique Pass

- continued `rose-boutique-eg` by shifting the weakest surface from the homepage/PDP to the shop page
- added a new reusable storefront variant:
  - `ShopCommandBar / boutique-discovery`
- wired the shop page in `frontend/src/storefront/themes/rose-boutique-eg.json` so:
  - the shop command bar now uses `boutique-discovery`
  - the filters block is configured as a calmer boutique refinement surface
  - the categories filter uses `categoryStyle: dropdown` to reduce vertical heaviness
  - the main grid title/copy now reads closer to a boutique catalog
- extended `frontend/src/storefront/sections/FiltersSidebar.tsx` with a dedicated `rose-boutique-eg` visual branch instead of relying on generic sidebar styling:
  - softer ivory/blush shell
  - boutique-specific header card
  - calmer desktop refinement cards
  - boutique mobile drawer treatment and CTA bar
- extended manifest support so filters can explicitly set `categoryStyle`
- updated registry + manifest for the new shop command bar variant
- validation after the pass:
  - `frontend: node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
  - `frontend: node ./node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts`
- note on validation:
  - `rose-boutique-eg` itself passed theme validation
  - the final `validate-themes` run still surfaced an unrelated existing failure in `elessi-carry-lane` unsupported variants
- final screenshots reviewed locally:
  - before: `H:/max_p_new/tmp-rose-boutique-shop-before.png`
  - desktop after: `H:/max_p_new/tmp-rose-boutique-shop-after.png`
  - mobile after: `H:/max_p_new/tmp-rose-boutique-shop-mobile-after.png`

## Cart + Checkout Boutique Pass

- continued `rose-boutique-eg` into the last purchase steps so the theme no longer drops back to a generic storefront feel after `home + PDP + shop`
- reused the already-suitable section variants where that was the cleaner choice:
  - `CartItems / wardrobe-cart`
  - `CheckoutForm / soft-flow`
- added two new reusable finishing variants to the storefront library:
  - `OrderSummary / boutique-summary`
  - `PaymentSection / boutique-payment`
- wired those into `frontend/src/storefront/themes/rose-boutique-eg.json` so:
  - cart now uses a softer summary card and disables the awkward upsell block
  - checkout keeps a calmer form surface, a boutique-styled payment block, and a quieter persistent summary
- extended `frontend/src/storefront/sections/OrderSummary.tsx` so `boutique-summary` carries:
  - blush/ivory shell styling
  - calmer reassurance framing
  - softer next-step copy
  - boutique-friendly coupon and total emphasis
- extended `frontend/src/storefront/sections/PaymentSection.tsx` so `boutique-payment` carries:
  - softer method cards
  - gentler reassurance block
  - calmer final confirmation styling
  - boutique-specific next-step treatment after order confirmation
- updated storefront registration surfaces:
  - `frontend/src/storefront/variants/registry.ts`
  - `frontend/src/storefront/sections/manifest.ts`
- validation after the pass:
  - `frontend: node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/marketplaceSampleData.test.ts`
  - `frontend: node ./node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts`
- validation note:
  - this run passed cleanly for all storefront themes, including `rose-boutique-eg`
- final screenshots reviewed locally:
  - desktop cart: `H:/max_p_new/tmp-rose-boutique-cart-after.png`
  - desktop checkout: `H:/max_p_new/tmp-rose-boutique-checkout-after.png`
  - mobile cart: `H:/max_p_new/tmp-rose-boutique-cart-mobile-after.png`
  - mobile checkout: `H:/max_p_new/tmp-rose-boutique-checkout-mobile-after.png`

## Thank You Boutique Pass

- continued `rose-boutique-eg` into the post-purchase flow so the theme no longer falls back to the generic thank-you surface after checkout
- extended `OrderConfirmation` to support a reusable new variant:
  - `boutique-aftercare`
- extended `PostPurchaseUpsellBlock` to support a reusable new internal variant:
  - `boutique-afterglow`
- updated `frontend/src/storefront/themes/rose-boutique-eg.json` so the thank-you page now uses:
  - `order-confirmation / boutique-aftercare`
  - a calmer boutique post-purchase shelf with `recommendedVariant = boutique-afterglow`
- added storefront registration support:
  - `frontend/src/storefront/sections/manifest.ts`
  - `frontend/src/storefront/variants/registry.ts`
- design changes kept after review:
  - softer blush/plum hero confirmation shell
  - cleaner aftercare language for tracking and reorder
  - calmer editorial add-on shelf instead of a generic upsell block
  - wider desktop thank-you rhythm closer to the boutique home/shop mood
- did one extra dataset polish pass after the first screenshot review:
  - re-ordered the `blush-knit-top` gallery cover in `roseBoutiqueEgMarketplaceData.ts`
  - reason: the first two post-purchase cards were too similar visually on mobile
- validation after the pass:
  - `frontend: node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts src/storefront/__tests__/marketplaceSampleData.test.ts`
  - `frontend: node ./node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts`
- final screenshots reviewed locally:
  - desktop thank-you: `H:/max_p_new/tmp-rose-boutique-thank-you-after-v2.png`
  - mobile thank-you: `H:/max_p_new/tmp-rose-boutique-thank-you-mobile-after-v2.png`

## Lookbook Destination Pass

- continued `rose-boutique-eg` automatically into the remaining branded surface that was still underdeveloped: `/lookbook`
- found that the route already existed in the storefront system and was linked from the header, but the theme itself only provided a single `journal-strip`, so the page behaved more like a fallback than a destination
- added a reusable `LookbookShowcase` variant:
  - `boutique-storyboard`
- extended `frontend/src/storefront/sections/LookbookShowcase.tsx` so the new variant carries:
  - softer blush/ivory shell styling
  - calmer overlay cards with readable ivory panels
  - lighter CTA framing closer to the boutique direction
  - a more editorial large-card rhythm without abandoning direct shopping links
- updated registration/editor support in:
  - `frontend/src/storefront/sections/manifest.ts`
  - `frontend/src/storefront/variants/registry.ts`
- expanded `frontend/src/storefront/themes/rose-boutique-eg.json` lookbook page from a single strip into a full boutique destination:
  - `hero-banner / boutique-muse`
  - `lookbook-showcase / boutique-storyboard`
  - `featured-products / boutique-shelf`
  - `journal-strip / editorial-cards`
  - `newsletter / editorial-strip`
- curated the page content so the route now sells through:
  - category-led lookbook cards for `dresses / tops / layers / accessories`
  - a direct "shop the inspiration" shelf
  - boutique-specific journal entries instead of recycled home content
- did one extra visual polish pass after the first screenshot review:
  - softened the hero imagery choice
  - reduced product-shelf duplication by choosing a more varied four-product set
- focused validation passed:
  - `frontend: node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/variantRegistry.test.ts -t "resolves known live variants"`
  - `frontend: node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/themeResolver.test.ts -t "Rose Boutique lookbook"`
  - `frontend: node ./node_modules/tsx/dist/cli.mjs -e <rose theme validation snippet>`
- validation note:
  - `rose-boutique-eg` itself validates cleanly
  - the repo-wide `validate-themes.ts` run currently surfaces an unrelated existing manifest/variant registration issue in `elessi-pedal-lab`
- final screenshots reviewed locally:
  - desktop lookbook: `H:/max_p_new/tmp-rose-boutique-lookbook-desktop-v2.png`
  - mobile lookbook: `H:/max_p_new/tmp-rose-boutique-lookbook-mobile-v2.png`
