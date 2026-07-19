# KHEMET Runtime Categories And Buybox Cleanup - 2026-05-07

## Summary
- KHEMET LUXE homepage/collections `featured-collections` `gallery-columns` now prefers real runtime product categories when available.
- KHEMET PDP keeps the merged quick-order form focused; the extra urgency/trust/completion decision-suite panel was removed after visual review.
- KHEMET cart drawer keeps checkout CTA outside the scrollable item/upsell region.
- Footer legal/service links now resolve to authored `shipping`, `privacy`, and `terms` pages instead of falling through to the dynamic 404 path.

## Runtime Categories
- `FeaturedCollections.tsx` exposes `shouldPreferRuntimeFeaturedCollections()`.
- Default behavior:
  - `khemet-luxe-eg` + `gallery-columns` prefers `useCategories()` when categories exist.
  - Non-KHEMET themes keep authored/manual collections by default.
  - `settings.preferRuntimeCategories: true` enables the behavior for any theme.
  - `settings.preferRuntimeCategories: false` opts KHEMET out and keeps manual fallback collections.
- The KHEMET JSON still keeps authored collection cards as a fallback for empty category states and static previews.

## PDP Buybox
- KHEMET inline quick-order mode no longer renders `data-testid="khemet-purchase-decision-suite"`.
- The product options and merged quick-order form remain in the same buybox area.
- The older top-of-buybox social proof/low-stock/trust/countdown copies remain suppressed for KHEMET inline quick-order mode to avoid repeated persuasion blocks.

## Cart And Trust Pages
- `CartDrawer.tsx` now closes the scroll region before rendering the footer, so subtotal and checkout remain fixed at the bottom of the drawer.
- `khemet-luxe-eg.json` now includes raw variants expected by runtime guards:
  - `cart-items`: `wardrobe-cart`
  - `order-summary`: `boutique-summary`
  - `checkout-form`: `soft-flow`
  - `payment`: `boutique-payment`
  - `order-confirmation`: `soft-thanks`
- New KHEMET pages:
  - `/shipping`
  - `/privacy`
  - `/terms`

## Preview Data
- KHEMET preview sale countdown now uses a rolling seven-day end date instead of the stale `2026-04-30` value.

## Verification
- `node -e "JSON.parse(...khemet-luxe-eg.json...)"`
- `npx vitest run src/storefront/__tests__/productInfoKhemetDecisionSuite.test.tsx src/storefront/__tests__/CartDrawer.khemet.test.tsx src/storefront/__tests__/featuredCollectionsImageResolver.test.ts src/storefront/__tests__/FeaturedCollections.khemet.test.tsx`
