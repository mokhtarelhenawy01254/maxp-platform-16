/**
 * Manufacturing Subcontract & External Factory Service
 * Wave 2: Partner Factories, External Stage Execution, Factory Events & Attachments.
 *
 * Implements:
 * 1. Partner Factories CRUD (unique name per company, soft delete with active stage protection).
 * 2. Stage Assignment: External/Internal execution with active partner factory validation.
 * 3. Sequential Factory Events: SENT -> ACK_RECEIPT -> COMPLETED (strict order enforcement).
 * 4. Manufacturing Attachments: Images, videos, documents linked to orders and stages.
 * 5. Subcontract Performance Metrics: On-time vs Late delivery, avg cycle time, and labor costs.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

class ManufacturingSubcontractService {
  /**
   * Runtime schema guard for partner factories & subcontracting fields
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "StageExecutionEntity" AS ENUM ('INTERNAL', 'EXTERNAL');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "AttachmentKind" AS ENUM ('IMAGE', 'VIDEO', 'DOC');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "partner_factories" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT,
          "specialty" TEXT,
          "contactPerson" TEXT,
          "phone" TEXT,
          "email" TEXT,
          "address" TEXT,
          "notes" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "partner_factories_companyId_name_key" ON "partner_factories"("companyId", "name");
        CREATE INDEX IF NOT EXISTS "partner_factories_companyId_isActive_idx" ON "partner_factories"("companyId", "isActive");

        CREATE TABLE IF NOT EXISTS "manufacturing_attachments" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "orderId" TEXT,
          "stageId" TEXT,
          "url" TEXT NOT NULL,
          "kind" "AttachmentKind" NOT NULL DEFAULT 'IMAGE',
          "caption" TEXT,
          "uploadedById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "manufacturing_attachments_companyId_orderId_idx" ON "manufacturing_attachments"("companyId", "orderId");
        CREATE INDEX IF NOT EXISTS "manufacturing_attachments_stageId_idx" ON "manufacturing_attachments"("stageId");

        ALTER TABLE "production_stages" ADD COLUMN IF NOT EXISTS "executionEntity" "StageExecutionEntity" NOT NULL DEFAULT 'INTERNAL';
        ALTER TABLE "production_stages" ADD COLUMN IF NOT EXISTS "partnerFactoryId" TEXT;
        ALTER TABLE "production_stages" ADD COLUMN IF NOT EXISTS "sentToFactoryAt" TIMESTAMP(3);
        ALTER TABLE "production_stages" ADD COLUMN IF NOT EXISTS "factoryAckReceiptAt" TIMESTAMP(3);
        ALTER TABLE "production_stages" ADD COLUMN IF NOT EXISTS "factoryCompletedAt" TIMESTAMP(3);
        ALTER TABLE "production_stages" ADD COLUMN IF NOT EXISTS "factoryNotes" TEXT;
        CREATE INDEX IF NOT EXISTS "production_stages_partnerFactoryId_idx" ON "production_stages"("partnerFactoryId");
      `);
    } catch (err) {
      console.warn('[ManufacturingSubcontractService] ensureSchema note:', err.message);
    }
  }

  // ==========================================================================
  // 1. Partner Factories CRUD
  // ==========================================================================

  static async listPartnerFactories(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }
    if (query.specialty) {
      where.specialty = query.specialty;
    }
    if (query.search) {
      const s = String(query.search).trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { contactPerson: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const factories = await prisma.partnerFactory.findMany({
      where,
      include: {
        stages: {
          select: {
            id: true,
            status: true,
            executionEntity: true,
            stageLaborCost: true,
            sentToFactoryAt: true,
            factoryCompletedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return factories.map((f) => {
      const activeStagesCount = f.stages.filter(
        (s) => s.status === 'PENDING' || s.status === 'IN_PROGRESS'
      ).length;
      const completedStagesCount = f.stages.filter(
        (s) => s.status === 'COMPLETED'
      ).length;
      const totalLaborCost = f.stages.reduce(
        (sum, s) => sum + Number(s.stageLaborCost || 0),
        0
      );

      return {
        id: f.id,
        companyId: f.companyId,
        name: f.name,
        code: f.code,
        specialty: f.specialty,
        contactPerson: f.contactPerson,
        phone: f.phone,
        email: f.email,
        address: f.address,
        notes: f.notes,
        isActive: f.isActive,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        metrics: {
          totalStagesCount: f.stages.length,
          activeStagesCount,
          completedStagesCount,
          totalLaborCost: round2(totalLaborCost),
        },
      };
    });
  }

  static async getPartnerFactoryById(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const factory = await prisma.partnerFactory.findFirst({
      where: { id, companyId },
      include: {
        stages: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                plannedQuantity: true,
                brandName: true,
                dueDate: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!factory) {
      const err = new Error('المصنع الشريك غير موجود أو ليس مصرحاً لك بالوصول إليه');
      err.statusCode = 404;
      throw err;
    }

    return factory;
  }

  static async createPartnerFactory(companyId, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const name = String(data.name || '').trim();
    if (!name) {
      const err = new Error('اسم المصنع الشريك مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const existing = await prisma.partnerFactory.findFirst({
      where: { companyId, name },
    });
    if (existing) {
      const err = new Error(`يوجد مصنع شريك مسجل بالفعل باسم "${name}"`);
      err.statusCode = 400;
      throw err;
    }

    return prisma.partnerFactory.create({
      data: {
        companyId,
        name,
        code: data.code?.trim() || null,
        specialty: data.specialty?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });
  }

  static async updatePartnerFactory(companyId, id, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const factory = await prisma.partnerFactory.findFirst({
      where: { id, companyId },
    });
    if (!factory) {
      const err = new Error('المصنع الشريك غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (data.name !== undefined) {
      const name = String(data.name || '').trim();
      if (!name) {
        const err = new Error('اسم المصنع الشريك لا يمكن أن يكون فارغاً');
        err.statusCode = 400;
        throw err;
      }
      if (name !== factory.name) {
        const existing = await prisma.partnerFactory.findFirst({
          where: { companyId, name, NOT: { id } },
        });
        if (existing) {
          const err = new Error(`يوجد مصنع شريك مسجل بالفعل باسم "${name}"`);
          err.statusCode = 400;
          throw err;
        }
      }
      updateData.name = name;
    }

    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.specialty !== undefined) updateData.specialty = data.specialty?.trim() || null;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    return prisma.partnerFactory.update({
      where: { id },
      data: updateData,
    });
  }

  static async deletePartnerFactory(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const factory = await prisma.partnerFactory.findFirst({
      where: { id, companyId },
    });
    if (!factory) {
      const err = new Error('المصنع الشريك غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // Check if there are active stages linked to this factory
    const activeStage = await prisma.productionStage.findFirst({
      where: {
        partnerFactoryId: id,
        executionEntity: 'EXTERNAL',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        order: {
          companyId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      },
    });

    if (activeStage) {
      const err = new Error(
        'لا يمكن تعطيل أو حذف هذا المصنع الشريك لوجود مراحل تشغيل نشطة مرتبطة به حالياً. قم بإسناد المراحل لمصنع آخر أولاً.'
      );
      err.statusCode = 400;
      throw err;
    }

    // Soft delete by deactivating
    await prisma.partnerFactory.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'تم تعطيل المصنع الشريك بنجاح' };
  }

  // ==========================================================================
  // 2. Stage Assignment (INTERNAL / EXTERNAL)
  // ==========================================================================

  static async assignStageExecution(companyId, orderId, stageId, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const order = await prisma.productionOrder.findFirst({
      where: { id: orderId, companyId },
      include: { stages: true },
    });
    if (!order) {
      const err = new Error('أمر الإنتاج غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      const err = new Error('لا يمكن تعديل مراحل أمر إنتاج مكتمل أو ملغي');
      err.statusCode = 400;
      throw err;
    }

    const stage = order.stages.find((s) => s.id === stageId);
    if (!stage) {
      const err = new Error('مرحلة التشغيل غير موجودة في هذا الأمر');
      err.statusCode = 404;
      throw err;
    }

    if (stage.status === 'COMPLETED') {
      const err = new Error('لا يمكن تعديل جهة التنفيذ لمرحلة تشغيل مكتملة بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const executionEntity = String(data.executionEntity || 'INTERNAL').toUpperCase();
    if (!['INTERNAL', 'EXTERNAL'].includes(executionEntity)) {
      const err = new Error('جهة التنفيذ غير صالحة. القيم المسموحة: INTERNAL أو EXTERNAL');
      err.statusCode = 400;
      throw err;
    }

    let partnerFactoryId = null;
    if (executionEntity === 'EXTERNAL') {
      partnerFactoryId = data.partnerFactoryId;
      if (!partnerFactoryId) {
        const err = new Error('يجب اختيار المصنع الشريك عند تحديد جهة التنفيذ كـ خارجي');
        err.statusCode = 400;
        throw err;
      }

      const factory = await prisma.partnerFactory.findFirst({
        where: { id: partnerFactoryId, companyId },
      });
      if (!factory) {
        const err = new Error('المصنع الشريك المحدد غير موجود');
        err.statusCode = 400;
        throw err;
      }
      if (!factory.isActive) {
        const err = new Error('المصنع الشريك المحدد معطل حالياً');
        err.statusCode = 400;
        throw err;
      }
    }

    const updated = await prisma.productionStage.update({
      where: { id: stageId },
      data: {
        executionEntity,
        partnerFactoryId,
      },
      include: {
        partnerFactory: true,
      },
    });

    return updated;
  }

  // ==========================================================================
  // 3. Stage Sequential Factory Events (SENT -> ACK_RECEIPT -> COMPLETED)
  // ==========================================================================

  static async recordStageFactoryEvent(companyId, orderId, stageId, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const event = String(data.event || '').toUpperCase();
    if (!['SENT', 'ACK_RECEIPT', 'COMPLETED'].includes(event)) {
      const err = new Error(
        'نوع الحدث غير معروف. الأحداث المتاحة: SENT (إرسال)، ACK_RECEIPT (تأكيد استلام)، COMPLETED (تأكيد إتمام)'
      );
      err.statusCode = 400;
      throw err;
    }

    const order = await prisma.productionOrder.findFirst({
      where: { id: orderId, companyId },
      include: { stages: true },
    });
    if (!order) {
      const err = new Error('أمر الإنتاج غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const stage = order.stages.find((s) => s.id === stageId);
    if (!stage) {
      const err = new Error('مرحلة التشغيل غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    if (stage.executionEntity !== 'EXTERNAL' || !stage.partnerFactoryId) {
      const err = new Error(
        'هذه المرحلة محددة كتنفيذ داخلي ولا يمكن تسجيل أحداث مصنع خارجي عليها. قم بإسنادها لمصنع خارجي أولاً.'
      );
      err.statusCode = 400;
      throw err;
    }

    const eventTime = data.at ? new Date(data.at) : new Date();
    const notes = data.notes?.trim() || null;

    const updateData = {};
    if (notes) {
      updateData.factoryNotes = stage.factoryNotes
        ? `${stage.factoryNotes}\n[${event} ${eventTime.toISOString().slice(0, 10)}] ${notes}`
        : `[${event} ${eventTime.toISOString().slice(0, 10)}] ${notes}`;
    }

    if (event === 'SENT') {
      updateData.sentToFactoryAt = eventTime;
      // If stage is still pending, move it to in progress
      if (stage.status === 'PENDING') {
        updateData.status = 'IN_PROGRESS';
        updateData.startedAt = stage.startedAt || eventTime;
      }
    } else if (event === 'ACK_RECEIPT') {
      if (!stage.sentToFactoryAt && !updateData.sentToFactoryAt) {
        const err = new Error(
          'لا يمكن تأكيد استلام المصنع قبل تسجيل إرسال المرحلة للمصنع أولاً (SENT).'
        );
        err.statusCode = 400;
        throw err;
      }
      updateData.factoryAckReceiptAt = eventTime;
    } else if (event === 'COMPLETED') {
      if (!stage.sentToFactoryAt) {
        const err = new Error(
          'لا يمكن تأكيد إتمام المرحلة قبل إرسالها للمصنع وتأكيد استلامه لها أولاً.'
        );
        err.statusCode = 400;
        throw err;
      }
      if (!stage.factoryAckReceiptAt) {
        const err = new Error(
          'لا يمكن تأكيد إتمام المرحلة قبل تأكيد استلام المصنع لها أولاً (ACK_RECEIPT).'
        );
        err.statusCode = 400;
        throw err;
      }

      updateData.factoryCompletedAt = eventTime;
      updateData.status = 'COMPLETED';
      updateData.completedAt = stage.completedAt || eventTime;

      // Auto-set completedQuantity if zero
      const completedQty = Number(stage.completedQuantity || 0);
      if (completedQty <= 0) {
        updateData.completedQuantity = order.plannedQuantity;
        updateData.stageLaborCost = Number(order.plannedQuantity) * Number(stage.ratePerPiece || 0);
      }
    }

    const updated = await prisma.productionStage.update({
      where: { id: stageId },
      data: updateData,
      include: {
        partnerFactory: true,
      },
    });

    return updated;
  }

  // ==========================================================================
  // 4. Manufacturing Attachments
  // ==========================================================================

  static async createAttachment(companyId, data, userId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const url = String(data.url || '').trim();
    if (!url) {
      const err = new Error('رابط المرفق (url) مطلوب');
      err.statusCode = 400;
      throw err;
    }

    let kind = String(data.kind || '').toUpperCase();
    if (!['IMAGE', 'VIDEO', 'DOC'].includes(kind)) {
      // Auto-detect from extension if invalid or empty
      const lower = url.toLowerCase();
      if (lower.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/)) {
        kind = 'IMAGE';
      } else if (lower.match(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/)) {
        kind = 'VIDEO';
      } else {
        kind = 'DOC';
      }
    }

    // Verify orderId if provided
    if (data.orderId) {
      const order = await prisma.productionOrder.findFirst({
        where: { id: data.orderId, companyId },
      });
      if (!order) {
        const err = new Error('أمر الإنتاج المرتبط غير موجود');
        err.statusCode = 404;
        throw err;
      }
    }

    // Verify stageId if provided
    if (data.stageId) {
      const stage = await prisma.productionStage.findFirst({
        where: { id: data.stageId },
      });
      if (!stage) {
        const err = new Error('مرحلة التشغيل المرتبطة غير موجودة');
        err.statusCode = 404;
        throw err;
      }
    }

    return prisma.manufacturingAttachment.create({
      data: {
        companyId,
        orderId: data.orderId || null,
        stageId: data.stageId || null,
        url,
        kind,
        caption: data.caption?.trim() || null,
        uploadedById: userId || null,
      },
      include: {
        stage: { select: { id: true, name: true, sequence: true } },
      },
    });
  }

  static async listOrderAttachments(companyId, orderId, filters = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const order = await prisma.productionOrder.findFirst({
      where: { id: orderId, companyId },
    });
    if (!order) {
      const err = new Error('أمر الإنتاج غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const where = { companyId, orderId };
    if (filters.stageId) {
      where.stageId = filters.stageId;
    }
    if (filters.kind) {
      where.kind = filters.kind;
    }

    return prisma.manufacturingAttachment.findMany({
      where,
      include: {
        stage: { select: { id: true, name: true, sequence: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteAttachment(companyId, id, user) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const attachment = await prisma.manufacturingAttachment.findFirst({
      where: { id, companyId },
    });
    if (!attachment) {
      const err = new Error('المرفق غير موجود أو تم حذفه بالفعل');
      err.statusCode = 404;
      throw err;
    }

    // Authorization: owner/admin or original uploader
    const role = String(user?.role || '').toUpperCase();
    const isPrivileged =
      role === 'SUPER_ADMIN' ||
      role === 'COMPANY_ADMIN' ||
      role === 'OWNER' ||
      user?.isOwner === true;
    const isUploader = user?.id && attachment.uploadedById === user.id;

    if (!isPrivileged && !isUploader) {
      const err = new Error('غير مصرح لك بحذف هذا المرفق');
      err.statusCode = 403;
      throw err;
    }

    await prisma.manufacturingAttachment.delete({
      where: { id },
    });

    return { success: true, message: 'تم حذف المرفق بنجاح' };
  }

  // ==========================================================================
  // 5. Subcontract Performance Reports
  // ==========================================================================

  static async getPartnerFactoriesPerformance(companyId, filters = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const factories = await prisma.partnerFactory.findMany({
      where: { companyId },
      include: {
        stages: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                dueDate: true,
                expectedDelivery: true,
                plannedQuantity: true,
              },
            },
            attachments: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;

    return factories.map((factory) => {
      let stages = factory.stages;

      // Filter stages by sent/created date if date range provided
      if (fromDate || toDate) {
        stages = stages.filter((st) => {
          const date = st.sentToFactoryAt || st.createdAt;
          if (fromDate && date < fromDate) return false;
          if (toDate && date > toDate) return false;
          return true;
        });
      }

      const assignedStagesCount = stages.length;
      const orderIds = new Set(stages.map((s) => s.orderId).filter(Boolean));
      const assignedOrdersCount = orderIds.size;

      const completedStages = stages.filter((s) => s.factoryCompletedAt || s.status === 'COMPLETED');
      const completedStagesCount = completedStages.length;
      const inProgressStagesCount = stages.filter(
        (s) => s.status === 'IN_PROGRESS' || (s.sentToFactoryAt && !s.factoryCompletedAt)
      ).length;

      let onTimeCount = 0;
      let lateCount = 0;
      let totalExecutionDays = 0;
      let stagesWithCycleTime = 0;

      for (const st of completedStages) {
        // Cycle time in days
        if (st.sentToFactoryAt && st.factoryCompletedAt) {
          const diffMs = new Date(st.factoryCompletedAt).getTime() - new Date(st.sentToFactoryAt).getTime();
          const days = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
          totalExecutionDays += days;
          stagesWithCycleTime += 1;
        }

        // On-time evaluation vs order target date
        const targetDate = st.order?.dueDate || st.order?.expectedDelivery;
        if (targetDate) {
          if (new Date(st.factoryCompletedAt || st.completedAt) <= new Date(targetDate)) {
            onTimeCount += 1;
          } else {
            lateCount += 1;
          }
        } else {
          // If no target date, consider on-time
          onTimeCount += 1;
        }
      }

      // Check overdue in-progress stages
      const now = new Date();
      for (const st of stages) {
        if (!st.factoryCompletedAt && st.status !== 'COMPLETED') {
          const targetDate = st.order?.dueDate || st.order?.expectedDelivery;
          if (targetDate && now > new Date(targetDate)) {
            lateCount += 1;
          }
        }
      }

      const avgExecutionDays =
        stagesWithCycleTime > 0 ? round2(totalExecutionDays / stagesWithCycleTime) : 0;

      const totalLaborCost = stages.reduce(
        (sum, s) => sum + Number(s.stageLaborCost || 0),
        0
      );

      const attachmentsCount = stages.reduce(
        (sum, s) => sum + (s.attachments?.length || 0),
        0
      );

      const onTimeRate =
        assignedStagesCount > 0 ? round2((onTimeCount / assignedStagesCount) * 100) : 100;

      return {
        id: factory.id,
        name: factory.name,
        code: factory.code,
        specialty: factory.specialty,
        contactPerson: factory.contactPerson,
        phone: factory.phone,
        isActive: factory.isActive,
        assignedStagesCount,
        assignedOrdersCount,
        completedStagesCount,
        inProgressStagesCount,
        onTimeCount,
        lateCount,
        onTimeRate,
        avgExecutionDays,
        totalLaborCost: round2(totalLaborCost),
        attachmentsCount,
      };
    });
  }
}

module.exports = ManufacturingSubcontractService;
