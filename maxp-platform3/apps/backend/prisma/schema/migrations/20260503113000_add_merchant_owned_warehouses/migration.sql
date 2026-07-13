ALTER TABLE "warehouses"
  ADD COLUMN IF NOT EXISTS "merchantId" TEXT;

CREATE INDEX IF NOT EXISTS "warehouses_merchantId_idx"
ON "warehouses"("merchantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'warehouses_merchantId_fkey'
  ) THEN
    ALTER TABLE "warehouses"
      ADD CONSTRAINT "warehouses_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "warehouses" w
SET
  "merchantId" = m."id",
  "type" = 'merchant',
  "updatedAt" = NOW()
FROM "Merchant" m
WHERE
  m."defaultWarehouseId" = w."id"
  AND m."companyId" = w."companyId"
  AND w."merchantId" IS NULL;

INSERT INTO "warehouses" (
  "id",
  "name",
  "location",
  "type",
  "capacity",
  "isActive",
  "companyId",
  "merchantId",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('mwh_', SUBSTRING(MD5(m."id"), 1, 20)),
  CONCAT('مخزن ', m."name"),
  m."address",
  'merchant',
  NULL,
  TRUE,
  m."companyId",
  m."id",
  NOW(),
  NOW()
FROM "Merchant" m
WHERE NOT EXISTS (
  SELECT 1
  FROM "warehouses" w
  WHERE w."merchantId" = m."id"
);

UPDATE "Merchant" m
SET "defaultWarehouseId" = w."id"
FROM "warehouses" w
WHERE
  w."merchantId" = m."id"
  AND (
    m."defaultWarehouseId" IS NULL
    OR m."defaultWarehouseId" = ''
    OR NOT EXISTS (
      SELECT 1
      FROM "warehouses" existing
      WHERE
        existing."id" = m."defaultWarehouseId"
        AND existing."merchantId" = m."id"
    )
  );
