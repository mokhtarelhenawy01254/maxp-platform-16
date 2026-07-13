# Code Map

## Frontend Runtime

- `frontend/src/storefront/StorefrontBootstrap.tsx`
  - Bootstraps the public storefront app and prefetches critical data.
- `frontend/src/storefront/StorefrontShell.tsx`
  - Main storefront runtime, route scoping, theme provider wiring, and page composition.
- `frontend/src/config/storefrontSystemRoutes.ts`
  - System route definitions and product preview route variants.
- `frontend/src/storefront/engine/themeResolver.ts`
  - Resolves preset + settings + page overrides + content overrides into the runtime theme.
- `frontend/src/storefront/engine/themeValidation.ts`
  - Theme-level validation helpers worth checking when a preset or blueprint fails.
- `frontend/src/utils/storefrontApi.ts`
  - Public storefront API client for products, cart, checkout, coupons, and order tracking.
- `frontend/src/services/storefrontSettingsService.ts`
  - Normalizes admin and public storefront settings payloads.

## Theme Authoring

- `frontend/src/storefront/themes/index.ts`
  - Theme preset registry and default theme resolution entry point.
- `frontend/src/storefront/themes/catalog.ts`
  - Marketplace/catalog metadata, descriptions, category mapping, preview fallbacks, and page section stats.
- `frontend/src/storefront/themes/*.json`
  - Full JSON storefront presets. Inspect these when authoring or comparing marketplace-ready themes.
- `frontend/src/storefront/blueprints/compiler.ts`
  - Compiles blueprint presets into runtime themes and enforces composition/page-override rules.
- `frontend/src/storefront/blueprints/types.ts`
  - Blueprint schema, `baseThemeId`, page config typing, and metadata surface.
- `frontend/src/storefront/blueprints/presets/*.ts`
  - Typed blueprint presets. Useful when the theme should be assembled from tokens + page overrides instead of raw JSON only.
- `frontend/src/storefront/blueprints/index.ts`
  - Blueprint exports and the current typed preset surface.
- `frontend/src/storefront/utils/pageOverrides.ts`
  - Page override merge/normalization helpers.
- `frontend/src/storefront/utils/contentOverrides.ts`
  - Content override merge/normalization helpers.
- `frontend/src/storefront/variants/registry.ts`
  - Registry of supported section/component variants.
- `frontend/src/storefront/sections/**`
  - Section implementations for new page composition or new variant work.
- `frontend/src/storefront/components/**`
  - Lower-level storefront components reused by sections and pages.

## Frontend Admin and Editors

- `frontend/src/pages/settings/StorefrontSettingsPage.tsx`
  - Main entry point for storefront settings in admin.
- `frontend/src/pages/settings/StorePages.tsx`
  - Admin UI for custom store pages such as policies, FAQ, and about pages.
- `frontend/src/components/store/StorefrontSettingsTab.tsx`
- `frontend/src/components/store/StorefrontVisualEditor.tsx`
- `frontend/src/components/store/StorefrontPageSectionsEditor.tsx`
  - Editing surfaces that often need to stay aligned with runtime behavior.

## Backend Public APIs

- `backend/routes/publicStorefrontRoutes.js`
  - Public storefront settings endpoint plus storefront app usage tracking.
- `backend/controller/publicStorefrontController.js`
  - Merges company data, storefront settings, template content, and installed marketplace apps into the public payload.
- `backend/routes/publicProductsRoutes.js`
  - Public product listing and product detail endpoints, including normalization and recommendation helpers.
- `backend/routes/publicOrdersRoutes.js`
  - Guest order creation and public checkout flow.

## Backend Admin and Settings

- `backend/routes/storefrontSettingsRoutes.js`
- `backend/controller/storefrontSettingsController.js`
  - Authenticated storefront settings flow, theme guardrails, tracking settings, and pixel management.
- `backend/routes/storePagesRoutes.js`
- `backend/controller/storePagesController.js`
  - CRUD for store pages and default page initialization.

## Tests Worth Reusing

- `frontend/src/storefront/scripts/validate-themes.ts`
  - Theme schema/preset validation.
- `frontend/src/storefront/scripts/validate-blueprints.ts`
  - Blueprint compilation/validation surface.
- `backend/tests/integration/storefrontPublicRoutes.test.js`
  - Strong backend integration coverage for public storefront settings, product normalization, shipping, and guest order flows.
- `frontend/src/storefront/__tests__/storefrontFlow.test.tsx`
- `frontend/src/storefront/__tests__/storefrontCustomPages.test.tsx`
- `frontend/src/storefront/__tests__/storefrontPreview.test.tsx`
- `frontend/src/storefront/__tests__/storefrontThemesMarketplace.test.tsx`
- `frontend/src/storefront/__tests__/themeCatalog.test.ts`
- `frontend/src/storefront/__tests__/themeResolver.test.ts`
- `frontend/src/storefront/__tests__/themeExperienceOverrides.test.ts`
  - Useful frontend test targets depending on whether the change affects runtime flow, custom pages, preview behavior, or theme marketplace behavior.

## Practical Entry Points By Task

- Create a brand-new theme or blueprint:
  - Read `frontend/src/storefront/themes/index.ts`
  - Read `frontend/src/storefront/themes/catalog.ts`
  - Read `frontend/src/storefront/blueprints/compiler.ts`
  - Read the nearest files under `frontend/src/storefront/themes/*.json` and `frontend/src/storefront/blueprints/presets/*.ts`
  - Then inspect `frontend/src/storefront/variants/registry.ts` if the new composition needs different sections or variants
- Add or adjust public page routing:
  - Read `frontend/src/storefront/StorefrontShell.tsx`
  - Read `frontend/src/config/storefrontSystemRoutes.ts`
  - Then inspect `backend/controller/storePagesController.js` if page data is dynamic
- Add or adjust storefront settings:
  - Read `frontend/src/services/storefrontSettingsService.ts`
  - Read `backend/controller/storefrontSettingsController.js`
  - Then inspect the consuming runtime hook or component
- Fix public product or checkout behavior:
  - Read `frontend/src/utils/storefrontApi.ts`
  - Read `backend/routes/publicProductsRoutes.js`
  - Read `backend/routes/publicOrdersRoutes.js`
  - Then inspect the specific storefront runtime component or hook
- Add or adjust a section variant:
  - Read `frontend/src/storefront/variants/registry.ts`
  - Read the relevant file under `frontend/src/storefront/sections/**`
  - Then inspect any shared component under `frontend/src/storefront/components/**`
