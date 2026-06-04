# Plan: Storefront Themes Shopify Audit

**Generated**: 2026-04-27
**Estimated Complexity**: High

## Overview

This plan covers a full audit of the live storefront theme registry, with a theme-by-theme review of:

- marketplace preview realism
- storefront page coverage and quality
- order and cart preview flows
- mobile behavior
- alignment with Shopify theme best practices

The goal is not only to catch broken previews, but to raise the weakest themes until the whole marketplace feels intentionally differentiated, conversion-ready, and mobile-safe.

## Current State Snapshot

- Live registry on **2026-04-27** resolves to **55 themes** in the current codebase, not 65.
- Marketplace preview product coverage is now **55/55** themes.
- All 55 themes currently expose the core page set:
  - `home`
  - `shop`
  - `pdp`
  - `cart`
  - `checkout`
- After theme normalization, supported linked internal pages are now covered at **306/306**.
- `43` themes currently receive generated support pages, totaling `213` generated pages across the registry.
- The main parity gap has moved from preview data coverage and dead links to **experience depth parity**.
- the remaining thin-family risk is now concentrated in a smaller cluster of structurally light themes:
  - `elessi-carry-lane`
  - `elessi-glow-routine`
  - `elessi-gem-atelier`
  - `elessi-chrono-gallery`
  - `elessi-garage-fit`
  - `elessi-sprout-room`
  - `max-care-go`

## External Benchmarks

This audit should use Shopify’s current official guidance as the comparison rubric:

- Theme store requirements:
  - uniqueness at the architectural level
  - clear navigation from homepage to discovery to product to cart to checkout
  - realistic demo store content
  - product, collection, cart, page, search, and customer template expectations
- Theme development principles:
  - be purpose-built
  - be mobile first
  - offer best-in-class UX
  - minimize JavaScript where possible
- Design principles:
  - intuitive product discovery
  - prominent title, price, and buy button on PDP
  - fast, clear path to checkout
  - avoid dark patterns
- Accessibility and performance:
  - keyboard-safe navigation
  - visible focus states
  - descriptive alt text
  - mobile-safe zoom behavior
  - Lighthouse-based accessibility and performance checks
- Multi-segment linked theme pages are now supported as well, including `airlume-ai` -> `/auth/login`

## Prerequisites

- Local app running at `http://localhost:3001`
- Working preview routes under `/store`
- Theme source of truth from:
  - `H:/max_p_new/frontend/src/storefront/themes/index.ts`
  - `H:/max_p_new/frontend/src/storefront/themes/catalog.ts`
  - `H:/max_p_new/frontend/src/storefront/preview/marketplaceSampleData.ts`
  - `H:/max_p_new/frontend/src/storefront/preview/marketplacePreviewCart.ts`
  - `H:/max_p_new/frontend/src/storefront/preview/marketplacePreviewOrder.ts`
- Existing structural audit for reference only:
- `H:/max_p_new/docs/storefront-theme-audit-2026-04-27.md`

## Execution Progress Update

- route parity is now stable enough that execution has shifted to theme-depth upgrades and live verification
- `electronics-demo` received a focused commerce upgrade in code:
  - richer `shop` discovery
  - stronger `pdp` decision support
  - stronger `cart`, `checkout`, and `thank-you`
- checkout summary dedupe is now applied in matching normalized flows so themes don't show the same order summary twice when both `payment` and `order-summary` are present
- verified after this execution step:
  - `npx vitest run src/storefront/__tests__/themeGeneratedPages.test.ts src/storefront/__tests__/elessiPackThemes.test.ts src/storefront/__tests__/checkoutPageCart.test.tsx`
  - `npm run validate:themes`
  - `npm run audit:storefront-themes -- --themes electronics-demo,max-care-go,elessi-carry-lane,airlume-ai`
- new execution progress from the mobile pass:
  - marketplace mobile preview chrome is now compact instead of banner-heavy on small screens
  - conversion-suite overlays are suppressed on small-screen marketplace previews so the user audits the template itself first
  - `split-panel` hero fallback copy is now category-safe and no longer leaks shoe-oriented messaging into unrelated themes such as `cafe-demo`
  - `split-panel` mobile typography and CTA sizing were tightened for narrower viewports
  - live mobile screenshots were refreshed for:
    - `cafe-demo`
    - `max-care-go`
    - `furniture-demo`
  - targeted validation that passed after this step:
    - `npx vitest run src/storefront/__tests__/storefrontPreview.test.tsx`
    - `npm run audit:storefront-themes -- --themes cafe-demo,max-care-go,furniture-demo`
