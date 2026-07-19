# Style Store EG Storefront Template Plan

## Brief Snapshot

- working template ID:
  - `style-store-eg`
- working theme name:
  - `ستايل ستور`
- audience:
  - Egyptian shoppers looking for a simple Arabic fashion/accessories storefront with real product photos, fast category browsing, and direct order from the PDP
- main jobs:
  - browse watches, sneakers, scarves, and bags quickly
  - compare simple product cards without visual noise
  - reach a PDP and place an order without cart-heavy friction
  - understand shipping and return basics without leaving the buying flow mentally
- tone:
  - simple
  - direct
  - retail
  - low-noise
  - mobile-clear
- primary conversion goal:
  - move the user from hero/category discovery into a product page with a direct-order form and a short thank-you loop

## Objective Strategy

- primary objective:
  - `Sales-led`
- secondary objective:
  - keep the storefront familiar and mass-market enough for broad Egyptian retail use
- first-visit outcome:
  - the user should quickly recognize the main categories, open a product, and understand that ordering happens directly from the product page
- what must not dominate:
  - editorial storytelling
  - luxury slowness
  - nested panels
  - noisy urgency stacks
- success lens:
  - fast category entry
  - simple framed cards
  - direct order clarity on PDP
  - a clean `thank-you` page that confirms the order immediately

## Benchmark Scan

- reference scan:
  - `nue-theme-reference-gap-analysis-2026-04-26.md`
- reference source:
  - `https://nue-theme.myeasyorders.com/`
- current signals to preserve:
  - announcement strip
  - simple hero retail banner
  - category-first home
  - framed product cards
  - direct-order PDP
  - light thank-you
- stale or weak signals not to copy:
  - placeholder imagery
  - broken cart route
  - repeated fake urgency
  - weak Arabic copy
- no-go patterns:
  - `box-in-box`
  - silent fallback
  - premium chrome that makes the theme feel unlike the reference family

## Design Style Definition

- selected design style:
  - `mass-retail-direct`
- why:
  - the reference adds a new library model built around simple Arabic retail browsing and direct product-page ordering, which was not fully represented by `إطلالة`, `خطوة`, or `أثر`
- must feel like:
  - a mass-market Arabic storefront with clear categories, clear cards, direct product decisions, and fast mobile reading
- must not feel like:
  - editorial fashion
  - perfume premium commerce
  - utility menswear

## Theme Foundation

- scene sentence:
  - زائرة أو زائر يفتح المتجر من الموبايل، يرى أقسامًا واضحة، يختار منتجًا، ثم يكمل الطلب من نفس صفحة المنتج بدون تعقيد.
- palette:
  - warm ivory
  - charcoal ink
  - orange retail accent
- type:
  - Arabic sans واضحة
  - heading أثقل من body لكن بدون فخامة زائدة
- shape:
  - rounded retail frames
  - clear card borders
  - pill CTAs when needed
- chrome:
  - light announcement strip
  - simple header
  - simple footer

## Mobile Experience Strategy

- mode:
  - `mobile-first retail direct`
- top fold:
  - hero + category entry should be understandable without scrolling through extra support chrome
- category browsing:
  - product families must read like quick retail entry points
- PDP:
  - gallery first
  - order form close to title/price
  - trust light, not dominant
- checkout/thank-you:
  - short and low-noise

## Variant Strategy

- variant posture:
  - `All-New Variants`
- families in scope:
  - `hero-banner`
  - `featured-collections`
  - `product-grid`
  - `product-card`
  - `product-gallery`
  - `product-info`
  - `pdp-checkout`
  - `reviews`
  - `related-products`
  - `order-confirmation`
  - `shell/header/footer chrome`
- decision per family:
  - all visible section families = `New`
- allowed reuse:
  - engine
  - routing
  - preview order plumbing
  - data plumbing
- blocked reuse:
  - visible legacy surfaces from `إطلالة / خطوة / أثر`

## Capability Matrix

- must-have capabilities:
  - announcement bar
  - category tiles
  - framed product rails
  - search + sort
  - direct-order PDP form
  - basic variant handling
  - drawer-friendly cart support
  - simple thank-you page
  - policy pages
- mapped sections / behaviors:
  - hero -> immediate entry into shop
  - categories -> fast route to watches / sneakers / scarves / bags
  - product cards -> name / price / simple CTA
  - PDP -> title / price / guide / form / trust / reviews
  - thank-you -> order number / status / summary / back home

## Conversion Stack & Upsell Strategy

- primary CTA system:
  - single direct-order CTA from PDP form
- quantity offers:
  - not primary by default
- quick order:
  - primary
- bundle mode:
  - light supporting only, not the core of the theme
- cart mode:
  - drawer-first support
- post-purchase:
  - optional, minimal

## Product Data Depth

- gallery depth target:
  - `2-3` real photos minimum for the main products
- variant-sensitive products:
  - watches by color
  - sneakers by color and size
  - scarves/bags by color
- product card requirements:
  - image
  - name
  - price
  - compare price when relevant
  - single clear CTA

## Sample Data Strategy

- chosen pack:
  - `styleStoreEgMarketplaceData`
- categories:
  - watches
  - sneakers
  - scarves
  - bags
  - accessories
- image strategy:
  - real local assets in `/assets/themes/style-store-eg/`

## Image Realism Gate

- photo source policy:
  - real product photography only on commerce-critical surfaces
- realism-critical surfaces:
  - hero
  - category tiles
  - product cards
  - PDP gallery
  - thank-you summary items
- risks:
  - placeholders
  - mismatched photo directions
  - lifestyle-only images that hide the actual item

## Verification & Tests

- required checks:
  - `validate-themes.ts`
  - storefront preview tests
  - marketplace preview order tests
  - page composer and variant enforcement tests
- browser QA:
  - `home`
  - `shop`
  - `PDP`
  - `thank-you`
  - live preview order from PDP to `thank-you`

## Definition of Done

- theme feels recognizably close in spirit to `nue-theme` without copying its weak points
- no missing visible capability relative to the reference pattern
- no silent fallback
- no `box-in-box`
- direct-order flow works in preview end-to-end
- marketplace preview asset exists

## Current Status — 2026-04-26

- `style-store-eg / ستايل ستور` is implemented and browser-reviewed
- live preview order now reaches:
  - `thank-you?orderId=SS-13289827&previewTheme=style-store-eg&previewSource=marketplace`
- `thank-you` renders real confirmation content, not placeholders
- fresh preview asset created at:
  - `frontend/public/assets/themes/style-store-eg/preview.png`
- visual comparison completed against:
  - `ref-home-style-compare.png`
  - `ref-shop-style-compare.png`
  - `ref-pdp-style-compare.png`
