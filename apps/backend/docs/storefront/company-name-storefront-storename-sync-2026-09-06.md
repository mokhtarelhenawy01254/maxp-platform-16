# Company Name & Storefront Store Name Auto-Sync (2026-09-06)

## Problem Description
When a company updated its name under Company Settings (`Company.name`), the storefront hero section and header brand text continued displaying an old store name.

## Root Cause
1. `StorefrontSettings.designTokens` contains a `storeName` key set during initial store creation or visual editor customization.
2. In `apps/frontend/src/storefront/utils/runtimeBrandText.ts` and `publicStorefrontController.js`, `storefront.settings.storeName` (from `designTokens.storeName`) took precedence over `company.name`.
3. Updating `Company.name` in `companiesController.updateCompany` and `adminCompnayController.updateCompany` did not sync `storefrontSettings.designTokens.storeName`, causing stale store names to remain active.

## Fix
1. Updated `companiesController.updateCompany` and `adminCompnayController.updateCompany` to automatically sync `storefrontSettings.designTokens.storeName` whenever `name` is updated.
2. Updated production database `storefront_settings.designTokens` for company `ahmedfahmy40@gmail.com` (`cmtk4862e0sq6judiubpvklni`) from `"TA TI"` to `"TATO"`.
3. Purged Redis cache and backend in-memory cache on production server.
