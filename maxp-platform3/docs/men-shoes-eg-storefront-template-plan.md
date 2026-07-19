# Men Shoes EG Storefront Template Plan

## Brief Snapshot

- Working template ID: `men-shoes-eg`
- Audience: Egyptian men shopping for sneakers, casual shoes, and daily-wear footwear with mobile-first behavior and clear price sensitivity.
- Main jobs:
  - find the right shoe quickly
  - understand price and offer without hunting
  - trust size exchange and delivery before committing
  - move from homepage to product or category fast
- Tone:
  - masculine
  - direct
  - practical
  - modern
  - concise
- Primary conversion goal: push the visitor toward category entry, best sellers, and add-to-cart with minimal hesitation and minimal copy.

## Objective Strategy

- primary objective:
  - `Sales-led`
- secondary objective:
  - build brand trust through clarity, realism, and consistency rather than long storytelling
- first-visit outcome:
  - the user should reach a category or a best-selling product within the first meaningful interaction
- what must not dominate:
  - editorial storytelling
  - oversized brand philosophy
  - decorative sections that delay browsing
- success lens:
  - faster route to `shop / category / product`
  - visible CTAs
  - clear prices and trust

## Benchmark Scan

- reference scan:
  - `men-shoes-eg-current-benchmark-scan-2026-04-24.md`
- current signals:
  - sales-first structure
  - real product photography
  - price / discount / demand cues
  - size and exchange reassurance
  - mobile-first scanning
- stale signals:
  - fluffy hero copy
  - fake or stylized product imagery
  - repeated explanation sections
  - generic card grids that don't sell
- no-go patterns:
  - more than one non-selling surface before category or best-seller entry
  - fake product visuals
  - duplicated CTAs and repeated messaging

## Theme Foundation

- scene sentence:
  - رجل يفتح المتجر من موبايله في الطريق أو في استراحة سريعة، يريد حذاء شكله رجالي محترم وسعره واضح ومقاسه مطمئن بدون لف كثير.
- palette:
  - light-first surface
  - tinted stone / warm white neutrals
  - dark graphite for text
  - deep olive or petrol as secondary control color
  - assertive orange for main CTAs and sale emphasis
- type:
  - Arabic sans with strong weight contrast
  - no editorial serif
  - headings bold and short
- layout logic:
  - dense but controlled
  - sales-first
  - no luxury spacing excess
- differentiation:
  - stronger and more masculine than `district-market`
  - more product-driven and less broad-retail
  - not athletic-only, not formal-only, but clearly men's footwear

## Mobile Experience Strategy

- mode:
  - `app-like`
- bottom nav / dock:
  - bottom dock واضحة بالعلامات النصية
  - cart action أقوى بصريًا من باقي التبويبات
- sticky CTA / buy bar:
  - CTA ثابتة على PDP تقرأ كسلوك تطبيقات التسوق لا كزر ثانوي في صفحة ويب طويلة
- filters / sort behavior on mobile:
  - chips أفقية سريعة + search / sort واضحة من أول viewport
- PDP behavior on mobile:
  - الشراء والاختيار يجب أن يظلا قريبين من الإبهام
  - reassurance قصيرة وقريبة من CTA
- footer / lower chrome behavior:
  - footer أخف على الموبايل
  - لا أعمدة روابط كاملة تحت dock التطبيقية
- risks:
  - app-like مبالغ فيها قد تجعل القالب يبدو clone لتطبيق لا storefront
  - يجب إبقاء الوضوح التجاري أعلى من الحركة أو الزينة

## Variant Strategy

- families in scope:
  - `hero-banner`
  - `featured-collections`
  - `featured-products / product-grid`
  - `offer-bento / value rail`
  - `pdp trust / reassurance surfaces`
  - `shop command / filters support`
- decision per family:
  - `hero-banner` = `New`
  - `featured-collections` = `Extend`
  - `featured-products / product-grid` = `Extend`
  - `offer-bento / value rail` = `Extend`
  - `pdp trust / reassurance surfaces` = `New`
  - `shop command / filters support` = `Extend`
- why:
  - the hero must be built specifically for men's shoes sales flow, not adapted from general retail
  - collections and product grid can reuse the existing engine but need sharper shoe-specific tuning
  - PDP needs a dedicated size-confidence / exchange-confidence pattern
- reuse risks:
  - existing variants may feel too generic or too fashion-neutral
- extend notes:
  - reuse only if the conversion logic stays stronger than the visual styling
- new variants needed:
  - compressed sales hero
  - PDP size-confidence rail
  - possibly a shoe-use-case quick-entry surface if current variants remain too generic

## Capability Matrix

- must-have capabilities:
  - fast category entry
  - best sellers surface
  - clear sale/value surface
  - real product images
  - size / exchange reassurance
  - delivery and payment trust
  - concise CTA structure
  - mobile-first filters and scanning
  - related accessories / care cross-sell
- mapped sections / behaviors:
  - hero -> strongest CTA + direct route to shop and best sellers
  - featured collections -> sneakers / casual leather / loafers / running-daily use-case
  - product grid -> price, discount, rating/demand cues
  - offer rail -> offers, free shipping threshold, exchange promise
  - PDP trust rail -> fit, exchange, delivery, payment
  - cart and checkout -> reassure, not distract
- missing capabilities:
  - none accepted at launch for core sales path
- tradeoffs:
  - brand storytelling will be light
  - visual expression serves conversion first

