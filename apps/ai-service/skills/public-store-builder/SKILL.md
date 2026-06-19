---
name: public-store-builder
description: Build, extend, debug, and validate the public storefront in this repository. Use when Codex needs to create a brand-new public storefront template or blueprint with a distinct page composition, evolve existing storefront themes, work on customer-facing store pages, public product or order flows, custom store pages, theme activation and settings sync, or any backend/frontend change that affects the public shop experience.
---

# Public Store Builder

This skill is for the existing storefront system in this repo, not for inventing a new stack from scratch. Reuse the current runtime, settings flow, public APIs, and section library.

For new themes, default to a fresh page composition for each key page. Reuse existing themes only as references for supported primitives, tokens, section types, and wiring. Do not treat any current theme as the default scaffold for page section order.
For every brand-new theme or template, require at least one brand-new storefront variant id that is registered and used in the delivered theme. A new theme that only rearranges existing variants is incomplete unless the user explicitly overrides this policy.

## Quick Start

1. Classify the request before editing:
   - New theme, template, or blueprint: read [references/template-playbook.md](references/template-playbook.md), then [references/code-map.md](references/code-map.md), then inspect `frontend/src/storefront/themes/`, `frontend/src/storefront/blueprints/`, and `frontend/src/storefront/variants/registry.ts`.
   - Existing theme or runtime layout change: read [references/code-map.md](references/code-map.md) and inspect `frontend/src/storefront/`.
   - Admin settings or theme activation change: inspect `frontend/src/pages/settings/`, `frontend/src/services/storefrontSettingsService.ts`, and the matching backend settings routes/controllers.
   - Public products, cart, checkout, or order flow: inspect `frontend/src/utils/storefrontApi.ts` plus the matching `backend/routes/public*.js`.
   - Custom informational pages such as `about`, `faq`, or policies: inspect `frontend/src/pages/settings/StorePages.tsx`, `backend/routes/storePagesRoutes.js`, and `backend/controller/storePagesController.js`.
2. Load only the relevant references:
   - Architecture and entry points: [references/code-map.md](references/code-map.md)
   - New-theme workflow and uniqueness guardrails: [references/template-playbook.md](references/template-playbook.md)
   - Research-backed quality bar: [references/research-best-practices-2026.md](references/research-best-practices-2026.md)
   - Validation and manual checks: [references/verification.md](references/verification.md)
3. Preserve the storefront invariants in this skill before changing code.
4. Validate with the smallest relevant checks from [references/verification.md](references/verification.md).

## Storefront Invariants

- Treat the public storefront as a coordinated system across frontend runtime, admin/editor screens, backend public routes, and company-scoped settings.
- Preserve both route scopes handled by `StorefrontShell`: root storefront routes and `/store/*` routes.
- Preserve company resolution behavior. Public APIs may resolve company context from query params, headers, slug, or subdomain middleware.
- Prefer extending existing storefront hooks and services over adding ad-hoc fetch logic.
- Keep theme selection and activation aligned with the existing theme catalog and settings guards instead of bypassing them.
- When changing custom pages, keep route definitions and page-management flows aligned so public pages and admin editors stay consistent.
- When changing public payload shape, avoid silently breaking the current merge strategy between template content, company settings, and storefront settings.
- Keep meaningful storefront work documented as part of the same delivery.

## New Template Default Protocol

- Start every new theme with a differentiation brief before touching code: target segment, merchandising promise, visual direction, trust strategy, mobile posture, and what must feel different from the nearest existing themes.
- Audit the nearest existing themes and blueprints first. Compare `home`, `shop`, `collections`, `pdp`, `cart`, and `checkout` section stacks and note which patterns should not be repeated.
- Build page composition from a blank page map for each key page. Decide `pageGoal`, `layoutHint`, first fold, section order, trust/discovery/conversion roles, and CTA emphasis independently for the new theme.
- Reuse existing themes only for design tokens, supported section types, low-level implementation patterns, or safe data wiring. Do not copy a full `pages.*.sections` array unless the user explicitly asks for a close derivative.
- If a new page would materially resemble an existing theme, redesign it before implementation. Default guardrail: avoid matching the same first three sections on `home`, `shop`, or `pdp` with any nearby existing theme unless there is a documented reason.
- When reusing the same section types, change enough of the experience that it becomes recognizably new: page role, order, variant, density, supporting copy, layout hint, neighboring sections, or conversion mechanic.
- Every brand-new theme must ship with at least one brand-new variant id that did not previously exist in the storefront registry or preset set.
- The required new variant must be wired into the final page composition on a key page such as `home`, `shop`, `collections`, `pdp`, `cart`, or `checkout`; it cannot remain unused.
- If the current section library cannot express the desired layout honestly, add a new section variant instead of forcing a disguised clone.
- Keep new themes additive under a new theme id. Do not overwrite an existing preset to simulate novelty.

