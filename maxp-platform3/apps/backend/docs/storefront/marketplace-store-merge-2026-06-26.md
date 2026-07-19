# Marketplace — Store App Merge

**Date:** 2026-06-26
**Catalog version:** 2026-06-26-store-merge

## Summary

Merged `ecommerce-basic` and `store-basic` into a single **"المتجر"** (Store) app.

## Changes

- **Deleted:** `store-basic` — themes moved to sidebar template store (not an app)
- **Replaced:** `ecommerce-basic` → `store` (المتجر) at $299/mo
- **Added:** `inventory-pro` (المخزون والمستودعات — $199)
- **Added:** `order-shipping-turbo` (الشحن الذكي — $149)
- **Added:** `order-invoicing` (الفواتير — $129)
- **Moved:** `order-confirmation-distribution` from PRODUCTIVITY → ECOMMERCE

## Slug Migration

All `requiredApps` references updated:
- `"store-basic"` → `"store"`
- `"ecommerce-basic"` → `"store"`

Frontend files updated: `sidebar.ts`, `appRegistry.ts`, `featureCatalog.ts`, `marketplaceFeatureMap.ts`
