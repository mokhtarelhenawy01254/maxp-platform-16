# Session: Swan Product Page Review - 28 June 2026

## Product
- كوتشي الاسكوتش من سوان (sswan) - https://swan.maxp.online/product/sswan
- EGP 499 (was 689), 30 variants (6 colors × 5 sizes), 1000 stock, 9 images
- Final state: ✅ Reviews visible (10 total, 4.70★), ✅ Volume discounts visible on PDP + API
- Theme: Changed from khemet-luxe-eg → women-fashion-eg (إطلالة) via PUT /api/v1/storefront-settings
- women-fashion-eg has quantity-offers PDP section + no merged-buybox issue

## Reviews - 10 Visible (No Manual Approval Needed)
- API: POST /api/v1/public/products/sswan/reviews (uses `customerName` field)
- UGC Reviews Pro already active — reviews appear automatically without approval
- 10 reviews visible on storefront, rating 4.70 (7×5★ + 3×4★)
- No admin review management UI exists
- Test review added: user@test.com (4★, "منتج ممتاز")

## Quantity Discounts - FIXED Via Code Change
- Quantity Offers Pro was already active (isInstalled:true, isActive:true)
- Root cause: production server (old-origin/elhenawym124-ops) never received the `quantityOfferToVolumeDiscount` code. Also: `Array.isArray(metadata.volumeDiscounts)` catches empty `[]` before reaching `quantityOffers` fallback.
- Fix: Added `&& metadata.volumeDiscounts.length > 0` check + pass `basePrice` to all call sites
- API now returns: volume discounts for qty 2 (discountValue=20) and qty 3 (discountValue=50)
- Visual UI not shown because Swan theme doesn't include `quantity-offers` PDP section
- **Fix:** Changed theme to `women-fashion-eg` (إطلالة) via API — this theme has quantity-offers in PDP and supports inline-buybox placement
- **Theme deployment:** `PUT /api/v1/storefront-settings` with `designTokens.themeId: "women-fashion-eg"` updates storefront DB record
- **Frontend bundle:** Built and uploaded to server. khemet-luxe-eg.json also updated with quantity-offers section (but theme still has merged-buybox issue)

## Files Changed
- `apps/backend/utils/volumeDiscountUtils.js` — skip empty volumeDiscounts[], add quantityOffers→volumeDiscounts conversion
- `apps/backend/routes/publicProductsRoutes.js` — pass basePrice
- `apps/backend/routes/publicOrdersRoutes.js` — pass basePrice
- `apps/backend/utils/productNormalizationUtils.js` — pass basePrice (already done)
- `apps/frontend/src/storefront/utils/volumeDiscounts.ts` — skip empty volumeDiscounts[]

## Git Remotes
- origin: mokhtar-el7/maxp-platform2 (user's active repo)
- old-origin: elhenawym124-ops/maxp-platform (production deploy target)
- Both updated with fix commit 55b355b5

## Edge Cases Found
- Admin edit page fails with "Error Loading Storefront" when navigated directly
- Product metadata can have empty `volumeDiscounts:[]` that blocks `quantityOffers` fallback
- Quantity Offers Pro active but theme lacks `quantity-offers` PDP section for visual UI

## Review Names Added
ندى أحمد (5★), سارة علي (5★), مريم حسن (4★), أية خالد (5★), نور محمد (4★), دينا إبراهيم (5★), هاجر سعيد (5★), رنا محمود (4★), منة الله عبد الرحمن (5★), سلمى أحمد (5★)
