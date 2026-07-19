# Plan: Kids Shoes Storefront Template

**Generated**: 2026-04-08
**Estimated Complexity**: Medium-High
**Working Template ID**: `kids-shoes-store` (placeholder until brand name is confirmed)

## Overview
Build a new Arabic-first storefront template for a children's shoes store by extending the existing `frontend/src/storefront` theme system instead of creating a separate frontend. The fastest and lowest-risk path is to fork the current child-focused foundation around `kids-play`, then retune it for footwear merchandising, size confidence, parent trust, and stronger product conversion on home, shop, PDP, cart, and checkout.

This plan assumes:
- The template will live inside the current Vite storefront system, not a separate app.
- Deployment is not tied to Vercel.
- The primary audience is Arabic-speaking parents shopping on mobile first.
- We want a reusable template, not a one-off store customization.

## Architecture Decisions
- Reuse the storefront theme engine instead of creating a parallel page system.
- Start from the existing child-oriented preset (`kids-play`) and evolve it into a footwear-specific theme.
- Keep the implementation vendor-neutral: no `@vercel/*` dependencies or platform coupling.
- Prioritize conversion patterns for commerce: size clarity, age guidance, trust signals, delivery/return reassurance, and cross-sell blocks.
- Use existing section and variant infrastructure first; create new variants only where footwear-specific UX is genuinely missing.
- Keep motion mostly CSS-native and restrained; use playful animation only where it improves discovery without hurting performance.

## Skill and Tool Mapping
- `planner`: structure the work into phases and checkpoints.
- `planning-and-task-breakdown`: keep tasks atomic and independently verifiable.
- `theme-foundation`: derive a coherent color system from the chosen brand color.
- `page-cro`: shape hero, trust, CTA, and merchandising blocks for better conversion.
- `shadcn-ui`: reuse existing UI primitives where new storefront controls are needed.
- `elite-css-animations`: add lightweight playful polish without turning the template into a heavy animation build.
- `Canva` (optional): useful only for moodboards, promo banners, preview images, and launch assets; not for the code template itself.

## Relevant Existing Files
- `frontend/src/storefront/themes/kids-play.json`
- `frontend/src/storefront/blueprints/presets/kidsPlay.ts`
- `frontend/src/storefront/themes/index.ts`
- `frontend/src/storefront/themes/catalog.ts`
- `frontend/src/storefront/variants/registry.ts`
- `frontend/src/storefront/engine/themeResolver.ts`
- `frontend/src/storefront/scripts/validate-themes.ts`
- `frontend/src/storefront/scripts/validate-blueprints.ts`
- `frontend/src/storefront/__tests__/themeCatalog.test.ts`
- `frontend/src/storefront/__tests__/themeResolver.test.ts`
- `frontend/src/storefront/__tests__/themeValidation.test.ts`

## Prerequisites
- Confirm the commercial direction: playful mass-market, premium orthopedic, or fashion-forward kids shoes.
- Confirm whether the template is Arabic-only or Arabic + English.
- Choose a provisional brand color and template name.
- Gather or generate 4-6 placeholder product images for preview and QA.

## Sprint 1: Product Positioning and Theme Foundation
**Goal**: Define the merchandising angle and establish a footwear-ready visual system.
**Demo/Validation**:
- A written positioning brief exists for the new template.
- A draft token direction exists for color, typography, and shape.
- We can explain how this template differs from `kids-play`.

### Task 1.1: Write the template positioning brief
- **Location**: `docs/kids-shoes-storefront-template-plan.md` and implementation notes in `docs/` if needed
- **Description**: Define target buyer, store personality, price perception, core differentiators, and the must-win purchase anxieties for parents.
- **Dependencies**: None
- **Acceptance Criteria**:
  - Primary audience is explicit.
  - The template promise is footwear-specific, not generic kids retail.
  - Top conversion anxieties are listed: fit, comfort, durability, hygiene, delivery, returns.
- **Validation**:
  - Manual review against the current `kids-play` language and sections.

### Task 1.2: Generate the theme foundation from a brand color
- **Location**: future theme tokens in `frontend/src/storefront/themes/kids-shoes-store.json`
- **Description**: Use the `theme-foundation` workflow to derive primary, secondary, and neutral ramps, then map them to storefront token fields.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Colors read as child-friendly but still credible for parents.
  - Contrast is sufficient for CTA buttons and badges.
  - The system avoids copying the exact `kids-play` palette.
