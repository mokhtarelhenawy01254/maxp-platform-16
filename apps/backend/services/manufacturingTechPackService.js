/**
 * Manufacturing Technical Pack & Multi-Source Size Charts Service (Wave 4)
 *
 * Implements:
 * 1. TechPack CRUD with automatic and explicit version management:
 *    - Statuses: DRAFT, APPROVED, ARCHIVED.
 *    - Approved modification law: Updating an APPROVED record never mutates it in place;
 *      it creates a new DRAFT version (version = old.version + 1, supersedesId = old.id).
 *    - Minimum approval criteria: name + fabricSummary + at least 1 file.
 * 2. Multi-Source Size Charts (Customer, Pattern, Factory):
 *    - Matrix generation (sizeLabel × measurementKey) across the 3 linked copies.
 *    - Tolerance violation calculations and alert flags.
 * 3. Safe Factory Portal resolution:
 *    - Resolves ONLY APPROVED versions for portal assignments.
 *    - Zero pricing/cost field leaks.
 * 4. Idempotent runtime PostgreSQL DDL (ensureSchema).
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

class ManufacturingTechPackService {
  /**
   * Idempotent runtime DDL guard for PostgreSQL
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "TechPackStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "TechPackFileKind" AS ENUM ('IMAGE', 'PDF', 'OTHER');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "SizeChartStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "SizeChartUnit" AS ENUM ('CM', 'INCH');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "SizeChartMeasurementMethod" AS ENUM ('FLAT', 'ROUND');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "SizeChartRowSource" AS ENUM ('CUSTOMER', 'PATTERN', 'FACTORY');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "tech_packs" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "version" INTEGER NOT NULL DEFAULT 1,
          "status" "TechPackStatus" NOT NULL DEFAULT 'DRAFT',
          "productId" TEXT,
          "bomId" TEXT,
          "brand" TEXT,
          "fabricSummary" TEXT,
          "printDetails" TEXT,
          "labelDetails" TEXT,
          "packagingDetails" TEXT,
          "instructions" TEXT,
          "notes" TEXT,
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP(3),
          "createdBy" TEXT,
          "supersedesId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "tech_packs_companyId_code_version_key" ON "tech_packs"("companyId", "code", "version");
        CREATE INDEX IF NOT EXISTS "tech_packs_companyId_status_idx" ON "tech_packs"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "tech_packs_companyId_productId_idx" ON "tech_packs"("companyId", "productId");
        CREATE INDEX IF NOT EXISTS "tech_packs_companyId_bomId_idx" ON "tech_packs"("companyId", "bomId");
        CREATE INDEX IF NOT EXISTS "tech_packs_supersedesId_idx" ON "tech_packs"("supersedesId");

        CREATE TABLE IF NOT EXISTS "tech_pack_files" (
          "id" TEXT PRIMARY KEY,
          "techPackId" TEXT NOT NULL,
          "fileName" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "kind" "TechPackFileKind" NOT NULL DEFAULT 'IMAGE',
          "uploadedBy" TEXT,
          "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS "tech_pack_files_techPackId_idx" ON "tech_pack_files"("techPackId");

        CREATE TABLE IF NOT EXISTS "size_charts" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "version" INTEGER NOT NULL DEFAULT 1,
          "status" "SizeChartStatus" NOT NULL DEFAULT 'DRAFT',
          "unit" "SizeChartUnit" NOT NULL DEFAULT 'CM',
          "measurementMethod" "SizeChartMeasurementMethod" NOT NULL DEFAULT 'FLAT',
          "productId" TEXT,
          "techPackId" TEXT,
          "notes" TEXT,
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP(3),
          "createdBy" TEXT,
          "supersedesId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "size_charts_companyId_code_version_key" ON "size_charts"("companyId", "code", "version");
        CREATE INDEX IF NOT EXISTS "size_charts_companyId_status_idx" ON "size_charts"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "size_charts_companyId_productId_idx" ON "size_charts"("companyId", "productId");
        CREATE INDEX IF NOT EXISTS "size_charts_companyId_techPackId_idx" ON "size_charts"("companyId", "techPackId");
        CREATE INDEX IF NOT EXISTS "size_charts_supersedesId_idx" ON "size_charts"("supersedesId");

        CREATE TABLE IF NOT EXISTS "size_chart_rows" (
          "id" TEXT PRIMARY KEY,
          "chartId" TEXT NOT NULL,
          "sizeLabel" TEXT NOT NULL,
          "measurementKey" TEXT NOT NULL,
          "value" DECIMAL(10,2) NOT NULL,
          "tolerance" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
          "source" "SizeChartRowSource" NOT NULL DEFAULT 'CUSTOMER',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS "size_chart_rows_chartId_idx" ON "size_chart_rows"("chartId");
        CREATE INDEX IF NOT EXISTS "size_chart_rows_chartId_source_idx" ON "size_chart_rows"("chartId", "source");
        CREATE INDEX IF NOT EXISTS "size_chart_rows_composite_idx" ON "size_chart_rows"("chartId", "sizeLabel", "measurementKey", "source");

        -- Add columns to production_orders if not present
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "techPackId" TEXT;
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "sizeChartId" TEXT;
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_techPackId_idx" ON "production_orders"("companyId", "techPackId");
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_sizeChartId_idx" ON "production_orders"("companyId", "sizeChartId");
      `);
    } catch (err) {
      console.warn('[ManufacturingTechPackService] ensureSchema note:', err.message);
    }
  }

  // ==========================================================================
  // 1. Tech Pack Operations
  // ==========================================================================

  /**
   * Generate next sequential code for a company
   */
  static async generateCode(companyId, prefix = 'TP') {
    const prisma = getSharedPrismaClient();
    const year = new Date().getFullYear();
    const table = prefix === 'TP' ? prisma.techPack : prisma.sizeChart;
    const count = await table.count({ where: { companyId } });
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-${year}-${seq}`;
  }

  /**
   * List Tech Packs with optional filters
   */
  static async listTechPacks(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.productId) {
      where.productId = query.productId;
    }
    if (query.bomId) {
      where.bomId = query.bomId;
    }
    if (query.search) {
      const q = String(query.search).trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ];
    }

    const techPacks = await prisma.techPack.findMany({
      where,
      include: {
        files: true,
        sizeCharts: { select: { id: true, code: true, name: true, version: true, status: true } },
        bom: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
    });

    return techPacks.map((tp) => ({
      ...tp,
      filesCount: (tp.files || []).length,
      sizeChartsCount: (tp.sizeCharts || []).length,
    }));
  }

  /**
   * Get Tech Pack by ID with complete relations
   */
  static async getTechPackById(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const techPack = await prisma.techPack.findFirst({
      where: { id, companyId },
      include: {
        files: { orderBy: { uploadedAt: 'desc' } },
        sizeCharts: true,
        bom: { select: { id: true, code: true, name: true } },
      },
    });

    if (!techPack) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    return techPack;
  }

  /**
   * Create a new Tech Pack (Starts in DRAFT status)
   */
  static async createTechPack(companyId, user, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const name = String(data.name || '').trim();
    if (!name) {
      const err = new Error('اسم الموديل أو المنتج الفني مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const code = data.code ? String(data.code).trim().toUpperCase() : await this.generateCode(companyId, 'TP');

    const created = await prisma.techPack.create({
      data: {
        companyId,
        code,
        name,
        version: 1,
        status: 'DRAFT',
        productId: data.productId || null,
        bomId: data.bomId || null,
        brand: data.brand || null,
        fabricSummary: data.fabricSummary || null,
        printDetails: data.printDetails || null,
        labelDetails: data.labelDetails || null,
        packagingDetails: data.packagingDetails || null,
        instructions: data.instructions || null,
        notes: data.notes || null,
        createdBy: user?.name || user?.email || user?.id || null,
        files: Array.isArray(data.files) && data.files.length > 0
          ? {
              create: data.files.map((f) => ({
                fileName: f.fileName || 'file',
                url: f.url,
                kind: f.kind || 'IMAGE',
                uploadedBy: user?.name || null,
              })),
            }
          : undefined,
      },
      include: { files: true },
    });

    return created;
  }

  /**
   * Update Tech Pack with Versioning Law:
   * Modifying an APPROVED Tech Pack automatically spawns a new DRAFT version!
   */
  static async updateTechPack(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const existing = await prisma.techPack.findFirst({
      where: { id, companyId },
      include: { files: true },
    });

    if (!existing) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status === 'ARCHIVED') {
      const err = new Error('لا يمكن تعديل ملف فني مؤرشف');
      err.statusCode = 400;
      throw err;
    }

    // VERSIONING RULE: If APPROVED, do not modify original! Spawn a new DRAFT version.
    if (existing.status === 'APPROVED') {
      const nextVersion = existing.version + 1;
      const newDraft = await prisma.techPack.create({
        data: {
          companyId,
          code: existing.code,
          name: data.name !== undefined ? String(data.name).trim() : existing.name,
          version: nextVersion,
          status: 'DRAFT',
          productId: data.productId !== undefined ? data.productId : existing.productId,
          bomId: data.bomId !== undefined ? data.bomId : existing.bomId,
          brand: data.brand !== undefined ? data.brand : existing.brand,
          fabricSummary: data.fabricSummary !== undefined ? data.fabricSummary : existing.fabricSummary,
          printDetails: data.printDetails !== undefined ? data.printDetails : existing.printDetails,
          labelDetails: data.labelDetails !== undefined ? data.labelDetails : existing.labelDetails,
          packagingDetails: data.packagingDetails !== undefined ? data.packagingDetails : existing.packagingDetails,
          instructions: data.instructions !== undefined ? data.instructions : existing.instructions,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          createdBy: user?.name || user?.email || user?.id || null,
          supersedesId: existing.id,
          // Duplicate previous files into new draft
          files: {
            create: (existing.files || []).map((f) => ({
              fileName: f.fileName,
              url: f.url,
              kind: f.kind,
              uploadedBy: f.uploadedBy,
            })),
          },
        },
        include: { files: true },
      });

      return {
        isNewVersion: true,
        message: `تم إنشاء إصدار مسودة جديد رقم ${nextVersion} لأن الإصدار السابق (${existing.version}) معتمد`,
        techPack: newDraft,
      };
    }

    // Direct update on DRAFT
    const updated = await prisma.techPack.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
        ...(data.productId !== undefined ? { productId: data.productId } : {}),
        ...(data.bomId !== undefined ? { bomId: data.bomId } : {}),
        ...(data.brand !== undefined ? { brand: data.brand } : {}),
        ...(data.fabricSummary !== undefined ? { fabricSummary: data.fabricSummary } : {}),
        ...(data.printDetails !== undefined ? { printDetails: data.printDetails } : {}),
        ...(data.labelDetails !== undefined ? { labelDetails: data.labelDetails } : {}),
        ...(data.packagingDetails !== undefined ? { packagingDetails: data.packagingDetails } : {}),
        ...(data.instructions !== undefined ? { instructions: data.instructions } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { files: true },
    });

    return {
      isNewVersion: false,
      message: 'تم تحديث ملف المنتج الفني بنجاح',
      techPack: updated,
    };
  }

  /**
   * Explicitly clone a Tech Pack to a new DRAFT version
   */
  static async cloneVersion(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const target = await prisma.techPack.findFirst({
      where: { id, companyId },
      include: { files: true },
    });

    if (!target) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // Determine max version for this code
    const allVersions = await prisma.techPack.findMany({
      where: { companyId, code: target.code },
      select: { version: true },
    });
    const maxVersion = Math.max(...allVersions.map((v) => v.version), target.version);
    const nextVersion = maxVersion + 1;

    const cloned = await prisma.techPack.create({
      data: {
        companyId,
        code: target.code,
        name: data.name ? String(data.name).trim() : target.name,
        version: nextVersion,
        status: 'DRAFT',
        productId: data.productId !== undefined ? data.productId : target.productId,
        bomId: data.bomId !== undefined ? data.bomId : target.bomId,
        brand: data.brand !== undefined ? data.brand : target.brand,
        fabricSummary: data.fabricSummary !== undefined ? data.fabricSummary : target.fabricSummary,
        printDetails: data.printDetails !== undefined ? data.printDetails : target.printDetails,
        labelDetails: data.labelDetails !== undefined ? data.labelDetails : target.labelDetails,
        packagingDetails: data.packagingDetails !== undefined ? data.packagingDetails : target.packagingDetails,
        instructions: data.instructions !== undefined ? data.instructions : target.instructions,
        notes: data.notes !== undefined ? data.notes : target.notes,
        createdBy: user?.name || user?.email || user?.id || null,
        supersedesId: target.id,
        files: {
          create: (target.files || []).map((f) => ({
            fileName: f.fileName,
            url: f.url,
            kind: f.kind,
            uploadedBy: user?.name || f.uploadedBy,
          })),
        },
      },
      include: { files: true },
    });

    return cloned;
  }

  /**
   * Approve Tech Pack with Strict Minimum Threshold:
   * Mandatory: name + fabricSummary + at least 1 file!
   */
  static async approveTechPack(companyId, user, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const techPack = await prisma.techPack.findFirst({
      where: { id, companyId },
      include: { files: true },
    });

    if (!techPack) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // Validation: name
    const hasName = Boolean(techPack.name && String(techPack.name).trim().length > 0);
    // Validation: fabricSummary
    const hasFabric = Boolean(techPack.fabricSummary && String(techPack.fabricSummary).trim().length > 0);
    // Validation: at least 1 file
    const hasFile = Array.isArray(techPack.files) && techPack.files.length > 0;

    if (!hasName || !hasFabric || !hasFile) {
      const missing = [];
      if (!hasName) missing.push('اسم الموديل');
      if (!hasFabric) missing.push('ملخص مواصفات الخامة (التركيب/GSM/العرض)');
      if (!hasFile) missing.push('ملف أو صورة فنية واحدة على الأقل');

      const err = new Error(
        `لا يمكن اعتماد ملف المنتج الفني بدون استيفاء الحد الأدنى المطلوب: ${missing.join('، ')}`
      );
      err.statusCode = 400;
      throw err;
    }

    const approved = await prisma.techPack.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user?.name || user?.email || user?.id || 'المسؤول',
        approvedAt: new Date(),
      },
      include: { files: true },
    });

    return approved;
  }

  /**
   * Archive a Tech Pack
   */
  static async archiveTechPack(companyId, user, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const techPack = await prisma.techPack.findFirst({
      where: { id, companyId },
    });

    if (!techPack) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const archived = await prisma.techPack.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return archived;
  }

  /**
   * Get version history chain for a Tech Pack
   */
  static async getTechPackVersions(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const current = await prisma.techPack.findFirst({
      where: { id, companyId },
      select: { code: true },
    });

    if (!current) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const versions = await prisma.techPack.findMany({
      where: { companyId, code: current.code },
      include: {
        files: true,
        sizeCharts: { select: { id: true, code: true, name: true, version: true, status: true } },
      },
      orderBy: { version: 'asc' },
    });

    return versions;
  }

  /**
   * Upload / Attach a file to a Tech Pack
   */
  static async addTechPackFile(companyId, user, techPackId, fileData = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const techPack = await prisma.techPack.findFirst({
      where: { id: techPackId, companyId },
    });

    if (!techPack) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (techPack.status === 'ARCHIVED') {
      const err = new Error('لا يمكن إضافة ملفات لملف فني مؤرشف');
      err.statusCode = 400;
      throw err;
    }

    // If APPROVED, updateTechPack rule applies (clone to new draft before modifying files)
    let targetTechPackId = techPackId;
    let isCloned = false;
    if (techPack.status === 'APPROVED') {
      const cloned = await this.cloneVersion(companyId, user, techPackId, {
        notes: `نسخة تلقائية لإضافة ملف فني جديد: ${fileData.fileName || ''}`,
      });
      targetTechPackId = cloned.id;
      isCloned = true;
    }

    const file = await prisma.techPackFile.create({
      data: {
        techPackId: targetTechPackId,
        fileName: fileData.fileName || 'file',
        url: fileData.url,
        kind: fileData.kind || 'IMAGE',
        uploadedBy: user?.name || null,
      },
    });

    return {
      file,
      targetTechPackId,
      isCloned,
      message: isCloned
        ? 'تم إنشاء إصدار مسودة جديد وإرفاق الملف به لأن الإصدار السابق معتمد'
        : 'تم إضافة الملف بنجاح',
    };
  }

  /**
   * Delete a file from a Tech Pack
   */
  static async deleteTechPackFile(companyId, user, techPackId, fileId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const techPack = await prisma.techPack.findFirst({
      where: { id: techPackId, companyId },
    });

    if (!techPack) {
      const err = new Error('ملف المنتج الفني غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (techPack.status === 'APPROVED') {
      const err = new Error('لا يمكن حذف ملفات من إصدار معتمد، يرجى إنشاء إصدار جديد أولاً');
      err.statusCode = 400;
      throw err;
    }

    await prisma.techPackFile.delete({
      where: { id: fileId },
    });

    return { success: true, message: 'تم حذف الملف بنجاح' };
  }

  // ==========================================================================
  // 2. Size Chart Operations (Multi-Source Matrix & Tolerances)
  // ==========================================================================

  /**
   * List Size Charts
   */
  static async listSizeCharts(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.productId) {
      where.productId = query.productId;
    }
    if (query.techPackId) {
      where.techPackId = query.techPackId;
    }
    if (query.search) {
      const q = String(query.search).trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const charts = await prisma.sizeChart.findMany({
      where,
      include: {
        techPack: { select: { id: true, code: true, name: true, version: true, status: true } },
        rows: true,
      },
      orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
    });

    return charts.map((sc) => ({
      ...sc,
      rowsCount: (sc.rows || []).length,
    }));
  }

  /**
   * Get Size Chart by ID with Rows
   */
  static async getSizeChartById(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const chart = await prisma.sizeChart.findFirst({
      where: { id, companyId },
      include: {
        techPack: { select: { id: true, code: true, name: true, version: true, status: true } },
        rows: { orderBy: [{ sizeLabel: 'asc' }, { measurementKey: 'asc' }] },
      },
    });

    if (!chart) {
      const err = new Error('جدول المقاسات غير موجود');
      err.statusCode = 404;
      throw err;
    }

    return chart;
  }

  /**
   * Create Size Chart (Starts in DRAFT status)
   */
  static async createSizeChart(companyId, user, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const name = String(data.name || '').trim();
    if (!name) {
      const err = new Error('اسم جدول المقاسات مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const code = data.code ? String(data.code).trim().toUpperCase() : await this.generateCode(companyId, 'SC');

    const created = await prisma.sizeChart.create({
      data: {
        companyId,
        code,
        name,
        version: 1,
        status: 'DRAFT',
        unit: data.unit || 'CM',
        measurementMethod: data.measurementMethod || 'FLAT',
        productId: data.productId || null,
        techPackId: data.techPackId || null,
        notes: data.notes || null,
        createdBy: user?.name || user?.email || user?.id || null,
        rows: Array.isArray(data.rows) && data.rows.length > 0
          ? {
              create: data.rows.map((r) => ({
                sizeLabel: String(r.sizeLabel || 'M').trim().toUpperCase(),
                measurementKey: String(r.measurementKey || 'CHEST').trim().toUpperCase(),
                value: round2(r.value || 0),
                tolerance: round2(r.tolerance !== undefined ? r.tolerance : 1.0),
                source: r.source || 'CUSTOMER',
              })),
            }
          : undefined,
      },
      include: { rows: true },
    });

    return created;
  }

  /**
   * Update Size Chart with Versioning Law:
   * Modifying an APPROVED Size Chart creates a new DRAFT version!
   */
  static async updateSizeChart(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const existing = await prisma.sizeChart.findFirst({
      where: { id, companyId },
      include: { rows: true },
    });

    if (!existing) {
      const err = new Error('جدول المقاسات غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status === 'ARCHIVED') {
      const err = new Error('لا يمكن تعديل جدول مقاسات مؤرشف');
      err.statusCode = 400;
      throw err;
    }

    // Rows to write
    const rowsToApply = Array.isArray(data.rows)
      ? data.rows.map((r) => ({
          sizeLabel: String(r.sizeLabel || 'M').trim().toUpperCase(),
          measurementKey: String(r.measurementKey || 'CHEST').trim().toUpperCase(),
          value: round2(r.value || 0),
          tolerance: round2(r.tolerance !== undefined ? r.tolerance : 1.0),
          source: r.source || 'CUSTOMER',
        }))
      : (existing.rows || []).map((r) => ({
          sizeLabel: r.sizeLabel,
          measurementKey: r.measurementKey,
          value: Number(r.value),
          tolerance: Number(r.tolerance),
          source: r.source,
        }));

    // If APPROVED, create new DRAFT version
    if (existing.status === 'APPROVED') {
      const nextVersion = existing.version + 1;
      const newDraft = await prisma.sizeChart.create({
        data: {
          companyId,
          code: existing.code,
          name: data.name !== undefined ? String(data.name).trim() : existing.name,
          version: nextVersion,
          status: 'DRAFT',
          unit: data.unit || existing.unit,
          measurementMethod: data.measurementMethod || existing.measurementMethod,
          productId: data.productId !== undefined ? data.productId : existing.productId,
          techPackId: data.techPackId !== undefined ? data.techPackId : existing.techPackId,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          createdBy: user?.name || user?.email || user?.id || null,
          supersedesId: existing.id,
          rows: {
            create: rowsToApply,
          },
        },
        include: { rows: true },
      });

      return {
        isNewVersion: true,
        message: `تم إنشاء إصدار مسودة جديد رقم ${nextVersion} لأن الإصدار السابق (${existing.version}) معتمد`,
        sizeChart: newDraft,
      };
    }

    // Direct update on DRAFT
    if (Array.isArray(data.rows)) {
      // Replace rows
      await prisma.sizeChartRow.deleteMany({ where: { chartId: id } });
      await prisma.sizeChartRow.createMany({
        data: rowsToApply.map((r) => ({ ...r, chartId: id })),
      });
    }

    const updated = await prisma.sizeChart.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.measurementMethod !== undefined ? { measurementMethod: data.measurementMethod } : {}),
        ...(data.productId !== undefined ? { productId: data.productId } : {}),
        ...(data.techPackId !== undefined ? { techPackId: data.techPackId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { rows: true },
    });

    return {
      isNewVersion: false,
      message: 'تم تحديث جدول المقاسات بنجاح',
      sizeChart: updated,
    };
  }

  /**
   * Clone a Size Chart to a new DRAFT version
   */
  static async cloneSizeChartVersion(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const target = await prisma.sizeChart.findFirst({
      where: { id, companyId },
      include: { rows: true },
    });

    if (!target) {
      const err = new Error('جدول المقاسات غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const allVersions = await prisma.sizeChart.findMany({
      where: { companyId, code: target.code },
      select: { version: true },
    });
    const maxVersion = Math.max(...allVersions.map((v) => v.version), target.version);
    const nextVersion = maxVersion + 1;

    const cloned = await prisma.sizeChart.create({
      data: {
        companyId,
        code: target.code,
        name: data.name ? String(data.name).trim() : target.name,
        version: nextVersion,
        status: 'DRAFT',
        unit: data.unit || target.unit,
        measurementMethod: data.measurementMethod || target.measurementMethod,
        productId: data.productId !== undefined ? data.productId : target.productId,
        techPackId: data.techPackId !== undefined ? data.techPackId : target.techPackId,
        notes: data.notes !== undefined ? data.notes : target.notes,
        createdBy: user?.name || user?.email || user?.id || null,
        supersedesId: target.id,
        rows: {
          create: (target.rows || []).map((r) => ({
            sizeLabel: r.sizeLabel,
            measurementKey: r.measurementKey,
            value: Number(r.value),
            tolerance: Number(r.tolerance),
            source: r.source,
          })),
        },
      },
      include: { rows: true },
    });

    return cloned;
  }

  /**
   * Approve Size Chart (Requires at least 1 valid row)
   */
  static async approveSizeChart(companyId, user, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const chart = await prisma.sizeChart.findFirst({
      where: { id, companyId },
      include: { rows: true },
    });

    if (!chart) {
      const err = new Error('جدول المقاسات غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (!chart.rows || chart.rows.length === 0) {
      const err = new Error('لا يمكن اعتماد جدول مقاسات فارغ بدون قياسات');
      err.statusCode = 400;
      throw err;
    }

    const approved = await prisma.sizeChart.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user?.name || user?.email || user?.id || 'المسؤول',
        approvedAt: new Date(),
      },
      include: { rows: true },
    });

    return approved;
  }

  /**
   * Archive a Size Chart
   */
  static async archiveSizeChart(companyId, user, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const chart = await prisma.sizeChart.findFirst({
      where: { id, companyId },
    });

    if (!chart) {
      const err = new Error('جدول المقاسات غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const archived = await prisma.sizeChart.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return archived;
  }

  /**
   * Get version history chain for a Size Chart
   */
  static async getSizeChartVersions(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const current = await prisma.sizeChart.findFirst({
      where: { id, companyId },
      select: { code: true },
    });

    if (!current) {
      const err = new Error('جدول المقاسات غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const versions = await prisma.sizeChart.findMany({
      where: { companyId, code: current.code },
      include: { rows: true },
      orderBy: { version: 'asc' },
    });

    return versions;
  }

  /**
   * Calculate 3-Source Matrix (Customer vs Pattern vs Factory) with Tolerance Checks
   */
  static async getSizeChartMatrix(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const chart = await prisma.sizeChart.findFirst({
      where: { id, companyId },
      include: {
        rows: true,
        techPack: { select: { id: true, code: true, name: true, version: true } },
      },
    });

    if (!chart) {
      const err = new Error('جدول المقاسات غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const rows = chart.rows || [];

    // Distinct sizes and measurement keys
    const sizes = Array.from(new Set(rows.map((r) => r.sizeLabel))).sort();
    const measurementKeys = Array.from(new Set(rows.map((r) => r.measurementKey))).sort();

    // Map: `${sizeLabel}__${measurementKey}` -> { CUSTOMER, PATTERN, FACTORY }
    const cellMap = new Map();

    for (const r of rows) {
      const key = `${r.sizeLabel}__${r.measurementKey}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          sizeLabel: r.sizeLabel,
          measurementKey: r.measurementKey,
          tolerance: Number(r.tolerance || 1.0),
          customerValue: null,
          patternValue: null,
          factoryValue: null,
        });
      }
      const cell = cellMap.get(key);
      const val = Number(r.value);
      if (r.source === 'CUSTOMER') cell.customerValue = val;
      if (r.source === 'PATTERN') cell.patternValue = val;
      if (r.source === 'FACTORY') cell.factoryValue = val;
      if (r.tolerance !== undefined && r.tolerance !== null) {
        cell.tolerance = Number(r.tolerance);
      }
    }

    let exceededCount = 0;
    const matrixCells = [];

    for (const [key, cell] of cellMap.entries()) {
      const { customerValue, patternValue, factoryValue, tolerance } = cell;

      // Calculate diffs between the 3 copies when values exist
      const diffPatternVsCustomer =
        patternValue !== null && customerValue !== null
          ? round2(Math.abs(patternValue - customerValue))
          : null;

      const diffFactoryVsCustomer =
        factoryValue !== null && customerValue !== null
          ? round2(Math.abs(factoryValue - customerValue))
          : null;

      const diffFactoryVsPattern =
        factoryValue !== null && patternValue !== null
          ? round2(Math.abs(factoryValue - patternValue))
          : null;

      const exceededSources = [];
      if (diffPatternVsCustomer !== null && diffPatternVsCustomer > tolerance) {
        exceededSources.push({
          comparison: 'PATTERN_VS_CUSTOMER',
          label: 'فرق الباترون عن مقاس العميل',
          diff: diffPatternVsCustomer,
          allowedTolerance: tolerance,
        });
      }
      if (diffFactoryVsCustomer !== null && diffFactoryVsCustomer > tolerance) {
        exceededSources.push({
          comparison: 'FACTORY_VS_CUSTOMER',
          label: 'فرق المصنع عن مقاس العميل',
          diff: diffFactoryVsCustomer,
          allowedTolerance: tolerance,
        });
      }
      if (diffFactoryVsPattern !== null && diffFactoryVsPattern > tolerance) {
        exceededSources.push({
          comparison: 'FACTORY_VS_PATTERN',
          label: 'فرق المصنع عن الباترون الفعلي',
          diff: diffFactoryVsPattern,
          allowedTolerance: tolerance,
        });
      }

      const isToleranceExceeded = exceededSources.length > 0;
      if (isToleranceExceeded) {
        exceededCount++;
      }

      matrixCells.push({
        sizeLabel: cell.sizeLabel,
        measurementKey: cell.measurementKey,
        tolerance,
        customerValue,
        patternValue,
        factoryValue,
        diffPatternVsCustomer,
        diffFactoryVsCustomer,
        diffFactoryVsPattern,
        isToleranceExceeded,
        exceededSources,
      });
    }

    return {
      chart: {
        id: chart.id,
        code: chart.code,
        name: chart.name,
        version: chart.version,
        status: chart.status,
        unit: chart.unit,
        measurementMethod: chart.measurementMethod,
        techPack: chart.techPack || null,
        notes: chart.notes || null,
      },
      sizes,
      measurementKeys,
      totalCells: matrixCells.length,
      exceededCount,
      hasExceededTolerance: exceededCount > 0,
      matrix: matrixCells,
    };
  }

  // ==========================================================================
  // 3. Factory Portal Resolver (Approved Only, Zero Pricing Leaks)
  // ==========================================================================

  /**
   * Lookup the current APPROVED TechPack for an order
   */
  static async getApprovedTechPackForOrder(companyId, order) {
    if (!order) return null;
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    let techPack = null;

    // 1. Direct link on order
    if (order.techPackId) {
      techPack = await prisma.techPack.findFirst({
        where: { id: order.techPackId, companyId, status: 'APPROVED' },
        include: { files: true },
      });
    }

    // 2. Fallback: match by bomId
    if (!techPack && order.bomId) {
      techPack = await prisma.techPack.findFirst({
        where: { bomId: order.bomId, companyId, status: 'APPROVED' },
        include: { files: true },
        orderBy: { version: 'desc' },
      });
    }

    // 3. Fallback: match by productId
    if (!techPack && order.productId) {
      techPack = await prisma.techPack.findFirst({
        where: { productId: order.productId, companyId, status: 'APPROVED' },
        include: { files: true },
        orderBy: { version: 'desc' },
      });
    }

    if (!techPack || techPack.status !== 'APPROVED') {
      return null;
    }

    // Strictly sanitized output — ZERO cost or price fields
    return {
      id: techPack.id,
      code: techPack.code,
      name: techPack.name,
      version: techPack.version,
      status: techPack.status,
      brand: techPack.brand || null,
      fabricSummary: techPack.fabricSummary || null,
      printDetails: techPack.printDetails || null,
      labelDetails: techPack.labelDetails || null,
      packagingDetails: techPack.packagingDetails || null,
      instructions: techPack.instructions || null,
      notes: techPack.notes || null,
      approvedAt: techPack.approvedAt || null,
      files: (techPack.files || []).map((f) => ({
        id: f.id,
        fileName: f.fileName,
        url: f.url,
        kind: f.kind,
      })),
    };
  }

  /**
   * Lookup the current APPROVED SizeChart for an order
   */
  static async getApprovedSizeChartForOrder(companyId, order, approvedTechPackId = null) {
    if (!order) return null;
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    let chart = null;

    // 1. Direct link on order
    if (order.sizeChartId) {
      chart = await prisma.sizeChart.findFirst({
        where: { id: order.sizeChartId, companyId, status: 'APPROVED' },
        include: { rows: true },
      });
    }

    // 2. Link via approved TechPack
    if (!chart && approvedTechPackId) {
      chart = await prisma.sizeChart.findFirst({
        where: { techPackId: approvedTechPackId, companyId, status: 'APPROVED' },
        include: { rows: true },
        orderBy: { version: 'desc' },
      });
    }

    // 3. Fallback: match by productId
    if (!chart && order.productId) {
      chart = await prisma.sizeChart.findFirst({
        where: { productId: order.productId, companyId, status: 'APPROVED' },
        include: { rows: true },
        orderBy: { version: 'desc' },
      });
    }

    if (!chart || chart.status !== 'APPROVED') {
      return null;
    }

    // Strictly sanitized output
    return {
      id: chart.id,
      code: chart.code,
      name: chart.name,
      version: chart.version,
      status: chart.status,
      unit: chart.unit,
      measurementMethod: chart.measurementMethod,
      approvedAt: chart.approvedAt || null,
      rows: (chart.rows || []).map((r) => ({
        sizeLabel: r.sizeLabel,
        measurementKey: r.measurementKey,
        value: Number(r.value),
        tolerance: Number(r.tolerance),
        source: r.source,
      })),
    };
  }
}

module.exports = ManufacturingTechPackService;
