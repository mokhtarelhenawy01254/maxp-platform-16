/**
 * Standalone Sample Manufacturing Order Service (Wave 5)
 *
 * Implements:
 * 1. Independent Sample Order lifecycle (DRAFT -> IN_PROGRESS -> APPROVED/REJECTED -> CONVERTED)
 * 2. Atomic sequential numbering: SMP-YYYY-##### (isolated from Production Orders MO-...)
 * 3. Support for freeform unregistered customer, brand, product, size/color, materialSource (CUSTOMER/COMPANY), sample fee
 * 4. Simplified production stages (sequence, status, start/complete, nullable templateSetId/templateId)
 * 5. Attachments and images
 * 6. Strict approval and rejection (mandatory resultNotes on reject)
 * 7. 1-Click Convert to ProductionOrder:
 *    - Strict guard: only APPROVED samples can be converted (400)
 *    - Strict guard: cannot convert twice (400)
 *    - Inherits fields, creates variantMatrix from sample size/color, sets sourceSampleOrderId
 *    - Sets sample status to CONVERTED and saves convertedOrderId
 * 8. Zero regression on existing manufacturing flows
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const ManufacturingService = require('./manufacturingService');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

class ManufacturingSampleService {
  /**
   * Idempotent runtime DDL guard for PostgreSQL
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "SampleOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CONVERTED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "SampleMaterialSource" AS ENUM ('CUSTOMER', 'COMPANY');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "SampleFileKind" AS ENUM ('IMAGE', 'PDF', 'OTHER');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "sample_orders" (
          "id" TEXT PRIMARY KEY,
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
          "designNotes" TEXT,
          "resultNotes" TEXT,
          "convertedOrderId" TEXT,
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "sample_orders_companyId_sampleNumber_key" ON "sample_orders"("companyId", "sampleNumber");
        CREATE INDEX IF NOT EXISTS "sample_orders_companyId_status_idx" ON "sample_orders"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "sample_orders_companyId_customerId_idx" ON "sample_orders"("companyId", "customerId");
        CREATE INDEX IF NOT EXISTS "sample_orders_companyId_productId_idx" ON "sample_orders"("companyId", "productId");
        CREATE INDEX IF NOT EXISTS "sample_orders_companyId_convertedOrderId_idx" ON "sample_orders"("companyId", "convertedOrderId");

        CREATE TABLE IF NOT EXISTS "sample_order_stages" (
          "id" TEXT PRIMARY KEY,
          "sampleOrderId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "stageType" "ProductionStageType" NOT NULL DEFAULT 'CUSTOM',
          "sequence" INTEGER NOT NULL DEFAULT 1,
          "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          "notes" TEXT,
          "templateSetId" TEXT,
          "templateId" TEXT,
          "startedAt" TIMESTAMP(3),
          "completedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS "sample_order_stages_sampleOrderId_idx" ON "sample_order_stages"("sampleOrderId");
        CREATE INDEX IF NOT EXISTS "sample_order_stages_sampleOrderId_sequence_idx" ON "sample_order_stages"("sampleOrderId", "sequence");

        CREATE TABLE IF NOT EXISTS "sample_order_attachments" (
          "id" TEXT PRIMARY KEY,
          "sampleOrderId" TEXT NOT NULL,
          "fileName" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "kind" "SampleFileKind" NOT NULL DEFAULT 'IMAGE',
          "uploadedBy" TEXT,
          "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS "sample_order_attachments_sampleOrderId_idx" ON "sample_order_attachments"("sampleOrderId");

        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "sourceSampleOrderId" TEXT;
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_sourceSampleOrderId_idx" ON "production_orders"("companyId", "sourceSampleOrderId");
      `);
    } catch (err) {
      // In SQLite/test mock environments, silently ignore
    }
  }

  /**
   * Atomic sequential numbering: SMP-YYYY-#####
   */
  static async generateSampleNumber(companyId, tx = null) {
    const prisma = tx || getSharedPrismaClient();
    const year = new Date().getFullYear();
    const prefix = `SMP-${year}-`;

    const last = await prisma.sampleOrder.findFirst({
      where: {
        companyId,
        sampleNumber: { startsWith: prefix },
      },
      orderBy: { sampleNumber: 'desc' },
      select: { sampleNumber: true },
    });

    let nextSeq = 1;
    if (last && last.sampleNumber) {
      const parts = last.sampleNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  /**
   * List sample orders with filtering & pagination
   */
  static async listSampleOrders(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const { status, search, customerId, materialSource, page = 1, limit = 50 } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = { companyId };

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (materialSource && materialSource !== 'ALL') {
      where.materialSource = materialSource;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (search && String(search).trim()) {
      const s = String(search).trim();
      where.OR = [
        { sampleNumber: { contains: s, mode: 'insensitive' } },
        { productName: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { brandName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.sampleOrder.findMany({
        where,
        include: {
          stages: { orderBy: { sequence: 'asc' } },
          attachments: { orderBy: { uploadedAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.sampleOrder.count({ where }),
    ]);

    // Enhance with convertedOrder details if converted
    const convertedOrderIds = items
      .map((s) => s.convertedOrderId)
      .filter((id) => Boolean(id));

    let orderMap = {};
    if (convertedOrderIds.length > 0) {
      const orders = await prisma.productionOrder.findMany({
        where: { id: { in: convertedOrderIds }, companyId },
        select: { id: true, orderNumber: true, status: true, plannedQuantity: true },
      });
      orders.forEach((o) => {
        orderMap[o.id] = o;
      });
    }

    const enrichedItems = items.map((s) => ({
      ...s,
      convertedOrder: s.convertedOrderId ? orderMap[s.convertedOrderId] || null : null,
    }));

    return {
      items: enrichedItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get single sample order by ID
   */
  static async getSampleOrderById(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!sample) {
      const err = new Error('أمر تصنيع العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    let convertedOrder = null;
    if (sample.convertedOrderId) {
      convertedOrder = await prisma.productionOrder.findFirst({
        where: { id: sample.convertedOrderId, companyId },
        select: { id: true, orderNumber: true, status: true, plannedQuantity: true, orderType: true },
      });
    }

    return {
      ...sample,
      convertedOrder,
    };
  }

  /**
   * Create new sample order
   */
  static async createSampleOrder(companyId, user, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const productName = String(data.productName || '').trim();
    if (!productName) {
      const err = new Error('اسم المنتج إلزامي لإنشاء أمر العينة');
      err.statusCode = 400;
      throw err;
    }

    const plannedQuantity = Math.max(1, parseInt(data.plannedQuantity, 10) || 1);
    const materialSource = data.materialSource === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY';
    const fee = data.fee !== undefined && data.fee !== null && data.fee !== '' ? round2(data.fee) : null;

    // Retry loop for atomic sequence collision protection
    let attempts = 0;
    while (attempts < 5) {
      try {
        attempts++;
        const sampleNumber = data.sampleNumber || (await this.generateSampleNumber(companyId));

        return await prisma.$transaction(async (tx) => {
          const sample = await tx.sampleOrder.create({
            data: {
              companyId,
              sampleNumber,
              customerId: data.customerId || null,
              customerName: data.customerName ? String(data.customerName).trim() : null,
              brandName: data.brandName ? String(data.brandName).trim() : null,
              productName,
              productId: data.productId || null,
              bomId: data.bomId || null,
              techPackId: data.techPackId || null,
              plannedQuantity,
              size: data.size ? String(data.size).trim().toUpperCase() : null,
              color: data.color ? String(data.color).trim().toUpperCase() : null,
              materialSource,
              fee,
              status: 'DRAFT',
              dueDate: data.dueDate ? new Date(data.dueDate) : null,
              designNotes: data.designNotes ? String(data.designNotes).trim() : null,
              createdById: user?.id ? String(user.id) : null,
            },
          });

          // Insert stages if provided
          if (Array.isArray(data.stages) && data.stages.length > 0) {
            for (let i = 0; i < data.stages.length; i++) {
              const st = data.stages[i];
              await tx.sampleOrderStage.create({
                data: {
                  sampleOrderId: sample.id,
                  name: String(st.name || `مرحلة ${i + 1}`).trim(),
                  stageType: st.stageType || 'CUSTOM',
                  sequence: st.sequence !== undefined ? Number(st.sequence) : i + 1,
                  status: st.status || 'PENDING',
                  notes: st.notes ? String(st.notes).trim() : null,
                  templateSetId: st.templateSetId || null,
                  templateId: st.templateId || null,
                },
              });
            }
          }

          return await tx.sampleOrder.findFirst({
            where: { id: sample.id, companyId },
            include: {
              stages: { orderBy: { sequence: 'asc' } },
              attachments: true,
            },
          });
        });
      } catch (err) {
        if (err.code === 'P2002' && attempts < 5) {
          // Unique constraint collision on sampleNumber -> retry next sequence
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Update sample order (DRAFT only)
   */
  static async updateSampleOrder(companyId, user, id, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const existing = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status !== 'DRAFT') {
      const err = new Error('لا يمكن تعديل بيانات العينة إلا في حالة المسودة (DRAFT)');
      err.statusCode = 400;
      throw err;
    }

    const updateData = {};
    if (data.productName !== undefined) updateData.productName = String(data.productName).trim();
    if (data.customerName !== undefined) updateData.customerName = data.customerName ? String(data.customerName).trim() : null;
    if (data.customerId !== undefined) updateData.customerId = data.customerId || null;
    if (data.brandName !== undefined) updateData.brandName = data.brandName ? String(data.brandName).trim() : null;
    if (data.productId !== undefined) updateData.productId = data.productId || null;
    if (data.bomId !== undefined) updateData.bomId = data.bomId || null;
    if (data.techPackId !== undefined) updateData.techPackId = data.techPackId || null;
    if (data.plannedQuantity !== undefined) updateData.plannedQuantity = Math.max(1, parseInt(data.plannedQuantity, 10) || 1);
    if (data.size !== undefined) updateData.size = data.size ? String(data.size).trim().toUpperCase() : null;
    if (data.color !== undefined) updateData.color = data.color ? String(data.color).trim().toUpperCase() : null;
    if (data.materialSource !== undefined) updateData.materialSource = data.materialSource === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY';
    if (data.fee !== undefined) updateData.fee = data.fee !== null && data.fee !== '' ? round2(data.fee) : null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.designNotes !== undefined) updateData.designNotes = data.designNotes ? String(data.designNotes).trim() : null;

    return await prisma.sampleOrder.update({
      where: { id },
      data: updateData,
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: true,
      },
    });
  }

  /**
   * Delete sample order (DRAFT only)
   */
  static async deleteSampleOrder(companyId, user, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const existing = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status !== 'DRAFT') {
      const err = new Error('لا يمكن حذف العينة إلا في حالة المسودة (DRAFT)');
      err.statusCode = 400;
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      await tx.sampleOrderStage.deleteMany({ where: { sampleOrderId: id } });
      await tx.sampleOrderAttachment.deleteMany({ where: { sampleOrderId: id } });
      await tx.sampleOrder.delete({ where: { id } });
    });

    return { success: true, message: 'تم حذف أمر العينة بنجاح' };
  }

  /**
   * Add stage to sample order
   */
  static async addSampleStage(companyId, user, sampleId, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id: sampleId, companyId },
    });
    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const name = String(data.name || '').trim();
    if (!name) {
      const err = new Error('اسم المرحلة إلزامي');
      err.statusCode = 400;
      throw err;
    }

    let sequence = data.sequence !== undefined ? Number(data.sequence) : null;
    if (sequence === null || isNaN(sequence)) {
      const lastStage = await prisma.sampleOrderStage.findFirst({
        where: { sampleOrderId: sampleId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      });
      sequence = (lastStage?.sequence || 0) + 1;
    }

    const stage = await prisma.sampleOrderStage.create({
      data: {
        sampleOrderId: sampleId,
        name,
        stageType: data.stageType || 'CUSTOM',
        sequence,
        status: data.status || 'PENDING',
        notes: data.notes ? String(data.notes).trim() : null,
        templateSetId: data.templateSetId || null,
        templateId: data.templateId || null,
      },
    });

    // If sample was in DRAFT and first stage started, transition to IN_PROGRESS
    if (sample.status === 'DRAFT' && stage.status === 'IN_PROGRESS') {
      await prisma.sampleOrder.update({
        where: { id: sampleId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return stage;
  }

  /**
   * Update stage progress (start, complete, notes)
   */
  static async updateSampleStage(companyId, user, sampleId, stageId, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id: sampleId, companyId },
    });
    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const stage = await prisma.sampleOrderStage.findFirst({
      where: { id: stageId, sampleOrderId: sampleId },
    });
    if (!stage) {
      const err = new Error('مرحلة العينة غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'IN_PROGRESS' && !stage.startedAt) {
        updateData.startedAt = new Date();
      }
      if (data.status === 'COMPLETED' && !stage.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (data.startedAt !== undefined) updateData.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes).trim() : null;

    const updatedStage = await prisma.sampleOrderStage.update({
      where: { id: stageId },
      data: updateData,
    });

    // Auto-transition sample to IN_PROGRESS if a stage is active and sample is DRAFT
    if (sample.status === 'DRAFT' && (updateData.status === 'IN_PROGRESS' || updateData.status === 'COMPLETED')) {
      await prisma.sampleOrder.update({
        where: { id: sampleId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return updatedStage;
  }

  /**
   * Add attachment / file to sample order
   */
  static async uploadSampleFile(companyId, user, sampleId, fileData) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id: sampleId, companyId },
    });
    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const fileName = fileData.fileName || fileData.originalname || 'sample-file';
    const url = fileData.url || `/uploads/manufacturing/${fileData.filename || fileName}`;
    const kind = fileData.kind || (fileName.match(/\.(png|jpe?g|webp|gif)$/i) ? 'IMAGE' : fileName.match(/\.pdf$/i) ? 'PDF' : 'OTHER');

    return await prisma.sampleOrderAttachment.create({
      data: {
        sampleOrderId: sampleId,
        fileName,
        url,
        kind,
        uploadedBy: user?.name || user?.email || 'System',
      },
    });
  }

  /**
   * Approve sample order
   */
  static async approveSampleOrder(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
    });
    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (sample.status === 'CONVERTED') {
      const err = new Error('لا يمكن اعتماد عينة تم تحويلها بالفعل إلى أمر تصنيع');
      err.statusCode = 400;
      throw err;
    }

    const resultNotes = data.resultNotes ? String(data.resultNotes).trim() : sample.resultNotes;

    return await prisma.sampleOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        resultNotes,
      },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: true,
      },
    });
  }

  /**
   * Reject sample order (MANDATORY resultNotes)
   */
  static async rejectSampleOrder(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
    });
    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (sample.status === 'CONVERTED') {
      const err = new Error('لا يمكن رفض عينة تم تحويلها بالفعل إلى أمر تصنيع');
      err.statusCode = 400;
      throw err;
    }

    const reason = String(data.resultNotes || '').trim();
    if (!reason) {
      const err = new Error('سبب الرفض إلزامي لرفض العينة');
      err.statusCode = 400;
      throw err;
    }

    return await prisma.sampleOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        resultNotes: reason,
      },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: true,
      },
    });
  }

  /**
   * Convert APPROVED sample order into full ProductionOrder
   */
  static async convertSampleToOrder(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // 1. Strict idempotency guard: Cannot convert twice
    if (sample.status === 'CONVERTED' || sample.convertedOrderId) {
      const err = new Error(`تم تحويل هذه العينة بالفعل إلى أمر تصنيع مسبقاً (رقم أمر التصنيع المرتبط: ${sample.convertedOrderId})`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Strict status guard: ONLY APPROVED samples can be converted
    if (sample.status !== 'APPROVED') {
      const err = new Error(`لا يمكن تحويل العينة لأمر تصنيع إلا بعد اعتمادها أولاً (حالة العينة الحالية: ${sample.status})`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Resolve BOM
    const bomId = data.bomId || sample.bomId;
    if (!bomId) {
      const err = new Error('قائمة المكونات (BOM) مطلوبة لإنشاء أمر التصنيع الناتج');
      err.statusCode = 400;
      throw err;
    }

    // 4. Resolve plannedQuantity & orderType
    const plannedQuantity = Math.max(1, Number(data.plannedQuantity) || sample.plannedQuantity || 1);
    const orderType = data.orderType || (sample.materialSource === 'CUSTOMER' ? 'CUSTOMER_MATERIALS' : 'FULL_PACKAGE');
    const customerId = data.customerId || sample.customerId || null;
    const brandName = data.brandName || sample.brandName || sample.customerName || null;
    const customerOrderId = data.customerOrderId || null;

    // 5. Construct variantMatrix: default to sample's size/color if not passed
    let variantMatrix = data.variantMatrix;
    if (!Array.isArray(variantMatrix) || variantMatrix.length === 0) {
      variantMatrix = [
        {
          size: sample.size || 'STANDARD',
          color: sample.color || 'STANDARD',
          plannedQuantity,
        },
      ];
    }

    const conversionNote = `محوّل من أمر العينة ${sample.sampleNumber}`;
    const fullNotes = [data.notes ? String(data.notes).trim() : null, conversionNote].filter(Boolean).join('\n');

    const orderPayload = {
      bomId,
      productId: sample.productId || null,
      orderType,
      customerId,
      brandName,
      customerOrderId,
      variantMatrix,
      sourceSampleOrderId: sample.id,
      notes: fullNotes,
      startDate: data.startDate || new Date().toISOString(),
      dueDate: data.dueDate || sample.dueDate || null,
      salePricePerUnit: data.salePricePerUnit !== undefined ? data.salePricePerUnit : null,
      techPackId: sample.techPackId || null,
    };

    // 6. Create production order using standard manufacturing service
    const createdOrder = await ManufacturingService.createOrder(companyId, orderPayload, user?.id);

    // 7. Update sample to CONVERTED with convertedOrderId
    const updatedSample = await prisma.sampleOrder.update({
      where: { id: sample.id },
      data: {
        status: 'CONVERTED',
        convertedOrderId: createdOrder.id,
      },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: true,
      },
    });

    return {
      success: true,
      message: 'تم تحويل العينة بنجاح إلى أمر تصنيع',
      order: createdOrder,
      sampleOrder: {
        ...updatedSample,
        convertedOrder: createdOrder,
      },
    };
  }
}

module.exports = ManufacturingSampleService;
