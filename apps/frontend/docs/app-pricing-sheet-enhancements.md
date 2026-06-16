# App Pricing Sheet Enhancements

## Overview
This document outlines the enhancements made to the App Pricing Sheet (`AppPricingSheet.tsx`) which serves as a unified view for all application pricing across the platform.

## Changes Implemented
1. **API Pagination Fix**: Increased the `/marketplace/apps` request limit to `500` to ensure all applications are retrieved and displayed in the sheet, avoiding silent omissions of applications beyond the previous limit of 100.
2. **Yearly Pricing Display**: Added the "Yearly Price" column to the data grid and spreadsheet views to provide a comprehensive pricing overview for B2B/SaaS customers and Super Admins.
3. **Super Admin Capabilities**: Introduced a conditional "Edit Pricing" action column specifically visible to users with the `SUPER_ADMIN` role, allowing them to quickly jump to the `marketplace-management` section to update app details.
4. **UI Improvements**: Made the table header (`<thead>`) sticky to maintain context while scrolling through large lists of applications.
5. **Localization & Translations**: Added support for unit translations (`message`, `request`, `order`, etc.) within both Arabic (`ar`) and English (`en`) `subscription.json` namespaces. Also localized the newly added CSV columns for yearly pricing.

## Files Modified
- `apps/frontend/src/pages/subscription/AppPricingSheet.tsx`
- `apps/frontend/src/locales/ar/sections/subscription.json`
- `apps/frontend/src/locales/en/sections/subscription.json`
- `apps/frontend/src/config/sidebar.ts`

## Verification
- Validated sticky headers behavior.
- Confirmed Super Admin conditional logic using `useAuth`.
- Verified Arabic and English unit translations.
- Passed `tsc` and `eslint` checks.

- \pps/frontend/src/App.tsx\`n6. **Super Admin Routing**: Added the App Pricing Sheet to the Super Admin layout under /super-admin/app-pricing to prevent Super Admins from being redirected to the customer platform view.

- \pps/frontend/src/config/sidebar.ts\`n7. **Sidebar Placement**: Moved the Super Admin's 'App Pricing Sheet' link back to the 'Subscriptions and Invoices' section, dynamically routing to \/super-admin/app-pricing\ for \SUPER_ADMIN\ users, and \/subscription/pricing\ for others.

8. **External Navigation**: Updated 'Details' and 'Edit Pricing' buttons to use \window.open\ instead of \
avigate\ to open target pages in new tabs, ensuring the pricing sheet remains open.
