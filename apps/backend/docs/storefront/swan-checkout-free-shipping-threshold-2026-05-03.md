# Swan Checkout Free Shipping Threshold - 2026-05-03

## Problem

Swan's checkout showed the conversion-suite free shipping progress as reached, but selecting a governorate still added the normal shipping quote to the order summary and final total.

Example from the reported flow:
- Product subtotal: `EGP 1,028.00`
- Governorate shipping quote: `EGP 75.00`
- Free shipping threshold: `799`
- Wrong checkout total: `EGP 1,103.00`

## Fix

- The storefront checkout shipping hook now reads `conversion-suite.thresholds.freeShippingAmount`.
- When `conversion-suite.modules.freeShippingBar` is enabled and the cart subtotal reaches the threshold, checkout keeps the original quote as `freeShippingDiscount`, applies `shippingCost = 0`, and displays the shipping row as a negative shipping discount.
- `OrderSummary` and both `PaymentSection` summary layouts now show the shipping line as `-EGP 75.00` while the final total stays equal to the product subtotal, minus any coupon.
- The public order creation route applies the same threshold server-side before calculating `finalTotal`, so the saved `GuestOrder` and mirrored `Order` cannot re-add shipping after submission.
- Guest order metadata records the source and original shipping quote under `metadata.freeShipping`.

## Verification Targets

- `frontend/src/storefront/__tests__/marketplaceApps.test.ts`
- `frontend/src/storefront/__tests__/checkoutShippingQuote.test.tsx`
- `backend/utils/__tests__/storefrontFreeShipping.test.js`
- `backend/tests/integration/storefrontPublicRoutes.test.js`

## Local Verification

- Passed: `node --check backend/routes/publicOrdersRoutes.js`
- Passed: `node --check backend/utils/storefrontFreeShipping.js`
- Passed: `backend npm.cmd test -- --runInBand --testPathPattern=storefrontFreeShipping.test.js`
- Passed: `frontend npx.cmd vitest run src/storefront/__tests__/checkoutShippingQuote.test.tsx src/storefront/__tests__/marketplaceApps.test.ts src/storefront/__tests__/checkout.test.ts`
- Passed: focused frontend ESLint for the touched checkout/storefront files.
- Blocked locally: Chrome DevTools MCP browser verification could not open because the configured Chrome profile was already running; logged in `.learnings/ERRORS.md`.
- Blocked locally: `backend/tests/integration/storefrontPublicRoutes.test.js` could not reach the new scenario because the local test database is missing `companies.signupTrialBonusDays`; rerun after syncing the test DB schema.

## Production Recheck

- Checked `https://swan.maxp.online/checkout` with a seeded browser cart matching the report:
  - `Swan Motion` = `EGP 499.00`
  - `Swan Fit` = `EGP 529.00`
  - subtotal = `EGP 1,028.00`
  - governorate = `الإسكندرية`
- Production settings are correct: `conversion-suite.modules.freeShippingBar = true` and `thresholds.freeShippingAmount = 799`.
- Production shipping quote is correct by itself: Alexandria quote returns `EGP 75.00`.
- Production checkout is still wrong before deployment: it shows the progress/free-shipping message, but keeps the shipping row as `EGP 75.00` and total as `EGP 1,103.00`.
- The loaded production chunk `useCheckoutShippingQuote-Cxxu35Hl.js` does not contain the new `freeShippingDiscount` / threshold logic, confirming the fix is local and needs deployment.
- Screenshot saved locally: `frontend/tmp/swan-checkout-live-review.png`.
