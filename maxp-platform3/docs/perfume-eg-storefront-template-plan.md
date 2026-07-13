# Perfume EG Storefront Template Plan

## Brief Snapshot

- Working template ID: `perfume-eg`
- Working theme name: `أثر`
- Audience: Egyptian perfume shoppers looking for authentic fragrances, clear sizes and prices, and a store that feels premium enough to trust but fast enough to buy from mobile.
- Main jobs:
  - discover perfumes by mood, family, gifting intent, or best sellers
  - compare bottle sizes and prices quickly
  - trust authenticity before buying
  - understand the scent family without reading a wall of copy
  - choose a size or gift set and complete checkout smoothly
- Tone:
  - elegant
  - sensorial
  - concise
  - trust-building
  - premium without vanity
- Primary conversion goal: move the visitor from scent discovery into confident PDP decision and clean checkout with real product photography.

## Objective Strategy

- primary objective:
  - `Hybrid`
- secondary objective:
  - convert with strong authenticity and gifting confidence, not with discount noise alone
- first-visit outcome:
  - the user should understand the store's scent world quickly, then reach either a family, best seller, gift set, or strong PDP
- what must not dominate:
  - abstract luxury storytelling
  - cosmetics-like clutter
  - marketplace chaos
  - decorative cards that hide the bottle, size, and price
- success lens:
  - faster route to `shop / scent family / gift set / PDP`
  - clear size-price decision
  - visible authenticity trust
  - high-quality real bottle imagery

## Benchmark Scan

- reference scan:
  - `perfume-eg-current-benchmark-scan-2026-04-25.md`
- current signals:
  - bottle-first real photography
  - size + price + discount grouped tightly
  - scent-family discovery
  - authenticity and gifting confidence
  - premium but still commerce-first PDP
- stale signals:
  - empty luxury whitespace
  - poetic copy before product facts
  - fake renders
  - duplicated trust or duplicated CTA
- no-go patterns:
  - `box-in-box`
  - fake imagery
  - duplicated trust strips
  - size selectors far from CTA

## Theme Foundation

- scene sentence:
  - زائرة تفتح المتجر من موبايلها وتريد عطرًا واضحًا في شخصيته وحجمه وسعره، مع إحساس راقٍ يطمئنها أن المنتج أصلي ويصلح لنفسها أو كهدية.
- palette:
  - warm ivory / champagne base
  - charcoal text
  - deep plum or oud-brown accents
  - restrained gold highlight for trust and premium cues
- type:
  - Arabic sans refined but readable
  - stronger editorial display for brand and product names
  - body concise and clear
- layout logic:
  - premium commerce
  - scent-led discovery
  - trust and bottle clarity over decorative chrome
- differentiation:
  - more sensorial than `women-fashion-eg`
  - more premium than `district-market`
  - stronger authenticity and gifting logic than generic beauty themes

## Mobile Experience Strategy

- mode:
  - `app-like`
- bottom nav / dock:
  - concise dock with cart, home, shop, account-like entry only if needed
- sticky CTA / buy bar:
  - PDP buy bar must keep size selection and purchase close together
- filters / sort behavior on mobile:
  - scent family chips
  - size chips
  - drawer for deep filters like brand / concentration / gift
- PDP behavior on mobile:
  - bottle gallery, size, price, authenticity, and notes should feel like one decision flow
  - utility rail should sit under the description, not above the name/price
- footer / lower chrome behavior:
  - compact footer
  - gifting/service links light, not heavy
- risks:
  - becoming too luxury-slow
  - becoming generic beauty ecommerce

## Variant Strategy

- variant posture:
  - `All-New Variants`
- families in scope:
  - `hero-banner`
  - `featured-collections`
  - `product-grid`
  - `promo-strip`
  - `shop-command-bar`
  - `product-gallery`
  - `product-info`
  - `trust surfaces`
  - `gift-set / bundle`
  - `related-products`
  - `reviews`
  - `cart-items`
  - `checkout-form`
- decision per family:
  - all visible section families = `New`
- why:
  - this theme must feel recognizably different from fashion and shoes, not just more beige
- allowed reuse:
  - engine
  - data plumbing
  - business logic
- blocked reuse:
  - visible variant surfaces from existing themes
- new variants needed:
  - scent-led hero
  - fragrance family explorer
  - premium bottle grid
  - size-first PDP header
  - authenticity utility rail
  - gifting / discovery-set bundle
  - fragrance checkout surfaces

## Capability Matrix

- must-have capabilities:
  - best sellers and featured brands
  - scent-family discovery
  - bottle-size selection
  - authenticity trust
  - gifting support
  - real product gallery with zoom
  - complementary add-ons or gift sets
  - clean checkout
