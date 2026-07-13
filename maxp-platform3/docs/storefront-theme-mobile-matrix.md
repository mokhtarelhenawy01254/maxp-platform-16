# Storefront Theme Mobile Matrix

**Date**: 2026-04-27
**Viewport used for spot checks**: `390x844`
**Reference rubric**: Shopify mobile-first theme guidance, clear navigation, thoughtful product discovery, fast path to checkout, and realistic demo content.

## Themes Reviewed In This Pass

### `cafe-demo`

- `home`
  - pass after cleanup: the first screen now starts from the hero instead of stacked preview + conversion overlays
  - pass after cleanup: `split-panel` fallback copy is now category-safe and no longer references shoes
  - remaining risk: the hero still uses a large visual rhythm and should get a deeper `shop` follow-up later
- `checkout`
  - pass: seeded coffee order remains coherent and category-specific
  - pass: checkout flow messaging reads like food-and-beverage fulfillment rather than a generic funnel
- `thank-you`
  - pass: reorder and add-on suggestions remain relevant to coffee ordering

### `max-care-go`

- `home`
  - pass after cleanup: the first screen is materially cleaner because marketplace promo overlays no longer consume the opening viewport
  - pass: pharmacy CTA hierarchy remains readable on narrow width
  - remaining risk: core theme depth is still lighter than flagship presets
- `shop`
  - pass: search + filter route exists and preview products remain pharmacy-native
  - remaining risk: the shop still needs a richer owned merchandising layer later
- `checkout`
  - pass: duplicated inline summary remains removed in the normalized flow
  - pass: seeded items and order context still match pharmacy usage
- `thank-you`
  - pass: order confirmation stays relevant to pharmacy ordering

### `furniture-demo`

- `home`
  - pass after cleanup: large preview messaging no longer pushes the real template content down the page on mobile
  - pass: the CTA appears earlier and cleaner
  - remaining risk: the template is still structurally thin for a furniture buying journey
- `checkout`
  - acceptable: mobile form readability is fine
  - remaining risk: the flow still feels generic compared with stronger commerce themes
- `thank-you`
  - acceptable: confirmation page works, but post-purchase depth is still shallow

### `elessi-carry-lane`

- `home`
  - pass: category fit and imagery are relevant to the theme
  - remaining risk: it still feels lighter than stronger marketplace themes and close to sibling Elessi presets
- `checkout`
  - acceptable: normalized checkout remains functional and preview data is relevant
  - remaining risk: theme-owned distinction is still limited

### `elessi-pedal-lab`

- `shop`
  - pass after runtime upgrade: discovery now starts from ride intent cards plus bike-specific filters and grid variants instead of a thin title + search + grid stack
  - pass: the first product rows now feel tied to city, road, safety, and service use cases rather than a generic technical shelf
- `checkout`
  - pass: cart, contact, shipping, payment, and summary now read like a bike-and-upgrades order rather than a generic command checkout
  - pass: order summary and follow-up language stay focused on fit, setup, and accessories
- `thank-you`
  - pass: post-purchase now includes ride-specific reorder and add-on follow-up instead of a bare generic confirmation

### `elessi-harvest-fold`

- `shop`
  - pass after runtime upgrade: discovery now starts from basket intent for daily greens, fruit boxes, pantry basics, and weekly crates
  - pass: grocery grid and trust messaging are clearer on mobile and feel closer to a recurring household order flow than a thin organic catalog
- `checkout`
  - pass: the flow now reads like a household basket review with size, box, and delivery notes instead of a generic nature checkout
  - pass: summary hierarchy remains clear on narrow width
- `thank-you`
  - pass: confirmation, reorder, and follow-up language now reflect weekly-box behavior and grocery-native continuity

### `elessi-signal-deck`

- `shop`
  - pass after runtime upgrade: discovery now starts from device intent cards for lightweight machines, creator setups, desk gear, and carry power instead of a thin title + search + grid stack
  - pass: mobile first fold now reads like a digital catalog with clearer tech-oriented grouping rather than a generic technical shelf
- `checkout`
  - pass: cart, payment, and summary now read like a laptop-and-accessories order with setup-oriented follow-up instead of a generic command checkout
  - pass: summary hierarchy stays clearer on narrow width while the themed runtime variants remain intact
- `thank-you`
  - pass: post-purchase now reads like tech setup / aftercare instead of a bare generic confirmation

### `elessi-tail-supply`

- `shop`
  - pass after runtime upgrade: discovery now starts from pet-routine intent for daily food, play, care, and outing needs instead of a thin filter + grid shelf
  - pass: the first visible rows now feel tied to recurring pet care and replenishment rather than a generic pet catalog
- `checkout`
  - pass: cart, payment, and summary now read like a pet-supply reorder flow instead of a generic nature checkout
  - pass: narrow-width hierarchy remains readable while the runtime variants stay pet-specific
- `thank-you`
  - pass: confirmation and follow-up language now reflect recurring pet-supply continuity and reorder behavior

## Execution Notes

- Mobile marketplace preview chrome is now intentionally compact across the audited themes.
- Conversion-suite overlays are suppressed on small-screen marketplace previews so the template itself is what gets reviewed first.
- This pass improved preview honesty and mobile readability, and the latest runtime upgrades converted `elessi-pedal-lab`, `elessi-harvest-fold`, `elessi-signal-deck`, and `elessi-tail-supply` from thin mobile catalogs into clearer theme-owned funnels.

## Next Mobile Targets

- `furniture-demo`
- `cafe-demo` `shop` depth
- `max-care-go` owned cart/post-purchase richness
- remaining Elessi thin family presets:
  - `elessi-gem-atelier`
  - `elessi-sprout-room`
  - `elessi-glow-routine`
  - `elessi-garage-fit`
