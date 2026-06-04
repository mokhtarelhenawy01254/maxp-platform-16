# Storefront Theme Priority Findings

**Date**: 2026-04-27
**Scope**: live registry + representative live preview checks

## What Is Already Fixed

- Marketplace preview catalog coverage is now aligned with the live registry.
- All current live themes have preview products, preview cart seeds, and preview order fallbacks.
- Core storefront funnel pages exist for all live themes:
  - `home`
  - `shop`
  - `pdp`
  - `cart`
  - `checkout`
- Supported theme-linked internal pages are now covered after normalization:
  - `306/306` supported linked routes resolve to a page config
  - `43` themes currently receive generated support pages
  - `213` generated pages are now filling parity gaps across the registry

## Current Truth

- The live storefront registry currently exposes **55 themes**.
- Any document or metric still using `65` as the active count is out of date for the current codebase state on `2026-04-27`.
- The biggest parity gap is no longer missing preview data or missing linked pages.
- Multi-segment internal theme routes are now covered as well, including:
  - `airlume-ai` -> `/auth/login`

## Latest Execution Update

- `cafe-demo` and `furniture-demo` are no longer just thin market-family fallbacks at runtime.
- both now resolve to theme-owned commerce journeys for:
  - `shop`
  - `pdp`
  - `cart`
  - `checkout`
  - `sale`
  - `collections`
  - `thank-you`
- `cafe-demo` now behaves more like a real coffee ordering flow:
  - category-aware discovery lanes for beans, cold brew, pastries, and brew tools
  - stronger coffee-specific PDP depth and add-on logic
  - clearer checkout notes for grind, pickup, and delivery
  - restored seeded reorder aftercare on `thank-you`
- `furniture-demo` now behaves more like a premium room-led catalog:
  - room-based discovery for living room, tables, lighting, and decor
  - stronger PDP framing around dimensions, delivery, and coordinated pieces
  - checkout copy now reflects higher-value furniture ordering instead of a generic store flow
- targeted verification that passed after this step:
  - `src/storefront/__tests__/themeExperienceOverrides.test.ts`
  - `src/storefront/__tests__/storefrontPreview.test.tsx`
  - `npm run audit:storefront-themes -- --themes cafe-demo,furniture-demo,max-care-go`
- live mobile screenshots refreshed after the pass showed:
  - `cafe-demo` checkout starts from order review and pickup/delivery clarity, not generic fallback messaging
  - `furniture-demo` shop now opens with a stronger room-led hero and a more premium mobile entry point
- `electronics-demo` is no longer just a thin fallback theme after the latest parity pass.
- Its live preview now has:
  - stronger `shop` discovery with theme-owned tech-specific discovery lanes
  - richer `pdp` depth with `bought-together`, reviews, and clearer related products
  - stronger `cart`, `checkout`, and `thank-you` structure for electronics ordering
- checkout summary duplication was also reduced across matching flow families:
  - `payment` sections now hide their inline summary when a separate `order-summary` section already exists on the same checkout page
  - this affects `electronics-demo` and also strengthens normalized flows such as `max-care-go` and Elessi-derived checkout families
- representative verification that now passes:
  - `electronics-demo`
    - `shop`
    - `checkout`
    - `thank-you`
  - `max-care-go`
    - `checkout` normalized flow
  - `airlume-ai`
    - linked route parity for `/auth/login`
- marketplace mobile preview chrome is now materially cleaner on the themes reviewed in this pass:
  - the heavy conversion-suite overlays are suppressed on small-screen marketplace previews so theme review starts from the actual template content instead of stacked promo UI
  - mobile preview actions now collapse into a small fixed dock instead of larger inline/floating preview banners
- `split-panel` hero fallback copy is now generic and category-safe:
  - removed the shoe-specific fallback panel title from themes such as `cafe-demo`
  - removed the fallback size-guide note stack that was leaking into unrelated categories
  - mobile heading scale and CTA sizing for `split-panel` are now tighter and more usable at narrow widths
- live mobile screenshots after the fix showed the biggest improvement on:
  - `cafe-demo`
  - `max-care-go`
  - `furniture-demo`
- `elessi-pedal-lab` and `elessi-harvest-fold` are no longer just identity-rich homepages with thin shared funnels.
- both now resolve to theme-owned commerce journeys for:
  - `shop`
  - `pdp`
  - `cart`
  - `checkout`
  - `sale`
  - `collections`
  - `thank-you`
