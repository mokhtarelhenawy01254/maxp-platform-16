# Super-admin users select labels

## Context

After the production chunk recovery deploy on 2026-05-07, browser verification
of `/super-admin/users` no longer showed dynamic import failures. Chrome
DevTools still reported unlabeled combobox controls on the page.

## Change

`frontend/src/pages/SuperAdminUsersManagement.tsx` now gives the users page
filter and editor selects hidden Arabic `SelectLabel` labels. The shared
`frontend/src/components/ui/select.tsx` wrapper now maps `SelectLabel` to Base
UI's root `Select.Label` primitive, so each trigger receives an
`aria-labelledby` relationship from the component library itself.

The users page also gives each select a stable `name`, which keeps Base UI's
visually hidden form inputs from receiving generated IDs that Chrome reports as
unlabeled fields.

This keeps the visual layout unchanged while giving assistive technologies a
stable name for the account status, page size, role, and availability controls.

## Verification

Reload `/super-admin/users` and confirm the dynamic imports return 200 and no
new unlabeled combobox warnings are emitted for the visible filters.
