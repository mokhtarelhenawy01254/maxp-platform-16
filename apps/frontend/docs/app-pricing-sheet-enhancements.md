# App Pricing Sheet Enhancements

## Overview
This document outlines the enhancements made to the App Pricing Sheet (`AppPricingSheet.tsx`) which serves as a unified view for all application pricing across the platform.

## Changes Implemented
1. **API Pagination Fix**: Increased the `/marketplace/apps` request limit to `500` to ensure all applications are retrieved and displayed in the sheet, avoiding silent omissions of applications beyond the previous limit of 100.
2. **Yearly Pricing Display**: Added the "Yearly Price" column to the data grid and spreadsheet views to provide a comprehensive pricing overview for B2B/SaaS customers and Super Admins.
3. **Super Admin Capabilities**: Introduced a conditional "Edit Pricing" action column specifically visible to users with the `SUPER_ADMIN` role, allowing them to quickly jump to the `marketplace-management` section to update app details.
4. **UI Improvements**: Made the table header (`<thead>`) sticky to maintain context while scrolling through large lists of applications.
5. **Localization & Translations**: Added support for unit translations (`message`, `request`, `order`, etc.) within both Arabic (`ar`) and English (`en`) `subscription.json` namespaces. Also localized the newly added CSV columns for yearly pricing.
6. **Super Admin Sidebar Placement**: Added the App Pricing Sheet link to the dedicated Super Admin `Subscriptions & Billing` sidebar group.
7. **Super Admin Route Context**: Updated `/super-admin/app-pricing` to render the Subscription Center with the App Pricing tab selected, keeping the page inside the subscriptions and billing management context.
8. **Export Action Removal**: Removed the visible Excel/CSV export action from the App Pricing Sheet toolbar.

## Files Modified
- `apps/frontend/src/pages/subscription/AppPricingSheet.tsx`
- `apps/frontend/src/locales/ar/sections/subscription.json`
- `apps/frontend/src/locales/en/sections/subscription.json`
- `apps/frontend/src/config/sidebar.ts`
- `apps/frontend/src/components/layout/SuperAdminSidebar.tsx`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/pages/super-admin/SubscriptionCenter.tsx`
- `apps/frontend/src/pages/super-admin/__tests__/SubscriptionCenter.catalogDiff.test.tsx`
- `apps/frontend/src/pages/super-admin/__tests__/SubscriptionCenter.storefrontThemes.test.tsx`
- `apps/frontend/src/locales/ar/sections/superAdmin.json`
- `apps/frontend/src/locales/en/sections/superAdmin.json`

## Verification
- Validated sticky headers behavior.
- Confirmed Super Admin conditional logic using `useAuth`.
- Verified Arabic and English unit translations.
- `npm run i18n:merge`
- `npx eslint src\App.tsx src\components\layout\SuperAdminSidebar.tsx src\pages\subscription\AppPricingSheet.tsx`
- `npm run test:catalog-diff-smoke`
- `npx jest --config jest.config.cjs src/pages/super-admin/__tests__/SubscriptionCenter.storefrontThemes.test.tsx --runInBand`
- `npm run build`
- `node scripts\verify-docs.js`
- `npm run type-check` was attempted twice but exceeded the command timeout before producing diagnostics.
