/**
 * Customer Portal Service (Wave 8)
 *
 * Implements:
 * 1. Public token-authenticated Customer Portal (zero platform login required).
 * 2. Secure Portal Link lifecycle (generation, rotation, enable/disable toggle, revocation).
 * 3. Strict Whitelist Sanitization: ZERO leak of factory/partnerFactory names, internal costs,
 *    margins, suppliers, or other orders.
 * 4. Filtered content: ONLY PUBLISHED media updates, ONLY APPROVED tech packs & size charts,
 *    approved stage progress quantities and customer payment schedule (70/20/10).
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

// Prohibited internal fields and vendor/factory markers that MUST NEVER leak to the customer
const PROHIBITED_FIELDS = new Set([
  'factory',
  'partnerFactory',
  'partnerFactoryId',
  'factoryId',
  'supplier',
  'supplierId',
  'vendor',
  'vendorId',
  'contractor',
  'subcontractor',
  'unitCost',
  'totalCost',
  'actualCost',
  'actualMaterialCost',
  'actualLaborCost',
  'actualOverheadCost',
  'actualTotalCost',
  'overheadCostPerUnit',
  'laborCostPerUnit',
  'costPerUnit',
  'cost',
  'profit',
  'margin',
  'profitMargin',
  'markup',
  'purchasePrice',
  'wipAccountId',
  'rawMaterialsAccountId',
  'accruedWagesAccountId',
  'overheadAppliedAccountId',
  'finishedGoodsAccountId',
  'factoryAgreements',
  'factoryAgreement',
  'factoryAgreementId',
]);

class CustomerPortalService {
  /**
   * Runtime schema guard: ensures customer_orders has portal columns and unique index
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "portalToken" TEXT;
        ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE "customer_orders" ADD COLUMN IF NOT EXISTS "portalLastAccessAt" TIMESTAMP(3);
        CREATE UNIQUE INDEX IF NOT EXISTS "customer_orders_portalToken_key" ON "customer_orders"("portalToken");
        CREATE INDEX IF NOT EXISTS "customer_orders_portalToken_portalEnabled_idx" ON "customer_orders"("portalToken", "portalEnabled");
      `);
    } catch (err) {
      console.warn('[CustomerPortalService] ensureSchema note:', err.message);
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
        throw new Error(
          `[SECURITY VIOLATION] Prohibited sensitive field "${key}" detected at path "${path}.${key}" in Customer Portal payload.`
        );
      }
      if (typeof key === 'string' && (/^actual/i.test(key) || /factory/i.test(key) || /supplier/i.test(key) || /margin/i.test(key))) {
        throw new Error(
          `[SECURITY VIOLATION] Prohibited pattern key "${key}" detected at path "${path}.${key}" in Customer Portal payload.`
        );
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
   * Verify token for incoming Customer Portal requests
   */
  static async verifyToken(token) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      const err = new Error('رمز الدخول لبوابة العميل مطلوب');
      err.statusCode = 403;
      throw err;
    }

    const order = await prisma.customerOrder.findFirst({
      where: { portalToken: cleanToken },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
      },
    });

    if (!order) {
      const err = new Error('رابط البوابة غير صالح أو انتهت صلاحيته');
      err.statusCode = 403;
      throw err;
    }

    if (!order.portalEnabled) {
      const err = new Error('تم تعطيل أو إيقاف بوابة متابعة هذا الطلب حالياً من قِبل الإدارة');
      err.statusCode = 403;
      throw err;
    }

    // Update last access timestamp asynchronously
    const now = new Date();
    try {
      await prisma.customerOrder.update({
        where: { id: order.id },
        data: { portalLastAccessAt: now },
      });
      order.portalLastAccessAt = now;
    } catch (_) {
      // Ignore background timestamp update error
    }

    return order;
  }

  /**
   * Generate or rotate portal token for a customer order (Management Action)
   */
  static async generatePortalLink(companyId, customerOrderId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const order = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
    });
    if (!order) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // Generate high-entropy 48-char hex token
    const token = crypto.randomBytes(24).toString('hex');

    const updated = await prisma.customerOrder.update({
      where: { id: customerOrderId },
      data: {
        portalToken: token,
        portalEnabled: true,
      },
    });

    return {
      success: true,
      portalToken: updated.portalToken,
      portalEnabled: updated.portalEnabled,
      portalUrl: `/customer-portal?token=${updated.portalToken}`,
      message: 'تم توليد رابط بوابة العميل وتفعيله بنجاح',
    };
  }

  /**
   * Toggle portal link enabled state (Management Action)
   */
  static async togglePortalLink(companyId, customerOrderId, { enabled }) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const order = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
    });
    if (!order) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (!order.portalToken && enabled) {
      // If toggled on without a token, generate one
      return await this.generatePortalLink(companyId, customerOrderId);
    }

    const updated = await prisma.customerOrder.update({
      where: { id: customerOrderId },
      data: {
        portalEnabled: Boolean(enabled),
      },
    });

    return {
      success: true,
      portalToken: updated.portalToken,
      portalEnabled: updated.portalEnabled,
      portalUrl: updated.portalToken ? `/customer-portal?token=${updated.portalToken}` : null,
      message: updated.portalEnabled ? 'تم تفعيل رابط بوابة العميل' : 'تم تعطيل رابط بوابة العميل مؤقتاً',
    };
  }

  /**
   * Revoke/Delete portal link (Management Action)
   */
  static async deletePortalLink(companyId, customerOrderId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const order = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
    });
    if (!order) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    await prisma.customerOrder.update({
      where: { id: customerOrderId },
      data: {
        portalToken: null,
        portalEnabled: false,
      },
    });

    return {
      success: true,
      message: 'تم إلغاء رابط بوابة العميل وإبطال صلاحيته بالكامل',
    };
  }

  // ==========================================================================
  // 2. Public Read Endpoints (Token-Authenticated)
  // ==========================================================================

  /**
   * GET /api/v1/customer-portal/context?token=
   * Returns minimal brand & order identity for initial header loading
   */
  static async getContext(token) {
    const order = await this.verifyToken(token);

    const customerName = order.customer
      ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim() ||
        order.customer.name ||
        null
      : null;

    const payload = {
      orderNumber: order.orderNumber,
      brandName: order.brandName || null,
      customerName,
      status: order.status,
      currency: order.currency || 'EGP',
      portalLastAccessAt: order.portalLastAccessAt,
    };

    this.auditSanitizedPayload(payload);

    return payload;
  }

  /**
   * GET /api/v1/customer-portal/order?token=
   * Returns complete client-facing order progress, delivery dates, published updates,
   * approved technical documents, and commercial payments schedule.
   */
  static async getOrderDetails(token) {
    const verifiedOrder = await this.verifyToken(token);
    const prisma = getSharedPrismaClient();

    // Fetch full order structure
    const fullOrder = await prisma.customerOrder.findUnique({
      where: { id: verifiedOrder.id },
      include: {
        customer: {
          select: { firstName: true, lastName: true, phone: true },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
        },
        orders: {
          include: {
            variants: true,
            stages: { orderBy: { sequence: 'asc' } },
            attachments: {
              where: { reviewStatus: 'PUBLISHED' },
              orderBy: { publishedAt: 'desc' },
            },
            techPack: {
              include: { files: true },
            },
            sizeChart: {
              include: { rows: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!fullOrder) {
      const err = new Error('الطلب غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const childOrders = fullOrder.orders || [];

    // ------------------------------------------------------------------------
    // 1. Delivery Dates & Delay Calculation
    // ------------------------------------------------------------------------
    const contractedDeliveryDate = fullOrder.expectedDelivery || null;
    let expectedDeliveryDate = contractedDeliveryDate;

    // Check if any child order or production stage projects a later completion date
    for (const child of childOrders) {
      if (child.dueDate && (!expectedDeliveryDate || new Date(child.dueDate) > new Date(expectedDeliveryDate))) {
        expectedDeliveryDate = child.dueDate;
      }
      for (const stg of child.stages || []) {
        if (stg.dueDate && (!expectedDeliveryDate || new Date(stg.dueDate) > new Date(expectedDeliveryDate))) {
          expectedDeliveryDate = stg.dueDate;
        }
      }
    }

    const isDelayed = Boolean(
      contractedDeliveryDate &&
        expectedDeliveryDate &&
        new Date(expectedDeliveryDate).getTime() > new Date(contractedDeliveryDate).getTime()
    );

    // ------------------------------------------------------------------------
    // 2. Production Progress & Stage Timeline (APPROVED Only)
    // ------------------------------------------------------------------------
    let totalStagesCount = 0;
    let completedStagesCount = 0;
    let totalPlannedPieces = 0;
    let totalCompletedPieces = 0;

    // Aggregate unique canonical workflow stages across child orders
    const canonicalStagesMap = new Map();

    for (const child of childOrders) {
      // Variants planned pieces
      for (const v of child.variants || []) {
        totalPlannedPieces += Number(v.quantity || 0);
      }

      for (const stg of child.stages || []) {
        totalStagesCount++;
        const isDone = stg.status === 'COMPLETED' || stg.status === 'FINISHED';
        if (isDone) completedStagesCount++;

        const stgCompleted = Number(stg.completedQuantity || 0);
        if (stgCompleted > 0 && isDone) {
          totalCompletedPieces = Math.max(totalCompletedPieces, stgCompleted);
        }

        const stageKey = `${stg.name}_${stg.sequence}`;
        if (!canonicalStagesMap.has(stageKey)) {
          canonicalStagesMap.set(stageKey, {
            name: stg.name,
            sequence: stg.sequence,
            status: stg.status,
            plannedQuantity: Number(stg.plannedQuantity || 0),
            completedQuantity: Number(stg.completedQuantity || 0),
            startedAt: stg.startedAt || null,
            completedAt: stg.completedAt || null,
          });
        } else {
          // Merge quantities
          const existing = canonicalStagesMap.get(stageKey);
          existing.plannedQuantity += Number(stg.plannedQuantity || 0);
          existing.completedQuantity += Number(stg.completedQuantity || 0);
          // If any child is in progress, show IN_PROGRESS
          if (stg.status === 'IN_PROGRESS' && existing.status !== 'IN_PROGRESS') {
            existing.status = 'IN_PROGRESS';
          }
        }
      }
    }

    const stagesList = Array.from(canonicalStagesMap.values()).sort((a, b) => a.sequence - b.sequence);

    // Compute overall progress percent
    let progressPercent = 0;
    if (fullOrder.status === 'DELIVERED') {
      progressPercent = 100;
    } else if (fullOrder.status === 'READY') {
      progressPercent = 95;
    } else if (totalStagesCount > 0) {
      progressPercent = Math.min(95, Math.round((completedStagesCount / totalStagesCount) * 100));
    } else if (totalPlannedPieces > 0 && totalCompletedPieces > 0) {
      progressPercent = Math.min(95, Math.round((totalCompletedPieces / totalPlannedPieces) * 100));
    } else if (fullOrder.status === 'IN_PRODUCTION') {
      progressPercent = 15;
    } else if (fullOrder.status === 'CONFIRMED') {
      progressPercent = 5;
    }

    // ------------------------------------------------------------------------
    // 3. Variant Matrix for Display
    // ------------------------------------------------------------------------
    const variantMatrix = [];
    for (const child of childOrders) {
      for (const v of child.variants || []) {
        variantMatrix.push({
          id: v.id,
          size: v.size || '—',
          color: v.color || '—',
          quantity: Number(v.quantity || 0),
          completedQuantity: Number(v.completedQuantity || 0),
        });
      }
    }

    // ------------------------------------------------------------------------
    // 4. Published Media Updates (PUBLISHED ONLY)
    // ------------------------------------------------------------------------
    const updates = [];
    const seenAttachmentIds = new Set();

    for (const child of childOrders) {
      for (const att of child.attachments || []) {
        // Enforce strictly PUBLISHED filter
        if (att.reviewStatus === 'PUBLISHED' && !seenAttachmentIds.has(att.id)) {
          seenAttachmentIds.add(att.id);
          updates.push({
            id: att.id,
            url: att.url,
            kind: att.kind || 'IMAGE',
            caption: att.caption || null,
            publishedAt: att.publishedAt || att.createdAt,
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // 5. Approved Tech Pack & Size Chart (APPROVED ONLY)
    // ------------------------------------------------------------------------
    let approvedTechPack = null;
    let approvedSizeChart = null;

    for (const child of childOrders) {
      if (!approvedTechPack && child.techPack && child.techPack.status === 'APPROVED') {
        const tp = child.techPack;
        approvedTechPack = {
          id: tp.id,
          code: tp.code,
          title: tp.title,
          version: tp.version,
          category: tp.category || null,
          season: tp.season || null,
          targetGender: tp.targetGender || null,
          approvedAt: tp.approvedAt || null,
          packagingDetails: tp.packagingDetails || null,
          instructions: tp.instructions || null,
          files: (tp.files || []).map((f) => ({
            id: f.id,
            fileName: f.fileName,
            url: f.url,
            kind: f.kind,
          })),
        };
      }

      if (!approvedSizeChart && child.sizeChart && child.sizeChart.status === 'APPROVED') {
        const sc = child.sizeChart;
        approvedSizeChart = {
          id: sc.id,
          code: sc.code,
          name: sc.name,
          version: sc.version,
          unit: sc.unit,
          measurementMethod: sc.measurementMethod,
          rows: (sc.rows || []).map((r) => ({
            id: r.id,
            sizeLabel: r.sizeLabel,
            measurementKey: r.measurementKey,
            value: Number(r.value),
            tolerance: Number(r.tolerance),
          })),
        };
      }
    }

    // ------------------------------------------------------------------------
    // 6. Payments Schedule (Commercial Contract Terms: 70/20/10)
    // ------------------------------------------------------------------------
    const rawPayments = fullOrder.payments || [];
    let totalAmount = 0;
    let paidAmount = 0;

    const payments = rawPayments.map((p) => {
      const pAmount = round2(p.amount);
      const pPaid = p.status === 'PAID' ? (p.paidAmount !== null && p.paidAmount !== undefined ? round2(p.paidAmount) : pAmount) : 0;
      totalAmount += pAmount;
      paidAmount += pPaid;

      return {
        id: p.id,
        kind: p.kind,
        label: p.label || null,
        percent: p.percent ? Number(p.percent) : null,
        amount: pAmount,
        dueDate: p.dueDate || null,
        status: p.status,
        paidAt: p.paidAt || null,
        paidAmount: pPaid,
        method: p.method || null,
        notes: p.notes || null,
      };
    });

    totalAmount = round2(totalAmount);
    paidAmount = round2(paidAmount);
    const remainingAmount = round2(Math.max(0, totalAmount - paidAmount));
    const percentPaid = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

    const customerName = fullOrder.customer
      ? [fullOrder.customer.firstName, fullOrder.customer.lastName].filter(Boolean).join(' ').trim() ||
        fullOrder.customer.name ||
        null
      : null;

    // ------------------------------------------------------------------------
    // 7. Whitelist Assembly & Prohibited Fields Audit
    // ------------------------------------------------------------------------
    const sanitizedPayload = {
      orderNumber: fullOrder.orderNumber,
      brandName: fullOrder.brandName || null,
      customerName,
      status: fullOrder.status,
      currency: fullOrder.currency || 'EGP',
      contractedDeliveryDate,
      expectedDeliveryDate,
      isDelayed,
      progress: {
        percent: progressPercent,
        totalStages: totalStagesCount,
        completedStages: completedStagesCount,
        totalPlannedPieces,
        totalCompletedPieces,
        stages: stagesList,
      },
      variantMatrix,
      updates,
      techPack: approvedTechPack,
      sizeChart: approvedSizeChart,
      payments: {
        totalAmount,
        paidAmount,
        remainingAmount,
        percentPaid,
        items: payments,
      },
      portalLastAccessAt: fullOrder.portalLastAccessAt,
    };

    // Strict security audit before returning
    this.auditSanitizedPayload(sanitizedPayload);

    return sanitizedPayload;
  }
}

module.exports = CustomerPortalService;
