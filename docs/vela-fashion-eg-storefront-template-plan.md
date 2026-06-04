# Vela Fashion EG Storefront Template Plan

## Brief Snapshot

- Working template ID: `vela-fashion-eg`
- Working theme name: `فيلا فاشن`
- Reference style family:
  - `pastel-fashion-direct`
- Audience: Egyptian fashion shoppers who want fast visual browsing, quick product preview, clear discounts, direct product-page ordering, and a softer feminine shopping mood.
- Main jobs:
  - browse dense fashion merchandising quickly
  - preview product options without always opening full PDP
  - jump from card to order with minimum friction
  - compare sizes / colors / discounts easily on mobile
  - complete direct order from PDP with trust and urgency
- Tone:
  - soft
  - commercial
  - clear
  - feminine
  - fast
- Primary conversion goal:
  - move the user from browsing grid -> quick view / PDP -> inline direct order.

## Objective Strategy

- primary objective:
  - `Sales-led`
- secondary objective:
  - improve product discovery speed without losing direct-order clarity
- first-visit outcome:
  - the shopper should understand the store quickly, browse categories, enter a quick preview or PDP, and see a direct way to order
- what must not dominate:
  - heavy storytelling
  - luxury whitespace
  - complicated filters
  - technical fashion jargon
- success lens:
  - faster route from grid to product decision
  - clearer discount visibility
  - smooth direct-order conversion from PDP

## Design Style Definition

- design style model:
  - `pastel-fashion-direct`
- design branch type:
  - `new model`
- art direction / mood:
  - pastel fashion retail
  - rounded and soft
  - quick and commercial
- commerce style:
  - quick-view-first browsing
  - sort-first collections
  - PDP direct order
- image direction:
  - real fashion product photography
  - soft studio backgrounds
  - colorway visibility is critical
- palette logic:
  - white / cream base
  - dusty pink footer / support slab
  - coral sale cues
  - charcoal text
- typography logic:
  - modern clean sans
  - heavy but friendly product headings
- shape language:
  - large rounded product cards
  - soft pills
  - compact CTA blocks
- chrome rules:
  - light header
  - pink footer support block
  - no dark heavy shell
- CTA tone:
  - `اشتري الآن`
  - `أضف للسلة`
  - `عرض التفاصيل`
  - `كملي الطلب`
- nearest styles it must stay away from:
  - `mass-retail-direct`
  - `editorial-soft-commerce`
  - `utility-retail-direct`

## Benchmark Scan

- reference scan:
  - `vela-fashion-reference-gap-analysis-2026-04-26.md`
- current signals:
  - billboard hero
  - quick-view modal
  - dense product cards with size and color preview
  - pastel footer slab
  - direct PDP order
- stale or weak signals:
  - repeated description text
  - mixed placeholder language
  - weak search page
  - buggy thank-you toasts
- no-go patterns:
  - `box-in-box`
  - repeated PDP description
  - decorative style labels
  - generic quick-order wording

## Theme Foundation

- scene sentence:
  - زائرة تفتح المتجر من موبايلها وتريد أن ترى المنتج بسرعة، تراجع اللون والمقاس أو نظرة سريعة، ثم تدخل مباشرة على قرار الشراء بدون زحمة ولا تعقيد.
- palette:
  - cream white base
  - dusty pink support areas
  - coral sale accents
  - charcoal text
- type:
  - modern sans with clean bold product names
- layout logic:
  - dense merchandising
  - soft fashion shell
  - modal-assisted browsing
- differentiation:
  - softer and more feminine than `style-store-eg`
  - less editorial than `women-fashion-eg`
  - lighter and less utility than `men-shoes-eg`

## Mobile Experience Strategy

- mode:
  - `app-like`
- top fold:
  - product decision must appear quickly with little dead space
- browsing mode:
  - 2-column fashion grid
  - quick view visible from cards
- PDP behavior:
  - summary, urgency, tab row, offers, then form
- footer behavior:
  - compact information slab
  - accordions for categories / pages
- risks:
  - over-cleaning until the theme loses its dense fashion-retail personality

## Variant Strategy

- variant posture:
  - `All-New Variants`
- families in scope:
  - `hero-banner`
  - `featured-collections`
  - `product-grid`
  - `shop-command-bar`
  - `product-info`
  - `product-gallery`
  - `pdp-checkout`
  - `features-bar`
  - `reviews`
  - `related-products`
  - `order-confirmation`
- decision per family:
  - visible surface families = `New`
- allowed reuse:
  - engine
  - quick view plumbing
  - quantity offers engine
  - order flow plumbing