- **Validation**:
  - Manual contrast check on primary buttons, badges, and product cards.

### Task 1.3: Choose typography and shape language
- **Location**: future theme tokens in `frontend/src/storefront/themes/kids-shoes-store.json`
- **Description**: Pick heading/body fonts and roundness values that feel friendly, modern, and more product-focused than toy-like.
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - Headings remain legible in Arabic.
  - Buttons, badges, and cards feel safe and approachable without looking overly childish.
  - Typography works on mobile product cards and dense catalog UI.
- **Validation**:
  - Manual review at mobile and desktop breakpoints in Storybook or local storefront preview.

## Sprint 2: Theme and Blueprint Creation
**Goal**: Register a new template end-to-end in the storefront theme system.
**Demo/Validation**:
- New theme can be resolved by ID.
- New blueprint exists and passes validation.
- Theme appears in the catalog fallback list with accurate description.

### Task 2.1: Create the new theme JSON preset
- **Location**: `frontend/src/storefront/themes/kids-shoes-store.json`
- **Description**: Fork `kids-play.json` into a footwear-specific theme with updated SEO, navigation labels, footer copy, and page sections.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - Theme ID and name are unique.
  - Copy references shoes, sizes, comfort, school/daycare/play use cases, not toys.
  - Home, shop, PDP, cart, and checkout pages all have valid section arrays.
- **Validation**:
  - `npm run validate:themes`

### Task 2.2: Create the blueprint preset
- **Location**: `frontend/src/storefront/blueprints/presets/kidsShoesStore.ts`
- **Description**: Add the blueprint equivalent of the new theme so the manual preset system stays aligned with the JSON theme.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Blueprint mirrors the intended page composition.
  - Theme tokens match the JSON preset direction.
  - The new preset follows current blueprint typing and structure conventions.
- **Validation**:
  - `npm run validate:blueprints`

### Task 2.3: Register the theme in catalog/index exports
- **Location**:
  - `frontend/src/storefront/themes/index.ts`
  - `frontend/src/storefront/themes/catalog.ts`
- **Description**: Import/export the new preset, add its description, and wire preview metadata if needed.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - The theme is available through `getStorefrontThemePreset`.
  - Catalog fallback includes correct description and preview colors.
  - No existing preset IDs regress.
- **Validation**:
  - `npm run test:storefront-themes`

## Sprint 3: Commerce-Specific UX and Section Tuning
**Goal**: Make the template genuinely better for kids shoes than the current generic child-focused preset.
**Demo/Validation**:
- Home page communicates footwear value clearly within one screen.
- PDP reduces fit anxiety and highlights trust signals.
- Shop page improves discovery by size/use-case rather than only generic browsing.

### Task 3.1: Recompose the home page for footwear merchandising
- **Location**: `frontend/src/storefront/themes/kids-shoes-store.json` and `frontend/src/storefront/blueprints/presets/kidsShoesStore.ts`
- **Description**: Replace toy-oriented messaging with footwear-specific blocks such as school shoes, first walkers, sandals, sneakers, and easy-size shopping.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - Hero headline states what is being sold in under 5 seconds.
  - One primary CTA dominates the hero.
  - Above-the-fold trust includes fit/return/shipping reassurance.
- **Validation**:
  - Manual CRO review against `page-cro` criteria.

### Task 3.2: Tune shop discovery for parent shopping behavior
- **Location**: existing shop sections plus any new settings in theme/blueprint files
- **Description**: Shift discovery language and filter emphasis toward age, size, occasion, and comfort, even if the underlying data model stays unchanged initially.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Shop page supports quick scanning by parent intent.
  - Product grid titles and collection labels fit footwear use cases.
  - No toy-specific or irrelevant merchandising remains.
- **Validation**:
  - Manual walkthrough on mobile and desktop.

### Task 3.3: Strengthen PDP conversion content
- **Location**: theme/blueprint composition and, if needed, targeted section variants under `frontend/src/storefront/sections` or `frontend/src/storefront/components`
- **Description**: Emphasize size guidance, material comfort, closure type, anti-slip messaging, delivery estimate, exchange policy, and related products.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - PDP trust content answers common parent objections before checkout.
  - Conversion stack remains concise on mobile.
  - Cross-sell block is relevant to shoes and accessories.
- **Validation**:
  - Manual PDP review with a sample product.

### Task 3.4: Add new section variants only if the existing library is insufficient
- **Location**:
  - `frontend/src/storefront/variants/registry.ts`
  - `frontend/src/storefront/sections/**`
  - `frontend/src/storefront/components/**`
