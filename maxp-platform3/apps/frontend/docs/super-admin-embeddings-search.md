# Super Admin Embeddings: Company Search & Last-Run

## Changes

### `SuperAdminProductEmbeddings.tsx`
- Added company name search bar for both Product Embeddings and Knowledge Embeddings company lists
- Company names are fetched from `/admin/companies` API and joined by `company_id`
- Last-run timestamp now persists across page refreshes using `last_db_update` from API
- Next-schedule is computed dynamically from configured hour/minute instead of hardcoded text

### API (`apps/ai-service/`)
- `job.last_db_update` added to both product and knowledge embedding status endpoints
