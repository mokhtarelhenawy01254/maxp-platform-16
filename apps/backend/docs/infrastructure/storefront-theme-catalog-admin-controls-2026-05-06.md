# Storefront Theme Catalog Admin Controls - 2026-05-06

## Summary

Super Admin storefront theme management now supports safer day-to-day catalog operations:

- Search by theme name, description, category, or `themeId`.
- Filter by visibility, activation state, archive state, pricing, and category.
- Select visible results and apply bulk actions.
- Archive themes safely by setting `isPublic=false` and `isActive=false` instead of deleting theme rows.
- Show usage telemetry per theme so admins can see installations, active installs, purchases, and companies currently using a theme before archiving.

## Backend Behavior

The admin catalog response from `/api/v1/super-admin/storefront-theme-catalog` includes `usageStats` for each theme:

- `installations`
- `activeInstallations`
- `purchases`
- `currentCompanies`
- `installCount`

Theme catalog sync now preserves intentional admin visibility decisions for existing theme rows. New preset rows are still created as active and public, but previously archived rows are not automatically re-enabled during read-time sync.

## Frontend Behavior

`SubscriptionCenter` storefront themes mode adds a control strip above the card grid:

- Search input.
- Status, pricing, and category filters.
- Select-all-for-current-results checkbox.
- Bulk show, disable, archive, and price-update actions.

Each theme card now shows usage counts and exposes:

- Preview link to `/marketplace/themes?theme={themeId}`.
- Safe archive/show action.
- Existing save action for per-theme edits.

## Safety Notes

Archiving does not remove records from `marketplace_apps` and does not remove existing company installations. Existing companies using a theme can keep their current storefront experience, while the archived theme stops appearing as a new selectable option for companies.
