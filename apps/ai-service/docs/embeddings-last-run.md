# Embeddings Last-Run Persistence

## Problem
After an embeddings job completes, the UI displayed "last run" as the agent's job timestamp. Refreshing the page lost the value because it wasn't persisted.

## Changes
### API (`apps/ai-service/src/api/admin/`)
- **knowledge_embeddings.py**: `get_knowledge_status` now returns `job.last_db_update` queried from `ai.knowledge_embeddings.updated_at`
- **product_embeddings.py**: `get_status` now returns `job.last_db_update` queried from `ai.product_embeddings.updated_at`

### Frontend (`apps/frontend/src/pages/super-admin/SuperAdminProductEmbeddings.tsx`)
- Added company name search input to filter by `company_name`
- Displays `last_db_update` from the job response as a persistent "last run" timestamp

## Testing
- Call `GET /api/v1/admin/product-embeddings/status` and verify `job.last_db_update` appears
- Call `GET /api/v1/admin/knowledge-embeddings/status` and verify `job.last_db_update` appears