- mapped sections / behaviors:
  - hero -> entry to best sellers / gifting / scent families
  - featured collections -> floral / woody / amber / fresh / gourmand
  - product grid -> bottle, name, size, price, discount, quick trust
  - product info -> size, price, savings, notes, authenticity
  - bundle -> gift set or layer-with suggestions
  - trust surfaces -> original product, sealed pack, exchange, delivery
- intentionally not required by default:
  - quantity offers as primary decision block
  - aggressive urgency stack

## Conversion Stack & Upsell Strategy

- primary CTA system:
  - one dominant purchase CTA in PDP and checkout
- standalone tools vs orchestrator:
  - standalone trust sections by default
- quantity-offers strategy (if relevant):
  - `supporting` only when the product is a discovery set or multi-bottle offer
- quick order:
  - optional, not default
- bought-together / bundle mode:
  - `gift / layering bundle`
- final CTA owner:
  - final purchase surface only
- top selectors ownership:
  - size selector stays inside the main buy block
- cart upsell:
  - subtle, complementary products only
- post-purchase / reorder:
  - reorder and gifting suggestions acceptable
- intentionally omitted tools:
  - fake countdowns
  - loud social-proof noise
  - duplicate discount chips

## Product Data Depth

- gallery depth target:
  - `4+` real images per featured perfume
- variant-sensitive products:
  - bottle size
  - concentration when relevant
  - gift set configuration
- variant axes:
  - `size / concentration / set type`
- products intentionally without variants:
  - some accessories or candles can stay simple
- risks:
  - weak bottle-size logic will immediately weaken trust

## Sample Data Strategy

- chosen pack:
  - new dedicated dataset `perfume-eg`
- why:
  - perfume needs scent-family taxonomy, sizes, gifting, and photography different from fashion or shoes
- gaps:
  - need an approved real-photo bottle pack with consistent lighting and backgrounds

## Image Realism Gate

- photo source policy:
  - `Approved photo pack`
- where realism is mandatory:
  - hero commerce image
  - product grid
  - PDP gallery
  - gift sets
  - related and bundled cards
- where stylization is allowed:
  - subtle background textures
  - note-inspired decorative accents only
- realism risks:
  - fake bottle renders
  - AI-looking reflections or glass
  - mixing too many unrelated lighting styles
- final image verdict:
  - real product photography only on commerce-critical surfaces

## Verification & Tests

- required checks:
  - `validate-themes.ts`
  - targeted storefront tests for sample data, resolver, and PDP flow
  - live browser QA on `home / shop / PDP / cart / checkout / thank-you`
- commerce checks:
  - size selection affects price correctly
  - authenticity trust appears once, not repeated
  - gift set / bundle works without leaving the flow
  - checkout and thank-you remain clean and credible
- final browser walkthrough:
  - real order preview from PDP to thank-you

## Definition of Done

- the theme feels clearly like perfume commerce, not fashion with warmer colors
- home / shop / PDP are perceptually distinct and clearly new
- bottle, size, price, and trust are readable in the first meaningful viewport
- all commerce-critical imagery is real
- no `box-in-box`
- no duplicate CTA ownership
- live order preview succeeds end-to-end

## Current Status — 2026-04-26

- `home / shop / PDP` now have visible perfume-specific variants wired and QAed in browser:
  - `scent-portrait`
  - `fragrance-ledger`
  - `perfume-cabinet`
  - `perfume-shelf`
  - `fragrance-console`
  - `scent-brief`
  - `scent-notes`
  - `gift-pairings`
  - `scent-circle`
- `shop` no longer repeats sort/category controls in both the command bar and sidebar:
  - command bar owns discovery, sort, and family chips
  - sidebar now focuses on price only
- `PDP` now has real preview reviews for the core perfume products instead of empty review states
- `bought-together` copy now uses perfume vocabulary:
  - size-focused hint copy inside the bundle cards
- `checkout / thank-you` passed a live preview order:
  - order number: `AT-00056022`
  - no console errors during the flow
  - post-purchase upsell now uses `أحجام متاحة` / `اختاري الحجم`

## Verification Snapshot — 2026-04-26

- passed:
  - `npm exec vitest run src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
  - `npm exec vitest run src/storefront/preview/__tests__/marketplaceSampleData.test.ts src/storefront/__tests__/BoughtTogetherSection.test.tsx src/storefront/__tests__/pageComposer.test.tsx src/storefront/__tests__/variantEnforcement.test.ts`
  - `npx tsx src/storefront/scripts/validate-themes.ts`
- live browser checks completed on:
  - `home`
  - `shop`
  - `PDP`
  - `checkout`
  - `thank-you`
