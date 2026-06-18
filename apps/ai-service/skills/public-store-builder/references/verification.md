# Verification

## Default Rule

Run the smallest relevant checks that cover the changed path. Prefer targeted storefront checks over broad test suites.

## Skill Validation

- Validate the skill structure after editing:
  - `python path/to/quick_validate.py skills/public-store-builder`
  - In this workspace, the bundled Python runtime may be easier to use than system Python.

## Backend Validation

- Public storefront payload, product normalization, shipping, and guest order flow:
  - From `backend/`: `npm test -- storefrontPublicRoutes.test.js`
- If the change touches only one backend controller or route, prefer a focused Jest path over the full integration suite.

## Frontend Validation

- Storefront runtime and theme-related tests:
  - From `frontend/`: `npm run test:storefront-themes`
- Theme schema or blueprint validation:
  - From `frontend/`: `npm run validate:themes`
  - From `frontend/`: `npm run validate:blueprints`
- If the change touches only one runtime or test surface, prefer a focused Jest path over broad frontend test sweeps.

## New Theme Specific Checks

- Compare the new theme against the 3-5 nearest existing themes before sign-off.
- Confirm the new theme introduces at least one brand-new variant id.
- Confirm the new variant is registered in the appropriate storefront variant surface and is actually referenced by the delivered theme or blueprint on a key page.
- Capture page signatures for `home`, `shop`, and `pdp`:
  - first 3 sections
  - `layoutHint`
  - dominant CTA / trust mechanic
- Confirm the new theme is not just a recolored copy:
  - the first 3 sections on `home`, `shop`, and `pdp` should not match a nearby theme in the same order unless explicitly requested
  - the theme should differ on multiple axes such as section order, trust pattern, discovery mechanic, PDP stack, or cart emphasis
- Confirm the required new variant is meaningful:
  - it supports a real page goal or merchandising need
  - it is not just a renamed copy with trivial token or copy differences
- Confirm docs were updated for meaningful new template or workflow changes.

## Manual Sanity Checks

- Confirm the affected page works under both route scopes when relevant:
  - `/...`
  - `/store/...`
- Confirm the key first-fold CTA is visible on mobile and desktop.
- Confirm mobile content parity for critical trust and conversion content after theme changes.
- Confirm company scoping still works for query-param and slug-based storefront access if the change touches public API resolution.
- Confirm admin settings changes are reflected in the public storefront payload and then in the runtime consumer.
- Confirm any new store page is reachable publicly and still editable from admin.
- Confirm preview-only behavior does not leak into the live storefront unintentionally.
- Confirm keyboard navigation, visible focus, and logical focus order on any changed navigation, product, search, drawer, modal, or checkout surfaces.
- Confirm primary controls remain touch-friendly on mobile.
- Confirm dynamic product price/availability changes remain understandable if variants are involved.
- Confirm product media does not depend on autoplay or swipe-only interaction for critical usage.
- Confirm search-heavy themes keep search discoverable and usable on mobile if search is part of the theme's promise.

## SEO And Commerce Checks

- If the change touches product/variant routing, confirm URL and canonical behavior still make sense for variants.
- If the change touches public product or business content, confirm any relevant structured data or breadcrumb behavior still has a clear path.
- If the change touches product discovery or PDP trust, confirm shipping, returns, warranty, sizing, compatibility, or other category-specific anxieties are still addressed somewhere obvious.
