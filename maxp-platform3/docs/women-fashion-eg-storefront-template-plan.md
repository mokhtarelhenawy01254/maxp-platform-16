# Women Fashion EG Storefront Template Plan

## Brief Snapshot

- Working template ID: `women-fashion-eg`
- Audience: Egyptian women shopping for women's apparel and footwear on mobile, with strong sensitivity to price, offers, fit confidence, and quick checkout.
- Main jobs:
  - discover new-in, offers, and best sellers fast
  - compare price and discount without effort
  - choose color and size confidently
  - use quick order when the decision is already made
  - benefit from multi-piece offers and bundle add-ons without leaving the main flow
- Tone:
  - feminine
  - modern
  - direct
  - lively
  - concise
- Primary conversion goal: move the visitor toward category entry, promoted products, and fast purchase with real product imagery and clear reassurance.

## Objective Strategy

- primary objective:
  - `Sales-led`
- secondary objective:
  - build trust through clarity, realism, and easy variant selection rather than through long storytelling
- first-visit outcome:
  - the user should reach a category, promoted offer, or strong PDP within the first meaningful interaction
- what must not dominate:
  - editorial storytelling
  - over-decorated femininity
  - long brand philosophy
  - soft boutique pacing that delays shopping
- success lens:
  - faster route to `shop / category / offer / product`
  - clear price/discount
  - visible quick-order path
  - variant confidence near the CTA

## Benchmark Scan

- reference scan:
  - `women-fashion-eg-current-benchmark-scan-2026-04-25.md`
- current signals:
  - real product photography
  - price-first cards
  - offer and delivery cues close to the product
  - women-specific category routing
  - mobile-first decision flow
- stale signals:
  - boutique-like slow hero
  - fluffy copy
  - repetitive decorative cards
  - fake imagery
- no-go patterns:
  - more than one non-selling surface before category/product entry
  - duplicated selectors
  - duplicate CTA ownership
  - fake product images

## Theme Foundation

- scene sentence:
  - سيدة تفتح المتجر من موبايلها بين مشوار وآخر، تريد قطعة أو حذاء شكله أنثوي مرتب وسعره واضح ومقاسه مطمئن، وتحب أن ترى العرض وتحسم بسرعة.
- palette:
  - light-first
  - warm ivory neutrals
  - charcoal text
  - berry / coral / rose accents محسوبة
  - sale orange or watermelon highlight when needed
- type:
  - Arabic sans واضحة وحيوية
  - وزن قوي في العناوين
  - body مريحة ومختصرة
- layout logic:
  - sales-first
  - feminine but structured
  - no luxury whitespace excess
- differentiation:
  - more conversion-driven than `Atelier Nova`
  - more current and Egyptian-market-aware than soft boutique themes
  - stronger quick-order / offers / bundle logic than generic women fashion themes

## Mobile Experience Strategy

- mode:
  - `app-like`
- bottom nav / dock:
  - dock واضحة بعناصر نصية وأيقونات
  - cart / order action stronger than browsing tabs
- sticky CTA / buy bar:
  - PDP buy bar must stay close to the thumb zone
  - quick order path should feel immediate
- filters / sort behavior on mobile:
  - horizontal chips + drawer / bottom-sheet for deeper filters
- PDP behavior on mobile:
  - color + size + offer + order form should feel like one buying flow
  - trust cues close to the decision, not scattered
- footer / lower chrome behavior:
  - compact footer
  - no heavy desktop footer on mobile
- risks:
  - becoming too marketplace-noisy
  - losing femininity if the interface becomes too industrial

## Variant Strategy

- families in scope:
  - `hero-banner`
  - `featured-collections`
  - `featured-products / product-grid`
  - `offer-bento / value rail`
  - `quantity-offers`
  - `pdp quick order`
  - `bundle / bought-together`
  - `trust surfaces`
- decision per family:
  - `hero-banner` = `New`
  - `featured-collections` = `New`
  - `featured-products / product-grid` = `New`
  - `offer-bento / value rail` = `New`
  - `quantity-offers` = `New`
  - `pdp quick order` = `New`
  - `bundle / bought-together` = `New`
  - `trust surfaces` = `New`
- why:
  - this template is now treated as an `All-New Variants` build, so every visible storefront section family must have its own women-fashion surface
  - engine and data plumbing may be reused, but visible composition and styling must not fall back to shared legacy variants
- reuse risks:
  - direct reuse feels too close to `men-shoes-eg`
  - mixed strategy would weaken this template as a clean reference build
- extend notes:
  - reuse engine only, never the visible variant surface
- new variants needed:
  - feminine sales hero
  - women-fashion merchandising shelf tuning
  - tighter PDP summary header for color + size + offer state
  - women-fashion trust, bundle, cart, checkout, and review surfaces

## Capability Matrix

