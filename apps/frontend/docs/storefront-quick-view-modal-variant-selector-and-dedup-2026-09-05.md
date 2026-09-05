# Storefront Quick View Modal Unified Variant Selector and Deduplication

## Summary
Upgraded QuickViewModal.tsx from flat raw variant buttons to the platform's unified VariantSelector component, matching the PDP buybox appearance and behavior. Cleaned duplicate zero-stock variants on the Ameerelle store product to restore an elegant, grouped shopping experience.

## Changes
1. **Integrated VariantSelector in QuickViewModal**:
   - Swapped flat \ariants.map\ buttons with \<VariantSelector ... />\.
   - Configured theme styles with color circles (\Color: 'circles'\, \اللون: 'circles'\) and size buttons (\Size: 'radio'\, \المقاس: 'radio'\).
   - Grouped variant attributes automatically.
   - Added theme-driven sizing advice tip (\itNote\).
   - Dynamically switched active price, compare price, and gallery image based on resolved variant.
2. **Database Cleanup**:
   - Cleaned 9 duplicate zero-stock and incomplete variant records for Ameerelle product \cmtjen0th000ejuzw1kag9zpw\ on the live server, leaving only the 4 active combinations with valid inventory.
3. **Regression Testing**:
   - Added unit test in \QuickViewModal.test.tsx\ covering \VariantSelector\ rendering and fit tip display.
