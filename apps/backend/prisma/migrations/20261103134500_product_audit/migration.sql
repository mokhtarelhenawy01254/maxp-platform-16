-- AlterTable: Add createdBy, updatedBy to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updatedBy" TEXT;

-- CreateTable: product_audit_logs
CREATE TABLE IF NOT EXISTS "product_audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "source" TEXT NOT NULL DEFAULT 'UI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_audit_logs_companyId_productId_createdAt_idx" ON "product_audit_logs"("companyId", "productId", "createdAt");
CREATE INDEX IF NOT EXISTS "product_audit_logs_companyId_userId_idx" ON "product_audit_logs"("companyId", "userId");
CREATE INDEX IF NOT EXISTS "product_audit_logs_companyId_idx" ON "product_audit_logs"("companyId");
CREATE INDEX IF NOT EXISTS "product_audit_logs_productId_idx" ON "product_audit_logs"("productId");
