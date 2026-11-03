-- AlterTable: Add lastBranchAt to shipments for branch custody tracking (SHIP-W10)
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "lastBranchAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "shipments_lastBranchAt_idx" ON "shipments"("lastBranchAt");