## Sample Data Strategy

- chosen pack:
  - new dedicated dataset `men-shoes-eg`
- why:
  - general-store data will weaken specificity
  - this theme needs shoe-specific category logic, sizes, price bands, and product naming
- pack direction:
  - sneakers
  - casual leather
  - loafers / slip-ons
  - running-inspired daily shoes
  - care accessories
- gaps:
  - need one wider real photo pack later if we want less repetition across adjacent product cards
  - need a mobile screenshot review round before final approval

## Image Realism Gate

- photo source policy:
  - `Approved photo pack`
- where realism is mandatory:
  - hero merchandising image
  - collection imagery if shoes appear
  - product grid
  - PDP gallery
  - cart cross-sell
- where stylization is allowed:
  - background textures
  - non-product decorative accents
  - tiny iconography
- realism risks:
  - mixed lighting styles
  - different product photography quality across categories
  - fake generated shoes or composited catalog sheets
- final image verdict:
  - pass in preview dataset and primary commerce surfaces, with a note that the local pack can still be widened later for more visual variety

## Build

- registration:
  - complete
- metadata:
  - complete
- preview assets:
  - complete
- sections:
  - complete for home / shop / pdp / cart / checkout / sale / support pages
- variants:
  - hero custom pass complete
  - product and collection flows extended from existing engine
  - PDP trust now uses `size-guide` plus standalone conversion sections:
    - `low-stock`
    - `delivery-proof`
    - `viewer-counter`
    - `trusted-badges`
    - `bulk-savings`
  - `conversion-stack` remains available for backward compatibility only and is no longer the default composition for this theme
- conversion execution:
  - `cart upsell` no longer lives only in the drawer; it now renders on the cart page itself
  - overlapping cross-sell / bought-together products are deduped before display
  - post-purchase recommendations now use denser commerce cards and preview-aware recommendations

## Verification & Tests

- validation scripts:
  - `validate-themes.ts`
- focused tests:
  - `marketplaceApps`
  - `pageComposer`
  - `ConversionStack`
  - `themeCatalog`
  - `themeResolver`
  - `themeValidation`
- preview data tests:
  - `marketplaceSampleData`
  - preview seeded order/cart tests if the new pack requires them
- variant / behavior tests:
  - required for any new hero or PDP trust variant
- status:
  - passed
  - `validate-themes.ts` passed with `men-shoes-eg`
  - focused tests passed:
    - `marketplaceApps`
    - `pageComposer`
    - `ConversionStack`
    - `marketplaceSampleData`
    - `marketplacePreviewOrder`
    - `themeCatalog`
    - `themeResolver`
    - `themeValidation`
  - local Playwright smoke flow passed:
    - `home`
    - `shop`
    - `pdp`
    - `cart`
    - `checkout`
    - `thank-you`
  - no console errors / page errors / failed requests in local smoke flow

## QA

- home:
  - pass locally on desktop preview
- shop:
  - pass locally on desktop preview
- pdp:
  - pass locally on desktop preview
- cart:
  - pass locally on desktop preview
  - inline upsell now visible beside the summary flow and no longer hidden inside the drawer only
- checkout:
  - pass locally on desktop preview
- thank-you:
  - pass locally on desktop preview
  - post-purchase cards render with real imagery after in-view lazy loading and read as actual commerce recommendations
- mobile:
  - pass
  - homepage / shop / product / checkout reviewed on mobile screenshots
  - mobile command bar, dock, sticky CTA, and footer were tightened to feel closer to a shopping app
- mobile app-feel:
  - pass
  - mode locked to `app-like`
  - mobile dock, shop chips, sticky CTA, and reduced footer now support that direction
- RTL:
  - pass
  - screenshots confirm the theme reads naturally in `rtl`

## Final Gate

- test coverage / validation status:
  - pass
- objective fit:
  - pass
- capability coverage:
  - pass in core path, including care/accessories cross-sell through preview recommendations
- image realism:
  - pass
- currentness:
  - pass in current desktop preview
- clarity:
  - pass
- mobile app-feel fit:
  - pass
- anti-stale:
  - pass
- distinction:
  - pass relative to `district-market` and `cairo-stride`, mainly through tighter sales focus and a dedicated hero
- final verdict:
  - `approved`
  - strong first release candidate for a men's shoes sales-led theme
  - optional polish remains possible on mobile homepage rhythm, but not as a blocker

## Marketplace Presentation

- marketplace card preview:
  - upgraded from a simple illustrative `svg` to a real-photo composite `preview.png`
  - preview now reflects the actual positioning of `خطوة`:
    - real shoe imagery
    - short Arabic value proposition
    - stronger sales CTA
    - compact marketplace-friendly composition
- marketplace metadata:
  - theme description was tightened and synced so the card no longer falls back to the generic storefront placeholder copy
- marketplace dark mode:
  - the marketplace themes page now uses stronger dark surfaces for:
    - result panels
    - sidebar category groups
    - theme cards
    - mini stats
  - dark mode is now visually coherent with the rest of the admin shell instead of leaving light, washed-out panels inside a dark frame

## Decisions Locked

- this theme is not `Brand-led`
- this theme will not rely on AI-looking product art
- copy must stay short and Arabic-first
- one strong CTA matters more than multiple equal buttons
- category and product entry must happen early
- CTAs, pricing, and reassurance must do more work than decorative layout