- must-have capabilities:
  - fast category entry
  - new-in / best sellers / offers surfaces
  - real product images
  - color + size selection
  - quick order
  - quantity offers
  - configurable bundle add-ons
  - delivery / COD / exchange / return trust
  - cart upsell
  - post-purchase follow-up if useful
- mapped sections / behaviors:
  - hero -> direct route to new-in / categories / offers
  - featured collections -> dresses / sets / sneakers / flats / heels / accessories
  - product grid -> price/discount/availability cues
  - quantity offers -> multi-piece decision block on PDP where relevant
  - quick order -> direct purchase path
  - bundle -> complete look / complementary item logic
  - trust surfaces -> delivery / COD / returns / exchange
- missing capabilities:
  - none accepted in core purchase path
- tradeoffs:
  - heavy storytelling intentionally reduced
  - visual polish must still support conversion first

## Conversion Stack & Upsell Strategy

- primary CTA system:
  - one dominant purchase CTA in the final action block
- standalone tools vs orchestrator:
  - standalone sections by default
- quantity-offers strategy (if relevant):
  - `standalone section/variant`
- quantity-offers decision mode (if relevant):
  - `primary`
- quick order / sticky add-to-cart / buy-now:
  - quick order + sticky purchase behavior required
- quick-order surface mode (if relevant):
  - `merged-buybox`
- bought-together / bundle mode (if relevant):
  - `true configurable bundle`
- where variant add-ons are configured:
  - inside the same bundle block
- final CTA owner:
  - form الطلب النهائي
- should top variant selectors stay interactive:
  - no, they should hide or become summary-only when quantity offers own the decision
- cart upsell:
  - inline in cart
- PDP recommendations / bought together:
  - present but compressed on mobile
- post-purchase / reorder:
  - light follow-up only if it supports fashion accessories or repeat basics
- intentionally omitted tools:
  - countdown noise
  - fake urgency clutter
  - repetitive badges
- abuse risks:
  - overloading the women fashion PDP with too many offer surfaces

## Product Data Depth

- gallery depth target:
  - `4+` real images per featured product
- variant-sensitive products:
  - shoes
  - dresses
  - sets
  - tops
  - accessories only when color variants matter
- variant axes:
  - `size / color / fit`
- products intentionally without variants:
  - a few add-on accessories can stay simple
- risks:
  - weak variant coverage will immediately break trust in this category

## Sample Data Strategy

- chosen pack:
  - new dedicated dataset `women-fashion-eg`
- why:
  - this theme needs women-specific categories, colors, sizes, and real fashion image behavior
- gaps:
  - need a richer approved photo pack with consistent lighting across clothes and shoes

## Image Realism Gate

- photo source policy:
  - `Approved photo pack`
- where realism is mandatory:
  - hero commerce imagery
  - collection visuals
  - product grid
  - PDP gallery
  - bundle cards
- where stylization is allowed:
  - subtle backgrounds
  - decorative accents only
- realism risks:
  - mixed photography styles between clothes and shoes
  - catalog sheets or AI-looking fashion shots
- final image verdict:
  - real or approved-photo-pack only on commerce-critical surfaces

## Build

- registration:
  - complete
- metadata:
  - complete
- preview assets:
  - complete
  - `frontend/public/assets/themes/women-fashion-eg/preview.png`
- sections:
  - complete
- variants:
  - complete
  - `All-New Variants` posture applied across visible home / shop / pdp / cart / checkout section families

## Verification & Tests

- validation scripts:
  - `validate-themes.ts`
- focused tests:
  - theme catalog
  - theme resolver
  - theme validation
  - page composer
  - variant enforcement
- preview data tests:
  - marketplace sample data
  - preview order
- variant / behavior tests:
  - quantity offers
  - quick order
  - bought together / bundle behavior
- preview thank-you / order-state tests:
  - required
- status:
  - pass
  - `validate-themes.ts`
  - `marketplaceApps.test.ts`
  - `marketplaceSampleData.test.ts`
  - `marketplacePreviewOrder.test.ts`
  - `pageComposer.test.tsx`
  - live storefront preview verification

## QA

- home:
  - pass
- shop:
  - pass
- pdp:
  - pass
- cart:
  - pass
- checkout:
  - pass
- mobile:
  - pass
- mobile app-feel:
  - pass
- RTL:
  - pass