- **Description**: If current variants cannot support footwear needs, add tightly scoped new variants such as a size-confidence bar, school-use feature row, or age/fit collection tiles.
- **Dependencies**: Tasks 3.1-3.3
- **Acceptance Criteria**:
  - Every new variant has a clear commerce purpose.
  - Registry metadata lists archetype fit and best page usage.
  - New variants are reusable beyond a single preset.
- **Validation**:
  - `npm run test:storefront-themes`
  - Add or update focused storefront tests where logic changes.

## Sprint 4: Visual Polish, Motion, and Preview Assets
**Goal**: Make the template feel intentional and market-ready without bloating implementation risk.
**Demo/Validation**:
- Theme preview looks distinct in the catalog.
- Motion is light, consistent, and accessible.
- The template is presentable for internal review or customer demo.

### Task 4.1: Add restrained playful motion
- **Location**: likely `frontend/src/storefront/styles/**`, section styles, or component-local styles
- **Description**: Use `elite-css-animations` patterns for subtle reveal, hover lift, badge motion, or soft background movement in hero/collection sections.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Motion supports merchandising rather than distracting from shopping.
  - `prefers-reduced-motion` is respected.
  - Mobile performance remains acceptable.
- **Validation**:
  - Manual browser check on home and PDP.

### Task 4.2: Create preview imagery and merchandising placeholders
- **Location**: likely `frontend/public/assets/themes/kids-shoes-store/` or current preview asset convention
- **Description**: Produce catalog preview imagery and placeholder promo banners. Canva can help here if quick marketing assets are needed.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - Catalog preview image exists.
  - Colors and layout reflect the actual theme identity.
  - Placeholder visuals do not conflict with Arabic layout direction.
- **Validation**:
  - Manual catalog verification.

### Task 4.3: Final QA for theme resolution and storefront stability
- **Location**:
  - `frontend/src/storefront/__tests__/themeCatalog.test.ts`
  - `frontend/src/storefront/__tests__/themeResolver.test.ts`
  - `frontend/src/storefront/__tests__/themeValidation.test.ts`
- **Description**: Extend tests where needed and verify the new preset does not break catalog generation, theme resolution, or validation flows.
- **Dependencies**: Tasks 4.1-4.2
- **Acceptance Criteria**:
  - Theme resolves cleanly through existing engine code.
  - Validation scripts pass.
  - Test coverage exists for the new theme registration path.
- **Validation**:
  - `npm run test:storefront-themes`
  - `npm run validate:themes`
  - `npm run validate:blueprints`

## Testing Strategy
- Prefer storefront-specific validation first:
  - `npm run validate:themes`
  - `npm run validate:blueprints`
  - `npm run test:storefront-themes`
- Run manual checks on:
  - Home page first screen
  - Shop discovery flow
  - PDP trust/conversion stack
  - Cart and checkout clarity
- Verify both RTL rendering and mobile-first spacing before visual polish is considered complete.

## Parallelization Opportunities
- Safe in parallel after Sprint 1:
  - Theme JSON preset
  - Blueprint preset
  - Preview asset production
- Needs coordination:
  - Any new section variants that require registry changes
  - Copywriting and QA for home/PDP if the section composition changes midstream

## Potential Risks and Gotchas
- The current `kids-play` preset is toy-oriented, so shallow copy changes could leave the new template feeling mislabeled.
- Over-indexing on playful visuals may reduce trust for parents looking for quality and durability.
- If the underlying product data lacks size/age/material fields, some UX improvements may need placeholder copy first and real data wiring later.
- Preview assets and catalog metadata can lag behind implementation if not planned explicitly.
- A footwear-specific theme may need one or two new section variants; forcing everything through existing variants could produce a generic result.

## Rollback Plan
- Keep all work additive under a new theme ID.
- Do not modify `kids-play` directly.
- If the new theme introduces regressions, remove its registration from:
  - `frontend/src/storefront/themes/index.ts`
  - `frontend/src/storefront/themes/catalog.ts`
  - any newly added preview asset references
- Existing presets should remain unaffected because the new work is isolated by ID.

## Open Questions
- Should the visual direction lean more toward playful/cartoon, premium orthopedic, or back-to-school practical?
- Is the first release Arabic-only, or should we preserve bilingual content from day one?
- Do you want the template optimized for a single-brand store or a broader multi-brand catalog?
