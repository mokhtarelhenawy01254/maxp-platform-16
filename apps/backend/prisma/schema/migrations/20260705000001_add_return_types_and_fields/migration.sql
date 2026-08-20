-- Add returnTypeId, shippingCompanyId, trackingNumber, receivedStatus, receivedAt, productCondition,
-- shippingReturnCost, settlementAmount columns to return_requests table
-- Add return_types table

-- Create return_types table first
CREATE TABLE IF NOT EXISTS "return_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shippingCompanyId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "costModel" TEXT NOT NULL,
    "fixedAmount" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "return_types_pkey" PRIMARY KEY ("id")
);

-- Add indexes and unique constraint to return_types
CREATE INDEX IF NOT EXISTS "return_types_companyId_idx" ON "return_types"("companyId");
CREATE INDEX IF NOT EXISTS "return_types_shippingCompanyId_idx" ON "return_types"("shippingCompanyId");
CREATE INDEX IF NOT EXISTS "return_types_code_idx" ON "return_types"("code");
CREATE INDEX IF NOT EXISTS "return_types_isActive_idx" ON "return_types"("isActive");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'return_types_companyId_shippingCompanyId_code_key'
    ) THEN
        ALTER TABLE "return_types" ADD CONSTRAINT "return_types_companyId_shippingCompanyId_code_key" UNIQUE ("companyId", "shippingCompanyId", "code");
    END IF;
END $$;

-- Add FK from return_types to company
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_types_companyId_fkey') THEN
        ALTER TABLE "return_types" ADD CONSTRAINT "return_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add FK from return_types to shipping_companies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_types_shippingCompanyId_fkey') THEN
        ALTER TABLE "return_types" ADD CONSTRAINT "return_types_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "shipping_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add missing columns to return_requests
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "receivedStatus" TEXT NOT NULL DEFAULT 'PENDING_RECEIVE';
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "productCondition" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "shippingReturnCost" DECIMAL(10,2);
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "settlementAmount" DECIMAL(10,2);
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "returnTypeId" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "shippingCompanyId" TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS "return_requests_trackingNumber_idx" ON "return_requests"("trackingNumber");
CREATE INDEX IF NOT EXISTS "return_requests_returnTypeId_idx" ON "return_requests"("returnTypeId");
CREATE INDEX IF NOT EXISTS "return_requests_shippingCompanyId_idx" ON "return_requests"("shippingCompanyId");

-- Add unique constraint (companyId, orderId) if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_companyId_orderId_key'
    ) THEN
        ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_companyId_orderId_key" UNIQUE ("companyId", "orderId");
    END IF;
END $$;

-- Add FK from return_requests to return_types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_returnTypeId_fkey') THEN
        ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_returnTypeId_fkey" FOREIGN KEY ("returnTypeId") REFERENCES "return_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add FK from return_requests to shipping_companies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_shippingCompanyId_fkey') THEN
        ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_shippingCompanyId_fkey" FOREIGN KEY ("shippingCompanyId") REFERENCES "shipping_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