- new execution progress from the theme-owned page pass:
  - `cafe-demo` now resolves to a theme-owned commerce journey across `shop`, `pdp`, `cart`, `checkout`, `sale`, `collections`, and `thank-you`
  - `furniture-demo` now resolves to a theme-owned commerce journey across the same core funnel and support surfaces
  - both themes were removed from the generic market family fallback path for `pdp` and checkout-related page treatment
  - `cafe-demo` now uses category-aware coffee discovery lanes tied to its preview dataset:
    - `beans`
    - `cold-brews`
    - `pastries`
    - `brew-tools`
  - `furniture-demo` now uses room-led discovery tied to its preview dataset:
    - `living-room`
    - `tables`
    - `lighting`
    - `decor`
  - targeted validation that passed after this step:
    - `npx vitest run src/storefront/__tests__/themeExperienceOverrides.test.ts`
    - `npx vitest run src/storefront/__tests__/storefrontPreview.test.tsx`
    - `npm run audit:storefront-themes -- --themes cafe-demo,furniture-demo,max-care-go`
  - focused mobile screenshot refresh after this step covered:
    - `cafe-demo` home + checkout
    - `furniture-demo` shop + checkout
  - result:
    - page depth parity is now materially better on two of the previously weakest themes
    - remaining priority is shifting further toward `max-care-go` and the Elessi thin-family group
- new execution progress from the bike + grocery Elessi pass:
  - `elessi-pedal-lab` now resolves to a theme-owned commerce journey across `shop`, `pdp`, `cart`, `checkout`, `sale`, `collections`, and `thank-you`
  - `elessi-harvest-fold` now resolves to a theme-owned commerce journey across the same funnel instead of depending on a thin shared runtime experience
  - both themes now start shop discovery from theme-specific customer intent instead of a flat title + search + grid sequence
  - `elessi-pedal-lab` now uses explicit bike-specific runtime surfaces:
    - `elessi-bike-toolbar`
    - `elessi-bike-shop-grid`
    - `elessi-bike-gallery`
    - `elessi-bike-buybox`
    - ride-oriented `command` cart/checkout/aftercare copy
  - `elessi-harvest-fold` now uses explicit grocery-specific runtime surfaces:
    - `elessi-organic-toolbar`
    - `elessi-organic-shop-grid`
    - `elessi-organic-gallery`
    - `elessi-organic-buybox`
    - basket-oriented `nature` cart/checkout/aftercare copy
  - targeted validation that passed after this step:
    - `npx vitest run src/storefront/__tests__/themeExperienceOverrides.test.ts src/storefront/__tests__/themeGeneratedPages.test.ts`
    - `npm run audit:storefront-themes -- --themes elessi-pedal-lab,elessi-harvest-fold`
    - `npm run validate:themes`
  - focused mobile screenshot refresh after this step covered:
    - `elessi-pedal-lab` shop + checkout + collections + thank-you
    - `elessi-harvest-fold` shop + checkout + collections + thank-you
  - result:
    - two more thin Elessi presets now read like purpose-built storefronts on mobile instead of identity-only demos with shallow funnels
    - the next Elessi priority is shifting toward `elessi-signal-deck`, `elessi-tail-supply`, `elessi-gem-atelier`, and `elessi-sprout-room`
  - current truth update:
    - the earlier `atelier-nova` validation blocker is no longer present in the current worktree
    - latest `npm run validate:themes` passed across `58` storefront presets on `2026-04-27`
