-- Clean up duplicate return requests, keeping the oldest one per (companyId, orderId)
-- This must run BEFORE the unique constraint is added

BEGIN;

WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "companyId", "orderId"
    ORDER BY "createdAt" ASC, id ASC
  ) as rn
  FROM return_requests
)
DELETE FROM return_requests
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Remove the old single-column index on companyId as the new unique constraint covers it
DROP INDEX IF EXISTS return_requests_company_id_idx;

COMMIT;
