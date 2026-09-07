# Storefront Size Guide Removal and Theme Override Priority Fix (2026-09-07)

## Summary
- **Merchant / Store**: Fiore (`wardegypt82@gmail.com` / `https://fiore.maxp.online`)
- **Product URL**: `https://fiore.maxp.online/product/mlabs-nsaeyh-1788425645`

## Context & Problem
1. The merchant requested complete removal of the Size Guide ("دليل المقاسات") from their store and product pages.
2. Previously, `sizeGuide` content was present in the product database records, and theme default footer navigation contained fallback `/size-guide` links.
3. In `themeResolverCore.ts`, `normalizeThemeOverrides` prioritized base theme `input.header` and `input.footer` over merchant `designTokens.header` and `designTokens.footer`, preventing merchant custom footer navigation from overriding base theme defaults.

## Key Changes
1. **Storefront Theme Engine (`themeResolverCore.ts`)**:
   - Updated `normalizeThemeOverrides` to evaluate `designTokens.header` / `settingsDesignTokens.header` and `designTokens.footer` / `settingsDesignTokens.footer` ahead of base `input.header` / `input.footer`.
   - Ensures merchant-configured footer navigation and section overrides correctly supersede default theme preset values.

2. **Production Database & Storefront Settings**:
   - Set `sizeGuide = null` on all products for Fiore (`cmth0nnxy0104jumu9onticyy`).
   - Updated `storefront_settings.designTokens` for Fiore:
     - Configured custom footer navigation excluding size guide links.
     - Updated `pageOverrides.pdp.sections` to set `showSizeGuide: false` on the `product-info` section.

3. **Cache & Service Reload**:
   - Flushed Redis cache (`FLUSHALL`) and reloaded `maxp-backend` PM2 service.

## Verification
- Queried live DOM elements using Puppeteer: 0 matches for "دليل المقاسات" remain on the page.
- Confirmed product API returns `sizeGuide: null` and product info section hides size guide modals/links completely.