- new execution progress from the digital + pet Elessi pass:
  - `elessi-signal-deck` now resolves to a theme-owned commerce journey across `shop`, `pdp`, `cart`, `checkout`, `sale`, `collections`, and `thank-you`
  - `elessi-tail-supply` now resolves to the same theme-owned funnel instead of depending on a thin shared runtime experience
  - both themes now start shop discovery from theme-specific customer intent instead of a flat title + search + grid sequence
  - `elessi-signal-deck` now uses explicit digital/device runtime surfaces:
    - `elessi-digital-toolbar`
    - `elessi-digital-catalog-grid`
    - `elessi-digital-gallery`
    - `elessi-digital-buybox`
    - `command` cart / checkout / aftercare copy
  - `elessi-tail-supply` now uses explicit pet-routine runtime surfaces:
    - `elessi-filter-deck`
    - `elessi-compact-shelf`
    - `elessi-showroom`
    - `elessi-pet-buybox`
    - `nature` cart / checkout / aftercare copy
  - targeted validation that passed after this step:
    - `npx vitest run src/storefront/__tests__/themeExperienceOverrides.test.ts src/storefront/__tests__/themeGeneratedPages.test.ts`
    - `npm run audit:storefront-themes -- --themes elessi-signal-deck,elessi-tail-supply`
    - `npm run validate:themes`
  - focused mobile screenshot refresh after this step covered:
    - `elessi-signal-deck` shop + checkout + collections + thank-you
    - `elessi-tail-supply` shop + checkout + collections + thank-you
  - result:
    - two more thin Elessi presets now read like purpose-built storefronts on mobile instead of identity-only demos with shallow funnels
    - the next Elessi priority is shifting toward `elessi-gem-atelier`, `elessi-sprout-room`, `elessi-glow-routine`, and `elessi-garage-fit`
  - important nuance:
    - raw audit output still reports some generated support surfaces for both themes because it reads source metadata, while the live normalized runtime now owns the core commerce funnel

## Sprint 1: Build The Audit Harness

**Goal**: Establish one trustworthy manifest for all live themes, routes, preview assets, and order/cart preview readiness.

**Demo/Validation**:

- Generate a machine-readable manifest for all live themes.
- Confirm route coverage and preview coverage from code, not from manual counting.
- Produce a first-pass red-flag list.

### Task 1.1: Create a live theme manifest

- **Location**:
  - `H:/max_p_new/frontend/src/storefront/themes/index.ts`
  - `H:/max_p_new/frontend/src/storefront/themes/catalog.ts`
  - `H:/max_p_new/frontend/scripts/` or `H:/max_p_new/frontend/tmp/` for a one-off audit script
- **Description**:
  - Generate a live manifest containing theme id, category, route keys, section counts, preview image source, preview dataset status, cart preview status, and order preview status.
  - Persist the output under `H:/max_p_new/docs/` as JSON or Markdown for repeatable comparison.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Manifest matches the runtime registry count.
  - Manifest includes all 55 current themes.
  - No manual copying is required to refresh the report.
- **Validation**:
  - Run a script from `H:/max_p_new/frontend`
  - Cross-check with `/marketplace/themes`

### Task 1.2: Define the storefront quality rubric

- **Location**:
  - `H:/max_p_new/docs/storefront-themes-shopify-audit-plan.md`
  - `H:/max_p_new/docs/storefront-theme-shopify-rubric.md`
- **Description**:
  - Convert Shopify’s guidance into a concrete review rubric for this codebase.
  - Score each theme on:
    - preview realism
    - page completeness
    - product discovery
    - PDP quality
    - cart and checkout clarity
    - order confirmation and tracking
    - mobile layout safety
    - theme uniqueness
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Rubric is specific enough to rate every theme consistently.
  - Every score maps to observable evidence.
- **Validation**:
  - Spot-check the rubric against three different theme families.

### Task 1.3: Flag current P0/P1 gaps from code

- **Location**:
  - `H:/max_p_new/docs/storefront-theme-priority-findings.md`
- **Description**:
  - Produce an initial backlog from the manifest before any visual review.
  - Include:
    - missing `thank-you` routes
    - thin shop pages
    - minimal families with low section depth
    - outdated audit files that reference removed themes
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Findings are grouped by severity.
  - Findings distinguish runtime truth from legacy docs.
- **Validation**:
  - Cross-check a sample against live snapshots and source files.

## Sprint 2: Theme-By-Theme Live Review

**Goal**: Review the live experience for every theme, grouped by family, across core pages and preview order flow.

**Demo/Validation**:

- Each theme receives a review row with pass/fail notes.
- Representative screenshots or snapshots exist for each family.
- Broken or weak flows are reproducible through direct preview URLs.

### Task 2.1: Review every theme home page

- **Location**:
  - `H:/max_p_new/docs/storefront-theme-review-matrix.md`
- **Description**:
  - Review the home page for each theme against:
    - quality of hero and first screen
    - presence of discovery entry points
    - clarity of value proposition
    - realism of products and merchandising
    - distinctiveness from nearby themes
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Every theme has a home page status.
  - Duplicate-feeling themes are grouped into redesign buckets.