- latest polish:
  - women PDP galleries tightened to feel more coherent across shoes, dress, and scarf products
  - women preview reviews normalized to Arabic-only copy
  - cart/checkout upsell copy and CTA now follow the real variant axes instead of generic wording
  - checkout `cart-items` heading overridden to `مراجعة القطع` with a checkout-appropriate subtitle
  - `All-New Variants` re-applied across hero, category routing, grid, promo ribbon, PDP buybox, quantity offers, trust surfaces, bundle, related, reviews, cart, and checkout
  - PDP duplicate quick-order bug fixed for `style-ledger`: standalone `pdp-checkout` no longer re-renders when `product-info` already supports inline quick order
  - home de-repetition pass completed:
    - `promo-strip` moved directly after the hero to break stacked-card rhythm
    - `featured-collections / occasion-ribbon` reshaped into one lead route + compact supporting routes instead of four similar cards
    - `featured-products / curated-rack` reduced to four products and rendered as a tighter 2x2 rack on mobile
    - hero highlights compressed into chips and the right-side image block merged into one stronger visual surface
  - perceptual novelty pass completed against the new gate:
    - `benefit-ribbon` converted from a soft card into a real inline ribbon, so it no longer reads like another rounded panel under the hero
    - `curated-rack` on home now uses one editorial lead product plus three supporting compact picks instead of another flat 2x2 rhythm
    - `delivery-proof` switched to `pill` style and `low-stock` to `minimal` to break the repeated `couture-minimal` panel feeling on PDP
    - `viewer-counter` removed from PDP because it was the least important signal and added repetition
    - `complete-look` bundle cards compressed into a thumbnail + info layout so the block reads faster on mobile
    - `closet-pairings` label localized to Arabic and no longer leaks English tone into the women flow
  - latest comparison evidence:
    - `tmp/women-fashion-home-all-new-polished-v4.png` → previous home state
    - `tmp/women-fashion-home-perceptual-v5.png` → current home after perceptual novelty pass
    - `tmp/women-fashion-pdp-review-fixed.png` → previous PDP state
    - `tmp/women-fashion-pdp-perceptual-v3.png` → current PDP after trust/bundle tightening
  - continuation pass completed:
    - `shop / product-grid` moved from `curated-rack` to `fit-catalog` so the shop now reads as faster discovery instead of another editorial shelf
    - `sale / product-grid` moved to `deal-edit` so the sale page now leads with two stronger deal cards before the supporting discounted items
    - `sale / promo-strip` moved to `sale-signal` so the page opens with campaign language distinct from the home ribbon
    - `delivery-proof` pill rendering was flattened in code so it now reads as a real inline strip instead of another soft panel
  - latest continuation evidence:
    - `tmp/women-fashion-home-continuation-desktop.png`
    - `tmp/women-fashion-shop-continuation-desktop.png`
    - `tmp/women-fashion-sale-continuation-desktop.png`
    - `tmp/women-fashion-pdp-continuation-mobile.png`
  - preview reviews coverage hardened:
    - added first-party preview reviews for `dusk-block-heel`
    - `useProductReviews` now returns preview data or an empty preview state inside marketplace preview instead of calling `/public/products/:id/reviews`
  - latest preview review evidence:
  - `tmp/women-fashion-dusk-reviews-fix-mobile.png`
  - flattened the `mirror-carousel` PDP gallery so it no longer uses `box-in-box` anatomy
  - added a real zoom dialog for the PDP gallery in preview and storefront runtime
  - replaced the large women preview banner with a compact floating preview control
  - corrected bundle/add-on cards so recommendation imagery follows the selected variant image when present
  - removed a broken external image from the women preview data and revalidated the PDP with no failed requests
  - saved fresh PDP review screenshots:
    - `tmp/women-fashion-pdp-final-mobile.png`
    - `tmp/women-fashion-pdp-final-zoom-mobile.png`
    - `tmp/women-fashion-pdp-final-desktop.png`
  - PDP `product-info` moved from `style-ledger` to new `utility-rail` variant:
    - `دليل المقاسات / الشحن والاستبدال / اسألي عن المنتج / مشاركة` now live in one lightweight utility strip above the decision area
    - utility strip now reads delivery ETA and viewer proof from `conversion-suite`, not `commerce-advanced`
    - separate `delivery-proof` section removed from `women-fashion-eg` so the ETA is no longer duplicated below the buy surface
    - latest evidence:
      - `tmp/women-fashion-utility-rail-mobile.png`
  - quantity-offers `selection-rail` tightened after final PDP review:
    - heading and subtitle shortened to reduce copy noise
    - selection rows flattened with lighter borders, less shadow, and smaller CTA weight
    - helper description and per-piece separators now read as one continuous decision flow rather than nested cards
    - latest evidence:
      - `tmp/women-fashion-pdp-post-quantity-polish-mobile.png`
  - trust + aftercare pass completed:
    - `product-info / utility-rail` now keeps guarantees visible again instead of hiding the fit-confidence layer under the buy surface
    - guarantees copy now explicitly covers sizing clarity, real imagery, and easier exchange rather than generic reassurance only
    - shoe PDPs regained a direct `دليل المقاسات` trigger from the utility rail while keeping the heavier numeric guide scoped away from non-shoe products
    - top navigation now surfaces `تواصلي معنا` sooner so the support route is easier to find during hesitation
    - thank-you moved onto the softer aftercare presentation with stronger tracking, reorder, and post-purchase “complete the look” copy
  - mobile CRO execution pass completed for `إطلالة`:
    - `hero-banner / style-ledger` now flips its mobile order so the sales copy and CTA render before the visual card stack, while secondary support cards stay collapsed behind `sm`
    - `shop / fit-finder` now opens with a compact summary chip row on phones instead of spending the first viewport on three explainer cards
    - women `PDP` buy flow now behaves as one clearer path:
      - `quantity-offers / selection-rail` hides the redundant middle continue CTA in primary-decision mode
      - `product-info` surfaces an inline trust strip before the form using existing trusted badges + review signals
      - `pdp-checkout` compacts the merged buybox, shortens field spacing, and uses a scroll-triggered sticky submit only after the user moves past the first fold
    - `product-gallery / mirror-carousel` now adds a first-fold mobile quick-buy overlay with price, compare-at price, savings, trust cue, and direct `اختاري العرض` jump to the buybox
    - `mobile-bottom-nav` is now suppressed on home and product pages for `women-fashion-eg` to reduce competition in the thumb zone
  - lower `PDP` mobile compaction pass completed:
    - `bought-together / pairing-rail` now uses tighter spacing, smaller summary chrome, and shorter inline guidance on phones so `كملي الإطلالة` reads like a quick add-on rail instead of another long section
    - `related-products / closet-pairings` now switches to the lighter `compact` product card on `women-fashion-eg`, trims the header box, hides the secondary helper chip on mobile, and reduces grid gaps
    - the goal of this pass was to keep post-buybox discovery present without letting it visually overpower the main purchase path on smaller screens
    - latest evidence:
      - `tmp/itlalah-pdp-firstfold-overlay.png`
      - `tmp/itlalah-pdp-mobile-preview-after-pass2.png`
  - cart + checkout CRO pass completed for `إطلالة`:
    - `cart / order-summary` now uses `boutique-summary` copy and shorter continuation framing instead of a generic summary box
    - `checkout / checkout-form` now prioritizes `الاسم + الهاتف` before the optional email field, while `soft-flow` spacing and textarea height are tightened for women mobile checkout
    - `checkout / payment` now uses `boutique-payment` with a lighter women-specific payment surface, denser method cards, and an inline final-review summary when the full payment summary card is hidden
    - `checkout / order-summary` now uses `boutique-summary` but suppresses coupon/trust/free-shipping noise on the final checkout step so the page ends on a cleaner confirm path
    - `cart-items` for `wardrobe-cart` now use tighter women-specific mobile spacing, smaller visual chrome, and calmer product rows without altering other themes
    - verification:
      - `npm.cmd run validate:themes`
      - `npx.cmd eslint src/storefront/sections/CartItems.tsx src/storefront/sections/OrderSummary.tsx src/storefront/sections/CheckoutForm.tsx src/storefront/sections/PaymentSection.tsx`
  - speed + image weight mobile pass completed for `إطلالة`:
    - `hero-banner / style-ledger` now routes the lead image and desktop support image through `StorefrontProductImage` with responsive widths, tuned quality, and explicit fetch priorities instead of raw `<img>` tags
    - `product-grid` now uses a lighter women-specific `mobile-first` image priority mode for `curated-rack`, `fit-catalog`, and `deal-edit`, reducing eager product image count on phones while keeping the first visible card highest priority
    - `product-card / compact` now respects passed `imageLoading` and `imageFetchPriority` values and emits responsive image sizes so women catalog cards actually benefit from the grid-level loading policy
    - goal of this pass:
      - reduce first-fold image weight on home + shop mobile surfaces
      - preserve perceived sharpness while cutting unnecessary early image competition
    - verification:
      - `npm.cmd run validate:themes`
      - `npx.cmd eslint src/storefront/sections/HeroBanner.tsx src/storefront/sections/ProductGrid.tsx src/storefront/components/ProductCard.tsx`
      - `eslint` still reports pre-existing `@typescript-eslint/no-explicit-any` errors in `HeroBanner.tsx` and `ProductGrid.tsx`, outside the scope of this pass

## Final Gate

- test coverage / validation status:
  - pass
- objective fit:
  - pass
- capability coverage:
  - pass
- conversion stack fit:
  - pass
- quantity-offers fit:
  - pass
- upsell coverage:
  - pass
- product data depth:
  - pass
- variant coverage:
  - pass
- perceptual novelty:
  - pass
- similarity audit result:
  - pass
- image realism:
  - pass
- preview order realism:
  - pass
- currentness:
  - pass
- clarity:
  - pass
- mobile app-feel fit:
  - pass
- anti-stale:
  - pass
- distinction:
  - pass
- final verdict:
  - `approved`
