# Storefront Quick Buy Checkout Navigation Fix (2026-09-05)

## Overview
Resolved an issue on storefronts (specifically observed on `ameerelle.maxp.online` using theme `khemet-fashion-eg`) where clicking "شراء فوري الآن" ("Buy Now") in `QuickViewModal` or "طلب سريع" on `ProductCard` failed to navigate the user to `/checkout`.

## Root Cause
1. In `QuickViewModal.tsx`, `handleQuickBuy` called `handleAddToCart()`, which:
   - Called `addItem` into `useCartStore` without `{ openCart: false }`, triggering the side cart drawer to open.
   - Did not immediately invoke `onClose()`, leaving the modal open and trapping user interaction.
2. It then called React Router's SPA `navigate(checkoutPath)`. In Khemet Luxe themes (`khemet-fashion-eg`, `khemet-luxe-eg`, etc.), document navigation is required (`shouldStorefrontForceDocumentNavigation`), so SPA routing failed to transition properly while the modal and drawer were mounted.
3. Similarly in `ProductCard.tsx`, `handleQuickBuy` did not specify `{ openCart: false }` and did not check `shouldForceDocumentNavigation`.

## Solution
1. In `QuickViewModal.tsx`:
   - Updated `handleQuickBuy` to call `addItem(..., { openCart: false })` to add the selected item silently.
   - Dispatches `trackAddToCartEvent`.
   - Calls `onClose()` immediately to tear down the modal dialog.
   - Evaluates `shouldForceDocumentNavigation`: if true, delegates to `navigateStorefrontDocument(checkoutPath)`, otherwise uses React Router `navigate(checkoutPath)`.
2. In `ProductCard.tsx`:
   - Updated `handleQuickBuy` to pass `{ openCart: false }` to `addItem`.
   - Uses `navigateStorefrontDocument(targetCheckoutPath)` when `shouldForceDocumentNavigation` is active.
3. Added unit tests in `QuickViewModal.test.tsx` ensuring `handleQuickBuy` works correctly.
