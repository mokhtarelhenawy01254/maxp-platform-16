/**
 * Manufacturing Execution System (MES) & Production Costing Engine
 *
 * Core Capabilities:
 * 1. Multi-Variant Bill of Materials (BOM) with size/color rules and waste margins.
 * 2. Production Orders lifecycle (PLANNED -> RELEASED -> IN_PROGRESS -> QC_PENDING -> COMPLETED / CANCELLED).
 * 3. Material Issue Vouchers with warehouse stock deduction and average cost valuation.
 * 4. Finished Goods Receipt with warehouse stock addition and weighted average unit cost.
 * 5. Three-Way Costing Engine (Direct Materials + Direct Labor + Manufacturing Overheads = Total & Unit Cost).
 * 6. Protection against closing orders with unsettled quantities.
 * 7. General Ledger Double-Entry Integration (WIP 110402 <-> Raw Materials 110401 / Wages 210201 / MOH 5103 / Finished Goods 110403).
 * 8. Strict multi-tenant isolation per companyId with zero blast-radius.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const AccountingService = require('./accountingService');
const AccountingAutoPostingService = require('./accountingAutoPostingService');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;
const round4 = (val) => Math.round((Number(val) || 0) * 10000) / 10000;

class ManufacturingService {
  /**
   * Idempotent runtime schema guard for PostgreSQL databases
   */
  static async ensureSchema() {
    try {
      const ManufacturingContractService = require('./manufacturingContractService');
      await ManufacturingContractService.ensureSchema();

      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "ProductionOrderStatus" AS ENUM ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'QC_PENDING', 'COMPLETED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "ProductionStageType" AS ENUM ('CUTTING', 'PRINTING_EMBROIDERY', 'SEWING', 'FINISHING', 'QC', 'PACKAGING', 'CUSTOM');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "ProductionStageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "MaterialIssueStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "FinishedGoodsReceiptStatus" AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "ScrapReason" AS ENUM ('CUTTING_WASTE', 'SEWING_DEFECT', 'FABRIC_FLAW', 'PRINT_DEFECT', 'OTHER');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "bill_of_materials" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "bill_of_materials_companyId_code_key" ON "bill_of_materials"("companyId", "code");
        CREATE INDEX IF NOT EXISTS "bill_of_materials_companyId_productId_idx" ON "bill_of_materials"("companyId", "productId");
        CREATE INDEX IF NOT EXISTS "bill_of_materials_companyId_isActive_idx" ON "bill_of_materials"("companyId", "isActive");

        CREATE TABLE IF NOT EXISTS "bom_component_items" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "bom_component_items_bomId_idx" ON "bom_component_items"("bomId");
        CREATE INDEX IF NOT EXISTS "bom_component_items_rawMaterialId_idx" ON "bom_component_items"("rawMaterialId");

        CREATE TABLE IF NOT EXISTS "bom_standard_stages" (
          "id" TEXT PRIMARY KEY,
          "bomId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "stageType" "ProductionStageType" NOT NULL DEFAULT 'CUSTOM',
          "sequence" INTEGER NOT NULL DEFAULT 1,
          "ratePerPiece" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
          "standardMinutes" DECIMAL(8,2) NOT NULL DEFAULT 0.0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "bom_standard_stages_bomId_sequence_idx" ON "bom_standard_stages"("bomId", "sequence");

        CREATE TABLE IF NOT EXISTS "production_orders" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "production_orders_companyId_orderNumber_key" ON "production_orders"("companyId", "orderNumber");
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_status_idx" ON "production_orders"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_bomId_idx" ON "production_orders"("companyId", "bomId");
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_productId_idx" ON "production_orders"("companyId", "productId");

        CREATE TABLE IF NOT EXISTS "production_order_variant_matrices" (
          "id" TEXT PRIMARY KEY,
          "orderId" TEXT NOT NULL,
          "size" TEXT NOT NULL,
          "color" TEXT NOT NULL,
          "sku" TEXT,
          "plannedQuantity" DECIMAL(10,2) NOT NULL,
          "producedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
          "scrappedQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "production_order_variant_matrices_orderId_size_color_key" ON "production_order_variant_matrices"("orderId", "size", "color");
        CREATE INDEX IF NOT EXISTS "production_order_variant_matrices_orderId_idx" ON "production_order_variant_matrices"("orderId");

        CREATE TABLE IF NOT EXISTS "production_stages" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "production_stages_orderId_sequence_idx" ON "production_stages"("orderId", "sequence");
        CREATE INDEX IF NOT EXISTS "production_stages_orderId_status_idx" ON "production_stages"("orderId", "status");

        CREATE TABLE IF NOT EXISTS "material_issues" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "material_issues_companyId_issueNumber_key" ON "material_issues"("companyId", "issueNumber");
        CREATE INDEX IF NOT EXISTS "material_issues_companyId_orderId_idx" ON "material_issues"("companyId", "orderId");

        CREATE TABLE IF NOT EXISTS "material_issue_items" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "material_issue_items_issueId_idx" ON "material_issue_items"("issueId");
        CREATE INDEX IF NOT EXISTS "material_issue_items_rawMaterialId_idx" ON "material_issue_items"("rawMaterialId");

        CREATE TABLE IF NOT EXISTS "finished_goods_receipts" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "finished_goods_receipts_companyId_receiptNumber_key" ON "finished_goods_receipts"("companyId", "receiptNumber");
        CREATE INDEX IF NOT EXISTS "finished_goods_receipts_companyId_orderId_idx" ON "finished_goods_receipts"("companyId", "orderId");

        CREATE TABLE IF NOT EXISTS "finished_goods_receipt_items" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "finished_goods_receipt_items_receiptId_idx" ON "finished_goods_receipt_items"("receiptId");

        CREATE TABLE IF NOT EXISTS "scrap_records" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "scrap_records_companyId_orderId_idx" ON "scrap_records"("companyId", "orderId");

        CREATE TABLE IF NOT EXISTS "manufacturing_settings" (
          "id" TEXT PRIMARY KEY,
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
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "manufacturing_settings_companyId_key" ON "manufacturing_settings"("companyId");
      `);
    } catch (err) {
      // In testing environments or mock DBs, ignore if $executeRawUnsafe fails
    }
  }

  // ==========================================================================
  // 1. Settings Management
  // ==========================================================================

  static async getSettings(companyId) {
    const prisma = getSharedPrismaClient();
    let settings = null;
    if (prisma.manufacturingSettings?.findUnique) {
      settings = await prisma.manufacturingSettings.findUnique({
        where: { companyId },
      });
    }

    if (!settings) {
      return {
        companyId,
        defaultSourceWarehouseId: null,
        defaultTargetWarehouseId: null,
        defaultOverheadRatePerPiece: 0.0,
        defaultWasteMarginPercent: 3.0,
        wipAccountId: null,
        rawMaterialsAccountId: null,
        accruedWagesAccountId: null,
        overheadAppliedAccountId: null,
        finishedGoodsAccountId: null,
        autoPostingEnabled: false,
      };
    }
    return settings;
  }

  static async updateSettings(companyId, data) {
    const prisma = getSharedPrismaClient();
    const updatePayload = {
      defaultSourceWarehouseId: data.defaultSourceWarehouseId !== undefined ? data.defaultSourceWarehouseId : undefined,
      defaultTargetWarehouseId: data.defaultTargetWarehouseId !== undefined ? data.defaultTargetWarehouseId : undefined,
      defaultOverheadRatePerPiece: data.defaultOverheadRatePerPiece !== undefined ? round2(data.defaultOverheadRatePerPiece) : undefined,
      defaultWasteMarginPercent: data.defaultWasteMarginPercent !== undefined ? round2(data.defaultWasteMarginPercent) : undefined,
      wipAccountId: data.wipAccountId !== undefined ? data.wipAccountId : undefined,
      rawMaterialsAccountId: data.rawMaterialsAccountId !== undefined ? data.rawMaterialsAccountId : undefined,
      accruedWagesAccountId: data.accruedWagesAccountId !== undefined ? data.accruedWagesAccountId : undefined,
      overheadAppliedAccountId: data.overheadAppliedAccountId !== undefined ? data.overheadAppliedAccountId : undefined,
      finishedGoodsAccountId: data.finishedGoodsAccountId !== undefined ? data.finishedGoodsAccountId : undefined,
      autoPostingEnabled: data.autoPostingEnabled !== undefined ? Boolean(data.autoPostingEnabled) : undefined,
    };

    if (prisma.manufacturingSettings?.upsert) {
      return await prisma.manufacturingSettings.upsert({
        where: { companyId },
        create: {
          companyId,
          ...updatePayload,
        },
        update: updatePayload,
      });
    }
    return { companyId, ...data };
  }

  // ==========================================================================
  // 2. Bill of Materials (BOM) Management
  // ==========================================================================

  static async createBom(companyId, data) {
    const prisma = getSharedPrismaClient();

    if (!data.code || !String(data.code).trim()) {
      throw new Error('كود قائمة المكونات مطلوب (BOM Code is required)');
    }
    if (!data.name || !String(data.name).trim()) {
      throw new Error('اسم قائمة المكونات مطلوب (BOM Name is required)');
    }

    const code = String(data.code).trim().toUpperCase();

    // Check code uniqueness within company
    const existing = await prisma.billOfMaterials.findFirst({
      where: { companyId, code },
    });
    if (existing) {
      throw new Error(`كود قائمة المكونات "${code}" مستخدم بالفعل لهذه الشركة`);
    }

    return await prisma.$transaction(async (tx) => {
      const bom = await tx.billOfMaterials.create({
        data: {
          companyId,
          productId: data.productId || null,
          code,
          name: String(data.name).trim(),
          version: data.version || '1.0',
          baseQuantity: round2(data.baseQuantity || 1.0),
          wasteMarginPercent: round2(data.wasteMarginPercent || 0.0),
          laborCostPerUnit: round2(data.laborCostPerUnit || 0.0),
          overheadCostPerUnit: round2(data.overheadCostPerUnit || 0.0),
          notes: data.notes || null,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        },
      });

      // Insert components if provided
      if (Array.isArray(data.components) && data.components.length > 0) {
        for (const item of data.components) {
          await tx.bomComponentItem.create({
            data: {
              bomId: bom.id,
              rawMaterialId: String(item.rawMaterialId),
              rawMaterialName: item.rawMaterialName || null,
              consumptionPerUnit: round4(item.consumptionPerUnit || 0),
              unit: item.unit || 'PIECE',
              appliesToSizes: item.appliesToSizes || ['ALL'],
              appliesToColors: item.appliesToColors || ['ALL'],
              scrapRate: round2(item.scrapRate || 0.0),
              notes: item.notes || null,
            },
          });
        }
      }

      // Insert standard stages if provided
      if (Array.isArray(data.standardStages) && data.standardStages.length > 0) {
        for (let i = 0; i < data.standardStages.length; i++) {
          const st = data.standardStages[i];
          await tx.bomStandardStage.create({
            data: {
              bomId: bom.id,
              name: String(st.name).trim(),
              stageType: st.stageType || 'CUSTOM',
              sequence: st.sequence !== undefined ? Number(st.sequence) : i + 1,
              ratePerPiece: round2(st.ratePerPiece || 0.0),
              standardMinutes: round2(st.standardMinutes || 0.0),
            },
          });
        }
      }

      return await tx.billOfMaterials.findFirst({
        where: { id: bom.id, companyId },
        include: {
          components: true,
          standardStages: { orderBy: { sequence: 'asc' } },
        },
      });
    });
  }

  static async getBomById(companyId, bomId) {
    const prisma = getSharedPrismaClient();
    const bom = await prisma.billOfMaterials.findFirst({
      where: { id: bomId, companyId },
      include: {
        components: true,
        standardStages: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!bom) throw new Error('قائمة المكونات غير موجودة');
    return bom;
  }

  static async listBoms(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await prisma.billOfMaterials.findMany({
      where,
      include: {
        components: true,
        standardStages: { orderBy: { sequence: 'asc' } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateBom(companyId, bomId, data) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.billOfMaterials.findFirst({
      where: { id: bomId, companyId },
    });
    if (!existing) throw new Error('قائمة المكونات غير موجودة');

    return await prisma.$transaction(async (tx) => {
      await tx.billOfMaterials.update({
        where: { id: bomId },
        data: {
          name: data.name !== undefined ? String(data.name).trim() : undefined,
          productId: data.productId !== undefined ? data.productId : undefined,
          version: data.version !== undefined ? data.version : undefined,
          baseQuantity: data.baseQuantity !== undefined ? round2(data.baseQuantity) : undefined,
          wasteMarginPercent: data.wasteMarginPercent !== undefined ? round2(data.wasteMarginPercent) : undefined,
          laborCostPerUnit: data.laborCostPerUnit !== undefined ? round2(data.laborCostPerUnit) : undefined,
          overheadCostPerUnit: data.overheadCostPerUnit !== undefined ? round2(data.overheadCostPerUnit) : undefined,
          notes: data.notes !== undefined ? data.notes : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
        },
      });

      if (Array.isArray(data.components)) {
        await tx.bomComponentItem.deleteMany({ where: { bomId } });
        for (const item of data.components) {
          await tx.bomComponentItem.create({
            data: {
              bomId,
              rawMaterialId: String(item.rawMaterialId),
              rawMaterialName: item.rawMaterialName || null,
              consumptionPerUnit: round4(item.consumptionPerUnit || 0),
              unit: item.unit || 'PIECE',
              appliesToSizes: item.appliesToSizes || ['ALL'],
              appliesToColors: item.appliesToColors || ['ALL'],
              scrapRate: round2(item.scrapRate || 0.0),
              notes: item.notes || null,
            },
          });
        }
      }

      if (Array.isArray(data.standardStages)) {
        await tx.bomStandardStage.deleteMany({ where: { bomId } });
        for (let i = 0; i < data.standardStages.length; i++) {
          const st = data.standardStages[i];
          await tx.bomStandardStage.create({
            data: {
              bomId,
              name: String(st.name).trim(),
              stageType: st.stageType || 'CUSTOM',
              sequence: st.sequence !== undefined ? Number(st.sequence) : i + 1,
              ratePerPiece: round2(st.ratePerPiece || 0.0),
              standardMinutes: round2(st.standardMinutes || 0.0),
            },
          });
        }
      }

      return await tx.billOfMaterials.findFirst({
        where: { id: bomId, companyId },
        include: {
          components: true,
          standardStages: { orderBy: { sequence: 'asc' } },
        },
      });
    });
  }

  static async deleteBom(companyId, bomId) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.billOfMaterials.findFirst({
      where: { id: bomId, companyId },
      include: {
        orders: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
    });

    if (!existing) throw new Error('قائمة المكونات غير موجودة');

    if (existing.orders && existing.orders.length > 0) {
      throw new Error(`لا يمكن حذف قائمة المكونات لوجود ${existing.orders.length} أمر إنتاج نشط مرتبط بها`);
    }

    return await prisma.$transaction(async (tx) => {
      await tx.bomComponentItem.deleteMany({ where: { bomId } });
      await tx.bomStandardStage.deleteMany({ where: { bomId } });
      return await tx.billOfMaterials.delete({ where: { id: bomId } });
    });
  }

  static async cloneBomVersion(companyId, bomId, { newCode, newVersion, name }) {
    const original = await this.getBomById(companyId, bomId);
    return await this.createBom(companyId, {
      code: newCode || `${original.code}-V2`,
      name: name || original.name,
      version: newVersion || '2.0',
      productId: original.productId,
      baseQuantity: original.baseQuantity,
      wasteMarginPercent: original.wasteMarginPercent,
      laborCostPerUnit: original.laborCostPerUnit,
      overheadCostPerUnit: original.overheadCostPerUnit,
      notes: `نسخة من ${original.code} (${original.version})`,
      components: original.components.map((c) => ({
        rawMaterialId: c.rawMaterialId,
        rawMaterialName: c.rawMaterialName,
        consumptionPerUnit: c.consumptionPerUnit,
        unit: c.unit,
        appliesToSizes: c.appliesToSizes,
        appliesToColors: c.appliesToColors,
        scrapRate: c.scrapRate,
        notes: c.notes,
      })),
      standardStages: original.standardStages.map((s) => ({
        name: s.name,
        stageType: s.stageType,
        sequence: s.sequence,
        ratePerPiece: s.ratePerPiece,
        standardMinutes: s.standardMinutes,
      })),
    });
  }

  /**
   * Resolve multi-variant raw material requirements for an array of size/color quantities.
   *
   * Formula per variant x component:
   * rawConsumption = quantity * consumptionPerUnit
   * withComponentScrap = rawConsumption * (1 + component.scrapRate / 100)
   * totalRequired = withComponentScrap * (1 + bom.wasteMarginPercent / 100)
   */
  static async resolveVariantRequirements(companyId, bomId, variantMatrix) {
    const bom = await this.getBomById(companyId, bomId);

    if (!Array.isArray(variantMatrix) || variantMatrix.length === 0) {
      throw new Error('مصفوفة الكميات والمتغيرات مطلوبة لحساب متطلبات التشغيل');
    }

    const materialMap = {};
    let totalPlannedQuantity = 0;

    for (const v of variantMatrix) {
      const vQty = Number(v.quantity || v.plannedQuantity || 0);
      if (vQty <= 0) continue;
      totalPlannedQuantity += vQty;

      const vSize = String(v.size || '').trim().toUpperCase();
      const vColor = String(v.color || '').trim().toUpperCase();

      for (const comp of bom.components) {
        // Size rule match: null / empty / ["ALL"] or contains vSize
        const sizes = Array.isArray(comp.appliesToSizes) ? comp.appliesToSizes.map((s) => String(s).toUpperCase()) : ['ALL'];
        const matchesSize = sizes.includes('ALL') || (vSize && sizes.includes(vSize));

        // Color rule match: null / empty / ["ALL"] or contains vColor
        const colors = Array.isArray(comp.appliesToColors) ? comp.appliesToColors.map((c) => String(c).toUpperCase()) : ['ALL'];
        const matchesColor = colors.includes('ALL') || (vColor && colors.includes(vColor));

        if (!matchesSize || !matchesColor) {
          continue;
        }

        const compScrapMultiplier = 1 + (Number(comp.scrapRate) || 0) / 100;
        const bomWasteMultiplier = 1 + (Number(bom.wasteMarginPercent) || 0) / 100;
        const requiredUnits = round4(vQty * Number(comp.consumptionPerUnit) * compScrapMultiplier * bomWasteMultiplier);

        const key = comp.rawMaterialId;
        if (!materialMap[key]) {
          materialMap[key] = {
            rawMaterialId: comp.rawMaterialId,
            rawMaterialName: comp.rawMaterialName || null,
            unit: comp.unit || 'PIECE',
            baseConsumptionPerUnit: Number(comp.consumptionPerUnit),
            totalRequiredQuantity: 0,
            breakdown: [],
          };
        }
        materialMap[key].totalRequiredQuantity = round4(materialMap[key].totalRequiredQuantity + requiredUnits);
        materialMap[key].breakdown.push({
          size: vSize,
          color: vColor,
          variantQuantity: vQty,
          componentUnits: requiredUnits,
        });
      }
    }

    const aggregatedMaterials = Object.values(materialMap);
    return {
      bomId: bom.id,
      bomCode: bom.code,
      totalPlannedQuantity: round2(totalPlannedQuantity),
      variantCount: variantMatrix.length,
      aggregatedMaterials,
    };
  }

  // ==========================================================================
  // 3. Production Orders Lifecycle
  // ==========================================================================

  static async generateOrderNumber(companyId) {
    const prisma = getSharedPrismaClient();
    const year = new Date().getFullYear();
    const prefix = `MO-${year}-`;

    const lastOrder = await prisma.productionOrder.findFirst({
      where: {
        companyId,
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let nextSeq = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const parts = lastOrder.orderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  static async createOrder(companyId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const bom = await this.getBomById(companyId, data.bomId);

    if (!Array.isArray(data.variantMatrix) || data.variantMatrix.length === 0) {
      throw new Error('مصفوفة إنتاج المقاسات والألوان مطلوبة لإنشاء أمر الإنتاج');
    }

    let plannedQuantity = 0;
    for (const v of data.variantMatrix) {
      const q = Number(v.plannedQuantity || v.quantity || 0);
      if (q < 0) throw new Error('الكميات المخططة لا يمكن أن تكون سالبة');
      plannedQuantity += q;
    }

    if (plannedQuantity <= 0) {
      throw new Error('إجمالي الكمية المخططة لأمر الإنتاج يجب أن يكون أكبر من الصفر');
    }

    const orderNumber = data.orderNumber || (await this.generateOrderNumber(companyId));
    const settings = await this.getSettings(companyId);

    if (data.salePricePerUnit !== undefined && data.salePricePerUnit !== null) {
      const price = Number(data.salePricePerUnit);
      if (isNaN(price) || price < 0) {
        throw new Error('سعر البيع للقطعة يجب أن يكون رقماً موجباً أو صفراً');
      }
    }
    if (data.customerOrderId) {
      const parentCo = await prisma.customerOrder.findFirst({
        where: { id: data.customerOrderId, companyId },
      });
      if (!parentCo) {
        throw new Error('أمر العميل المراد الربط معه غير موجود أو لا ينتمي لنفس الشركة');
      }
    }

    const sourceWarehouseId = data.sourceWarehouseId || settings.defaultSourceWarehouseId || null;
    const targetWarehouseId = data.targetWarehouseId || settings.defaultTargetWarehouseId || null;

    return await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.create({
        data: {
          companyId,
          orderNumber,
          bomId: bom.id,
          productId: data.productId || bom.productId || null,
          plannedQuantity: round2(plannedQuantity),
          producedQuantity: 0.0,
          scrappedQuantity: 0.0,
          status: 'PLANNED',
          sourceWarehouseId,
          targetWarehouseId,
          startDate: data.startDate ? new Date(data.startDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          actualMaterialCost: 0.0,
          actualLaborCost: 0.0,
          actualOverheadCost: 0.0,
          totalCost: 0.0,
          unitCost: 0.0,
          notes: data.notes || null,
          createdById: userId ? String(userId) : null,
          customerOrderId: data.customerOrderId || null,
          orderType: data.orderType || 'FULL_PACKAGE',
          customerId: data.customerId || null,
          brandName: data.brandName ? String(data.brandName).trim() : null,
          customerCountry: data.customerCountry ? String(data.customerCountry).trim() : null,
          salePricePerUnit: data.salePricePerUnit !== undefined && data.salePricePerUnit !== null
            ? round2(data.salePricePerUnit)
            : null,
          deliveryAddress: data.deliveryAddress ? String(data.deliveryAddress).trim() : null,
          deliveryMethod: data.deliveryMethod ? String(data.deliveryMethod).trim() : null,
          responsibleUserId: data.responsibleUserId ? String(data.responsibleUserId) : null,
        },
      });

      // Insert variant matrix rows
      for (const v of data.variantMatrix) {
        await tx.productionOrderVariantMatrix.create({
          data: {
            orderId: order.id,
            size: String(v.size || 'STANDARD').trim().toUpperCase(),
            color: String(v.color || 'STANDARD').trim().toUpperCase(),
            sku: v.sku || null,
            plannedQuantity: round2(v.plannedQuantity || v.quantity || 0),
            producedQuantity: 0.0,
            scrappedQuantity: 0.0,
          },
        });
      }

      // Initialize stages from custom input or BOM standard stages
      const stagesToCreate = Array.isArray(data.stages) && data.stages.length > 0 ? data.stages : bom.standardStages;
      if (Array.isArray(stagesToCreate) && stagesToCreate.length > 0) {
        for (let i = 0; i < stagesToCreate.length; i++) {
          const st = stagesToCreate[i];
          await tx.productionStage.create({
            data: {
              orderId: order.id,
              name: String(st.name).trim(),
              stageType: st.stageType || 'CUSTOM',
              sequence: st.sequence !== undefined ? Number(st.sequence) : i + 1,
              status: 'PENDING',
              ratePerPiece: round2(st.ratePerPiece || 0.0),
              standardMinutes: round2(st.standardMinutes || 0.0),
              actualMinutes: 0.0,
              completedQuantity: 0.0,
              stageLaborCost: 0.0,
              assignedWorker: st.assignedWorker || null,
              notes: st.notes || null,
            },
          });
        }
      }

      return await tx.productionOrder.findFirst({
        where: { id: order.id, companyId },
        include: {
          bom: true,
          variants: true,
          stages: { orderBy: { sequence: 'asc' } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          customerOrder: { select: { id: true, orderNumber: true, status: true, brandName: true } },
        },
      });
    });
  }

  static async getOrderById(companyId, orderId, tx = null) {
    const client = tx || getSharedPrismaClient();
    const order = await client.productionOrder.findFirst({
      where: { id: orderId, companyId },
      include: {
        bom: { include: { components: true, standardStages: true } },
        variants: true,
        stages: { orderBy: { sequence: 'asc' } },
        materialIssues: { include: { items: true }, orderBy: { createdAt: 'asc' } },
        goodsReceipts: { include: { items: true }, orderBy: { createdAt: 'asc' } },
        scrapRecords: { orderBy: { createdAt: 'asc' } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        customerOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            brandName: true,
            payments: true,
            orders: { select: { plannedQuantity: true, salePricePerUnit: true } },
          },
        },
      },
    });
    if (!order) throw new Error('أمر الإنتاج غير موجود');

    const contractValue = order.salePricePerUnit !== null && order.salePricePerUnit !== undefined
      ? round2(Number(order.plannedQuantity || 0) * Number(order.salePricePerUnit || 0))
      : null;

    let parentTotals = null;
    if (order.customerOrder) {
      const coPayments = order.customerOrder.payments || [];
      const coOrders = order.customerOrder.orders || [];
      let coTotalAmount = 0;
      for (const coOrd of coOrders) {
        coTotalAmount += Number(coOrd.plannedQuantity || 0) * Number(coOrd.salePricePerUnit || 0);
      }
      let coPaidAmount = 0;
      for (const p of coPayments) {
        if (p.status === 'PAID') {
          coPaidAmount += p.paidAmount !== null && p.paidAmount !== undefined ? Number(p.paidAmount) : Number(p.amount || 0);
        }
      }
      parentTotals = {
        totalAmount: round2(coTotalAmount),
        paidAmount: round2(coPaidAmount),
        remainingAmount: round2(Math.max(0, coTotalAmount - coPaidAmount)),
      };
    }

    return {
      ...order,
      contractValue,
      parentTotals,
    };
  }

  static async listOrders(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }
    if (filters.orderType) where.orderType = filters.orderType;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.customerOrderId) where.customerOrderId = filters.customerOrderId;

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { brandName: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.bomId) where.bomId = filters.bomId;
    if (filters.productId) where.productId = filters.productId;

    const orders = await prisma.productionOrder.findMany({
      where,
      include: {
        bom: { select: { id: true, code: true, name: true } },
        variants: true,
        stages: { orderBy: { sequence: 'asc' } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        customerOrder: { select: { id: true, orderNumber: true, status: true, brandName: true } },
        _count: {
          select: {
            materialIssues: true,
            goodsReceipts: true,
            scrapRecords: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      contractValue: o.salePricePerUnit !== null && o.salePricePerUnit !== undefined
        ? round2(Number(o.plannedQuantity || 0) * Number(o.salePricePerUnit || 0))
        : null,
    }));
  }

  static async releaseOrder(companyId, orderId, userId = null) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId);

    if (order.status !== 'PLANNED') {
      throw new Error(`لا يمكن اعتماد أمر في حالة "${order.status}". يجب أن يكون في حالة مخطط (PLANNED)`);
    }

    return await prisma.productionOrder.update({
      where: { id: orderId },
      data: { status: 'RELEASED' },
      include: { variants: true, stages: true },
    });
  }

  static async startOrder(companyId, orderId, options = {}) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId);

    if (order.status === 'IN_PROGRESS') {
      // Idempotency: order is already in progress. Ensure no duplicate issue is performed.
      const existingIssue = await prisma.materialIssue.findFirst({
        where: { orderId, companyId, status: 'ISSUED' },
        include: { items: true },
      });
      return {
        ...order,
        idempotent: true,
        autoIssueSkipped: !!existingIssue,
        message: existingIssue
          ? `أمر الإنتاج قيد التشغيل بالفعل ويوجد إشعار صرف خامات سابق (${existingIssue.issueNumber})`
          : 'أمر الإنتاج قيد التشغيل بالفعل',
      };
    }

    if (order.status !== 'RELEASED' && order.status !== 'PLANNED') {
      throw new Error(`لا يمكن بدء تشغيل أمر في حالة "${order.status}"`);
    }

    const { autoIssue = false, sourceWarehouseId = null, userId = null } = options;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: 'IN_PROGRESS',
          startDate: order.startDate || new Date(),
        },
        include: { variants: true, stages: true },
      });

      // Optionally auto-issue materials if requested (Idempotent Guard)
      if (autoIssue) {
        const existingIssue = await tx.materialIssue.findFirst({
          where: { orderId, companyId, status: 'ISSUED' },
        });

        if (existingIssue) {
          console.warn(`[MES] Order ${order.orderNumber} already has an ISSUED material issue (${existingIssue.issueNumber}). Skipping duplicate auto-issue.`);
          updated.autoIssueSkipped = true;
          updated.autoIssueMessage = `تم تخطي الصرف التلقائي: يوجد إشعار صرف خامات قائم بالفعل برقم ${existingIssue.issueNumber}`;
        } else {
          const warehouseId = sourceWarehouseId || order.sourceWarehouseId;
          if (!warehouseId) {
            throw new Error('مستودع صرف الخامات مطلوب للصرف التلقائي');
          }
          const resolved = await this.resolveVariantRequirements(companyId, order.bomId, order.variants);
          const issueItems = resolved.aggregatedMaterials.map((m) => ({
            rawMaterialId: m.rawMaterialId,
            rawMaterialName: m.rawMaterialName,
            quantity: m.totalRequiredQuantity,
            unit: m.unit,
            unitCost: 0.0,
          }));

          const autoIssueResult = await this.issueMaterials(
            companyId,
            orderId,
            {
              sourceWarehouseId: warehouseId,
              items: issueItems,
              notes: 'صرف خامات تلقائي عند بدء التشغيل',
              isAutoIssue: true,
            },
            userId,
            tx
          );
          if (autoIssueResult?.costWarnings?.length) {
            updated.costWarnings = autoIssueResult.costWarnings;
          }
        }
      }

      return updated;
    });
  }

  // ==========================================================================
  // 4. Material Issue (صرف الخامات وخصم المخزون والربط المحاسبي)
  // ==========================================================================

  static async issueMaterials(companyId, orderId, data, userId = null, existingTx = null) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId, existingTx);

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new Error(`لا يمكن صرف خامات لأمر في حالة "${order.status}"`);
    }

    const warehouseId = data.sourceWarehouseId || order.sourceWarehouseId;
    if (!warehouseId) {
      throw new Error('مستودع صرف الخامات مطلوب (sourceWarehouseId is required)');
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('بنود الخامات المصروفة مطلوبة');
    }

    if (data.preventDuplicate || data.isAutoIssue) {
      const client = existingTx || prisma;
      const existing = await client.materialIssue.findFirst({
        where: { orderId, companyId, status: 'ISSUED' },
        include: { items: true },
      });
      if (existing) {
        return {
          ...existing,
          idempotent: true,
          alreadyIssued: true,
          message: `يوجد إشعار صرف خامات قائم بالفعل برقم ${existing.issueNumber}`,
        };
      }
    }

    const runInTx = async (tx) => {
      let totalCost = 0;
      const preparedItems = [];
      const costWarnings = [];

      for (const item of data.items) {
        const rawQty = round4(item.quantity);
        if (rawQty <= 0) throw new Error('كمية الخامة المصروفة يجب أن تكون أكبر من الصفر');

        // Unify rounding between inventory deduction, stock movement, item voucher, and cost:
        // Since Inventory.quantity and StockMovement.quantity in the database schema are integer (Int),
        // we use Math.round(rawQty) across all 4 touchpoints to prevent cumulative drift between ledger and inventory.
        const issuedQty = Math.round(rawQty);
        if (issuedQty <= 0) throw new Error('كمية الخامة المصروفة بعد التقريب يجب أن تكون أكبر من الصفر');

        // Lookup inventory for cost valuation & deduction
        let unitCost = round2(item.unitCost || 0);
        let inv = null;
        try {
          if (tx.inventory?.findFirst) {
            inv = await tx.inventory.findFirst({
              where: {
                productId: item.rawMaterialId,
                warehouseId,
              },
            });
          }
        } catch {
          // ignore if table not present in tests
        }

        if (inv && (!item.unitCost || item.unitCost === 0)) {
          unitCost = round2(inv.cost || 0);
        }

        // Fallback to Product.cost if inventory cost is not set or 0
        if (unitCost === 0 && tx.product?.findFirst) {
          try {
            const rawProd = await tx.product.findFirst({
              where: { id: item.rawMaterialId },
              select: { cost: true },
            });
            if (rawProd?.cost) {
              unitCost = round2(rawProd.cost);
            }
          } catch {
            // ignore if product table not available
          }
        }

        if (unitCost === 0) {
          costWarnings.push({
            rawMaterialId: item.rawMaterialId,
            rawMaterialName: item.rawMaterialName || null,
            warning: `الخامة "${item.rawMaterialName || item.rawMaterialId}" تم صرفها بتكلفة صفرية (0.00 ج.م). لم يتم العثور على تكلفة في المخزون (Inventory.cost) أو المنتج (Product.cost).`,
          });
        }

        const itemTotal = round2(issuedQty * unitCost);
        totalCost += itemTotal;

        // Deduct inventory stock if record exists
        if (inv && tx.inventory?.update) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              quantity: { decrement: issuedQty },
              available: { decrement: issuedQty },
            },
          });
        }

        // Record stock movement (safe try/catch so failure never halts MES)
        try {
          if (tx.stockMovement?.create) {
            await tx.stockMovement.create({
              data: {
                productId: item.rawMaterialId,
                warehouseId,
                type: 'OUT',
                reason: 'ADJUSTMENT',
                quantity: issuedQty,
                cost: unitCost,
                reference: order.orderNumber,
                notes: `صرف خامات تصنيع أمر: ${order.orderNumber}`,
                userId: userId ? String(userId) : null,
                isApproved: true,
              },
            });
          }
        } catch (err) {
          console.warn('[MES] Stock movement creation skipped/failed:', err.message);
        }

        preparedItems.push({
          rawMaterialId: item.rawMaterialId,
          rawMaterialName: item.rawMaterialName || null,
          quantity: issuedQty,
          unit: item.unit || 'PIECE',
          unitCost,
          totalCost: itemTotal,
          batchNumber: item.batchNumber || null,
          notes: item.notes || null,
        });
      }

      totalCost = round2(totalCost);
      const issueNumber = `MI-${Date.now().toString().slice(-6)}`;

      const issue = await tx.materialIssue.create({
        data: {
          companyId,
          orderId,
          issueNumber,
          sourceWarehouseId: warehouseId,
          status: 'ISSUED',
          date: data.date ? new Date(data.date) : new Date(),
          totalCost,
          notes: data.notes || null,
          createdById: userId ? String(userId) : null,
        },
      });

      for (const pi of preparedItems) {
        await tx.materialIssueItem.create({
          data: {
            issueId: issue.id,
            ...pi,
          },
        });
      }

      // Update actual material cost on order
      const newActualMaterialCost = round2(Number(order.actualMaterialCost) + totalCost);
      await tx.productionOrder.update({
        where: { id: orderId },
        data: { actualMaterialCost: newActualMaterialCost },
      });

      // General Ledger Auto-Posting (WIP 110402 Debit / Raw Materials 110401 Credit)
      if (totalCost > 0) {
        try {
          await ManufacturingService.postWipMaterialIssue(companyId, issue.id, {
            orderNumber: order.orderNumber,
            totalCost,
            date: issue.date,
            userId,
          });
        } catch (err) {
          console.warn('[MES] WIP material issue auto-posting deferred:', err.message);
        }
      }

      const issueRecord = await tx.materialIssue.findFirst({
        where: { id: issue.id },
        include: { items: true },
      });
      if (issueRecord) {
        issueRecord.costWarnings = costWarnings;
        issueRecord.hasZeroCostWarning = costWarnings.length > 0;
      }
      return issueRecord;
    };

    if (existingTx) {
      return await runInTx(existingTx);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await runInTx(tx);
      });
    }
  }

  // ==========================================================================
  // 5. Production Stages & Shop Floor Progress Tracking
  // ==========================================================================

  static async updateStageProgress(companyId, orderId, stageId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId);

    const stage = order.stages.find((s) => s.id === stageId);
    if (!stage) throw new Error('مرحلة التشغيل غير موجودة');

    const completedQuantity = data.completedQuantity !== undefined ? round2(data.completedQuantity) : Number(stage.completedQuantity);
    const actualMinutes = data.actualMinutes !== undefined ? round2(data.actualMinutes) : Number(stage.actualMinutes);
    const status = data.status || (completedQuantity >= Number(order.plannedQuantity) ? 'COMPLETED' : 'IN_PROGRESS');

    // Stage labor cost = completedQuantity * ratePerPiece
    const stageLaborCost = data.stageLaborCost !== undefined ? round2(data.stageLaborCost) : round2(completedQuantity * Number(stage.ratePerPiece));

    return await prisma.$transaction(async (tx) => {
      await tx.productionStage.update({
        where: { id: stageId },
        data: {
          completedQuantity,
          actualMinutes,
          stageLaborCost,
          status,
          assignedWorker: data.assignedWorker !== undefined ? data.assignedWorker : stage.assignedWorker,
          notes: data.notes !== undefined ? data.notes : stage.notes,
          startedAt: stage.startedAt || new Date(),
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
      });

      // Recalculate total labor cost for the order
      const allStages = await tx.productionStage.findMany({ where: { orderId } });
      const totalLaborCost = round2(allStages.reduce((acc, s) => acc + Number(s.stageLaborCost), 0));

      await tx.productionOrder.update({
        where: { id: orderId },
        data: { actualLaborCost: totalLaborCost },
      });

      return await tx.productionStage.findFirst({ where: { id: stageId } });
    });
  }

  // ==========================================================================
  // 6. Scrap & Waste Records
  // ==========================================================================

  static async recordScrap(companyId, orderId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId);

    const quantity = round2(data.quantity);
    if (quantity <= 0) throw new Error('كمية الهالك يجب أن تكون أكبر من الصفر');

    return await prisma.$transaction(async (tx) => {
      const scrap = await tx.scrapRecord.create({
        data: {
          companyId,
          orderId,
          stageId: data.stageId || null,
          materialId: data.materialId || null,
          size: data.size || null,
          color: data.color || null,
          quantity,
          unit: data.unit || 'PIECE',
          cost: round2(data.cost || 0.0),
          reason: data.reason || 'CUTTING_WASTE',
          isNormal: data.isNormal !== undefined ? Boolean(data.isNormal) : true,
          notes: data.notes || null,
        },
      });

      // Update variant scrappedQuantity if size & color match
      if (data.size && data.color) {
        const variant = order.variants.find(
          (v) => v.size.toUpperCase() === String(data.size).toUpperCase() && v.color.toUpperCase() === String(data.color).toUpperCase()
        );
        if (variant) {
          await tx.productionOrderVariantMatrix.update({
            where: { id: variant.id },
            data: { scrappedQuantity: { increment: quantity } },
          });
        }
      }

      // Update order scrappedQuantity
      await tx.productionOrder.update({
        where: { id: orderId },
        data: { scrappedQuantity: { increment: quantity } },
      });

      return scrap;
    });
  }

  // ==========================================================================
  // 7. Finished Goods Receipt (استلام التام وزيادة المخزون)
  // ==========================================================================

  static async receiveFinishedGoods(companyId, orderId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId);

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new Error(`لا يمكن استلام إنتاج تام لأمر في حالة "${order.status}"`);
    }

    const settings = await this.getSettings(companyId);
    const warehouseId = data.targetWarehouseId || order.targetWarehouseId || settings.defaultTargetWarehouseId || 'wh_default';

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('بنود استلام الإنتاج التام مطلوبة');
    }

    return await prisma.$transaction(async (tx) => {
      let totalGoodQty = 0;
      let totalScrapQty = 0;
      const receiptNumber = `FGR-${Date.now().toString().slice(-6)}`;

      // Calculate provisional unit cost from currently accumulated costs
      const accumulatedCosts = round2(Number(order.actualMaterialCost) + Number(order.actualLaborCost) + Number(order.actualOverheadCost));
      const expectedTotalGood = round2(Number(order.producedQuantity) + data.items.reduce((acc, it) => acc + (Number(it.goodQuantity) || 0), 0));
      const estimatedUnitCost = expectedTotalGood > 0 ? round2(accumulatedCosts / expectedTotalGood) : 0;

      const preparedItems = [];
      for (const item of data.items) {
        const gQty = round2(item.goodQuantity || 0);
        const sQty = round2(item.scrapQuantity || 0);
        if (gQty < 0 || sQty < 0) throw new Error('الكميات لا يمكن أن تكون سالبة');
        if (gQty === 0 && sQty === 0) continue;

        totalGoodQty += gQty;
        totalScrapQty += sQty;

        const uCost = item.unitCost !== undefined ? round2(item.unitCost) : estimatedUnitCost;
        const totalItemCost = round2(gQty * uCost);

        preparedItems.push({
          size: item.size || null,
          color: item.color || null,
          sku: item.sku || null,
          goodQuantity: gQty,
          scrapQuantity: sQty,
          unitCost: uCost,
          totalCost: totalItemCost,
          notes: item.notes || null,
        });

        // Update variant matrix
        if (item.size && item.color) {
          const variant = order.variants.find(
            (v) => v.size.toUpperCase() === String(item.size).toUpperCase() && v.color.toUpperCase() === String(item.color).toUpperCase()
          );
          if (variant) {
            await tx.productionOrderVariantMatrix.update({
              where: { id: variant.id },
              data: {
                producedQuantity: { increment: gQty },
                scrappedQuantity: { increment: sQty },
              },
            });
          }
        }

        // Add to target warehouse Inventory
        if (gQty > 0 && order.productId) {
          let inv = null;
          try {
            if (tx.inventory?.findFirst) {
              inv = await tx.inventory.findFirst({
                where: {
                  productId: order.productId,
                  warehouseId,
                },
              });
            }
          } catch {
            // ignore
          }

          const addUnits = Math.round(gQty);
          if (inv && tx.inventory?.update) {
            const currentTotalVal = Number(inv.quantity) * Number(inv.cost || 0);
            const newTotalVal = currentTotalVal + gQty * uCost;
            const newTotalQty = Number(inv.quantity) + addUnits;
            const newAvgCost = newTotalQty > 0 ? round2(newTotalVal / newTotalQty) : uCost;

            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                quantity: { increment: addUnits },
                available: { increment: addUnits },
                cost: newAvgCost,
              },
            });
          } else if (!inv && tx.inventory?.create) {
            try {
              await tx.inventory.create({
                data: {
                  productId: order.productId,
                  warehouseId,
                  quantity: addUnits,
                  available: addUnits,
                  reserved: 0,
                  cost: uCost,
                },
              });
            } catch (createErr) {
              if (tx.inventory?.findFirst && tx.inventory?.update) {
                const retryInv = await tx.inventory.findFirst({
                  where: { productId: order.productId, warehouseId },
                });
                if (retryInv) {
                  const currentTotalVal = Number(retryInv.quantity) * Number(retryInv.cost || 0);
                  const newTotalVal = currentTotalVal + gQty * uCost;
                  const newTotalQty = Number(retryInv.quantity) + addUnits;
                  const newAvgCost = newTotalQty > 0 ? round2(newTotalVal / newTotalQty) : uCost;

                  await tx.inventory.update({
                    where: { id: retryInv.id },
                    data: {
                      quantity: { increment: addUnits },
                      available: { increment: addUnits },
                      cost: newAvgCost,
                    },
                  });
                }
              }
            }
          }

          // Record stock movement (safe try/catch)
          try {
            if (tx.stockMovement?.create) {
              await tx.stockMovement.create({
                data: {
                  productId: order.productId,
                  warehouseId,
                  type: 'IN',
                  reason: 'ADJUSTMENT',
                  quantity: Math.round(gQty),
                  cost: uCost,
                  reference: order.orderNumber,
                  notes: `استلام إنتاج تام أمر: ${order.orderNumber}`,
                  userId: userId ? String(userId) : null,
                  isApproved: true,
                },
              });
            }
          } catch (err) {
            console.warn('[MES] Finished goods stock movement skipped/failed:', err.message);
          }
        }
      }

      const totalReceiptCost = round2(preparedItems.reduce((acc, it) => acc + Number(it.totalCost), 0));
      const receipt = await tx.finishedGoodsReceipt.create({
        data: {
          companyId,
          orderId,
          receiptNumber,
          targetWarehouseId: warehouseId,
          status: 'RECEIVED',
          date: data.date ? new Date(data.date) : new Date(),
          totalQuantity: round2(totalGoodQty),
          unitCost: estimatedUnitCost,
          totalCost: totalReceiptCost,
          notes: data.notes || null,
          createdById: userId ? String(userId) : null,
        },
      });

      for (const pi of preparedItems) {
        await tx.finishedGoodsReceiptItem.create({
          data: {
            receiptId: receipt.id,
            ...pi,
          },
        });
      }

      // Update order totals
      const newProduced = round2(Number(order.producedQuantity) + totalGoodQty);
      const newScrapped = round2(Number(order.scrappedQuantity) + totalScrapQty);
      await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          producedQuantity: newProduced,
          scrappedQuantity: newScrapped,
        },
      });

      return await tx.finishedGoodsReceipt.findFirst({
        where: { id: receipt.id },
        include: { items: true },
      });
    });
  }

  // ==========================================================================
  // 8. Order Closure (§9 Protection against unsettled quantities & Costing)
  // ==========================================================================

  static async completeOrder(companyId, orderId, userId = null) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId);

    if (order.status === 'COMPLETED') {
      throw new Error('أمر الإنتاج مكتمل بالفعل');
    }
    if (order.status === 'CANCELLED') {
      throw new Error('لا يمكن إقفال أمر إنتاج ملغي');
    }

    const planned = Number(order.plannedQuantity);
    const produced = Number(order.producedQuantity);
    const scrapped = Number(order.scrappedQuantity);
    const settled = round2(produced + scrapped);

    // Strict Rule (§9): Prevent closing if unsettled quantities exist
    if (planned > settled) {
      const remaining = round2(planned - settled);
      throw new Error(`لا يمكن إقفال أمر الإنتاج: توجد كميات غير مسواة (${remaining} قطعة) بين المخطط والمستلم والهالك`);
    }

    const settings = await this.getSettings(companyId);

    // Calculate or allocate manufacturing overheads (MOH) if not yet explicitly set
    let actualMOH = Number(order.actualOverheadCost);
    if (actualMOH <= 0) {
      const overheadRate = Number(settings.defaultOverheadRatePerPiece) || Number(order.bom?.overheadCostPerUnit) || 0;
      actualMOH = round2(overheadRate * produced);
    }

    const totalCost = round2(Number(order.actualMaterialCost) + Number(order.actualLaborCost) + actualMOH);
    const unitCost = produced > 0 ? round2(totalCost / produced) : 0;

    return await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualOverheadCost: actualMOH,
          totalCost,
          unitCost,
        },
        include: { variants: true, stages: true },
      });

      // Post General Ledger entries for Labor, MOH, and Finished Goods Receipt from WIP
      try {
        if (Number(order.actualLaborCost) > 0) {
          await ManufacturingService.postWipLaborCost(companyId, orderId, {
            orderNumber: order.orderNumber,
            amount: Number(order.actualLaborCost),
            userId,
          });
        }

        if (actualMOH > 0) {
          await ManufacturingService.postWipOverheadCost(companyId, orderId, {
            orderNumber: order.orderNumber,
            amount: actualMOH,
            userId,
          });
        }

        if (totalCost > 0) {
          await ManufacturingService.postWipFinishedGoodsReceipt(companyId, orderId, {
            orderNumber: order.orderNumber,
            amount: totalCost,
            userId,
          });
        }
      } catch (err) {
        console.warn('[MES] WIP completion GL auto-posting deferred:', err.message);
      }

      // Settle and synchronize FinishedGoodsReceipt (FGR) records with final absorbed cost
      // At receipt time, FGR records provisional cost (materials only).
      // Upon completion/closure, all absorbed costs (Direct Materials + Labor + MOH) are finalized,
      // and FGR vouchers & inventory cost are retroactively settled to match Entry 4 GL posting.
      if (produced > 0 && tx.finishedGoodsReceipt?.updateMany) {
        try {
          const receipts = await tx.finishedGoodsReceipt.findMany({
            where: { orderId, companyId, status: 'RECEIVED' },
            include: { items: true },
          });

          for (const rc of receipts) {
            const finalReceiptTotal = round2(Number(rc.totalQuantity) * unitCost);
            await tx.finishedGoodsReceipt.update({
              where: { id: rc.id },
              data: {
                unitCost,
                totalCost: finalReceiptTotal,
              },
            });

            if (tx.finishedGoodsReceiptItem?.updateMany) {
              await tx.finishedGoodsReceiptItem.updateMany({
                where: { receiptId: rc.id },
                data: {
                  unitCost,
                },
              });
            }
          }

          // Adjust target warehouse inventory valuation to match finalized unitCost
          const targetWh = order.targetWarehouseId || settings.defaultTargetWarehouseId;
          if (order.productId && targetWh && tx.inventory?.findFirst && tx.inventory?.update) {
            const inv = await tx.inventory.findFirst({
              where: { productId: order.productId, warehouseId: targetWh },
            });
            if (inv) {
              await tx.inventory.update({
                where: { id: inv.id },
                data: { cost: unitCost },
              });
            }
          }
        } catch (settleErr) {
          console.warn('[MES] FGR settlement update deferred:', settleErr.message);
        }
      }

      return updatedOrder;
    });
  }

  static async cancelOrder(companyId, orderId, options = {}) {
    const prisma = getSharedPrismaClient();
    const order = await this.getOrderById(companyId, orderId);

    if (order.status === 'COMPLETED') {
      throw new Error('لا يمكن إلغاء أمر إنتاج مكتمل ومقفل');
    }

    const { reason = 'إلغاء بأمر الإدارة', returnMaterials = true, userId = null } = options;

    return await prisma.$transaction(async (tx) => {
      // If materials were issued and return is requested, restore stock to source warehouse
      if (returnMaterials && order.materialIssues && order.materialIssues.length > 0) {
        for (const mi of order.materialIssues) {
          if (mi.status !== 'CANCELLED' && mi.items) {
            for (const item of mi.items) {
              const qty = Math.round(Number(item.quantity));
              if (qty > 0 && mi.sourceWarehouseId) {
                try {
                  if (tx.inventory?.updateMany) {
                    await tx.inventory.updateMany({
                      where: {
                        productId: item.rawMaterialId,
                        warehouseId: mi.sourceWarehouseId,
                      },
                      data: {
                        quantity: { increment: qty },
                        available: { increment: qty },
                      },
                    });
                  }
                  if (tx.stockMovement?.create) {
                    await tx.stockMovement.create({
                      data: {
                        productId: item.rawMaterialId,
                        warehouseId: mi.sourceWarehouseId,
                        type: 'IN',
                        reason: 'RETURN',
                        quantity: qty,
                        cost: item.unitCost,
                        reference: order.orderNumber,
                        notes: `إرجاع خامات أمر إنتاج ملغي: ${order.orderNumber}`,
                        userId: userId ? String(userId) : null,
                        isApproved: true,
                      },
                    });
                  }
                } catch (err) {
                  console.warn('[MES] Material return stock update skipped/failed:', err.message);
                }
              }
            }
            await tx.materialIssue.update({
              where: { id: mi.id },
              data: { status: 'CANCELLED' },
            });
          }
        }
      }

      return await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });
    });
  }

  // ==========================================================================
  // 9. Costing Analysis & Variance Report
  // ==========================================================================

  static async calculateOrderCost(companyId, orderId) {
    const order = await this.getOrderById(companyId, orderId);
    const bom = order.bom;

    const plannedQty = Number(order.plannedQuantity);
    const producedQty = Number(order.producedQuantity);

    // Standard Planned Costs from BOM
    let stdMaterialCost = 0;
    if (bom && Array.isArray(bom.components)) {
      const prisma = getSharedPrismaClient();
      const rawIds = bom.components.map((c) => c.rawMaterialId).filter(Boolean);
      let costMap = {};
      if (rawIds.length > 0 && prisma?.product?.findMany) {
        try {
          const prods = await prisma.product.findMany({
            where: { id: { in: rawIds } },
            select: { id: true, cost: true },
          });
          costMap = Object.fromEntries(
            prods.map((p) => [p.id, Number(p.cost || 0)])
          );
        } catch {
          // ignore if product table not available
        }
      }

      for (const c of bom.components) {
        const prodCost = costMap[c.rawMaterialId];
        const unitCost = prodCost && prodCost > 0 ? prodCost : 1.0;
        stdMaterialCost += plannedQty * Number(c.consumptionPerUnit) * unitCost;
      }
    }
    stdMaterialCost = round2(stdMaterialCost);
    const stdLaborCost = round2(plannedQty * Number(bom?.laborCostPerUnit || 0));
    const stdOverheadCost = round2(plannedQty * Number(bom?.overheadCostPerUnit || 0));
    const stdTotalCost = round2(stdMaterialCost + stdLaborCost + stdOverheadCost);
    const stdUnitCost = plannedQty > 0 ? round2(stdTotalCost / plannedQty) : 0;

    // Actual Incurred Costs
    const actMaterialCost = round2(Number(order.actualMaterialCost));
    const actLaborCost = round2(Number(order.actualLaborCost));
    const actOverheadCost = round2(Number(order.actualOverheadCost));
    const actTotalCost = round2(actMaterialCost + actLaborCost + actOverheadCost);
    const actUnitCost = producedQty > 0 ? round2(actTotalCost / producedQty) : 0;

    // Variance = Actual - Planned (Positive = Unfavorable overrun, Negative = Favorable savings)
    const costVariance = round2(actTotalCost - stdTotalCost);
    const unitVariance = round2(actUnitCost - stdUnitCost);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      plannedQuantity: plannedQty,
      producedQuantity: producedQty,
      scrappedQuantity: Number(order.scrappedQuantity),
      standardCost: {
        materials: stdMaterialCost,
        labor: stdLaborCost,
        overhead: stdOverheadCost,
        total: stdTotalCost,
        unitCost: stdUnitCost,
      },
      actualCost: {
        materials: actMaterialCost,
        labor: actLaborCost,
        overhead: actOverheadCost,
        total: actTotalCost,
        unitCost: actUnitCost,
      },
      variance: {
        totalVariance: costVariance,
        unitVariance,
        isFavorable: costVariance <= 0,
      },
    };
  }

  // ==========================================================================
  // 10. General Ledger WIP Auto-Posting (§7)
  // ==========================================================================

  /**
   * Helper to check dual gates and resolve manufacturing accounting accounts
   */
  static async checkManufacturingGates(companyId) {
    const prisma = getSharedPrismaClient();

    // 1. Dual-gate check via AccountingAutoPostingService
    const { canPost } = await AccountingAutoPostingService.checkGates(companyId);
    if (!canPost) return { canPost: false };

    const mfgSettings = await this.getSettings(companyId);

    // Resolve standard accounts with fallbacks
    // 110402: WIP (مخزون إنتاج تحت التشغيل)
    const wipAccountId = await AccountingAutoPostingService.resolveAccount(
      companyId,
      mfgSettings.wipAccountId,
      '110402',
      'ASSET'
    );

    // 110401: Raw Materials (مخزون الخامات ومستلزمات الإنتاج)
    const rawMaterialsAccountId = await AccountingAutoPostingService.resolveAccount(
      companyId,
      mfgSettings.rawMaterialsAccountId,
      '110401',
      'ASSET'
    );

    // 210201: Accrued Wages (رواتب وأجور مستحقة)
    const accruedWagesAccountId = await AccountingAutoPostingService.resolveAccount(
      companyId,
      mfgSettings.accruedWagesAccountId,
      '210201',
      'LIABILITY'
    );

    // 5103: Applied Overheads (تكاليف صناعية محملة وغير مباشرة)
    const overheadAppliedAccountId = await AccountingAutoPostingService.resolveAccount(
      companyId,
      mfgSettings.overheadAppliedAccountId,
      '5103',
      'EXPENSE'
    );

    // 110403: Finished Goods (مخزون الإنتاج التام والبضاعة الجاهزة)
    const finishedGoodsAccountId = await AccountingAutoPostingService.resolveAccount(
      companyId,
      mfgSettings.finishedGoodsAccountId,
      '110403',
      'ASSET'
    );

    return {
      canPost: true,
      wipAccountId,
      rawMaterialsAccountId,
      accruedWagesAccountId,
      overheadAppliedAccountId,
      finishedGoodsAccountId,
    };
  }

  /**
   * Entry 1: Material Issue to Production
   * Debit: 110402 WIP
   * Credit: 110401 Raw Materials
   */
  static async postWipMaterialIssue(companyId, issueId, { orderNumber, totalCost, date, userId = null }) {
    const amount = round2(totalCost);
    if (amount <= 0) return { skipped: true };

    const prisma = getSharedPrismaClient();
    const gates = await this.checkManufacturingGates(companyId);
    if (!gates.canPost) return { skipped: true, reason: 'GATES_CLOSED' };

    // Idempotency check
    const existing = await prisma.journalEntry.findFirst({
      where: {
        companyId,
        sourceType: 'MANUFACTURING_ISSUE',
        sourceId: String(issueId),
        status: { not: 'VOID' },
      },
    });
    if (existing) return { skipped: true, idempotent: true, entryId: existing.id };

    const txDate = date ? new Date(date) : new Date();
    const isClosed = await AccountingService.isPeriodClosed(companyId, txDate);
    if (isClosed) {
      await AccountingAutoPostingService.enqueueUnposted(companyId, {
        sourceType: 'MANUFACTURING_ISSUE',
        sourceId: String(issueId),
        documentNo: `MI-${issueId}`,
        amount,
        date: txDate,
        reason: 'PERIOD_CLOSED',
        payload: { issueId, orderNumber, totalCost: amount },
      });
      return { pending: true, reason: 'PERIOD_CLOSED' };
    }

    if (!gates.wipAccountId || !gates.rawMaterialsAccountId) {
      return { skipped: true, reason: 'ACCOUNTS_NOT_RESOLVED' };
    }

    return await AccountingService.createEntry(
      companyId,
      {
        narration: `صرف خامات تشغيل لأمر الإنتاج ${orderNumber}`,
        sourceType: 'MANUFACTURING_ISSUE',
        sourceId: String(issueId),
        status: 'POSTED',
        date: txDate,
        lines: [
          {
            accountId: gates.wipAccountId,
            debit: amount,
            credit: 0.0,
            narration: `تحميل خامات على WIP أمر ${orderNumber}`,
          },
          {
            accountId: gates.rawMaterialsAccountId,
            debit: 0.0,
            credit: amount,
            narration: `خصم خامات من مخزن مستلزمات الإنتاج`,
          },
        ],
      },
      userId
    );
  }

  /**
   * Entry 2: Accrued Direct Labor applied to Production Order
   * Debit: 110402 WIP
   * Credit: 210201 Accrued Wages
   */
  static async postWipLaborCost(companyId, orderId, { orderNumber, amount, date, userId = null }) {
    const cost = round2(amount);
    if (cost <= 0) return { skipped: true };

    const prisma = getSharedPrismaClient();
    const gates = await this.checkManufacturingGates(companyId);
    if (!gates.canPost) return { skipped: true, reason: 'GATES_CLOSED' };

    // Idempotency check
    const existing = await prisma.journalEntry.findFirst({
      where: {
        companyId,
        sourceType: 'MANUFACTURING_LABOR',
        sourceId: String(orderId),
        status: { not: 'VOID' },
      },
    });
    if (existing) return { skipped: true, idempotent: true, entryId: existing.id };

    const txDate = date ? new Date(date) : new Date();
    const isClosed = await AccountingService.isPeriodClosed(companyId, txDate);
    if (isClosed) {
      await AccountingAutoPostingService.enqueueUnposted(companyId, {
        sourceType: 'MANUFACTURING_LABOR',
        sourceId: String(orderId),
        documentNo: `LABOR-${orderNumber}`,
        amount: cost,
        date: txDate,
        reason: 'PERIOD_CLOSED',
        payload: { orderId, orderNumber, amount: cost },
      });
      return { pending: true, reason: 'PERIOD_CLOSED' };
    }

    if (!gates.wipAccountId || !gates.accruedWagesAccountId) {
      return { skipped: true, reason: 'ACCOUNTS_NOT_RESOLVED' };
    }

    return await AccountingService.createEntry(
      companyId,
      {
        narration: `إثبات أجور عمال تشغيل أمر الإنتاج ${orderNumber}`,
        sourceType: 'MANUFACTURING_LABOR',
        sourceId: String(orderId),
        status: 'POSTED',
        date: txDate,
        lines: [
          {
            accountId: gates.wipAccountId,
            debit: cost,
            credit: 0.0,
            narration: `تحميل أجور مباشرة على WIP أمر ${orderNumber}`,
          },
          {
            accountId: gates.accruedWagesAccountId,
            debit: 0.0,
            credit: cost,
            narration: `رواتب وأجور مستحقة لعمال خط الإنتاج`,
          },
        ],
      },
      userId
    );
  }

  /**
   * Entry 3: Manufacturing Overheads (MOH) applied to Production Order
   * Debit: 110402 WIP
   * Credit: 5103 Overheads Applied
   */
  static async postWipOverheadCost(companyId, orderId, { orderNumber, amount, date, userId = null }) {
    const cost = round2(amount);
    if (cost <= 0) return { skipped: true };

    const prisma = getSharedPrismaClient();
    const gates = await this.checkManufacturingGates(companyId);
    if (!gates.canPost) return { skipped: true, reason: 'GATES_CLOSED' };

    // Idempotency check
    const existing = await prisma.journalEntry.findFirst({
      where: {
        companyId,
        sourceType: 'MANUFACTURING_OVERHEAD',
        sourceId: String(orderId),
        status: { not: 'VOID' },
      },
    });
    if (existing) return { skipped: true, idempotent: true, entryId: existing.id };

    const txDate = date ? new Date(date) : new Date();
    const isClosed = await AccountingService.isPeriodClosed(companyId, txDate);
    if (isClosed) {
      await AccountingAutoPostingService.enqueueUnposted(companyId, {
        sourceType: 'MANUFACTURING_OVERHEAD',
        sourceId: String(orderId),
        documentNo: `MOH-${orderNumber}`,
        amount: cost,
        date: txDate,
        reason: 'PERIOD_CLOSED',
        payload: { orderId, orderNumber, amount: cost },
      });
      return { pending: true, reason: 'PERIOD_CLOSED' };
    }

    if (!gates.wipAccountId || !gates.overheadAppliedAccountId) {
      return { skipped: true, reason: 'ACCOUNTS_NOT_RESOLVED' };
    }

    return await AccountingService.createEntry(
      companyId,
      {
        narration: `تحميل تكاليف صناعية غير مباشرة (MOH) لأمر الإنتاج ${orderNumber}`,
        sourceType: 'MANUFACTURING_OVERHEAD',
        sourceId: String(orderId),
        status: 'POSTED',
        date: txDate,
        lines: [
          {
            accountId: gates.wipAccountId,
            debit: cost,
            credit: 0.0,
            narration: `تحميل تكاليف صناعية غير مباشرة على WIP أمر ${orderNumber}`,
          },
          {
            accountId: gates.overheadAppliedAccountId,
            debit: 0.0,
            credit: cost,
            narration: `تكاليف صناعية غير مباشرة محملة`,
          },
        ],
      },
      userId
    );
  }

  /**
   * Entry 4: Finished Goods Receipt from WIP
   * Debit: 110403 Finished Goods Inventory
   * Credit: 110402 WIP
   */
  static async postWipFinishedGoodsReceipt(companyId, orderId, { orderNumber, amount, date, userId = null }) {
    const cost = round2(amount);
    if (cost <= 0) return { skipped: true };

    const prisma = getSharedPrismaClient();
    const gates = await this.checkManufacturingGates(companyId);
    if (!gates.canPost) return { skipped: true, reason: 'GATES_CLOSED' };

    // Idempotency check
    const existing = await prisma.journalEntry.findFirst({
      where: {
        companyId,
        sourceType: 'MANUFACTURING_RECEIPT',
        sourceId: String(orderId),
        status: { not: 'VOID' },
      },
    });
    if (existing) return { skipped: true, idempotent: true, entryId: existing.id };

    const txDate = date ? new Date(date) : new Date();
    const isClosed = await AccountingService.isPeriodClosed(companyId, txDate);
    if (isClosed) {
      await AccountingAutoPostingService.enqueueUnposted(companyId, {
        sourceType: 'MANUFACTURING_RECEIPT',
        sourceId: String(orderId),
        documentNo: `FGR-${orderNumber}`,
        amount: cost,
        date: txDate,
        reason: 'PERIOD_CLOSED',
        payload: { orderId, orderNumber, amount: cost },
      });
      return { pending: true, reason: 'PERIOD_CLOSED' };
    }

    if (!gates.finishedGoodsAccountId || !gates.wipAccountId) {
      return { skipped: true, reason: 'ACCOUNTS_NOT_RESOLVED' };
    }

    return await AccountingService.createEntry(
      companyId,
      {
        narration: `إقفال واستلام الإنتاج التام من التشغيل لأمر الإنتاج ${orderNumber}`,
        sourceType: 'MANUFACTURING_RECEIPT',
        sourceId: String(orderId),
        status: 'POSTED',
        date: txDate,
        lines: [
          {
            accountId: gates.finishedGoodsAccountId,
            debit: cost,
            credit: 0.0,
            narration: `استلام منتج تام الصنع بمخزن البضاعة الجاهزة`,
          },
          {
            accountId: gates.wipAccountId,
            debit: 0.0,
            credit: cost,
            narration: `تصفير وإقفال رصيد الإنتاج تحت التشغيل (WIP) لأمر ${orderNumber}`,
          },
        ],
      },
      userId
    );
  }
}

module.exports = ManufacturingService;
