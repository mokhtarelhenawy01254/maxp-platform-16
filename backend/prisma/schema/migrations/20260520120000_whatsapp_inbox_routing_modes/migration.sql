ALTER TABLE "whatsapp_number_assignments"
ADD COLUMN "routingMode" TEXT NOT NULL DEFAULT 'NUMBER_OWNER',
ADD COLUMN "distributionStrategy" TEXT NOT NULL DEFAULT 'ROUND_ROBIN',
ADD COLUMN "routingUserIds" TEXT,
ADD COLUMN "roundRobinCursor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastDistributedUserId" TEXT,
ADD COLUMN "lastDistributedAt" TIMESTAMP(3);

UPDATE "whatsapp_number_assignments"
SET
  "routingUserIds" = CASE
    WHEN "assignedUserId" IS NOT NULL THEN CONCAT('["', "assignedUserId", '"]')
    ELSE '[]'
  END,
  "routingMode" = CASE
    WHEN "assignedUserId" IS NOT NULL THEN 'NUMBER_OWNER'
    ELSE "routingMode"
  END;
