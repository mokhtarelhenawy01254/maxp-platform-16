# Order Management Marketplace App Gating (2026-09-05)

## Overview
Fixed an issue where all optional marketplace applications and features in the "إدارة الطلبات" (Order Management) sidebar section appeared for company accounts (specifically owners and company admins) even when those apps were not installed or active.

## Root Cause
In `apps/frontend/src/config/sidebar.ts`, the sub-items under the `orders` section were solely checking `requiredPermissions`. Because company owners and admins have `isSuperOrAdmin = true`, permission checks passed unconditionally, displaying 20+ optional marketplace apps.

## Changes Made
1. **Sidebar Gating (`apps/frontend/src/config/sidebar.ts`):**
   - Added `hidden: !isAppActive(...)` and `hidden: !isAnyAppActive(...)` to all standalone marketplace features in order management:
     - `order-automation`
     - `order-invoicing`
     - `bulk-search`
     - `ugc-reviews-pro`
     - `customer-blocks`
     - `order-shipping-turbo`
     - `returns-settings`
     - `bulk-orders`
     - `quick-status`
     - `orders-analytics`
     - `status-summary`
     - `woocommerce-pro` / `webhooks-pro`
     - `order-workflow`
     - `cod-deposit`
     - `whatsapp-business`
   - Kept core store features visible whenever the store is active:
     - `/orders` (Orders list)
     - `/orders/preparation` (Preparation)
     - `/orders/incomplete` (Incomplete orders)
     - `/settings/orders` (General order settings)

2. **Route Protection (`apps/frontend/src/App.tsx`):**
   - Wrapped matching routes with `<AppAccessRoute requiredAppSlugs={[...]} />`.

3. **Test Update (`apps/frontend/src/config/__tests__/sidebar.ordersSettings.test.ts`):**
   - Updated tests to verify items are hidden when the corresponding app is inactive and visible when activated.
