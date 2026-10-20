/**
 * Factory Portal & Attachment Review Service (Wave 3)
 *
 * Implements:
 * 1. Token-authenticated Factory Portal (zero platform login required).
 * 2. Secure Portal Link lifecycle (generation, rotation, enable/disable toggle, revocation).
 * 3. Strict Whitelist Sanitization: ZERO leak of customer sale price, HUINZO profit/margin, or internal costs.
 * 4. Factory Stage Lifecycle (confirm receipt -> start -> update quantities -> media upload -> request approval -> report issues).
 * 5. Management Review System (under review, approve, reject with mandatory reason, publish to customer, hide).
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

// Prohibited internal financial and pricing fields that MUST NEVER leak into factory portal responses
const PROHIBITED_FIELDS = new Set([
  'salePricePerUnit',
  'unitPrice',
  'totalPrice',
  'customerOrderPayment',
  'customerOrders',
  'customerOrder',
  'customerOrderId',
  'payments',
  'payment',
  'profit',
  'margin',
  'profitMargin',
  'actualMaterialCost',
  'actualLaborCost',
  'actualOverheadCost',
  'totalCost',
  'unitCost',
  'defaultOverheadRatePerPiece',
  'wasteMarginPercent',
  'overheadCostPerUnit',
  'laborCostPerUnit',
  'wipAccountId',
  'rawMaterialsAccountId',
  'accruedWagesAccountId',
  'overheadAppliedAccountId',
  'finishedGoodsAccountId',
]);

class FactoryPortalService {
  /**
   * Runtime schema guard
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "AttachmentReviewStatus" AS ENUM ('UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'HIDDEN');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        ALTER TABLE "partner_factories" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
        ALTER TABLE "partner_factories" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE "partner_factories" ADD COLUMN IF NOT EXISTS "portalLastAccessAt" TIMESTAMP(3);
        CREATE UNIQUE INDEX IF NOT EXISTS "partner_factories_accessToken_key" ON "partner_factories"("accessToken");

        ALTER TABLE "manufacturing_attachments" ADD COLUMN IF NOT EXISTS "reviewStatus" "AttachmentReviewStatus" NOT NULL DEFAULT 'UNDER_REVIEW';
        ALTER TABLE "manufacturing_attachments" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
        ALTER TABLE "manufacturing_attachments" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
        ALTER TABLE "manufacturing_attachments" ADD COLUMN IF NOT EXISTS "rejectReason" TEXT;
        ALTER TABLE "manufacturing_attachments" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
        ALTER TABLE "manufacturing_attachments" ADD COLUMN IF NOT EXISTS "publishedBy" TEXT;
        ALTER TABLE "manufacturing_attachments" ADD COLUMN IF NOT EXISTS "partnerFactoryId" TEXT;
        CREATE INDEX IF NOT EXISTS "manufacturing_attachments_companyId_reviewStatus_idx" ON "manufacturing_attachments"("companyId", "reviewStatus");
        CREATE INDEX IF NOT EXISTS "manufacturing_attachments_partnerFactoryId_idx" ON "manufacturing_attachments"("partnerFactoryId");
      `);
    } catch (err) {
      console.warn('[FactoryPortalService] ensureSchema note:', err.message);
    }
  }

  /**
   * Strict recursive field security audit
   * Throws an error immediately if any prohibited field is present in any object/array.
   */
  static auditSanitizedPayload(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => this.auditSanitizedPayload(item, `${path}[${idx}]`));
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (PROHIBITED_FIELDS.has(key)) {
        throw new Error(`[SECURITY VIOLATION] Prohibited sensitive field "${key}" detected at path "${path}.${key}" in Factory Portal payload.`);
      }
      if (value && typeof value === 'object') {
        this.auditSanitizedPayload(value, `${path}.${key}`);
      }
    }
  }

  // ==========================================================================
  // 1. Portal Token Authentication & Lifecycle
  // ==========================================================================

  /**
   * Verify token for incoming Factory Portal requests
   */
  static async verifyToken(token) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      const err = new Error('رمز الدخول لبوابة المصنع مطلوب');
      err.statusCode = 403;
      throw err;
    }

    const factory = await prisma.partnerFactory.findFirst({
      where: { accessToken: cleanToken },
    });

    if (!factory) {
      const err = new Error('رابط البوابة غير صالح أو انتهت صلاحيته');
      err.statusCode = 403;
      throw err;
    }

    if (!factory.isActive || !factory.portalEnabled) {
      const err = new Error('تم تعطيل أو إيقاف بوابة هذا المصنع الشريك حالياً');
      err.statusCode = 403;
      throw err;
    }

    // Update last access timestamp
    const now = new Date();
    try {
      await prisma.partnerFactory.update({
        where: { id: factory.id },
        data: { portalLastAccessAt: now },
      });
      factory.portalLastAccessAt = now;
    } catch (_) {
      // Ignore background timestamp update errors
    }

    return factory;
  }

  /**
   * Generate or rotate portal token for a factory (Management Action)
   */
  static async generatePortalLink(companyId, factoryId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const factory = await prisma.partnerFactory.findFirst({
      where: { id: factoryId, companyId },
    });
    if (!factory) {
      const err = new Error('المصنع الشريك غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // Generate high-entropy 48-char hex token
    const token = crypto.randomBytes(24).toString('hex');

    const updated = await prisma.partnerFactory.update({
      where: { id: factoryId },
      data: {
        accessToken: token,
        portalEnabled: true,
      },
    });

    return {
      success: true,
      accessToken: updated.accessToken,
      portalEnabled: updated.portalEnabled,
      portalUrl: `/factory-portal?token=${updated.accessToken}`,
      message: 'تم توليد رابط بوابة المصنع بنجاح',
    };
  }

  /**
   * Toggle portal link enabled state (Management Action)
   */
  static async togglePortalLink(companyId, factoryId, { portalEnabled }) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const factory = await prisma.partnerFactory.findFirst({
      where: { id: factoryId, companyId },
    });
    if (!factory) {
      const err = new Error('المصنع الشريك غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const isEnabled = Boolean(portalEnabled);

    // If enabling but no token exists yet, generate one
    let accessToken = factory.accessToken;
    if (isEnabled && !accessToken) {
      accessToken = crypto.randomBytes(24).toString('hex');
    }

    const updated = await prisma.partnerFactory.update({
      where: { id: factoryId },
      data: {
        portalEnabled: isEnabled,
        ...(accessToken ? { accessToken } : {}),
      },
    });

    return {
      success: true,
      portalEnabled: updated.portalEnabled,
      accessToken: updated.accessToken,
      portalUrl: updated.accessToken ? `/factory-portal?token=${updated.accessToken}` : null,
      message: isEnabled ? 'تم تفعيل بوابة المصنع' : 'تم إيقاف بوابة المصنع',
    };
  }

  /**
   * Revoke portal link (Management Action)
   */
  static async revokePortalLink(companyId, factoryId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const factory = await prisma.partnerFactory.findFirst({
      where: { id: factoryId, companyId },
    });
    if (!factory) {
      const err = new Error('المصنع الشريك غير موجود');
      err.statusCode = 404;
      throw err;
    }

    await prisma.partnerFactory.update({
      where: { id: factoryId },
      data: {
        accessToken: null,
        portalEnabled: false,
      },
    });

    return {
      success: true,
      portalEnabled: false,
      message: 'تم إلغاء رابط بوابة المصنع بنجاح',
    };
  }

  // ==========================================================================
  // 2. Factory Portal Public Read Endpoints
  // ==========================================================================

  /**
   * Public portal context (only factory's own basic info)
   */
  static async getContext(factory) {
    const payload = {
      id: factory.id,
      name: factory.name,
      code: factory.code || null,
      specialty: factory.specialty || null,
      contactPerson: factory.contactPerson || null,
      phone: factory.phone || null,
      email: factory.email || null,
      address: factory.address || null,
      portalEnabled: Boolean(factory.portalEnabled),
      portalLastAccessAt: factory.portalLastAccessAt || null,
    };

    this.auditSanitizedPayload(payload, 'context');
    return payload;
  }

  /**
   * List assignments (EXTERNAL production stages assigned to this factory)
   * Strictly sanitized with 0 sensitive customer/internal pricing fields.
   */
  static async getAssignments(factory) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const stages = await prisma.productionStage.findMany({
      where: {
        partnerFactoryId: factory.id,
        executionEntity: 'EXTERNAL',
      },
      include: {
        order: {
          include: {
            materialIssues: {
              where: { status: 'ISSUED' },
              include: {
                items: true,
              },
            },
            variants: true,
            attachments: {
              where: {
                reviewStatus: { in: ['APPROVED', 'PUBLISHED'] },
              },
            },
            bom: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const ManufacturingTechPackService = require('./manufacturingTechPackService');

    const sanitizedAssignments = await Promise.all(
      stages.map(async (st) => {
        const ord = st.order || {};

      // Aggregate delivered materials across issued vouchers (strictly no unitCost or totalCost)
      const deliveredMaterialsMap = new Map();
      const materialIssues = ord.materialIssues || [];
      for (const issue of materialIssues) {
        for (const it of issue.items || []) {
          const key = `${it.rawMaterialName || it.rawMaterialId}_${it.unit}`;
          if (!deliveredMaterialsMap.has(key)) {
            deliveredMaterialsMap.set(key, {
              rawMaterialName: it.rawMaterialName || 'خامة إنتاج',
              quantity: 0,
              unit: it.unit || 'PIECE',
              batchNumber: it.batchNumber || null,
              notes: it.notes || null,
            });
          }
          const existing = deliveredMaterialsMap.get(key);
          existing.quantity = round2(existing.quantity + Number(it.quantity || 0));
        }
      }
      const deliveredMaterials = Array.from(deliveredMaterialsMap.values());

      // Filter attachments: visible to factory if uploaded by this factory or approved/published
      const allAttachments = st.attachments || [];
      const visibleAttachments = allAttachments
        .filter(
          (att) =>
            att.partnerFactoryId === factory.id ||
            att.reviewStatus === 'APPROVED' ||
            att.reviewStatus === 'PUBLISHED'
        )
        .map((att) => ({
          id: att.id,
          url: att.url,
          kind: att.kind,
          caption: att.caption || null,
          reviewStatus: att.reviewStatus || 'UNDER_REVIEW',
          rejectReason: att.rejectReason || null,
          createdAt: att.createdAt,
        }));

      // Variant matrix for this order
      const variantMatrix = (ord.variants || []).map((vm) => ({
        size: vm.size || null,
        color: vm.color || null,
        sku: vm.sku || null,
        plannedQuantity: Number(vm.plannedQuantity || 0),
      }));

      // Partner agreed cost calculation
      const ratePerPiece = Number(st.ratePerPiece || 0);
      const completedQty = Number(st.completedQuantity || 0);
      const plannedQty = Number(ord.plannedQuantity || 0);
      const partnerAgreedCost =
        Number(st.stageLaborCost) > 0
          ? Number(st.stageLaborCost)
          : round2(plannedQty * ratePerPiece);

      const approvedTechPack = await ManufacturingTechPackService.getApprovedTechPackForOrder(
        factory.companyId,
        ord
      );

      return {
        id: st.id,
        name: st.name,
        stageType: st.stageType,
        sequence: st.sequence,
        status: st.status,
        completedQuantity: completedQty,
        startedAt: st.startedAt || null,
        completedAt: st.completedAt || null,
        sentToFactoryAt: st.sentToFactoryAt || null,
        factoryAckReceiptAt: st.factoryAckReceiptAt || null,
        factoryCompletedAt: st.factoryCompletedAt || null,
        factoryNotes: st.factoryNotes || null,
        order: {
          id: ord.id,
          orderNumber: ord.orderNumber,
          brandName: ord.brandName || null,
          dueDate: ord.dueDate || null,
          expectedDelivery: ord.expectedDelivery || null,
          plannedQuantity: plannedQty,
          unit: ord.unit || 'قطعة',
          notes: ord.notes || null,
          productModel: ord.bom?.name || ord.brandName || 'موديل ملابس',
          variantMatrix,
        },
        deliveredMaterials,
        agreement: {
          ratePerPiece,
          partnerAgreedCost: round2(partnerAgreedCost),
          currency: 'EGP',
        },
        attachments: visibleAttachments,
        techPack: approvedTechPack,
        sizeChart: await ManufacturingTechPackService.getApprovedSizeChartForOrder(
          factory.companyId,
          ord,
          approvedTechPack && approvedTechPack.id
        ),
      };
    })
  );

    // Run strict security audit on the entire payload before returning
    this.auditSanitizedPayload(sanitizedAssignments, 'assignments');

    return sanitizedAssignments;
  }

  // ==========================================================================
  // 3. Sequential Factory Portal Lifecycle Actions
  // ==========================================================================

  /**
   * Helper: Retrieve and validate external stage for this factory
   */
  static async getStageForFactory(factoryId, stageId) {
    const prisma = getSharedPrismaClient();
    const stage = await prisma.productionStage.findFirst({
      where: {
        id: stageId,
        partnerFactoryId: factoryId,
        executionEntity: 'EXTERNAL',
      },
      include: {
        order: true,
      },
    });

    if (!stage) {
      const err = new Error('مرحلة التشغيل غير موجودة أو ليست مسندة لهذا المصنع');
      err.statusCode = 404;
      throw err;
    }

    return stage;
  }

  /**
   * Action 1: Confirm Receipt (تأكيد استلام الخامات والتشغيل بالمصنع)
   * Enforces sequence: stage must have sentToFactoryAt != null.
   */
  static async confirmReceipt(factory, stageId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const stage = await this.getStageForFactory(factory.id, stageId);

    if (!stage.sentToFactoryAt) {
      const err = new Error('لا يمكن تأكيد الاستلام قبل إرسال أمر التشغيل من إدارة المصنع أولاً (SENT)');
      err.statusCode = 400;
      throw err;
    }

    const eventTime = data.at ? new Date(data.at) : new Date();
    const noteText = data.notes?.trim() || 'تم تأكيد استلام الخامات وبدء التجهيز';

    const updatedNotes = stage.factoryNotes
      ? `${stage.factoryNotes}\n[ACK_RECEIPT ${eventTime.toISOString().slice(0, 10)}] ${noteText}`
      : `[ACK_RECEIPT ${eventTime.toISOString().slice(0, 10)}] ${noteText}`;

    const updateData = {
      factoryAckReceiptAt: eventTime,
      factoryNotes: updatedNotes,
    };

    if (stage.status === 'PENDING') {
      updateData.status = 'IN_PROGRESS';
      updateData.startedAt = stage.startedAt || eventTime;
    }

    const updated = await prisma.productionStage.update({
      where: { id: stageId },
      data: updateData,
    });

    return {
      success: true,
      message: 'تم تأكيد استلام أمر التشغيل والخامات بنجاح',
      stageId: updated.id,
      factoryAckReceiptAt: updated.factoryAckReceiptAt,
      status: updated.status,
    };
  }

  /**
   * Action 2: Start Stage Execution (بدء التشغيل الفعلي)
   * Enforces sequence: stage must be confirmed as received (ACK_RECEIPT) first.
   */
  static async startStage(factory, stageId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const stage = await this.getStageForFactory(factory.id, stageId);

    if (!stage.factoryAckReceiptAt) {
      const err = new Error('يجب تأكيد استلام الخامات أولاً قبل بدء مرحلة التشغيل (ACK_RECEIPT)');
      err.statusCode = 400;
      throw err;
    }

    const eventTime = data.at ? new Date(data.at) : new Date();
    const noteText = data.notes?.trim() || 'تم بدء خطوط التشغيل والتنفيذ';

    const updatedNotes = stage.factoryNotes
      ? `${stage.factoryNotes}\n[START ${eventTime.toISOString().slice(0, 10)}] ${noteText}`
      : `[START ${eventTime.toISOString().slice(0, 10)}] ${noteText}`;

    const updated = await prisma.productionStage.update({
      where: { id: stageId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: stage.startedAt || eventTime,
        factoryNotes: updatedNotes,
      },
    });

    return {
      success: true,
      message: 'تم تسجيل بدء مرحلة التشغيل بنجاح',
      stageId: updated.id,
      startedAt: updated.startedAt,
      status: updated.status,
    };
  }

  /**
   * Action 3: Update Executed Quantities & Progress (تحديث الكميات المنفذة والتالفة)
   */
  static async updateStage(factory, stageId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const stage = await this.getStageForFactory(factory.id, stageId);

    if (!stage.factoryAckReceiptAt) {
      const err = new Error('لا يمكن تحديث الكميات قبل تأكيد استلام المرحلة أولاً');
      err.statusCode = 400;
      throw err;
    }

    const completedQuantity =
      data.completedQuantity !== undefined
        ? Math.max(0, Number(data.completedQuantity) || 0)
        : Number(stage.completedQuantity || 0);

    const scrapQuantity = Number(data.scrapQuantity || 0);
    const reworkQuantity = Number(data.reworkQuantity || 0);
    const notes = data.notes?.trim() || '';

    const ratePerPiece = Number(stage.ratePerPiece || 0);
    const stageLaborCost = round2(completedQuantity * ratePerPiece);

    const eventTime = new Date();
    let noteLog = `[UPDATE ${eventTime.toISOString().slice(0, 10)}] كمية منفذة: ${completedQuantity}`;
    if (scrapQuantity > 0) noteLog += ` · تالف: ${scrapQuantity}`;
    if (reworkQuantity > 0) noteLog += ` · إعادة عمل: ${reworkQuantity}`;
    if (notes) noteLog += ` (${notes})`;

    const updatedNotes = stage.factoryNotes
      ? `${stage.factoryNotes}\n${noteLog}`
      : noteLog;

    const updated = await prisma.productionStage.update({
      where: { id: stageId },
      data: {
        completedQuantity,
        stageLaborCost,
        factoryNotes: updatedNotes,
      },
    });

    return {
      success: true,
      message: 'تم تحديث كميات التشغيل بنجاح',
      stageId: updated.id,
      completedQuantity: updated.completedQuantity,
      stageLaborCost: updated.stageLaborCost,
    };
  }

  /**
   * Action 4: Upload Media / Photos (رفع صور وفيديوهات المرحلة)
   * Files automatically enter UNDER_REVIEW status and require management approval.
   */
  static async uploadMedia(factory, stageId, fileData) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const stage = await this.getStageForFactory(factory.id, stageId);

    const url = String(fileData.url || '').trim();
    if (!url) {
      const err = new Error('رابط الملف المرفوع مطلوب');
      err.statusCode = 400;
      throw err;
    }

    let kind = String(fileData.kind || '').toUpperCase();
    if (!['IMAGE', 'VIDEO', 'DOC'].includes(kind)) {
      const lower = url.toLowerCase();
      if (lower.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/)) {
        kind = 'IMAGE';
      } else if (lower.match(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/)) {
        kind = 'VIDEO';
      } else {
        kind = 'DOC';
      }
    }

    const attachment = await prisma.manufacturingAttachment.create({
      data: {
        companyId: factory.companyId,
        orderId: stage.orderId,
        stageId: stage.id,
        partnerFactoryId: factory.id,
        url,
        kind,
        caption: fileData.caption?.trim() || null,
        reviewStatus: 'UNDER_REVIEW', // Mandatory: Enters Under Review automatically
      },
    });

    return {
      success: true,
      message: 'تم رفع المرفق بنجاح وهو الآن قيد مراجعة الإدارة',
      attachment: {
        id: attachment.id,
        url: attachment.url,
        kind: attachment.kind,
        caption: attachment.caption,
        reviewStatus: attachment.reviewStatus,
        createdAt: attachment.createdAt,
      },
    };
  }

  /**
   * Action 5: Request Stage Approval (طلب اعتماد المرحلة من الإدارة)
   */
  static async requestApproval(factory, stageId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const stage = await this.getStageForFactory(factory.id, stageId);

    if (!stage.factoryAckReceiptAt) {
      const err = new Error('لا يمكن طلب الاعتماد قبل استلام وبدء تنفيذ المرحلة');
      err.statusCode = 400;
      throw err;
    }

    const eventTime = new Date();
    const notes = data.notes?.trim() || 'المصنع يطلب اعتماد المرحلة وإغلاق التشغيل';

    const noteLog = `[APPROVAL_REQUEST ${eventTime.toISOString().slice(0, 10)}] ${notes}`;
    const updatedNotes = stage.factoryNotes
      ? `${stage.factoryNotes}\n${noteLog}`
      : noteLog;

    const updated = await prisma.productionStage.update({
      where: { id: stageId },
      data: {
        factoryNotes: updatedNotes,
      },
    });

    return {
      success: true,
      message: 'تم إرسال طلب الاعتماد بنجاح إلى إدارة التصنيع للمراجعة',
      stageId: updated.id,
    };
  }

  /**
   * Action 6: Report Issue or Blocker (تسجيل مشكلة أو ملاحظة من المصنع)
   */
  static async reportIssue(factory, stageId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const stage = await this.getStageForFactory(factory.id, stageId);

    const issueText = String(data.issue || data.notes || '').trim();
    if (!issueText) {
      const err = new Error('تفاصيل الملاحظة أو العائق مطلوبة');
      err.statusCode = 400;
      throw err;
    }

    const eventTime = new Date();
    const noteLog = `[FACTORY_ISSUE ${eventTime.toISOString().slice(0, 10)}] ${issueText}`;
    const updatedNotes = stage.factoryNotes
      ? `${stage.factoryNotes}\n${noteLog}`
      : noteLog;

    const updated = await prisma.productionStage.update({
      where: { id: stageId },
      data: {
        factoryNotes: updatedNotes,
      },
    });

    return {
      success: true,
      message: 'تم تسجيل الملاحظة بنجاح وسيتم إشعار إدارة الإنتاج',
      stageId: updated.id,
    };
  }

  // ==========================================================================
  // 4. Management Review & Approval System (Platform Admin)
  // ==========================================================================

  /**
   * List attachments across manufacturing orders for management review
   */
  static async listReviews(companyId, filters = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const where = { companyId };

    if (filters.reviewStatus && filters.reviewStatus !== 'ALL') {
      where.reviewStatus = filters.reviewStatus;
    }

    if (filters.partnerFactoryId) {
      where.partnerFactoryId = filters.partnerFactoryId;
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
    }

    const attachments = await prisma.manufacturingAttachment.findMany({
      where,
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            sequence: true,
            status: true,
            sentToFactoryAt: true,
            factoryAckReceiptAt: true,
            factoryCompletedAt: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            brandName: true,
            plannedQuantity: true,
            status: true,
          },
        },
        partnerFactory: {
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count attachments currently under review for badge
    const underReviewCount = await prisma.manufacturingAttachment.count({
      where: {
        companyId,
        reviewStatus: 'UNDER_REVIEW',
      },
    });

    return {
      attachments,
      underReviewCount,
      totalCount: attachments.length,
    };
  }

  /**
   * Approve an attachment
   */
  static async approveAttachment(companyId, attachmentId, user) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const attachment = await prisma.manufacturingAttachment.findFirst({
      where: { id: attachmentId, companyId },
    });
    if (!attachment) {
      const err = new Error('المرفق غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.manufacturingAttachment.update({
      where: { id: attachmentId },
      data: {
        reviewStatus: 'APPROVED',
        reviewedBy: user?.name || user?.email || user?.id || 'المسؤول',
        reviewedAt: new Date(),
        rejectReason: null,
      },
    });

    return {
      success: true,
      message: 'تم اعتماد المرفق بنجاح',
      attachment: updated,
    };
  }

  /**
   * Reject an attachment (requires mandatory reason)
   */
  static async rejectAttachment(companyId, attachmentId, user, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const reason = String(data.reason || '').trim();
    if (!reason) {
      const err = new Error('سبب رفض المرفق إلزامي (مثلاً: صورة غير واضحة، تفاصيل خياطة غير مطابقة للمواصفات)');
      err.statusCode = 400;
      throw err;
    }

    const attachment = await prisma.manufacturingAttachment.findFirst({
      where: { id: attachmentId, companyId },
    });
    if (!attachment) {
      const err = new Error('المرفق غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.manufacturingAttachment.update({
      where: { id: attachmentId },
      data: {
        reviewStatus: 'REJECTED',
        rejectReason: reason,
        reviewedBy: user?.name || user?.email || user?.id || 'المسؤول',
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'تم تسجيل رفض المرفق وإخطار المصنع بسبب الرفض',
      attachment: updated,
    };
  }

  /**
   * Publish an attachment (makes it visible to customer / public)
   */
  static async publishAttachment(companyId, attachmentId, user) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const attachment = await prisma.manufacturingAttachment.findFirst({
      where: { id: attachmentId, companyId },
    });
    if (!attachment) {
      const err = new Error('المرفق غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.manufacturingAttachment.update({
      where: { id: attachmentId },
      data: {
        reviewStatus: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: user?.name || user?.email || user?.id || 'المسؤول',
        reviewedBy: attachment.reviewedBy || user?.name || user?.email || user?.id || 'المسؤول',
        reviewedAt: attachment.reviewedAt || new Date(),
      },
    });

    return {
      success: true,
      message: 'تم نشر المرفق بنجاح ليظهر في سجلات العميل',
      attachment: updated,
    };
  }

  /**
   * Hide / Revoke publication of an attachment
   */
  static async hideAttachment(companyId, attachmentId, user) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const attachment = await prisma.manufacturingAttachment.findFirst({
      where: { id: attachmentId, companyId },
    });
    if (!attachment) {
      const err = new Error('المرفق غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.manufacturingAttachment.update({
      where: { id: attachmentId },
      data: {
        reviewStatus: 'HIDDEN',
        reviewedBy: user?.name || user?.email || user?.id || 'المسؤول',
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'تم سحب وإخفاء المرفق بنجاح',
      attachment: updated,
    };
  }
}

module.exports = FactoryPortalService;
