# Bulk Search — Limit Expansion & Chunked Query Batching (2026-09-28)

## Problem

The bulk search tool (`https://maxp.online/bulk-search`) previously restricted queries to a maximum of 100 values:
- Frontend threw `bulkSearch.errorMaxValues` when input had > 100 values.
- Backend `bulkSearchController.js` rejected requests with `Maximum 100 values allowed per search`.
- Users pasting hundreds or thousands of order numbers or customer phone numbers could not perform bulk lookups.

## Changes & Implementation

1. **Backend (`apps/backend/controller/bulkSearchController.js`)**:
   - Expanded maximum values limit from 100 to 10,000 values (`MAX_BULK_SEARCH_VALUES = 10000`).
   - Implemented chunked batching (`BATCH_SIZE = 100`) for `orderNumber` search to execute queries concurrently in batches, preventing PostgreSQL parameter exhaustion or deep AST query planning bottlenecks.
   - Implemented chunked batching (`BATCH_SIZE = 500`) for `phone` search to keep `IN` clauses optimal and lightweight.
   - Optimized `foundInputValues` calculation for order numbers using a `Set` for O(1) exact matching before falling back to suffix/partial comparisons.

2. **Frontend (`apps/frontend/src/pages/bulk-search/BulkSearchPage.tsx`)**:
   - Updated validation cap from 100 to 10,000 values.

3. **Translations (`apps/frontend/src/locales/`)**:
   - Updated `bulkSearch.valueCount` to show pure count (`عدد القيم: {{count}}`) without the restrictive `(الحد الأقصى: 100)` label.
   - Updated `bulkSearch.errorMaxValues` to reference 10,000 values.
   - Regenerated merged translation bundles and i18n TypeScript definitions.
