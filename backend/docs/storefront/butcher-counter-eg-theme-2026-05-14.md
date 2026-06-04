# Premium Butcher Shop Theme

Date: 2026-05-14

## Summary

Added and then upgraded `butcher-counter-eg` into a right-to-left premium butcher storefront under the public name `Premium Butcher Shop`.

The current direction is a dark cinematic Black Label butcher atelier, not a recolored fashion or shoe storefront. It uses charcoal, oxblood, brass, steel-line texture, oversized editorial type, dramatic meat photography, and cut/weight proof signals.

## Runtime Variants

- `header:butcher-atelier` and `footer:butcher-atelier` create an isolated dark chrome, Black Label rail, square controls, and butcher-specific brand posture.
- `hero-banner:butcher-atelier` creates a full-viewport editorial hero with dramatic background photography, steel grid texture, oversized Arabic heading, and premium cut proof stats.
- `features-bar:butcher-proof-board` replaces generic trust cards with a steel proof board for grade, weight confirmation, prep notes, and cold handoff.
- `featured-collections:butcher-cut-map` replaces category tiles with a cinematic cut map: one large lead route plus compact steel side lanes.
- `shop-command-bar:butcher-cut-console` adds a dark butcher-specific search/sort/category surface for cut and weight decisions.
- `product-grid:butcher-atelier-grid` uses asymmetric layout and the new `ProductCard:butcher-black-label` card treatment.
- `promo-strip:butcher-proof-marquee` adds a dark proof marquee instead of a generic promo ribbon.

## Pages

- Home: butcher atelier hero, proof board, cut map, Black Label product wall, and proof marquee.
- Shop: butcher cut console followed by the Black Label product wall.
- Collections: cut map plus Black Label product wall.
- PDP: product gallery, buy box copy for cut/weight confirmation, editorial conversion stack, and premium related products.
- Cart and checkout: command variants with weight confirmation and cold-chain copy.
- Sale: aged-grill version of the butcher atelier hero plus premium offer wall.
- Thank-you: command aftercare focused on entering the cut room, confirming final weight, and supporting reorder.

## Validation

- `npm run validate:themes`
- `npx vitest run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/themeCatalog.test.ts`

## Local Preview Notes

- Verified `/store?previewTheme=butcher-counter-eg&previewSource=marketplace` on desktop and mobile viewports with the marketplace preview dataset.
- The full frontend `type-check` command still fails on existing unrelated strictness errors across admin, inbox, procurement, and utility modules, so targeted storefront checks remain the reliable validation for this change.
