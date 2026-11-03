-- AlterTable: Add linkedCompanyId to merchants
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "linkedCompanyId" TEXT;
CREATE INDEX IF NOT EXISTS "merchants_linkedCompanyId_idx" ON "merchants"("linkedCompanyId");

-- AlterTable: Add linkedCompanyId to shipping_companies
ALTER TABLE "shipping_companies" ADD COLUMN IF NOT EXISTS "linkedCompanyId" TEXT;
CREATE INDEX IF NOT EXISTS "shipping_companies_linkedCompanyId_idx" ON "shipping_companies"("linkedCompanyId");
