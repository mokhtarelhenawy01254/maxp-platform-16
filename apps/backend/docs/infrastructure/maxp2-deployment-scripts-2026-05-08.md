# MaxP2 Deployment Utility Scripts - 2026-05-08

The continuation snapshot initially excluded ignored utility scripts to keep the
new repository small and free of local/runtime artifacts.

Two scripts are required by the production deployment workflow and must remain
tracked in `maxp2`:

- `backend/scripts/createSuperAdmin.js` powers the non-blocking
  `setup:superadmin` deployment step.
- `backend/scripts/sync_target_marketplace_catalog_entries.js` powers the
  required `catalog:sync-target` deployment step.

The `.gitignore` file now keeps the broad temporary-script ignore rule while
explicitly allowing these deployment utilities.
