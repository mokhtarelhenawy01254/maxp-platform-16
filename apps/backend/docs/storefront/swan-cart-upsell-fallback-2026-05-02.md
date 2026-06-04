# Swan / KHEMET Cart Upsell Fallback - 2026-05-02

## Context

The production conversion smoke for `flora.maxp.online` showed that the KHEMET cart drawer is large and the checkout CTA stays visible, but the upsell rail disappears when the related-products and frequently-bought-together endpoints return empty arrays.

That leaves the cart with no secondary conversion action even though the shopper has already added an item.

## Change

- Kept the existing product-recommendation rail when dynamic suggestions exist.
- Added a KHEMET-only fallback rail when recommendations are empty:
  - A quantity upsell card that increases the current cart item with one tap.
  - A shop continuation card that opens `/shop` while preserving the cart.
- Added the same quantity/shop fallback directly inside the KHEMET cart drawer so the conversion surface still appears when the lazy recommendation host returns `null`.
- Kept the fallback inside the scrollable cart content so the checkout CTA remains fixed in the drawer footer.
- Tracked the fallback quantity click through `conversion-suite` usage metadata.

## Regression Coverage

- Added `CartUpsellHost.khemet.test.tsx`.
- Extended `CartDrawer.khemet.test.tsx`.
- The new test covers:
  - Recommendation APIs returning no products still render `khemet-cart-conversion-nudges`.
  - The `زودي قطعة` CTA increments the existing cart item quantity.
  - The fallback shop CTA links to `/shop`.
  - The direct drawer fallback remains available in the real KHEMET drawer layout.

## Verification Plan

1. Run the focused KHEMET cart tests.
2. Run the storefront runtime import guard to ensure no new heavy startup imports were added.
3. Build the frontend production bundle.
4. Push to `main`, watch `Deploy to Server`, then verify production:
   - `/shop` to product navigation.
   - Product add-to-cart opens the larger KHEMET drawer.
   - Empty recommendation state still shows the fallback upsell rail.
   - `زودي قطعة` increases cart quantity.
   - Checkout remains reachable and no console errors appear.
