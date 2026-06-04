# Rose Boutique PDP Redesign

## Goal

Rebuild `rose-boutique-eg` product pages away from the previous boxed, nested-card composition into a calmer editorial product-detail surface that keeps the product image and buying decision in front.

## Style Direction

- Final name: `Editorial Commerce PDP`
- Earlier exploration: `Editorial Atelier PDP`
- Visual grammar:
  - open composition instead of card-in-card shells
  - product image as the main stage
  - typography and ruled sections doing the hierarchy work
  - one clear buy rail instead of multiple competing decision boxes
  - mobile-first commerce cues in the first fold before the long image stage
  - sticky mobile CTA once the main buy actions scroll away

## Implementation

- Added a new gallery variant in [ProductGallery.tsx](/H:/max_p_new/frontend/src/storefront/sections/ProductGallery.tsx):
  - `atelier-editorial-stage`
- Added a new product info / buybox variant in [ProductInfo.tsx](/H:/max_p_new/frontend/src/storefront/sections/ProductInfo.tsx):
  - `atelier-buybox`
- Refined the same variants into a more familiar commerce grammar:
  - mobile title + price + CTA before the image stage
  - buy rail moved ahead of secondary facts on mobile
  - sticky mobile add-to-cart behavior for the atelier branch
  - desktop CTA row no longer forces `buy now` beside the quantity/add-to-cart cluster at medium widths
  - lower product-sheet content now stays single-column until wider desktop space is available, so Arabic detail copy does not collapse into cramped side-by-side columns
  - selected color/size variants now keep the wider product gallery instead of collapsing the PDP to a single variant image
  - atelier CTA and utility controls now use tighter Arabic-friendly button typography instead of airy uppercase-style tracking
  - button and utility colors now sit on a stricter rose-boutique system: deep ink for primary actions, muted rose for secondary actions, and clearer secondary icon affordances
- Marked the new buybox variant as inline-compatible in [PdpCheckout.tsx](/H:/max_p_new/frontend/src/storefront/sections/PdpCheckout.tsx)
- Switched the `rose-boutique-eg` PDP recipe in [rose-boutique-eg.json](/H:/max_p_new/frontend/src/storefront/themes/rose-boutique-eg.json) to use the new variants

## Expected Result

- fewer bordered containers in the first fold
- stronger product-image presence
- price and buy actions surface earlier and more clearly
- a more familiar product-page rhythm on mobile
- details read like an editorial product sheet instead of stacked ecommerce cards
- medium desktop widths keep the Arabic CTA row and product details readable instead of squeezing them into narrow columns