## Deliverables For New Themes

- Positioning brief with explicit audience, price posture, and buying anxieties.
- Unique page map for `home`, `shop`, `collections`, `pdp`, `cart`, `checkout`, plus any required system pages.
- Theme JSON preset and/or blueprint preset, depending on how the theme should plug into the current engine.
- Theme catalog registration and preview metadata when the theme should appear in the marketplace UI.
- At least one brand-new variant id, registered and used in the new theme on a key page.
- New variants or sections only where they create a real experience difference, but the minimum for a new theme is still one new variant.
- Validation, manual checks, and documentation updates in the same task.

## Task Playbooks

### New Theme or Blueprint Work

- Start from `frontend/src/storefront/themes/index.ts`, `frontend/src/storefront/themes/catalog.ts`, `frontend/src/storefront/blueprints/index.ts`, `frontend/src/storefront/blueprints/compiler.ts`, and `frontend/src/storefront/engine/themeResolver.ts`.
- Inspect the closest existing presets first, then draft the new page signatures outside the code before mapping them onto supported sections and variants.
- Use [references/template-playbook.md](references/template-playbook.md) as the default workflow whenever the user wants a new theme, a marketplace template, or a visibly different storefront experience.
- Favor a distinct composition over shallow cosmetic edits. A new theme should feel different in structure, not just in colors and copy.
- Plan the required new variant early instead of bolting it on at the end. The new theme should have a deliberate reason for that variant to exist.
- Register the new variant and make sure the final theme actually uses it on a key page.
- Create both the theme preset and blueprint preset when the repo already maintains both representations for that class of theme.
- Keep `metadata.notes`, preview assets, and theme descriptions honest about the actual experience differences.
- Add docs whenever the new template changes the available storefront catalog, architecture expectations, or authoring workflow.

### Theme or Layout Work

- Start from `frontend/src/storefront/StorefrontBootstrap.tsx` and `frontend/src/storefront/StorefrontShell.tsx`.
- Follow the runtime path through theme providers, page composition, page configs, and storefront hooks before editing.
- Favor design tokens, theme config, and existing theme runtime APIs over hardcoded branches.
- If a request adds a new system page or route, update the runtime route map and verify the new page works under both storefront scopes.

### Admin Settings or Theme Activation

- Start from the admin surface that exposes the change, then trace to the service and backend controller.
- Keep the settings contract symmetric between frontend normalization and backend serialization.
- Reuse existing guards around theme activation and company access.
- Do not add a setting only on one side; wire the full chain: UI -> frontend service -> backend route/controller -> public/runtime consumer.

### Public Product, Cart, Checkout, or Order Flow

- Start from `frontend/src/utils/storefrontApi.ts` and the matching `backend/routes/publicProductsRoutes.js`, `publicOrdersRoutes.js`, or `publicStorefrontRoutes.js`.
- Preserve public access requirements, company scoping, pricing trust boundaries, and variant metadata flow.
- Reuse existing response normalization patterns for images, variants, and price fields.
- Validate any behavior change against the existing backend integration tests when possible.

### Custom Store Pages

- Use the existing store pages flow instead of creating a parallel page system.
- Check route definitions, admin page management, backend page CRUD, and how public pages are resolved by slug.
- If the request introduces a page that behaves like a system page, verify whether it belongs in the storefront route definitions rather than only as free-form content.

## Examples

- Create a brand-new public storefront template with a unique `home`/`shop`/`pdp` composition, not just a recolored clone of an existing theme.
- Add a new marketplace-ready theme that keeps the current engine but introduces a different discovery pattern, trust stack, and checkout emphasis.
- Add a new marketplace-ready theme that also introduces at least one new variant id and uses it in the final composition.
- Add a new customer-facing page to the storefront and expose it through the existing route and page-management flow.
- Add a new storefront toggle in admin settings and make the public runtime honor it.
- Fix a product detail page bug involving variant images, pricing, or related recommendations.
- Adjust theme preview or theme activation behavior without breaking the current catalog guardrails.
- Improve checkout or public order creation while preserving company scoping and current API contracts.
