# Sidebar Layout Preference Persistence Fixes

This document records the design and implementation fixes for the user-reported sidebar layout persistence issue where the side menu's layout gets stuck and keeps reverting.

## 1. User Sync Preference Race Condition (`SidebarSettingsContext.tsx`)

### The Issue
In `SidebarSettingsContext.tsx`, on mount, `syncUserLayout` fetches user preferences from `/user/settings`. If the preference is not set (e.g. fresh installation) or cleared explicitly by the user, the server returns `sidebarLayout: null`.
However, the front-end merge logic used the nullish coalescing operator:
```typescript
const next = { ...prev, sidebarLayout: serverLayout ?? prev.sidebarLayout };
```
Since `null ?? "classic"` evaluates to `"classic"`, any stale cached layout in `localStorage` was incorrectly overriding the server's clean state (`null`), causing layout preferences to get stuck and never fall back to company defaults correctly.

### The Fix
Updated the merge logic to check for key existence (using `in` operator) in the server response payload, and explicitly allow the server's `null` override to overwrite the local state:
```typescript
const resolvedLayout = "sidebarLayout" in serverData ? serverData.sidebarLayout : undefined;
setUserSettings((prev) => {
  const next = {
    ...prev,
    sidebarLayout: resolvedLayout !== undefined ? resolvedLayout : prev.sidebarLayout,
  };
  saveUserSettings(next);
  return next;
});
```

## 2. Company Settings Selection Override (`CompanySettings.tsx`)

### The Issue
In `Layout.tsx`, the layout is resolved using:
```typescript
const resolvedUserLayout = userLayout || (user?.company?.sidebarLayout as SidebarLayoutType);
```
When a company admin modified the company default layout in `CompanySettings.tsx`, it correctly persisted in the database. However, any existing personal custom overrides (`userLayout` in local storage or user settings) took precedence over the company layout. As a result, the admin's changes were not visible on their own viewport since the per-user override masked the company preference.

### The Fix
Integrated `useSidebarSettings` context into `CompanySettings.tsx` and updated the company layout change handler `handleLayoutChange` to call `sidebarCtx.setUserLayout(null)` to clear the user's custom layout override. This guarantees that when the company layout is changed, the viewport immediately falls back to the newly defined default.
