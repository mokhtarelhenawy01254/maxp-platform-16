# Session: Swan Product Page Review - 28 June 2026

## Product
- كوتشي الاسكوتش من سوان (sswan) - https://swan.maxp.online/product/sswan
- EGP 499 (was 689), 30 variants (6 colors × 5 sizes), 1000 stock, 9 images

## Reviews - 11 Added (All Pending - No Approval Method)
- API: POST /api/v1/public/products/sswan/reviews (uses `customerName` field)
- All created with `isApproved: false` — server ignores isApproved field
- No admin review management endpoints exist (all PATCH/PUT/POST on reviews return 404)
- GET /api/v1/reviews returns ALL reviews (pending + approved) but read-only
- UGC Reviews Pro IS active (مدفوع) but provides only Photo/Video/Badge toggles, NO review management/approval UI
- **Conclusion:** No way for merchant to approve reviews. Requires DB modification or platform support.
- Test review added: user@test.com (4★, "منتج ممتاز")

## Quantity Discounts - Not Showing
- 3 offers configured in admin (1@499, 2@479, 3@449) all active
- Product API returns volumeDiscounts:[] — storefront never renders them
- **Fix:** Needs Quantity Offers Pro (149 EGP/month) from marketplace (not installed)

## Current Subscriptions (via payments page)
- Store: 299 EGP/month ✅
- Unified Inbox: 299 EGP/month ✅
- Turbo Shipping: 149 EGP/month ✅
- Wallet balance: 23,755 EGP

## Edge Cases Found
- Admin edit page (maxp.online/products/:id/edit) fails with "Error Loading Storefront" when navigated directly. Must click "تعديل" from product listing page.

## Review Names Added
ندى أحمد (5★), سارة علي (5★), مريم حسن (4★), أية خالد (5★), نور محمد (4★), دينا إبراهيم (5★), هاجر سعيد (5★), رنا محمود (4★), منة الله عبد الرحمن (5★), سلمى أحمد (5★)
