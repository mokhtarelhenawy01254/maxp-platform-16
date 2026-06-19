# New Theme Playbook

Use this playbook whenever the request is "new theme", "new template", "marketplace template", "general store template", or any other task where the user expects a visibly different storefront experience.

## 1. Lock The Working Inputs

- Target segment: what kind of merchant or catalog is this for?
- Primary buyer: who decides, what do they fear, what persuades them?
- Device posture: mobile-first, desktop-heavy, or balanced?
- Locale: Arabic-only, bilingual, Egypt-first, GCC-first, etc.
- Catalog shape: dense catalog, curated catalog, high-ticket PDP-heavy, impulse-buy, multi-category, etc.
- Trust anxieties: sizing, delivery, COD confidence, authenticity, ingredients, warranty, returns, freshness, installation, etc.
- Must-have pages: `home`, `shop`, `collections`, `pdp`, `cart`, `checkout`, and any system pages such as `thank-you`, `faq`, `size-guide`, `contact`, or policy pages.

If inputs are missing, infer reasonable defaults from the product type and note the assumptions in docs or `metadata.notes`.

## 2. Audit The Nearest Existing Themes First

Inspect the 3-5 closest existing themes and blueprints before authoring the new one:

- `frontend/src/storefront/themes/*.json`
- `frontend/src/storefront/blueprints/presets/*.ts`
- `frontend/src/storefront/themes/catalog.ts`

Capture a quick signature for each nearby theme:

- `home`: first fold + first 3 sections
- `shop`: layout hint + first 3 sections
- `pdp`: dominant trust pattern + first 3 sections
- `cart` and `checkout`: what is emphasized first?

Write down what not to repeat.

## 2.5. Audit External Reference Themes As Pattern Banks Only

If you inspect an external demo such as a ThemeForest, Shopify, or WooCommerce theme:

- log the source and the specific pages reviewed
- extract patterns, capabilities, merchandising ideas, and mobile/RTL behavior cues
- break them into `sections`, `variants`, and `capabilities`
- explicitly write what will be rejected

Do not let the external reference theme dictate:

- page architecture
- section order
- conversion flow
- PDP decision logic
- the visible anatomy of an `All-New Variants` theme

Use it as a benchmark library, not as the skeleton.

## 2.6. Reference-Locked Expansion Packs

If the user wants multiple themes from one anchor reference such as `Elessi`:

- declare the anchor reference explicitly
- document the shared DNA that all themes should retain
- document the divergence axes that must separate them
- require every critical user-facing family in scope to be `New to library`
- allow reuse only for engines, logic, data plumbing, and registries
- reject any theme that consumes old visible library families instead of adding new ones
- review the pack with a `Library Delta Audit`, not only single-theme screenshots

## 3. Compose Each Page From Scratch

Do not begin by copying another theme's `pages.*.sections`.

For every key page, define:

- `pageGoal`
- `layoutHint`
- first-fold intent
- primary CTA
- trust mechanism
- discovery mechanism
- supporting sections
- content density

Only after this page map exists should you map it to current sections, variants, and blueprint/page override structures.

Before implementation starts, also decide which new variant this theme will introduce and on which key page it will appear.

## 4. Use Archetypes Deliberately

Pick an archetype for each page instead of inheriting one accidentally.

### Home Archetypes

- Category-led command center
- Editorial story-commerce
- Offer-bento launch pad
- Trust-led reassurance home
- Discovery magazine
- Problem-solution conversion page

### Shop Archetypes

- Filter-rail marketplace
- Comparison-first grid
- Collection-strips merchandising page
- Editorial merch map
- Quick-buy dense catalog

### PDP Archetypes

- Sticky buy column
- Proof-first PDP
- Fit-guide-first PDP
- Bundle-led PDP
- Comparison-led PDP
- Media-story PDP

### Cart And Checkout Archetypes

- Speed-to-checkout
- Reassurance-led
- Bundle rescue / add-on recovery
- COD-confidence / delivery-clarity

Choose combinations that are not already dominant in the nearest themes.

## 5. Uniqueness Guardrails

- Never treat an existing theme as the template skeleton unless the user explicitly asked for a close derivative.
- Never treat an external reference theme as the template skeleton unless the user explicitly asked for a close derivative, and even then document the exception.
- Default guardrail: the first three sections of `home`, `shop`, or `pdp` should not match a nearby theme in the same order.
- Every brand-new theme must introduce at least one brand-new variant id and use it on a key page.
- Reusing only existing variants is not enough for a new theme in this workspace unless the user explicitly waives that rule.
- A new theme should differ on at least 4 of these axes from the nearest existing theme:
  - first-fold structure
  - section order
  - `layoutHint`
  - trust pattern
  - discovery mechanic
  - PDP conversion stack
  - cart emphasis
  - visual density / art direction
- If you reuse the same section type, change enough of the role around it that the page still feels new.
- Add the new variant intentionally: it should solve a real page-composition or merchandising need, not exist as a cosmetic token swap.
- If the section library cannot honestly produce a different feel, add a new section variant instead of disguising a copy.

## 6. Map To This Repo's Authoring Model

Use the current engine; do not create a parallel storefront system.

- Theme preset path: `frontend/src/storefront/themes/*.json`
- Blueprint path: `frontend/src/storefront/blueprints/presets/*.ts`
- Registration: `frontend/src/storefront/themes/index.ts`, `frontend/src/storefront/themes/catalog.ts`, `frontend/src/storefront/blueprints/index.ts`
- Runtime merge/validation: `frontend/src/storefront/engine/themeResolver.ts`, `frontend/src/storefront/engine/themeValidation.ts`, `frontend/src/storefront/blueprints/compiler.ts`
- Variants and sections: `frontend/src/storefront/variants/registry.ts`, `frontend/src/storefront/sections/**`, `frontend/src/storefront/components/**`

## 7. Expected Delivery Shape

For a new theme, aim to leave behind:

- a positioning brief
- a page signature map
- a named new variant with a clear purpose and usage page
- the new preset and/or blueprint
- registration and preview metadata if needed
- docs update
- validation evidence

## 8. Stop Conditions

Do not stop with only colors, copy swaps, or a renamed clone.

Keep iterating if:

- the new page signatures are still near-identical to an existing theme
- the new theme has no new variant id, or the new variant exists but is not used on a key page
- the new theme cannot explain what customer journey it improves
- `home`, `shop`, and `pdp` still behave like a recolored preset