- **Validation**:
  - Smoke-check direct preview URLs under `/store?previewTheme=...`

### Task 2.2: Review shop, PDP, cart, checkout, and thank-you

- **Location**:
  - `H:/max_p_new/docs/storefront-theme-review-matrix.md`
  - `H:/max_p_new/frontend/src/storefront/StorefrontShell.tsx`
- **Description**:
  - For every theme, review:
    - shop browsing and discovery
    - PDP purchase clarity
    - cart summary quality
    - checkout confidence and friction
    - thank-you continuity and post-purchase messaging
  - Record whether the theme is:
    - strong
    - acceptable
    - thin
    - misleading
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Every theme is checked across the core funnel.
  - Missing or shallow pages are explicitly labeled.
- **Validation**:
  - Navigate directly to `/store/shop`, `/store/product/:slug`, `/store/cart`, `/store/checkout`, `/store/thank-you`

### Task 2.2a: Upgrade thin commerce themes while auditing

- **Location**:
  - `H:/max_p_new/frontend/src/storefront/themes/experienceOverrides.ts`
  - `H:/max_p_new/frontend/src/storefront/__tests__/themeGeneratedPages.test.ts`
- **Description**:
  - When a weak theme is confirmed live, do not stop at scoring it.
  - Upgrade the theme-owned commerce flow in the same pass when the fix is high leverage and structurally clear.
  - Current completed examples:
    - `electronics-demo`
    - `cafe-demo`
    - `furniture-demo`
    - `elessi-pedal-lab`
    - `elessi-harvest-fold`
    - `elessi-signal-deck`
    - `elessi-tail-supply`
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - The selected thin theme no longer feels like a fallback family in `shop`, `checkout`, and `thank-you`.
  - Tests lock the strengthened structure.
- **Validation**:
  - Live preview + targeted tests + targeted theme audit

### Task 2.3: Validate preview orders and tracked orders

- **Location**:
  - `H:/max_p_new/frontend/src/storefront/preview/marketplacePreviewOrder.ts`
  - `H:/max_p_new/frontend/src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts`
- **Description**:
  - For every theme family, verify that preview orders feel native to the theme and category.
  - Check:
    - order naming realism
    - line items
    - totals
    - payment method
    - shipping address tone
    - tracked-order continuity
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - No theme falls back to a clearly unrelated order profile.
  - Tracked order and purchase tracking remain aligned.
- **Validation**:
  - Automated tests plus manual spot checks for at least one theme per family

## Sprint 3: Mobile And Shopify Benchmarking

**Goal**: Measure each theme against mobile expectations and Shopify’s current best practices.

**Demo/Validation**:

- A mobile QA matrix exists for representative themes and all flagged weak themes.
- Shopify comparison notes are attached to each finding.

### Task 3.1: Create the mobile QA matrix

- **Location**:
  - `H:/max_p_new/docs/storefront-theme-mobile-matrix.md`
- **Description**:
  - Review the core funnel on mobile for:
    - `390x844`
    - `430x932`
    - `768x1024`
  - Check:
    - header and navigation collapse
    - hero readability
    - product grid density
    - sticky add-to-cart behavior
    - cart and checkout overflow
    - tappable controls and spacing
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Every weak or high-priority theme gets a mobile note.
  - At least one strong theme per category is used as a mobile reference.
- **Validation**:
  - Browser-based review and screenshot comparison

### Task 3.1 Note

- Desktop and normalized-flow verification are now ahead of full viewport emulation.
- The next concrete execution step should be a dedicated mobile pass for:
  - `max-care-go`
  - `elessi-carry-lane`
  - remaining thin Elessi family themes after `elessi-pedal-lab`, `elessi-harvest-fold`, `elessi-signal-deck`, and `elessi-tail-supply`
  - `furniture-demo`
  - `cafe-demo`

### Task 3.2: Map findings to Shopify requirements

- **Location**:
  - `H:/max_p_new/docs/storefront-theme-shopify-gap-analysis.md`
- **Description**:
  - Translate audit findings into Shopify-style gaps:
    - uniqueness failure
    - demo realism weakness
    - weak product discovery
    - weak PDP buying stack
    - thin cart or checkout
    - mobile-first failures
    - accessibility failures
    - performance risk
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Every major gap maps to a specific Shopify principle or requirement.
  - The document distinguishes between:
    - must-fix for quality parity
    - must-fix for Shopify-style compliance
    - nice-to-have polish
