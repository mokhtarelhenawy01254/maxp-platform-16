-- AlterTable: Add branchId, pickupRequestId, actualWeight, priceAdjustment, barcode to shipments
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "pickupRequestId" TEXT;
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "actualWeight" DECIMAL(10,3);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "priceAdjustment" DECIMAL(10,2);
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "barcode" TEXT;

-- CreateTable: shipping_branches
CREATE TABLE IF NOT EXISTS "shipping_branches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "governorate" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipping_branches_companyId_code_key" ON "shipping_branches"("companyId", "code");
CREATE INDEX IF NOT EXISTS "shipping_branches_companyId_isActive_idx" ON "shipping_branches"("companyId", "isActive");

-- CreateTable: pickup_requests
CREATE TABLE IF NOT EXISTS "pickup_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "merchantId" TEXT,
    "pickupNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "city" TEXT,
    "governorate" TEXT NOT NULL,
    "expectedParcels" INTEGER NOT NULL DEFAULT 1,
    "actualParcels" INTEGER,
    "assignedCourierId" TEXT,
    "branchId" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pickup_requests_companyId_pickupNumber_key" ON "pickup_requests"("companyId", "pickupNumber");
CREATE INDEX IF NOT EXISTS "pickup_requests_companyId_status_scheduledDate_idx" ON "pickup_requests"("companyId", "status", "scheduledDate");
CREATE INDEX IF NOT EXISTS "pickup_requests_companyId_merchantId_idx" ON "pickup_requests"("companyId", "merchantId");
CREATE INDEX IF NOT EXISTS "pickup_requests_assignedCourierId_idx" ON "pickup_requests"("assignedCourierId");
CREATE INDEX IF NOT EXISTS "pickup_requests_branchId_idx" ON "pickup_requests"("branchId");

-- Create unique & indexes on shipments
CREATE UNIQUE INDEX IF NOT EXISTS "shipments_companyId_barcode_key" ON "shipments"("companyId", "barcode");
CREATE INDEX IF NOT EXISTS "shipments_branchId_idx" ON "shipments"("branchId");
CREATE INDEX IF NOT EXISTS "shipments_pickupRequestId_idx" ON "shipments"("pickupRequestId");
CREATE INDEX IF NOT EXISTS "shipments_barcode_idx" ON "shipments"("barcode");

-- Foreign key constraints with IF NOT EXISTS checks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pickup_requests_branchId_fkey'
    ) THEN
        ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "shipping_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipments_branchId_fkey'
    ) THEN
        ALTER TABLE "shipments" ADD CONSTRAINT "shipments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "shipping_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shipments_pickupRequestId_fkey'
    ) THEN
        ALTER TABLE "shipments" ADD CONSTRAINT "shipments_pickupRequestId_fkey" FOREIGN KEY ("pickupRequestId") REFERENCES "pickup_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
