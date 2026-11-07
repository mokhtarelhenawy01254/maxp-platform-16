-- Task 83791d03 — مكونات العينة: الجدول بقى managed بالكامل بالـmigration (بدل CREATE TABLE وقت التشغيل)
-- Idempotent: آمن على قاعدة فيها الجداول بالفعل (الإنتاج) وعلى قاعدة نضيفة تمامًا.
--
-- ملاحظة: sample_orders تاريخيًا بيتعمل runtime DDL في manufacturingSampleService.ensureSchema
-- ومفيش migration سابقة بتنشئه. عشان الـFK يبقى مضمون على أي تثبيت نضيف، الـmigration دي
-- بتنشئ الجدول الأب (IF NOT EXISTS) + الـenums قبل جدول المكونات.

-- 1) Enums اللازمة لجدول sample_orders
DO $$ BEGIN
    CREATE TYPE "SampleOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CONVERTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "SampleMaterialSource" AS ENUM ('CUSTOMER', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) الجدول الأب sample_orders (نفس تعريف ensureSchema)
CREATE TABLE IF NOT EXISTS "sample_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sampleNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "brandName" TEXT,
    "productName" TEXT NOT NULL,
    "productId" TEXT,
    "bomId" TEXT,
    "techPackId" TEXT,
    "plannedQuantity" INTEGER NOT NULL DEFAULT 1,
    "size" TEXT,
    "color" TEXT,
    "materialSource" "SampleMaterialSource" NOT NULL DEFAULT 'COMPANY',
    "fee" DECIMAL(10,2),
    "status" "SampleOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "expectedDeliveryAt" TIMESTAMP(3),
    "sampleReceived" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "designNotes" TEXT,
    "resultNotes" TEXT,
    "convertedOrderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sample_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sample_orders_companyId_sampleNumber_key"
    ON "sample_orders"("companyId", "sampleNumber");
CREATE INDEX IF NOT EXISTS "sample_orders_companyId_status_idx"
    ON "sample_orders"("companyId", "status");
CREATE INDEX IF NOT EXISTS "sample_orders_companyId_customerId_idx"
    ON "sample_orders"("companyId", "customerId");
CREATE INDEX IF NOT EXISTS "sample_orders_companyId_productId_idx"
    ON "sample_orders"("companyId", "productId");
CREATE INDEX IF NOT EXISTS "sample_orders_companyId_convertedOrderId_idx"
    ON "sample_orders"("companyId", "convertedOrderId");

-- 3) جدول مكونات العينة
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

-- 4) الـFK — الجدول الأب مضمون دلوقتي (created above on clean DB / موجود على الإنتاج)
DO $$
BEGIN
    ALTER TABLE "sample_order_components"
        ADD CONSTRAINT "sample_order_components_sampleOrderId_fkey"
        FOREIGN KEY ("sampleOrderId") REFERENCES "sample_orders"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
