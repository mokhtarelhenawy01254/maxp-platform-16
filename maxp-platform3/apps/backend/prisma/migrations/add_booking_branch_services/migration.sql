-- CreateTable: booking_branch_services
CREATE TABLE "booking_branch_services" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "serviceId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "hasPackages" BOOLEAN NOT NULL DEFAULT true,
    "packages" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_branch_services_pkey" PRIMARY KEY ("id")
);

-- Migrate existing service data into the join table
INSERT INTO "booking_branch_services" ("serviceId", "branchId", "hasPackages", "packages", "isActive", "createdAt", "updatedAt")
SELECT "id", "branchId", "hasPackages", "packages", "isActive", "createdAt", "updatedAt" FROM "booking_services";

-- Drop FK and indexes on booking_services before removing columns
DROP INDEX IF EXISTS "booking_services_branchId_idx";
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_branchId_fkey";

-- Drop columns that moved to the join table
ALTER TABLE "booking_services" DROP COLUMN "branchId";
ALTER TABLE "booking_services" DROP COLUMN "hasPackages";
ALTER TABLE "booking_services" DROP COLUMN "packages";

-- Create indexes on the join table
CREATE INDEX "booking_branch_services_branchId_idx" ON "booking_branch_services"("branchId");
CREATE UNIQUE INDEX "booking_branch_services_serviceId_branchId_key" ON "booking_branch_services"("serviceId", "branchId");

-- AddForeignKey: booking_branch_services -> booking_services
ALTER TABLE "booking_branch_services" ADD CONSTRAINT "booking_branch_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "booking_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: booking_branch_services -> booking_branches
ALTER TABLE "booking_branch_services" ADD CONSTRAINT "booking_branch_services_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "booking_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
