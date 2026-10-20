const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

class ManufacturingFactoryAgreementService {
  /**
   * Runtime schema guard for Factory Agreements (Wave 7)
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "FactoryAgreementPricingMode" AS ENUM ('PER_PIECE', 'PER_STAGE', 'HOURLY', 'FIXED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "FactoryAgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "FactoryAgreementPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "factory_agreements" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "partnerFactoryId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "orderId" TEXT,
          "customerOrderId" TEXT,
          "pricingMode" "FactoryAgreementPricingMode" NOT NULL DEFAULT 'PER_PIECE',
          "totalValue" DECIMAL(12,2),
          "currency" TEXT NOT NULL DEFAULT 'EGP',
          "startDate" TIMESTAMP(3),
          "endDate" TIMESTAMP(3),
          "scopeOfOperations" TEXT,
          "productsDesc" TEXT,
          "quantitiesNotes" TEXT,
          "qualityTerms" TEXT,
          "materialOwnership" TEXT,
          "wastePolicy" TEXT,
          "deliveryTerms" TEXT,
          "reworkPolicy" TEXT,
          "notes" TEXT,
          "status" "FactoryAgreementStatus" NOT NULL DEFAULT 'DRAFT',
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "factory_agreements_companyId_code_key" ON "factory_agreements"("companyId", "code");
        CREATE INDEX IF NOT EXISTS "factory_agreements_companyId_partnerFactoryId_idx" ON "factory_agreements"("companyId", "partnerFactoryId");
        CREATE INDEX IF NOT EXISTS "factory_agreements_companyId_status_idx" ON "factory_agreements"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "factory_agreements_orderId_idx" ON "factory_agreements"("orderId");
        CREATE INDEX IF NOT EXISTS "factory_agreements_customerOrderId_idx" ON "factory_agreements"("customerOrderId");

        CREATE TABLE IF NOT EXISTS "factory_agreement_payments" (
          "id" TEXT PRIMARY KEY,
          "agreementId" TEXT NOT NULL REFERENCES "factory_agreements"("id") ON DELETE CASCADE,
          "seq" INTEGER NOT NULL,
          "label" TEXT NOT NULL,
          "percent" DECIMAL(5,2),
          "amount" DECIMAL(12,2) NOT NULL,
          "dueDate" TIMESTAMP(3),
          "status" "FactoryAgreementPaymentStatus" NOT NULL DEFAULT 'PENDING',
          "paidAt" TIMESTAMP(3),
          "paidById" TEXT,
          "reference" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "factory_agreement_payments_agreementId_idx" ON "factory_agreement_payments"("agreementId");
        CREATE INDEX IF NOT EXISTS "factory_agreement_payments_agreementId_seq_idx" ON "factory_agreement_payments"("agreementId", "seq");
        CREATE INDEX IF NOT EXISTS "factory_agreement_payments_status_idx" ON "factory_agreement_payments"("status");

        CREATE TABLE IF NOT EXISTS "factory_agreement_files" (
          "id" TEXT PRIMARY KEY,
          "agreementId" TEXT NOT NULL REFERENCES "factory_agreements"("id") ON DELETE CASCADE,
          "fileName" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "kind" TEXT NOT NULL DEFAULT 'DOCUMENT',
          "uploadedBy" TEXT,
          "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "factory_agreement_files_agreementId_idx" ON "factory_agreement_files"("agreementId");
      `);
    } catch (err) {
      console.warn('[ManufacturingFactoryAgreementService] ensureSchema note:', err.message);
    }
  }

  /**
   * Helper to format computed financial metrics for an agreement
   */
  static formatAgreementPayload(agreement) {
    if (!agreement) return null;
    const totalVal = Number(agreement.totalValue || 0);
    const payments = agreement.payments || [];

    const paidAmount = payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const pendingAmount = payments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const paidPercent =
      totalVal > 0 ? Math.min(100, Math.round((paidAmount / totalVal) * 100)) : 0;

    const remainingAmount = Math.max(0, round2(totalVal - paidAmount));

    return {
      ...agreement,
      totalValue: round2(totalVal),
      paidAmount: round2(paidAmount),
      pendingAmount: round2(pendingAmount),
      paidPercent,
      remainingAmount,
    };
  }