- `elessi-pedal-lab` now behaves more like a real bike-and-upgrades storefront:
  - shop discovery starts from trip type rather than a flat product grid
  - PDP now uses bike-specific gallery and buybox variants instead of a generic technical fallback
  - cart, checkout, and post-purchase now speak about fit, setup, accessories, and ride-ready follow-up
- `elessi-harvest-fold` now behaves more like a recurring grocery-and-boxes storefront:
  - shop discovery starts from daily greens, fruit boxes, pantry basics, and weekly crates
  - PDP now uses harvest-specific gallery and buybox treatment around weight, box size, and delivery timing
  - cart, checkout, and post-purchase now reflect recurring household ordering rather than a generic organic checkout
- targeted verification that passed after this step:
  - `src/storefront/__tests__/themeExperienceOverrides.test.ts`
  - `src/storefront/__tests__/themeGeneratedPages.test.ts`
  - `npm run audit:storefront-themes -- --themes elessi-pedal-lab,elessi-harvest-fold`
- fresh mobile screenshots after the pass showed:
  - `elessi-pedal-lab` shop now starts from ride-intent cards plus a stronger bike grid instead of a thin search-and-grid page
  - `elessi-pedal-lab` thank-you now includes ride-specific reorder and add-on follow-up
  - `elessi-harvest-fold` shop now starts from basket intent and grocery-specific categories rather than a bare catalog
  - `elessi-harvest-fold` thank-you now reflects weekly-box reorder behavior and grocery-native follow-up
- `elessi-signal-deck` and `elessi-tail-supply` are now out of the thin shared-funnel bucket as well.
- both now resolve to theme-owned commerce journeys for:
  - `shop`
  - `pdp`
  - `cart`
  - `checkout`
  - `sale`
  - `collections`
  - `thank-you`
- `elessi-signal-deck` now behaves more like a device-and-desk-gear storefront:
  - shop discovery starts from device intent (`أجهزة خفيفة`, `صناعة ومحتوى`, `معدات مكتب`, `تنقل وطاقة`) instead of a thin title + search + grid stack
  - PDP now uses digital-specific gallery and buybox variants instead of a generic technical fallback
  - cart, checkout, and post-purchase now read like a laptop-and-accessories order with setup-oriented follow-up
- `elessi-tail-supply` now behaves more like a pet-routine storefront:
  - shop discovery starts from pet routine (`طعام يومي`, `لعب ونشاط`, `عناية وتنظيف`, `نزهة وخروج`) instead of a bare pet shelf
  - PDP now uses pet-specific gallery and buybox treatment instead of a generic nature/ecommerce fallback
  - cart, checkout, and post-purchase now reflect recurring pet care and reorder continuity rather than a generic catalog checkout
- targeted verification that passed after this step:
  - `src/storefront/__tests__/themeExperienceOverrides.test.ts`
  - `src/storefront/__tests__/themeGeneratedPages.test.ts`
  - `npm run audit:storefront-themes -- --themes elessi-signal-deck,elessi-tail-supply`
  - `npm run validate:themes`
- fresh mobile screenshots after the pass showed:
  - `elessi-signal-deck` shop now opens from clearer device-intent cards and a stronger digital catalog rhythm
  - `elessi-signal-deck` thank-you now reads like tech setup / aftercare instead of a generic confirmation
  - `elessi-tail-supply` shop now starts from pet-routine discovery instead of a thin filter + grid shelf
  - `elessi-tail-supply` thank-you now reflects recurring pet-supply follow-up and reorder behavior

## P0: Must Stay Locked

These items are no longer the main problem, but they must not regress:

- theme-specific preview products
- cart seed relevance per theme
- tracked preview order relevance per theme
- linked-page coverage for supported internal theme routes

## P1: Weakest Experience Depth

These themes currently look the thinnest structurally and should be first in line for parity improvements:

- `max-care-go`
- `elessi-carry-lane`
- `elessi-glow-routine`
- `elessi-gem-atelier`
- `elessi-chrono-gallery`
- `elessi-garage-fit`
- `elessi-sprout-room`

### Why These Are P1

- total section depth is only `15` or `16` for most of them
- shop page depth is often only `2` sections
- they are more vulnerable to feeling like demos or re-skinned families beside stronger themes

## P1: Theme Parity Is Now Partly Generated, Not Fully Owned

The latest normalization pass now generates missing `collections`, `sale`, `thank-you`, and linked support pages for many themes. This fixes route parity, but it also highlights which themes still rely on generated scaffolding rather than theme-owned depth.

Highest-impact examples from the full audit:

- `electronics-demo` still uses generated parity for `collections`, `sale`, and `thank-you`, but its live normalized experience is now materially stronger because the theme-owned commerce pages and checkout flow were upgraded.
- `elessi-pedal-lab` and `elessi-harvest-fold` still show generated parity in the raw audit output, but their live normalized runtime now owns `shop`, `pdp`, `cart`, `checkout`, `sale`, `collections`, and `thank-you`.
- `elessi-signal-deck` and `elessi-tail-supply` now behave the same way: the raw audit still flags some generated parity pages because it reads source metadata, while the live normalized runtime now owns the core commerce funnel.
- Most current Elessi themes now have complete support-page coverage, but many of them still depend on generated `faq`, `shipping`, `returns`, `privacy`, and `terms` pages.
- `max-care-go` now covers `prescription` and `rx` safely, but those routes still need richer pharmacy-native experiences later.

This means the route problem is largely solved, while the next phase becomes **theme-owned depth and distinctiveness**.

## P1: Thin Shop Experience

These themes have `2` shop sections or less and should be reviewed for discovery weakness:

- `vanguard-premium`
- `solea-femme`
- `district-market`
- `legacy-default-old`
- `vela-fashion-eg`
- all current Elessi-pack themes

## Representative Live Checks

### `modern-minimal`

Live preview checks on:

- home
- cart
- checkout
- thank-you

What looked strong:

- theme-specific products match the category
- cart is pre-seeded and coherent
- checkout includes a clear review + contact + shipping flow
- thank-you page includes order summary, tracking prompt, and reorder path

### `max-care-go`

Live preview check on home and normalized checkout now shows:

- pharmacy-specific navigation
- prescription and pharmacist-oriented entry points
- a more mobile-first/store-utility direction than generic retail themes
- cleaner normalized checkout flow with duplicated inline payment summary removed when a dedicated sidebar summary exists

Main risk:

- it still sits inside the structurally thin group, so it needs deeper parity validation on cart, checkout, and post-purchase screens
- mobile preview is much cleaner now because the marketplace overlay stack no longer consumes the first screen, but the template still needs richer theme-owned shop/cart depth later

### `electronics-demo`

Live preview checks on:

- shop
- checkout
- thank-you

What is stronger now:

- shop discovery no longer feels like a flat 2-section catalog
- category and intent entry points are clearer and more electronics-native
- checkout now has a cleaner hierarchy closer to Shopify-style fast path expectations
- post-purchase now includes order review, tracking, reorder, and related upgrade suggestions

Main remaining risk:

- mobile still needs a dedicated viewport pass because the current validation was done in a desktop-oriented in-app browser frame

### `elessi-carry-lane`

Live preview check on home showed:

- relevant bag-focused merchandising and navigation
- category-specific copy and imagery

Main risk:

- it still feels structurally lighter than stronger flagship themes and may not be sufficiently differentiated from sibling Elessi themes

### `cafe-demo`

Live mobile review after the latest pass now shows:

- the first screen is no longer buried under conversion overlays
- the preview controls are compact enough to stop fighting the hero
- the home hero no longer leaks shoe-specific copy into a coffee storefront

Main risk:

- the theme still needs a stronger owned `shop` depth later if we want it to stand beside the stronger flagship presets, not just pass mobile cleanup

### `furniture-demo`

Live mobile review after the latest pass now shows:

- the large preview banner pressure is removed on mobile
- the hero and CTA start much earlier on the screen

Main risk:

- the commerce flow remains structurally thin compared with the stronger presets, especially on `shop`, `cart`, and post-purchase depth

## Routing Follow-Up

- The last known router gap from this pass was closed by supporting multi-segment dynamic theme pages.
- Internal theme links no longer depend on the old single-segment-only assumption.
- The next routing work should now come from future feature needs, not from current marketplace parity gaps.

## Process Risks

- `H:/max_p_new/docs/storefront-theme-audit-2026-04-27.md` should be treated as a historical structural review, not the current live source of truth.
- In-app browser popups can block the marketplace “Preview” button, so direct `/store?...previewTheme=...` URLs are more reliable for auditing.
- the earlier `atelier-nova` validation blocker is no longer present in the current worktree state:
  - latest `npm run validate:themes` passed across `58` storefront presets on `2026-04-27`

## Recommended Execution Order

1. Lock preview data parity with regression tests.
2. Replace generated parity with stronger theme-owned pages for the thinnest families first.
3. Run a dedicated mobile pass on priority themes.
4. Separate overlapping families structurally, not only visually.
5. Re-score the entire marketplace using the Shopify rubric after fixes.
