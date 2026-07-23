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

COMMIT;