  /**
   * Atomic sequence generator for Factory Agreements: FA-YYYY-0001
   */
  static async generateAgreementCode(companyId) {
    const prisma = getSharedPrismaClient();
    const year = new Date().getFullYear();
    const prefix = `FA-${year}-`;

    const lastAgreement = await prisma.factoryAgreement.findFirst({
      where: {
        companyId,
        code: { startsWith: prefix },
      },
      orderBy: { code: 'desc' },
    });

    let nextSeq = 1;
    if (lastAgreement && lastAgreement.code) {
      const match = lastAgreement.code.match(/FA-\d{4}-(\d+)/);
      if (match && match[1]) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * List factory agreements with filters and metrics
   */
  static async listAgreements(companyId, filters = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const {
      partnerFactoryId,
      status,
      orderId,
      customerOrderId,
      pricingMode,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const where = { companyId };

    if (partnerFactoryId && partnerFactoryId !== 'ALL') {
      where.partnerFactoryId = partnerFactoryId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    if (customerOrderId) {
      where.customerOrderId = customerOrderId;
    }

    if (pricingMode && pricingMode !== 'ALL') {
      where.pricingMode = pricingMode;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { partnerFactory: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = Math.max(0, ((parseInt(page, 10) || 1) - 1) * take);

    const [total, agreements] = await Promise.all([
      prisma.factoryAgreement.count({ where }),
      prisma.factoryAgreement.findMany({
        where,
        include: {
          partnerFactory: {
            select: { id: true, name: true, code: true, phone: true, specialty: true },
          },
          order: {
            select: { id: true, orderNumber: true, status: true, plannedQuantity: true },
          },
          customerOrder: {
            select: { id: true, orderNumber: true, brandName: true, status: true },
          },
          payments: {
            orderBy: { seq: 'asc' },
          },
          files: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const formatted = agreements.map((agr) => this.formatAgreementPayload(agr));

    // Summary metrics
    const allAgreements = await prisma.factoryAgreement.findMany({
      where: { companyId },
      include: {
        payments: true,
      },
    });

    const totalAgreementsCount = allAgreements.length;
    const activeAgreementsCount = allAgreements.filter((a) => a.status === 'ACTIVE').length;
    const totalAgreementsValue = allAgreements.reduce(
      (sum, a) => sum + Number(a.totalValue || 0),
      0
    );
    const totalPaidAmount = allAgreements.reduce((sum, a) => {
      const pSum = (a.payments || [])
        .filter((p) => p.status === 'PAID')
        .reduce((pAcc, p) => pAcc + Number(p.amount || 0), 0);
      return sum + pSum;
    }, 0);

    return {
      success: true,
      data: formatted,
      pagination: {
        total,
        page: parseInt(page, 10) || 1,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
      metrics: {
        totalCount: totalAgreementsCount,
        activeCount: activeAgreementsCount,
        totalValue: round2(totalAgreementsValue),
        totalPaid: round2(totalPaidAmount),
      },
    };
  }

  /**
   * Get single factory agreement by ID
   */
  static async getAgreementById(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
      include: {
        partnerFactory: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            plannedQuantity: true,
            unit: true,
            brandName: true,
          },
        },
        customerOrder: {
          select: {
            id: true,
            orderNumber: true,
            brandName: true,
            status: true,
          },
        },
        payments: {
          orderBy: { seq: 'asc' },
        },
        files: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    return this.formatAgreementPayload(agreement);
  }

  /**
   * Create a new factory agreement
   */
  static async createAgreement(companyId, user, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const partnerFactoryId = String(data.partnerFactoryId || '').trim();
    if (!partnerFactoryId) {
      const err = new Error('المصنع الشريك مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const factory = await prisma.partnerFactory.findFirst({
      where: { id: partnerFactoryId, companyId },
    });
    if (!factory) {
      const err = new Error('المصنع الشريك المحدد غير موجود أو غير تابع للشركة');
      err.statusCode = 400;
      throw err;
    }

    const title = String(data.title || '').trim();
    if (!title) {
      const err = new Error('عنوان الاتفاقية مطلوب');
      err.statusCode = 400;
      throw err;
    }

    let code = String(data.code || '').trim();
    if (!code) {
      code = await this.generateAgreementCode(companyId);
    } else {
      const existing = await prisma.factoryAgreement.findFirst({
        where: { companyId, code },
      });
      if (existing) {
        const err = new Error(`كود الاتفاقية (${code}) مسجل بالفعل بالشركة`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Optional linkages
    let orderId = data.orderId ? String(data.orderId).trim() : null;
    if (orderId) {
      const ord = await prisma.productionOrder.findFirst({
        where: { id: orderId, companyId },
      });
      if (!ord) {
        const err = new Error('أمر التشغيل المرتبط غير موجود');
        err.statusCode = 400;
        throw err;
      }
    }

    let customerOrderId = data.customerOrderId ? String(data.customerOrderId).trim() : null;
    if (customerOrderId) {
      const co = await prisma.customerOrder.findFirst({
        where: { id: customerOrderId, companyId },
      });
      if (!co) {
        const err = new Error('أمر العميل المرتبط غير موجود');
        err.statusCode = 400;
        throw err;
      }
    }

    const pricingMode = ['PER_PIECE', 'PER_STAGE', 'HOURLY', 'FIXED'].includes(data.pricingMode)
      ? data.pricingMode
      : 'PER_PIECE';

    const totalValue = data.totalValue !== undefined && data.totalValue !== null
      ? Math.max(0, round2(data.totalValue))
      : null;

    const agreement = await prisma.factoryAgreement.create({
      data: {
        companyId,
        partnerFactoryId,
        code,
        title,
        orderId,
        customerOrderId,
        pricingMode,
        totalValue,
        currency: data.currency ? String(data.currency).trim().toUpperCase() : 'EGP',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        scopeOfOperations: data.scopeOfOperations || null,
        productsDesc: data.productsDesc || null,
        quantitiesNotes: data.quantitiesNotes || null,
        qualityTerms: data.qualityTerms || null,
        materialOwnership: data.materialOwnership || null,
        wastePolicy: data.wastePolicy || null,
        deliveryTerms: data.deliveryTerms || null,
        reworkPolicy: data.reworkPolicy || null,
        notes: data.notes || null,
        status: 'DRAFT',
        createdById: user?.id || null,
      },
      include: {
        partnerFactory: true,
        order: true,
        customerOrder: true,
        payments: true,
        files: true,
      },
    });

    return this.formatAgreementPayload(agreement);
  }

  /**
   * Update factory agreement (Structural changes restricted to DRAFT)
   */
  static async updateAgreement(companyId, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    // Only DRAFT agreements can have structural fields modified
    if (agreement.status !== 'DRAFT') {
      const err = new Error('لا يمكن تعديل بنود أو تفاصيل الاتفاقية إلا في حالة المسودة (DRAFT)');
      err.statusCode = 400;
      throw err;
    }

    const updateData = {};

    if (data.title !== undefined) {
      const title = String(data.title || '').trim();
      if (!title) {
        const err = new Error('عنوان الاتفاقية لا يمكن أن يكون فارغاً');
        err.statusCode = 400;
        throw err;
      }
      updateData.title = title;
    }

    if (data.pricingMode !== undefined) {
      if (!['PER_PIECE', 'PER_STAGE', 'HOURLY', 'FIXED'].includes(data.pricingMode)) {
        const err = new Error('نوع التسعير غير صالح');
        err.statusCode = 400;
        throw err;
      }
      updateData.pricingMode = data.pricingMode;
    }

    if (data.totalValue !== undefined) {
      updateData.totalValue = data.totalValue !== null ? Math.max(0, round2(data.totalValue)) : null;
    }

    if (data.currency !== undefined) {
      updateData.currency = String(data.currency || 'EGP').trim().toUpperCase();
    }

    if (data.partnerFactoryId !== undefined) {
      const factory = await prisma.partnerFactory.findFirst({
        where: { id: data.partnerFactoryId, companyId },
      });
      if (!factory) {
        const err = new Error('المصنع الشريك غير موجود');
        err.statusCode = 400;
        throw err;
      }
      updateData.partnerFactoryId = data.partnerFactoryId;
    }

    if (data.orderId !== undefined) {
      if (data.orderId) {
        const ord = await prisma.productionOrder.findFirst({
          where: { id: data.orderId, companyId },
        });
        if (!ord) {
          const err = new Error('أمر التشغيل المرتبط غير موجود');
          err.statusCode = 400;
          throw err;
        }
        updateData.orderId = data.orderId;
      } else {
        updateData.orderId = null;
      }
    }

    if (data.customerOrderId !== undefined) {
      if (data.customerOrderId) {
        const co = await prisma.customerOrder.findFirst({
          where: { id: data.customerOrderId, companyId },
        });
        if (!co) {
          const err = new Error('أمر العميل المرتبط غير موجود');
          err.statusCode = 400;
          throw err;
        }
        updateData.customerOrderId = data.customerOrderId;
      } else {
        updateData.customerOrderId = null;
      }
    }

    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    // 10 Terms
    if (data.scopeOfOperations !== undefined) updateData.scopeOfOperations = data.scopeOfOperations || null;
    if (data.productsDesc !== undefined) updateData.productsDesc = data.productsDesc || null;
    if (data.quantitiesNotes !== undefined) updateData.quantitiesNotes = data.quantitiesNotes || null;
    if (data.qualityTerms !== undefined) updateData.qualityTerms = data.qualityTerms || null;
    if (data.materialOwnership !== undefined) updateData.materialOwnership = data.materialOwnership || null;
    if (data.wastePolicy !== undefined) updateData.wastePolicy = data.wastePolicy || null;
    if (data.deliveryTerms !== undefined) updateData.deliveryTerms = data.deliveryTerms || null;
    if (data.reworkPolicy !== undefined) updateData.reworkPolicy = data.reworkPolicy || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    const updated = await prisma.factoryAgreement.update({
      where: { id },
      data: updateData,
      include: {
        partnerFactory: true,
        order: true,
        customerOrder: true,
        payments: true,
        files: true,
      },
    });

    return this.formatAgreementPayload(updated);
  }

  /**
   * Activate agreement (Mandatory: totalValue > 0)
   */
  static async activateAgreement(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    if (agreement.status !== 'DRAFT') {
      const err = new Error(`لا يمكن تفعيل الاتفاقية لأنها في حالة (${agreement.status})، والتفعيل متاح للمسودات فقط`);
      err.statusCode = 400;
      throw err;
    }

    const totalVal = Number(agreement.totalValue || 0);
    if (totalVal <= 0) {
      const err = new Error('يجب تحديد قيمة إجمالية صالحة أكبر من الصفر لتفعيل الاتفاقية');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.factoryAgreement.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: {
        partnerFactory: true,
        order: true,
        customerOrder: true,
        payments: true,
        files: true,
      },
    });

    return this.formatAgreementPayload(updated);
  }

  /**
   * Close agreement
   */
  static async closeAgreement(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.factoryAgreement.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: {
        partnerFactory: true,
        order: true,
        customerOrder: true,
        payments: true,
        files: true,
      },
    });

    return this.formatAgreementPayload(updated);
  }

  /**
   * Cancel agreement
   */
  static async cancelAgreement(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const updated = await prisma.factoryAgreement.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        partnerFactory: true,
        order: true,
        customerOrder: true,
        payments: true,
        files: true,
      },
    });

    return this.formatAgreementPayload(updated);
  }

  /**
   * Delete agreement (Only DRAFT can be deleted)
   */
  static async deleteAgreement(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    if (agreement.status !== 'DRAFT') {
      const err = new Error('لا يمكن حذف الاتفاقية إلا في حالة المسودة (DRAFT)');
      err.statusCode = 400;
      throw err;
    }

    await prisma.factoryAgreement.delete({
      where: { id },
    });

    return { success: true, message: 'تم حذف الاتفاقية المسودة بنجاح' };
  }

  /**
   * Generate default payment schedule (70/20/10 default or custom schedule)
   */
  static async generateDefaultPayments(companyId, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
      include: { payments: true },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const totalVal = Number(agreement.totalValue || 0);
    if (totalVal <= 0) {
      const err = new Error('يجب تحديد قيمة إجمالية صالحة للاتفاقية أكبر من الصفر قبل توليد جدول الدفعات');
      err.statusCode = 400;
      throw err;
    }

    // Rule: Refuse if payments already exist (non-cancelled)
    const activePayments = (agreement.payments || []).filter((p) => p.status !== 'CANCELLED');
    if (activePayments.length > 0) {
      const err = new Error('لا يمكن توليد جدول دفعات تلقائي لوجود دفعات مسجلة بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const schedule =
      Array.isArray(data.schedule) && data.schedule.length > 0
        ? data.schedule
        : [
            { label: 'دفعة مقدمة (تعاقد)', percent: 70 },
            { label: 'دفعة أثناء الإنتاج (تشغيل)', percent: 20 },
            { label: 'دفعة تسوية نهائية (استلام)', percent: 10 },
          ];

    // Validate percentage sum
    const totalPercent = schedule.reduce((sum, item) => sum + Number(item.percent || 0), 0);
    if (totalPercent > 100) {
      const err = new Error(`مجموع نسب الدفعات (${totalPercent}%) لا يمكن أن يتجاوز 100%`);
      err.statusCode = 400;
      throw err;
    }

    // Generate payments sequentially
    const createdPayments = [];
    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      const percent = Number(item.percent || 0);
      const amount = round2(totalVal * (percent / 100));

      const payment = await prisma.factoryAgreementPayment.create({
        data: {
          agreementId: id,
          seq: i + 1,
          label: String(item.label || `دفعة رقم ${i + 1}`).trim(),
          percent,
          amount,
          status: 'PENDING',
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          notes: item.notes || null,
        },
      });
      createdPayments.push(payment);
    }

    const refreshed = await this.getAgreementById(companyId, id);
    return {
      success: true,
      message: `تم توليد جدول من ${createdPayments.length} دفعات بنجاح`,
      data: refreshed,
    };
  }

  /**
   * Add a single manual payment
   */
  static async createPayment(companyId, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
      include: { payments: true },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const amount = Number(data.amount || 0);
    if (amount <= 0) {
      const err = new Error('قيمة الدفعة يجب أن تكون أكبر من الصفر');
      err.statusCode = 400;
      throw err;
    }

    const totalVal = Number(agreement.totalValue || 0);
    const existingPayments = agreement.payments || [];
    const activeAmount = existingPayments
      .filter((p) => p.status !== 'CANCELLED')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    if (totalVal > 0 && round2(activeAmount + amount) > totalVal) {
      const remaining = Math.max(0, round2(totalVal - activeAmount));
      const err = new Error(
        `قيمة الدفعة (${amount} ج.م) تتجاوز المبلغ المتبقي من قيمة الاتفاقية (${remaining} ج.م)`
      );
      err.statusCode = 400;
      throw err;
    }

    const label = String(data.label || '').trim() || `دفعة ${existingPayments.length + 1}`;
    const nextSeq = existingPayments.length > 0
      ? Math.max(...existingPayments.map((p) => p.seq || 0)) + 1
      : 1;

    const percent = totalVal > 0 ? round2((amount / totalVal) * 100) : null;

    const payment = await prisma.factoryAgreementPayment.create({
      data: {
        agreementId: id,
        seq: nextSeq,
        label,
        percent,
        amount: round2(amount),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: 'PENDING',
        notes: data.notes || null,
      },
    });

    const refreshed = await this.getAgreementById(companyId, id);
    return {
      success: true,
      data: payment,
      agreement: refreshed,
    };
  }

  /**
   * Mark payment as PAID
   */
  static async payPayment(companyId, id, paymentId, data = {}, user) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const payment = await prisma.factoryAgreementPayment.findFirst({
      where: { id: paymentId, agreementId: id },
    });
    if (!payment) {
      const err = new Error('الدفعة المحددة غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    if (payment.status === 'PAID') {
      const err = new Error('تم سداد هذه الدفعة مسبقاً');
      err.statusCode = 400;
      throw err;
    }

    if (payment.status === 'CANCELLED') {
      const err = new Error('لا يمكن سداد دفعة ملغاة');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.factoryAgreementPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        paidById: user?.id || null,
        reference: data.reference ? String(data.reference).trim() : null,
        notes: data.notes ? String(data.notes).trim() : payment.notes,
      },
    });

    const refreshed = await this.getAgreementById(companyId, id);
    return {
      success: true,
      data: updated,
      agreement: refreshed,
    };
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(companyId, id, paymentId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const payment = await prisma.factoryAgreementPayment.findFirst({
      where: { id: paymentId, agreementId: id },
    });
    if (!payment) {
      const err = new Error('الدفعة المحددة غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    if (payment.status === 'PAID') {
      const err = new Error('لا يمكن إلغاء دفعة مسددة بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.factoryAgreementPayment.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED' },
    });

    const refreshed = await this.getAgreementById(companyId, id);
    return {
      success: true,
      data: updated,
      agreement: refreshed,
    };
  }

  /**
   * Upload and attach file to agreement
   */
  static async addFile(companyId, id, fileInfo, user) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const file = await prisma.factoryAgreementFile.create({
      data: {
        agreementId: id,
        fileName: fileInfo.fileName || fileInfo.originalname || 'مستند اتفاقية',
        url: fileInfo.url || `/uploads/manufacturing/${fileInfo.filename}`,
        kind: fileInfo.kind || 'DOCUMENT',
        uploadedBy: user?.name || user?.email || user?.id || null,
      },
    });

    return {
      success: true,
      data: file,
    };
  }

  /**
   * Delete attached file
   */
  static async deleteFile(companyId, id, fileId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const agreement = await prisma.factoryAgreement.findFirst({
      where: { id, companyId },
    });
    if (!agreement) {
      const err = new Error('اتفاقية المصنع غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const file = await prisma.factoryAgreementFile.findFirst({
      where: { id: fileId, agreementId: id },
    });
    if (!file) {
      const err = new Error('الملف غير موجود');
      err.statusCode = 404;
      throw err;
    }

    await prisma.factoryAgreementFile.delete({
      where: { id: fileId },
    });

    return {
      success: true,
      message: 'تم حذف الملف بنجاح',
    };
  }
}

module.exports = ManufacturingFactoryAgreementService;
