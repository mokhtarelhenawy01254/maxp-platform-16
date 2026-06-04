# Swan Pixel Purchase Tracking Fix - 2026-05-04

## Scope

Swan is currently relying on the browser Meta Pixel only. This fix does not enable or require Conversions API.

## Production Diagnosis

- Swan Pixel `1989842325284174` is configured and enabled.
- Browser Pixel events are not globally dead: `ViewContent`, `AddToCart`, and `InitiateCheckout` were present.
- Swan Conversions API is disabled and has no token configured.
- Recent paid Facebook/Instagram orders included `_fbp` and `_fbc`, but internal conversion tracking had no `purchase` events.
- Active Swan product campaigns showed spend, clicks, views, add-to-cart, and checkout events, but zero Pixel purchases.
- Another campaign on the same ad account/pixel showed purchases, so the dataset itself was not fully broken.

## Root Cause

The quick product order flow created the thank-you URL and then used `window.location.assign(thankYouPath)`. That hard navigation happened before React Router could pass `location.state.purchaseTracking` to the order confirmation page, so the thank-you page often opened without the data needed to fire the Pixel `Purchase` event.

The standard checkout and product-image landing flows also depended on transient navigation state, which is fragile across reloads, hard navigations, browser restores, and direct thank-you page visits.

## Code Fix

- Added session-backed purchase tracking storage keyed by order number.
- Persisted purchase tracking before navigating to the thank-you page in:
  - standard checkout
  - PDP quick order
  - product image landing order
- Updated the order confirmation page to read purchase tracking from React Router state first, then session storage.
- Added a local browser dedupe marker so refreshing the thank-you page does not fire duplicate Pixel `Purchase` events.
- Delayed `Purchase` firing until storefront settings have finished loading and browser Pixel tracking is enabled, so the stored payload is only consumed when Pixel can actually fire.

## Files

- `frontend/src/storefront/utils/purchaseTrackingStorage.ts`
- `frontend/src/storefront/__tests__/purchaseTrackingStorage.test.ts`
- `frontend/src/storefront/hooks/useCheckout.ts`
- `frontend/src/storefront/sections/PdpQuickOrderForm.tsx`
- `frontend/src/storefront/pages/ProductImageLandingPage.tsx`
- `frontend/src/storefront/sections/OrderConfirmation.tsx`

## Verification Notes

- Isolated TypeScript check for `purchaseTrackingStorage.ts` passed.
- Full frontend verification is currently blocked by a corrupted/unreadable `frontend/node_modules` state, specifically `node_modules/vite` and `node_modules/.bin`.
- After dependencies are repaired, run:
  - `npm run test:storefront-themes`
  - `npm run type-check`

## Expected Outcome

New Swan orders from Pixel-tracked sessions should fire browser Pixel `Purchase` on the thank-you page, including quick product order flows that previously lost the purchase tracking payload during hard navigation.
