# Granular Orders Permissions — 2026-07-13

## New Orders Domain Permissions

Added granular sub-domain permissions under the ORDERS domain in `seedPermissions.js`:

| Permission Group | Keys Added |
|---|---|
| Invoices | `orders.invoices.view`, `orders.invoices.manage`, `orders.invoices.print` |
| Manual Order | `orders.manual.create` |
| Status Summary Report | `orders.status-summary.view` |
| Returns | `orders.returns.view`, `orders.returns.manage`, `orders.returns.approve` |
| Shipping Companies | `orders.shipping.view`, `orders.shipping.manage` |
| Turbo Tickets | `orders.tickets.view`, `orders.tickets.create`, `orders.tickets.manage` |
| Bulk Search | `orders.bulk-search.view` |
| POS | `orders.pos.view`, `orders.pos.manage` |
| Order Settings | `orders.settings.view`, `orders.settings.manage` |
| Customer Blocks | `orders.customer-blocks.view`, `orders.customer-blocks.manage` |
| Turbo Settings | `orders.turbo-settings.view`, `orders.turbo-settings.manage` |
| Return Settings | `orders.return-settings.view`, `orders.return-settings.manage` |
| Cancellation Reasons | `orders.cancellation-reasons.view`, `orders.cancellation-reasons.manage` |
| Platform Integrations | `orders.integrations.view`, `orders.integrations.manage` |
| Order Workflow | `orders.workflow.view`, `orders.workflow.manage` |

### Built-in Role Updates

- **AGENT role**: added `orders.invoices.view`, `orders.manual.create`, `orders.status-summary.view`, `orders.shipping.view`, `orders.workflow.view`, `orders.settings.view`
- **AFFILIATE role**: added `orders.invoices.view`, `orders.manual.create`

### RolesManagement.jsx — Subgroup Display

- Removed emoji prefixes from all Orders subgroup labels
- Added new subgroup entries for all 15 new permission groups
- Renamed subgroups for clarity (e.g., "الطلبات غير المكتملة", "مركز التأكيد والمتابعة")

## Companies Controller — Role Display Names

`companiesController.js`:
- Removed `roleRef` relation (Prisma include) from `getCompanyUsers` and `updateUser`
- Added `ROLE_DISPLAY_NAMES` mapping with Arabic fallback labels (`مالك`, `مدير النظام`, `مدير الشركة`, etc.)
- `roleName` now resolves from the `role` string directly instead of joining `roleRef.name`

## MyCompaniesDashboard — Role Guard

`MyCompaniesDashboard.tsx`:
- Added authorization guard: only `OWNER` and `SUPER_ADMIN` roles can access the owner dashboard
- Non-authorized users see an error message: "هذه الصفحة متاحة لأصحاب الشركات فقط"

## Image URL — CDN Proxy Fix

`imageUrl.ts`:
- Facebook CDN URLs (`fbcdn`, `fbsbx`) now pass through the proxy server instead of direct `<img>` loading
- Fixes 403 errors caused by hotlink protection on external CDN images
