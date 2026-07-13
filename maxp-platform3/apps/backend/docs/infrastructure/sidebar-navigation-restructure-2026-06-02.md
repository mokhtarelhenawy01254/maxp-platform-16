# Sidebar Navigation Restructure — Dashboard Default & Company Links Relocation

**Date**: 2026-06-02
**Type**: Navigation/Routing Restructure
**Scope**: Frontend — React Router config, Sidebar menu config, 3 Sidebar layout components, Feature map

## Summary

Three interrelated navigation changes:

1. **Dashboard as default page** — The logo/company header in all sidebar layouts (`ThreeTierSidebar`, `ClassicSidebar`, `MinimalSidebar`) is now wrapped in a `<Link to="/company-dashboard">` so clicking it always returns to the Dashboard.
2. **Company Links relocated** — The `/company-links` protected route is moved to `/my-companies/links`. The old path now issues a `<Navigate replace />` for backward compatibility. The public sharing route `/company-links/:token` is unchanged.
3. **"My Companies" section expanded** — The section now appears for `COMPANY_ADMIN` and `SUPER_ADMIN` in addition to `OWNER`, making Company Links (and future company-level tools) accessible to all admin roles.

## Files Changed

| File | Type | Change |
|------|------|--------|
| `frontend/src/App.tsx` | Modified | Added `/my-companies/links` route; changed 3 `/company-links` protected routes to `<Navigate to="/my-companies/links" replace />` |
| `frontend/src/config/sidebar.ts` | Modified | Moved `companyLinks` item from `main` section to `my-companies` section; expanded role access to `[OWNER, COMPANY_ADMIN, SUPER_ADMIN]` |
| `frontend/src/config/marketplaceFeatureMap.ts` | Modified | Updated `company-links` route reference to `/my-companies/links` |
| `frontend/src/components/layout/sidebar/ThreeTierSidebar.tsx` | Modified | Wrapped logo rail and company panel header in `<Link to="/company-dashboard">` |
| `frontend/src/components/layout/sidebar/ClassicSidebar.tsx` | Modified | Wrapped logo in expanded and collapsed states in `<Link to="/company-dashboard">` |
| `frontend/src/components/layout/sidebar/MinimalSidebar.tsx` | Modified | Wrapped logo in `<Link to="/company-dashboard">` |

## Routes Summary

| Path | Auth | Behavior |
|------|------|----------|
| `/company-dashboard` | Protected | Dashboard (default landing after login) |
| `/my-companies/links` | Protected | Company Links management |
| `/company-links` | Protected | Redirects to `/my-companies/links` |
| `/company-links/:token` | Public | Shared company links (unchanged) |

## Sidebar Sections

### Main section
- `companyLinks` removed (moved to `my-companies`)

### My Companies section
- Role access: `OWNER`, `COMPANY_ADMIN`, `SUPER_ADMIN` (was: only `OWNER`)
- Items: `companiesDashboard` (HR dashboard), `companyLinks` (新增), `unifiedReports`, `attendanceReport`, `usersManagement`

## Backward Compatibility

- Old `/company-links` bookmarks still work via `<Navigate replace />`
- Public sharing links `/company-links/:token` are untouched
- Permissions are unchanged (component-level `canManage` in `CompanyLinks.tsx` already covers the roles)
