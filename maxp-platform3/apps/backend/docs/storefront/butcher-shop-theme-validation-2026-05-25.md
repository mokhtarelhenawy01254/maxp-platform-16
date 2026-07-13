# Butcher Shop Theme Validation Fix - 2026-05-25

## Context

The `Storefront Validation` GitHub Action failed on the current `main` baseline because `butcher-shop-eg` referenced legacy section IDs that are no longer present in the storefront section manifest.

## Change

- Replaced `features-grid` with `features-bar`.
- Replaced PDP legacy sections with the supported `product-gallery` and `product-info` sections.
- Replaced `cart-summary` with supported `cart-items` and `order-summary` sections.

## Validation

Run:

```bash
cd frontend
npm run validate:themes
```
