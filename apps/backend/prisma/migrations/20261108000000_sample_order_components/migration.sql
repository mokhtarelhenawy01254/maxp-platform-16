-- Task 83791d03 — مكونات العينة: الجدول بقى managed بالكامل بالـmigration (بدل CREATE TABLE وقت التشغيل)
-- Idempotent: آمن على قاعدة فيها الجدول بالفعل (الإنتاج) وعلى قاعدة جديدة.

CREATE TABLE IF NOT EXISTS "sample_order_components" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sampleOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'قطعة',
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "priceSnapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_order_components_pkey" PRIMARY KEY ("id")
);

-- الإنتاج اتعمل قبل كده بـCREATE TABLE وقت التشغيل من غير productId — نضمن العمود لو ناقص
ALTER TABLE "sample_order_components" ADD COLUMN IF NOT EXISTS "productId" TEXT;

CREATE INDEX IF NOT EXISTS "sample_order_components_companyId_sampleOrderId_idx"
    ON "sample_order_components"("companyId", "sampleOrderId");

CREATE INDEX IF NOT EXISTS "sample_order_components_companyId_productId_idx"
    ON "sample_order_components"("companyId", "productId");

DO $$
BEGIN
    -- sample_orders بيتعمل بواسطة ensureSchema/db push في المشروع ده، مش بـmigration سابقة.
    -- على قاعدة نضيفة الجدول الأب ممكن يكون لسه مش موجود — نتخطى الـFK بدل ما الـmigration تفشل.
    IF to_regclass('public.sample_orders') IS NOT NULL THEN
        BEGIN
            ALTER TABLE "sample_order_components"
                ADD CONSTRAINT "sample_order_components_sampleOrderId_fkey"
                FOREIGN KEY ("sampleOrderId") REFERENCES "sample_orders"("id")
                ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;
