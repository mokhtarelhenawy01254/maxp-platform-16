-- SHIP-W15: Full Courier Profile (Documents, Compensation Models & Monthly Payroll Engine)

-- 1. Alter couriers table: Add compensation and document verification fields
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "documentsStatus" TEXT NOT NULL DEFAULT 'INCOMPLETE';
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "hireDate" TIMESTAMP(3);
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "salaryBase" DECIMAL(10, 2);
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "compensationModel" TEXT NOT NULL DEFAULT 'COMMISSION_ONLY';
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "bonusPerOrder" DECIMAL(10, 2);
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "bonusStartsAfterOrders" INTEGER;
ALTER TABLE "couriers" ADD COLUMN IF NOT EXISTS "bonusTiers" TEXT;

-- 2. Create courier_documents table
CREATE TABLE IF NOT EXISTS "courier_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "courier_documents_companyId_idx" ON "courier_documents"("companyId");
CREATE INDEX IF NOT EXISTS "courier_documents_courierId_idx" ON "courier_documents"("courierId");
CREATE INDEX IF NOT EXISTS "courier_documents_status_idx" ON "courier_documents"("status");
CREATE INDEX IF NOT EXISTS "courier_documents_type_idx" ON "courier_documents"("type");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courier_documents_courierId_fkey'
    ) THEN
        ALTER TABLE "courier_documents" 
        ADD CONSTRAINT "courier_documents_courierId_fkey" 
        FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Create courier_payrolls table
CREATE TABLE IF NOT EXISTS "courier_payrolls" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "compensationModel" TEXT NOT NULL DEFAULT 'COMMISSION_ONLY',
    "baseSalary" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    "bonus" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    "commission" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    "deductions" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    "netPayable" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    "deliveredOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "calculationDetails" TEXT,
    "treasuryAccountId" TEXT,
    "treasuryTransactionId" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_payrolls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "courier_payrolls_companyId_courierId_month_key" ON "courier_payrolls"("companyId", "courierId", "month");
CREATE INDEX IF NOT EXISTS "courier_payrolls_companyId_month_idx" ON "courier_payrolls"("companyId", "month");
CREATE INDEX IF NOT EXISTS "courier_payrolls_courierId_idx" ON "courier_payrolls"("courierId");
CREATE INDEX IF NOT EXISTS "courier_payrolls_status_idx" ON "courier_payrolls"("status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courier_payrolls_courierId_fkey'
    ) THEN
        ALTER TABLE "courier_payrolls" 
        ADD CONSTRAINT "courier_payrolls_courierId_fkey" 
        FOREIGN KEY ("courierId") REFERENCES "couriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
