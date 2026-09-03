# Storefront PDP Quantity Selector Reset Fix

**Date:** 2026-09-03  
**Status:** Completed  
**Components:**
- `apps/frontend/src/storefront/sections/PdpQuickOrderForm.tsx`
- `apps/frontend/src/storefront/components/QuantitySelector.tsx`

---

## 1. Problem Description
On storefront product detail pages (PDP) — such as `https://ameerelle.maxp.online/product/kashat-anotha-ora7a-tol-alyom` using themes with embedded or inline checkout (e.g., `khemet-fashion-eg`) — clicking the quantity selector buttons (`+` or `−`) did not work; the quantity was locked to 1 and immediately reverted to 1 upon clicking.

### Root Cause
1. In `PdpQuickOrderForm.tsx`, an aggressive `useEffect` was present:
```tsx
useEffect(() => {
  if (!showQuantityBlock && quantity !== 1) {
    setQuantity(1);
  }
}, [showQuantityBlock, quantity, setQuantity]);
```
2. When the quick order section settings specified `showQuantity: false` (to avoid displaying a duplicate quantity input inside the order form itself), `showQuantityBlock` evaluated to `false`.
3. Because `usePdpSelectionStore` is a globally shared Zustand store across both the `ProductInfo` buybox and `PdpQuickOrderForm`, whenever a customer clicked `+` on the `QuantitySelector` rendered in `ProductInfo`, `quantity` changed to 2.
4. `PdpQuickOrderForm` re-rendered, saw `!showQuantityBlock && quantity !== 1`, and immediately invoked `setQuantity(1)`, forcing the quantity back to 1 in the same tick.
5. In addition, the `<button>` elements in `QuantitySelector.tsx` lacked `type="button"`, creating a risk of default form button behaviors in nested form contexts.

---

## 2. Solution Implemented
1. **Removed Rogue Effect in `PdpQuickOrderForm.tsx`:**
   - Removed the `useEffect` that forcibly resets `quantity` to 1.
   - `showQuantityBlock` continues to govern whether the quick order form displays its own `<QuantitySelector />`, while preserving whatever quantity the customer selects in the buybox or store.
2. **Explicit Button Type in `QuantitySelector.tsx`:**
   - Added `type="button"` to decrement and increment buttons to prevent unintended form submit triggers.
