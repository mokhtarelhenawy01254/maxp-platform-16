# Returns Status Filters

## Problem

Return management page (`/returns`) had hardcoded status filter buttons: الكل, قيد الانتظار (PENDING), تمت الموافقة (APPROVED), مرفوض (REJECTED), مكتمل (COMPLETED). Stores could not hide statuses they don't use.

## Changes

- **`apps/frontend/src/services/returnService.ts`**: Added `showPendingStatus`, `showApprovedStatus`, `showRejectedStatus`, `showCompletedStatus` to `ReviewDisplayConfig`. Created `ReturnSettingsData` interface. Typed `getSettings()`/`updateSettings()`.

- **`apps/frontend/src/pages/returns/ReturnSettingsPage.tsx`**: Added "حالات التصفية" (Filter Statuses) section in Display Settings tab with Switch toggles for each status. All enabled by default (`DEFAULT_DISPLAY_CONFIG`).

- **`apps/frontend/src/pages/returns/ReturnManagementPage.tsx`**: Computes `visibleStatuses` from `displayConfig` settings. "الكل" always visible. Only shows status buttons for enabled statuses.