- blocked reuse:
  - visible `style-store-eg` or `women-fashion-eg` surfaces as-is

## Section vs Variant Decision

- keep as variants / component anatomy:
  - hero
  - cards
  - collection toolbar
  - PDP buybox
  - features slab
  - thank-you
- likely new section family:
  - `testimonials-carousel`
- why:
  - testimonials are a real home merchandising block in the reference, not just PDP reviews

## Capability Matrix

- must-have capabilities:
  - category-first browsing
  - sort-only collection mode
  - quick-view modal
  - visible size / color preview on cards
  - direct PDP order form
  - quantity offers
  - simple thank-you page
  - policy pages
  - footer contact slab
- mapped sections / behaviors:
  - hero -> fashion billboard
  - category section -> direct entry lanes
  - product grid -> quick-view-first dense fashion cards
  - PDP -> gallery + proof + urgency + tabs + order
  - features -> store advantages
  - testimonials -> social proof on home

## Conversion Stack & Upsell Strategy

- primary CTA system:
  - clear `Buy Now` and `Add to cart` in quick view and PDP
- quick order:
  - required
- quantity offers:
  - `supporting` but visible
- bought-together / bundle:
  - optional, secondary for this style
- final CTA owner:
  - PDP quick-order form
- top selectors ownership:
  - size + color live near image / price area before form

## Product Data Depth

- gallery depth target:
  - `4+` real images for featured products
- variant axes:
  - `size / color`
- card preview requirements:
  - visible size chips
  - visible color swatches
- risks:
  - weak color data will immediately collapse the quick-view pattern

## Sample Data Strategy

- chosen pack:
  - new dedicated women-fashion direct retail dataset
- why:
  - this style depends on colorways, size chips, sale badges, and consistent model photography
- required data:
  - real images
  - visible compare prices
  - review snippets
  - quick-view friendly color / size variants

## Image Realism Gate

- photo source policy:
  - `Approved photo pack`
- mandatory realism zones:
  - product cards
  - quick view modal
  - PDP gallery
- not allowed:
  - illustration substitutes
  - blank color swatches
  - synthetic fashion renders

## Route-by-Route Distance

- `home`:
  - billboard + pastel fashion lanes
- `shop / collection`:
  - sort-first dense grid
- `PDP`:
  - direct order, modal-like rhythm carried into full page
- `thank-you`:
  - simpler and lighter than our richer confirmation pages

## Verification & Tests

- required automated checks:
  - `validate-themes.ts`
  - targeted storefront vitest suites
  - order preview tests if preview order logic changes
- required manual QA:
  - home visual comparison against reference
  - collection card and quick-view comparison
  - PDP order path
  - thank-you comparison
- explicit live comparison checklist:
  - product card density
  - quick-view behavior
  - pastel shell tone
  - PDP urgency rhythm
  - footer slab personality

## Done Definition

- the theme feels recognizably close to `vela-fashion`
- the visible design style is `pastel-fashion-direct`, not a recolored `style-store-eg`
- quick view is a first-class browsing step
- PDP order flow is clean and direct
- all visible images are real
- visual comparison is documented route by route before approval

## Current Status

- state:
  - implemented
  - browser-reviewed
  - visually compared against `vela-fashion.myeasyorders.com`
  - preview direct-order verified
- latest successful preview order:
  - `VF-92739281`

## Latest Gap-Closing Pass

- closed in this pass:
  - `vela-fashion` header chrome now reads closer to the reference:
    - centered wordmark
    - lighter shell
    - search returned to the mobile header
  - `fashion-billboard` hero moved closer to the reference poster logic:
    - gray stage
    - framed poster card
    - lower polish
  - `vela-fashion` footer now uses a pink contact slab instead of a generic storefront footer
  - preview chrome was reduced to compact floating controls so the comparison is driven by the theme, not the review shell
  - image galleries for key products were tightened to avoid weak first-impression cards
- final comparison verdict:
  - `home`: close in spirit and merchandising rhythm
  - `shop`: close in card density, sale framing, and sort-first behavior
  - `PDP`: same direct-order idea, but still slightly cleaner than the rough original

## 2026-04-27 PDP Simplification

- cleaned the remaining CTA duplication inside the `Vela` product page:
  - the upper `اشتري الآن` button remains a scroll/entry action
  - the quick-order form now owns a single final CTA only
  - `showAddToCartButton` was disabled for `vela-fashion-eg`
- result:
  - the PDP reads more like a direct-order page and less like a hybrid cart/order page
