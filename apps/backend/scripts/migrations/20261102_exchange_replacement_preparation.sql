-- Task 69cc5d36 — التجهيز: البديل يبقى أوردر عادي
--
-- Migration ONLY (must run BEFORE the code that drops the exchange exception ships):
-- an exchange replacement order was saved with status EXCHANGED, and EXCHANGED is
-- terminal for the preparation queue. The queue only showed those rows through a
-- temporary SQL exception. This migration moves every such replacement to
-- PENDING_PREPARATION (a normal preparation order) and writes one audit row each,
-- so the exception can be deleted without any order disappearing from the queue.
--
-- The ORIGINAL order is never touched: it carries neither metadata.requestType='exchange'
-- nor metadata.originalOrderId.
--
-- Idempotent: the WHERE clause requires status = 'EXCHANGED'; a second run matches
-- zero rows (0 audit rows, 0 updates).
--
-- Dry run: run everything inside the transaction, read the SELECT output, then ROLLBACK.
-- Apply:   psql ... -v ON_ERROR_STOP=1 -f 20261102_exchange_replacement_preparation.sql

BEGIN;

CREATE TEMP TABLE _exchange_replacement_migration ON COMMIT DROP AS
SELECT o."id" AS id,
       o."orderNumber" AS "orderNumber",
       o."companyId" AS "companyId",
       o."metadata"::jsonb->>'originalOrderNumber' AS "originalOrderNumber"
FROM "orders" o
WHERE o."status"::text = 'EXCHANGED'
  AND (
    o."metadata"::jsonb->>'requestType' = 'exchange'
    OR o."metadata"::jsonb->>'originalOrderId' IS NOT NULL
  )
  AND (
    o."metadata"::jsonb->>'preparationStatus' IS NULL
    OR o."metadata"::jsonb->>'preparationStatus' = ''
  );

-- 1) Audit trail BEFORE the update (old → new + reason + actor).
INSERT INTO "OrderStatusHistory"
  ("id", "orderId", "status", "oldStatus", "changedBy", "userName", "reason", "createdAt")
SELECT 'migr_' || replace(gen_random_uuid()::text, '-', ''),
       m.id,
       'PENDING_PREPARATION',
       'EXCHANGED',
       'hermes-migration:task-69cc5d36',
       'Hermes (automated migration)',
       'ترحيل تاسك 69cc5d36: أوردر البديل بقى أوردر تجهيز عادي (EXCHANGED → PENDING_PREPARATION) — بيانات الأصل في metadata زي ما هي؛ الأصل نفسه لم يُلمس',
       now()
FROM _exchange_replacement_migration m;

-- 2) Status change — scoped to the exact rows and re-checked against the enum value.
UPDATE "orders" o
SET "status" = 'PENDING_PREPARATION',
    "updatedAt" = now()
FROM _exchange_replacement_migration m
WHERE o."id" = m."id"
  AND o."status"::text = 'EXCHANGED';

-- 3) Report (visible before COMMIT).
SELECT (SELECT count(*) FROM _exchange_replacement_migration)::int AS migrated_rows,
       (SELECT count(*) FROM "orders" o
         WHERE o."status"::text = 'EXCHANGED'
           AND (o."metadata"::jsonb->>'requestType' = 'exchange'
                OR o."metadata"::jsonb->>'originalOrderId' IS NOT NULL)
           AND (o."metadata"::jsonb->>'preparationStatus' IS NULL
                OR o."metadata"::jsonb->>'preparationStatus' = ''))::int AS remaining_exchanged_replacements;

COMMIT;
