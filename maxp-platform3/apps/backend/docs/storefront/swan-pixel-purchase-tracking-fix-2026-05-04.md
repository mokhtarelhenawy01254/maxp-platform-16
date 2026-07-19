# Swan Pixel Purchase Tracking Fix - 2026-05-04

## Context

Swan is currently relying on browser Meta Pixel tracking only. Conversions API remains disabled for this fix.

## Diagnosis

- Swan Pixel `1989842325284174` is enabled.
- Browser events reached Meta for `ViewContent`, `AddToCart`, and `InitiateCheckout`.
- Recent paid Facebook and Instagram orders included `_fbp` and `_fbc`.
- Internal conversion data showed no `purchase` events for the affected Swan flows.
- Active product campaigns showed clicks and lower-funnel browser events but zero Pixel purchases.

## Root Cause

Some checkout paths, especially PDP quick order, used a hard thank-you-page navigation with `window.location.assign(thankYouPath)`. That navigation could drop React Router `location.state.purchaseTracking`, leaving the order confirmation page without the payload required to fire browser Pixel `Purchase`.

## Fix

- Persist purchase tracking in `sessionStorage` before thank-you navigation.
- Restore the payload on order confirmation when router state is missing.
- Fire browser Pixel `Purchase` only after storefront settings are loaded and browser Pixel tracking is enabled.
- Mark consumed purchases in `localStorage` to avoid duplicate `Purchase` events on thank-you page reload.

## Covered Flows

- Standard cart checkout.
- PDP quick order.
- Product image landing page order.

## Verification

After dependency repair, run the storefront tests and type-check locally. Production verification should create a real or controlled Swan order from a Pixel-attributed browser session and confirm the `Purchase` event in browser Pixel diagnostics and Meta events reporting.
