# Facebook Settings Consolidation - 2026-05-09

## Context

The Facebook sidebar exposed two adjacent settings pages:

- `/settings/facebook`
- `/settings/facebook-oauth`

Both screens showed Facebook page connection state, which made the product feel duplicated. The older `/settings/facebook` page still carried a few operational tools that were not present on the OAuth screen: diagnostics, setup guide access, and Facebook page blocked-customer management.

## Change

- `/settings/facebook-oauth` is now the single merchant-facing Facebook Messenger settings surface.
- The OAuth page now includes:
  - refresh controls
  - connected page management
- Blocked-customer management moved to a dedicated page at `/settings/facebook-blocked-customers`.
- `/settings/facebook` now redirects to `/settings/facebook-oauth`.
- The Facebook sidebar now shows one settings entry that points to `/settings/facebook-oauth`.
- The Facebook sidebar also includes a separate `العملاء المحظورين` entry for blocked-customer operations.
- The duplicate `/settings/facebook-oauth` route registration in `App.tsx` was removed.
- The setup guide, diagnostics modal, and secure-linking benefits card were removed from the merchant OAuth page.

## Files

- `frontend/src/pages/settings/FacebookOAuth.tsx`
- `frontend/src/pages/settings/FacebookBlockedCustomers.tsx`
- `frontend/src/App.tsx`
- `frontend/src/config/sidebar.ts`

## Notes

The legacy `FacebookSettings.tsx` file is intentionally left in the codebase for now as reference while the consolidated OAuth page settles in production. It is no longer routed from the main app.
