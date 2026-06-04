# KHEMET LUXE Free Shipping Progress

## Context

The KHEMET LUXE header service strip is intentionally compact and should stay visible as a trust signal. The missing piece was a second, order-context free-shipping progress cue inside the cart and checkout flow so customers see the benefit at the decision point.

## Implementation

- Added a compact free-shipping progress block to the KHEMET cart drawer footer, above subtotal and checkout.
- Enabled the existing `order-summary` free-shipping progress block on the KHEMET cart page and checkout page.
- Added KHEMET-specific Arabic Conversion Suite copy for free-shipping progress and related cart suggestions in marketplace preview.
- Made the KHEMET header shipping text read the same `conversion-suite.thresholds.freeShippingAmount` value instead of hardcoding `500`.
- Added the `freeShippingAmount` field next to `Free Shipping Bar` in `Settings > Store > Growth Widgets`, so the merchant can control show/hide and the threshold from the same grouped settings page.
- Skipped storefront app-usage tracking in marketplace preview to avoid sending conversion tracking requests from theme preview screens.

## Merchant Control

- Show/hide: `Settings > Store > Growth Widgets > Free Shipping Bar`.
- Threshold value: `Settings > Store > Growth Widgets > Free Shipping Bar > حد الشحن المجاني`.
- Deep app settings still expose the same value at `Conversion Suite > thresholds.freeShippingAmount`.
- The threshold is a sales/UX trigger for the progress bar. Actual shipping prices by governorate remain controlled by the store shipping settings and checkout shipping quote flow.

## Verification

- `npm run validate:themes`
- `npx vitest run --environment jsdom src/storefront/__tests__/checkoutPageCart.test.tsx src/storefront/__tests__/appUsageTracking.test.ts src/pages/settings/__tests__/StoreConversionGroupedPages.test.tsx`
- Targeted ESLint on touched storefront/settings files: 0 errors, 2 pre-existing `StorefrontShell.tsx` warnings.
- Playwright mobile preview verified:
  - Cart page shows the free-shipping reached state.
  - Checkout page shows the free-shipping reached state.
  - Product add-to-cart opens the drawer with the item and the free-shipping progress block.
  - No console errors and no `>=400` responses after preview tracking was skipped.

## Artifacts

- `artifacts/khemet-free-shipping-2026-05-02/cart-mobile-free-shipping.png`
- `artifacts/khemet-free-shipping-2026-05-02/checkout-mobile-free-shipping.png`
- `artifacts/khemet-free-shipping-2026-05-02/drawer-mobile-free-shipping-after-add.png`