- **Validation**:
  - Review at least 10 themes across multiple categories and confirm mapping consistency

### Task 3.3: Establish automated performance and accessibility checks

- **Location**:
  - `H:/max_p_new/frontend`
  - `H:/max_p_new/frontend/package.json`
  - `H:/max_p_new/frontend/vite.config.ts`
- **Description**:
  - Add or document repeatable checks for:
    - Lighthouse on home/shop/pdp
    - keyboard navigation basics
    - image alt coverage
    - heading order sanity
  - Start with representative themes, then expand to priority themes.
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - There is a repeatable command or workflow for accessibility/performance checks.
  - Results can be tracked per theme family.
- **Validation**:
  - Run on at least 3 representative themes

## Sprint 4: Fix Backlog And Theme Differentiation

**Goal**: Turn the audit into an ordered execution backlog that improves both parity and distinctiveness.

**Demo/Validation**:

- A prioritized fix list exists with owners, files, and verification steps.
- Each sprint ends with a smaller set of improved themes that can be demoed.

### Task 4.1: P0 fixes

- **Location**:
  - storefront preview and routing files
- **Description**:
  - Fix anything that makes a theme misleading or broken:
    - wrong preview products
    - broken preview routes
    - empty or weak cart/order states
    - missing critical CTAs
    - obvious mobile breakage
- **Dependencies**: Sprint 2 and Sprint 3 outputs
- **Acceptance Criteria**:
  - No theme has a broken preview funnel.
- **Validation**:
  - Manual smoke test on all P0 themes

### Task 4.2: P1 parity fixes

- **Location**:
  - theme presets and shared storefront shell sections
- **Description**:
  - Raise shallow families to minimum acceptable parity:
    - strengthen shop structure
    - add or normalize thank-you pages
    - improve PDP clarity
    - improve cart/checkout communication
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Thin themes stop feeling like demos next to stronger production-ready themes.
- **Validation**:
  - Compare before/after theme matrix scores

### Task 4.3: P2 differentiation and family separation

- **Location**:
  - theme preset definitions
  - shared section libraries
  - theme assets
- **Description**:
  - Break up families that feel too close:
    - Elessi-based pack themes
    - overlapping fashion themes
    - overlapping generic retail themes
  - Differentiate:
    - information architecture
    - merchandising rhythm
    - card systems
    - category entry points
    - content voice
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - Similarity is reduced through structure, not just cosmetics.
- **Validation**:
  - Re-run structural comparison and manual review

## Testing Strategy

- Manifest generation check on every registry change
- Targeted unit tests for preview product/cart/order helpers
- Route smoke tests for:
  - `/store`
  - `/store/shop`
  - `/store/product/:slug`
  - `/store/cart`
  - `/store/checkout`
  - `/store/thank-you`
- Manual review of representative themes per category
- Mobile QA pass on priority themes
- Accessibility and Lighthouse checks on representative themes

## Priority Buckets

### P0

- Any theme with mismatched preview data
- Any theme with broken route, cart, checkout, or order preview
- Any theme with severe mobile breakage

### P1

- Themes with missing `thank-you`
- Minimal 5-page families with only 15 sections total
- Themes with weak shop depth or weak PDP buying stack

### P2

- Themes that feel too similar to another theme
- Themes that are technically complete but not distinct enough

### P3

- Accessibility polish
- Performance hardening
- Editorial and demo-store realism improvements

## Potential Risks & Gotchas

- The older audit file under `H:/max_p_new/docs/storefront-theme-audit-2026-04-27.md` references a larger and older registry shape, so it must not be treated as the current source of truth.
- In-app preview popups can be blocked in some browser contexts, so direct `/store?...previewTheme=...` URLs are more reliable for testing.
- A theme can pass preview data checks and still fail the real quality bar because of shallow structure or poor mobile hierarchy.
- Shared section infrastructure can hide theme-level duplication; similarity must be judged at the experience level, not only at token level.
- Route parity is no longer the primary issue; the remaining work is about theme depth, mobile quality, and distinctiveness.

## Rollback Plan

- Audit documents and scripts can be removed without affecting runtime behavior.
- If any validation helpers are added under `frontend/scripts` or tests, keep them isolated and reversible.
- Do not merge structural theme changes and audit-only tooling in the same commit when implementation begins.
