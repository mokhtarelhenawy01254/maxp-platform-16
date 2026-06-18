# Super Admin Plans Center Removal

Removed the Platform Plans (خطط المنصة) administration tab and route from the Super Admin dashboard.

## Changes
- **SuperAdminSidebar.tsx**: Removed the link to the Plans Center.
- **App.tsx**: Removed the route for `/super-admin/plans`.
- **projectMapData.tsx**: Updated the reference to target `/super-admin/marketplace-management`.
- **SubscriptionCenter.tsx**: Removed the Platform Plans tab, all associated states, API calls, and nested components (`PlatformPlansTab`, `EditPlanDialog`).
- **SubscriptionCenter.catalogDiff.test.tsx**: Updated the tests to match the removed tab and correct indexes.
