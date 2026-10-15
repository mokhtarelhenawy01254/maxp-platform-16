-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ProductionOrderStatus" AS ENUM ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'QC_PENDING', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProductionStageType" AS ENUM ('CUTTING', 'PRINTING_EMBROIDERY', 'SEWING', 'FINISHING', 'QC', 'PACKAGING', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProductionStageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MaterialIssueStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FinishedGoodsReceiptStatus" AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScrapReason" AS ENUM ('CUTTING_WASTE', 'SEWING_DEFECT', 'FABRIC_FLAW', 'PRINT_DEFECT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable bill_of_materials
CREATE TABLE IF NOT EXISTS "bill_of_materials" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "baseQuantity" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "wasteMarginPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "laborCostPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "overheadCostPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable bom_component_items
CREATE TABLE IF NOT EXISTS "bom_component_items" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "rawMaterialName" TEXT,
    "consumptionPerUnit" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PIECE',
    "appliesToSizes" JSONB,
    "appliesToColors" JSONB,
    "scrapRate" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_component_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable bom_standard_stages
CREATE TABLE IF NOT EXISTS "bom_standard_stages" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stageType" "ProductionStageType" NOT NULL DEFAULT 'CUSTOM',
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "ratePerPiece" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "standardMinutes" DECIMAL(8,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_standard_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable production_orders
CREATE TABLE IF NOT EXISTS "production_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "productId" TEXT,
    "plannedQuantity" DECIMAL(10,2) NOT NULL,
    "producedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "scrappedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'PLANNED',
    "sourceWarehouseId" TEXT,
    "targetWarehouseId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "actualMaterialCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "actualLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "actualOverheadCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable production_order_variant_matrices
CREATE TABLE IF NOT EXISTS "production_order_variant_matrices" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sku" TEXT,
    "plannedQuantity" DECIMAL(10,2) NOT NULL,
    "producedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "scrappedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_variant_matrices_pkey" PRIMARY KEY ("id")
);

-- CreateTable production_stages
CREATE TABLE IF NOT EXISTS "production_stages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stageType" "ProductionStageType" NOT NULL DEFAULT 'CUSTOM',
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "status" "ProductionStageStatus" NOT NULL DEFAULT 'PENDING',
    "ratePerPiece" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "standardMinutes" DECIMAL(8,2) NOT NULL DEFAULT 0.0,
    "actualMinutes" DECIMAL(8,2) NOT NULL DEFAULT 0.0,
    "completedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "stageLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "assignedWorker" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_issues
CREATE TABLE IF NOT EXISTS "material_issues" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "sourceWarehouseId" TEXT,
    "status" "MaterialIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable material_issue_items
CREATE TABLE IF NOT EXISTS "material_issue_items" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "rawMaterialName" TEXT,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PIECE',
    "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "batchNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_issue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable finished_goods_receipts
CREATE TABLE IF NOT EXISTS "finished_goods_receipts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "targetWarehouseId" TEXT,
    "status" "FinishedGoodsReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finished_goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable finished_goods_receipt_items
CREATE TABLE IF NOT EXISTS "finished_goods_receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "sku" TEXT,
    "goodQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "scrapQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finished_goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable scrap_records
CREATE TABLE IF NOT EXISTS "scrap_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stageId" TEXT,
    "materialId" TEXT,
    "size" TEXT,
    "color" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PIECE',
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "reason" "ScrapReason" NOT NULL DEFAULT 'CUTTING_WASTE',
    "isNormal" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrap_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable manufacturing_settings
CREATE TABLE IF NOT EXISTS "manufacturing_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "defaultSourceWarehouseId" TEXT,
    "defaultTargetWarehouseId" TEXT,
    "defaultOverheadRatePerPiece" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "defaultWasteMarginPercent" DECIMAL(5,2) NOT NULL DEFAULT 3.0,
    "wipAccountId" TEXT,
    "rawMaterialsAccountId" TEXT,
    "accruedWagesAccountId" TEXT,
    "overheadAppliedAccountId" TEXT,
    "finishedGoodsAccountId" TEXT,
    "autoPostingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "bill_of_materials_companyId_code_key" ON "bill_of_materials"("companyId", "code");
CREATE INDEX IF NOT EXISTS "bill_of_materials_companyId_productId_idx" ON "bill_of_materials"("companyId", "productId");
CREATE INDEX IF NOT EXISTS "bill_of_materials_companyId_isActive_idx" ON "bill_of_materials"("companyId", "isActive");

CREATE INDEX IF NOT EXISTS "bom_component_items_bomId_idx" ON "bom_component_items"("bomId");
CREATE INDEX IF NOT EXISTS "bom_component_items_rawMaterialId_idx" ON "bom_component_items"("rawMaterialId");

CREATE INDEX IF NOT EXISTS "bom_standard_stages_bomId_sequence_idx" ON "bom_standard_stages"("bomId", "sequence");

CREATE UNIQUE INDEX IF NOT EXISTS "production_orders_companyId_orderNumber_key" ON "production_orders"("companyId", "orderNumber");
CREATE INDEX IF NOT EXISTS "production_orders_companyId_status_idx" ON "production_orders"("companyId", "status");
CREATE INDEX IF NOT EXISTS "production_orders_companyId_bomId_idx" ON "production_orders"("companyId", "bomId");
CREATE INDEX IF NOT EXISTS "production_orders_companyId_productId_idx" ON "production_orders"("companyId", "productId");

CREATE UNIQUE INDEX IF NOT EXISTS "production_order_variant_matrices_orderId_size_color_key" ON "production_order_variant_matrices"("orderId", "size", "color");
CREATE INDEX IF NOT EXISTS "production_order_variant_matrices_orderId_idx" ON "production_order_variant_matrices"("orderId");

CREATE INDEX IF NOT EXISTS "production_stages_orderId_sequence_idx" ON "production_stages"("orderId", "sequence");
CREATE INDEX IF NOT EXISTS "production_stages_orderId_status_idx" ON "production_stages"("orderId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "material_issues_companyId_issueNumber_key" ON "material_issues"("companyId", "issueNumber");
CREATE INDEX IF NOT EXISTS "material_issues_companyId_orderId_idx" ON "material_issues"("companyId", "orderId");

CREATE INDEX IF NOT EXISTS "material_issue_items_issueId_idx" ON "material_issue_items"("issueId");
CREATE INDEX IF NOT EXISTS "material_issue_items_rawMaterialId_idx" ON "material_issue_items"("rawMaterialId");

CREATE UNIQUE INDEX IF NOT EXISTS "finished_goods_receipts_companyId_receiptNumber_key" ON "finished_goods_receipts"("companyId", "receiptNumber");
CREATE INDEX IF NOT EXISTS "finished_goods_receipts_companyId_orderId_idx" ON "finished_goods_receipts"("companyId", "orderId");

CREATE INDEX IF NOT EXISTS "finished_goods_receipt_items_receiptId_idx" ON "finished_goods_receipt_items"("receiptId");

CREATE INDEX IF NOT EXISTS "scrap_records_companyId_orderId_idx" ON "scrap_records"("companyId", "orderId");

CREATE UNIQUE INDEX IF NOT EXISTS "manufacturing_settings_companyId_key" ON "manufacturing_settings"("companyId");
