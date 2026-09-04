# Storefront Khemet Shop & PDP Add to Cart Visibility Fix

## Issue Summary
In the storefront for companies using Khemet themes (such as `khemet-fashion-eg` for Ameerelle `https://ameerelle.maxp.online/shop`), the "أضف للسلة" (Add to Cart) button was not appearing on product cards in the shop catalog (`/shop`), nor on the product detail page (PDP), even when merchants enabled it in their product configuration (`showAddToCartButton: true`).

## Root Causes
1. **Shop Grid Card Variant Override**: In `ProductGrid.tsx`, for `isKhemetLuxe && isShopPage`, `variant === 'boutique-shelf'` was forced to `'editorial-bare'`. The `editorial-bare` card renderer in `ProductCard.tsx` had no action buttons rendered whatsoever (no Add to Cart, no Quick Buy).
2. **Theme Preset Default**: In `khemet-fashion-eg.json` (and company database designTokens), `pdp-checkout.settings.showAddToCartButton` defaulted to `false`.
3. **PDP Quick Order Form Logic**: `PdpQuickOrderForm.tsx` prioritized `configuredShowAddToCartButton` without respecting `product.showAddToCartButton === true`, suppressing the button when enabled on the product.
4. **Prop Propagation**: `ProductInfo.tsx` omitted `showAddToCartButton` from `inlineQuickOrderProduct`.

## Solution Applied
- **`ProductGrid.tsx`**: Removed `variant === 'boutique-shelf'` from the `editorial-bare` override so it maps to `boutique-air`, featuring the styled Add to Cart and Quick Order buttons.
- **`ProductCard.tsx`**: Added Add to Cart and Quick Order buttons directly into `editorial-bare` for Khemet Luxe cards to prevent missing buttons across any editorial card surfaces.
- **`PdpQuickOrderForm.tsx`**: Updated `showAddToCartButton` resolution to prioritize `product?.showAddToCartButton === true` (and honor `false` if explicitly disabled on the product).
- **`ProductInfo.tsx`**: Forwarded `showAddToCartButton` from product to `inlineQuickOrderProduct` and `resolvedEmbeddedPdpCheckoutSettings`.
- **`khemet-fashion-eg.json`**: Updated default `showAddToCartButton` to `true`.
- **Production Database**: Updated Ameerelle's `storefrontSettings.designTokens` (`pages.pdp` and `pageOverrides.pdp`) to enable `showAddToCartButton: true`.
