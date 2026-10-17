/**
 * Contract Manufacturing Service (طبقة تعاقد التصنيع للغير)
 * Wave 1: Commercial Contract Layer, Customer Orders, WO Split & Payments.
 *
 * Implements:
 * 1. CustomerOrder CRUD (CO-YYYY-XXXXX) with multi-child production orders (WO Split).
 * 2. Contract financials: total planned qty, produced qty, contract amount (Σ plannedQty × salePricePerUnit), paid, and remaining.
 * 3. Structured payment schedule (70% deposit on confirmation, 20% on start, 10% on delivery) + custom installments.
 * 4. Granular RBAC: payment mark-as-paid for operators; schedule generation and modification for Company Admin/Owner.
 * 5. Strict multi-tenant isolation (companyId) and zero blast-radius on core MES engine.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

class ManufacturingContractService {
  /**
   * Check if a user has Company Admin or Owner privileges
   */
  static isCompanyAdminOrOwner(user) {
    if (!user) return false;
    const role = String(user.role || '').toUpperCase();
    return (
      role === 'SUPER_ADMIN' ||
      role === 'COMPANY_ADMIN' ||
      role === 'OWNER' ||
      user.isOwner === true
    );
  }

  /**
   * Runtime schema guard for contract manufacturing tables & enums
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "ProductionOrderType" AS ENUM ('FULL_PACKAGE', 'CMT', 'CUSTOMER_MATERIALS', 'OUTSOURCED', 'SAMPLE', 'REWORK');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "CustomerOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "CustomerOrderPaymentKind" AS ENUM ('DEPOSIT', 'INSTALLMENT', 'FINAL', 'CUSTOM');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "CustomerOrderPaymentDueTrigger" AS ENUM ('ON_CONFIRMATION', 'ON_START', 'ON_STAGE', 'ON_DELIVERY', 'MANUAL');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
        DO $$ BEGIN
          CREATE TYPE "CustomerOrderPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "customer_orders" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "orderNumber" TEXT NOT NULL,
          "customerId" TEXT,
          "brandName" TEXT,
          "customerCountry" TEXT,
          "responsibleUserId" TEXT,
          "status" "CustomerOrderStatus" NOT NULL DEFAULT 'DRAFT',
          "expectedDelivery" TIMESTAMP(3),
          "notes" TEXT,
          "createdById" TEXT,
          "currency" TEXT NOT NULL DEFAULT 'EGP',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "customer_orders_companyId_orderNumber_key" ON "customer_orders"("companyId", "orderNumber");
        CREATE INDEX IF NOT EXISTS "customer_orders_companyId_status_idx" ON "customer_orders"("companyId", "status");
        CREATE INDEX IF NOT EXISTS "customer_orders_companyId_customerId_idx" ON "customer_orders"("companyId", "customerId");

        CREATE TABLE IF NOT EXISTS "customer_order_payments" (
          "id" TEXT PRIMARY KEY,
          "customerOrderId" TEXT NOT NULL REFERENCES "customer_orders"("id") ON DELETE CASCADE,
          "kind" "CustomerOrderPaymentKind" NOT NULL DEFAULT 'CUSTOM',
          "label" TEXT,
          "percent" DECIMAL(5,2),
          "amount" DECIMAL(12,2) NOT NULL,
          "dueTrigger" "CustomerOrderPaymentDueTrigger" NOT NULL DEFAULT 'MANUAL',
          "dueDate" TIMESTAMP(3),
          "status" "CustomerOrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
          "paidAt" TIMESTAMP(3),
          "paidAmount" DECIMAL(12,2),
          "method" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "customer_order_payments_customerOrderId_idx" ON "customer_order_payments"("customerOrderId");

        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "customerOrderId" TEXT;
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "orderType" "ProductionOrderType" NOT NULL DEFAULT 'FULL_PACKAGE';
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "brandName" TEXT;
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "customerCountry" TEXT;
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "salePricePerUnit" DECIMAL(12,2);
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT;
        ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "responsibleUserId" TEXT;
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_customerOrderId_idx" ON "production_orders"("companyId", "customerOrderId");
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_customerId_idx" ON "production_orders"("companyId", "customerId");
        CREATE INDEX IF NOT EXISTS "production_orders_companyId_orderType_idx" ON "production_orders"("companyId", "orderType");
      `);
    } catch (err) {
      // Non-fatal if schema already synced via Prisma
      console.warn('[ManufacturingContractService] ensureSchema note:', err.message);
    }
  }

  /**
   * Sequence generator for Customer Orders: CO-YYYY-XXXXX (same sequence style as MO)
   */
  static async generateCustomerOrderNumber(companyId) {
    const prisma = getSharedPrismaClient();
    const year = new Date().getFullYear();
    const prefix = `CO-${year}-`;

    const lastOrder = await prisma.customerOrder.findFirst({
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

  /**
   * Compute aggregated financial metrics for a customer order
   */
  static computeOrderTotals(orders = [], payments = []) {
    let plannedQuantity = 0;
    let producedQuantity = 0;
    let totalAmount = 0;
    let totalActualCost = 0;

    for (const ord of orders) {
      const planned = Number(ord.plannedQuantity || 0);
      const produced = Number(ord.producedQuantity || 0);
      const salePrice = Number(ord.salePricePerUnit || 0);
      const cost = Number(ord.totalCost || 0);

      plannedQuantity += planned;
      producedQuantity += produced;
      totalAmount += planned * salePrice;
      totalActualCost += cost;
    }

    let paidAmount = 0;
    for (const pay of payments) {
      if (pay.status === 'PAID') {
        const amt = pay.paidAmount !== null && pay.paidAmount !== undefined
          ? Number(pay.paidAmount)
          : Number(pay.amount || 0);
        paidAmount += amt;
      }
    }

    totalAmount = round2(totalAmount);
    paidAmount = round2(paidAmount);
    totalActualCost = round2(totalActualCost);
    const remainingAmount = round2(Math.max(0, totalAmount - paidAmount));
    const estimatedProfit = round2(totalAmount - totalActualCost);

    return {
      ordersCount: orders.length,
      plannedQuantity: round2(plannedQuantity),
      producedQuantity: round2(producedQuantity),
      totalAmount,
      totalActualCost,
      estimatedProfit,
      paidAmount,
      remainingAmount,
    };
  }

  /**
   * Create Customer Order
   */
  static async createCustomerOrder(companyId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const orderNumber = data.orderNumber || (await this.generateCustomerOrderNumber(companyId));

    const order = await prisma.customerOrder.create({
      data: {
        companyId,
        orderNumber,
        customerId: data.customerId || null,
        brandName: data.brandName ? String(data.brandName).trim() : null,
        customerCountry: data.customerCountry ? String(data.customerCountry).trim() : null,
        responsibleUserId: data.responsibleUserId ? String(data.responsibleUserId) : null,
        status: data.status || 'DRAFT',
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
        notes: data.notes || null,
        createdById: userId ? String(userId) : null,
        currency: data.currency || 'EGP',
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        orders: true,
        payments: true,
      },
    });

    const totals = this.computeOrderTotals(order.orders, order.payments);
    return { ...order, ...totals };
  }

  /**
   * List Customer Orders with filters and aggregated totals
   */
  static async listCustomerOrders(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    const where = { companyId };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.search) {
      const q = String(filters.search).trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { brandName: { contains: q, mode: 'insensitive' } },
        { customerCountry: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const customerOrders = await prisma.customerOrder.findMany({
      where,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            orderType: true,
            plannedQuantity: true,
            producedQuantity: true,
            salePricePerUnit: true,
            totalCost: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let overallPlannedQuantity = 0;
    let overallProducedQuantity = 0;
    let overallAmount = 0;
    let overallPaidAmount = 0;
    let overallRemainingAmount = 0;
    let overallChildOrdersCount = 0;

    const items = customerOrders.map((co) => {
      const totals = this.computeOrderTotals(co.orders, co.payments);
      overallPlannedQuantity += totals.plannedQuantity;
      overallProducedQuantity += totals.producedQuantity;
      overallAmount += totals.totalAmount;
      overallPaidAmount += totals.paidAmount;
      overallRemainingAmount += totals.remainingAmount;
      overallChildOrdersCount += totals.ordersCount;

      return {
        ...co,
        ...totals,
      };
    });

    const summaryTotals = {
      totalCustomerOrders: items.length,
      totalChildOrders: overallChildOrdersCount,
      totalPlannedQuantity: round2(overallPlannedQuantity),
      totalProducedQuantity: round2(overallProducedQuantity),
      totalAmount: round2(overallAmount),
      totalPaidAmount: round2(overallPaidAmount),
      totalRemainingAmount: round2(overallRemainingAmount),
    };

    return {
      items,
      totals: summaryTotals,
    };
  }

  /**
   * Get single Customer Order by ID with full details & breakdown
   */
  static async getCustomerOrderById(companyId, id) {
    const prisma = getSharedPrismaClient();
    const order = await prisma.customerOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        orders: {
          include: {
            bom: { select: { id: true, code: true, name: true } },
            variants: true,
            stages: { orderBy: { sequence: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const totals = this.computeOrderTotals(order.orders, order.payments);
    return {
      ...order,
      ...totals,
    };
  }

  /**
   * Update Customer Order details & state transition
   */
  static async updateCustomerOrder(companyId, id, data) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.customerOrder.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (data.customerId !== undefined) updateData.customerId = data.customerId || null;
    if (data.brandName !== undefined) updateData.brandName = data.brandName ? String(data.brandName).trim() : null;
    if (data.customerCountry !== undefined) updateData.customerCountry = data.customerCountry ? String(data.customerCountry).trim() : null;
    if (data.responsibleUserId !== undefined) updateData.responsibleUserId = data.responsibleUserId ? String(data.responsibleUserId) : null;
    if (data.expectedDelivery !== undefined) updateData.expectedDelivery = data.expectedDelivery ? new Date(data.expectedDelivery) : null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.currency !== undefined) updateData.currency = data.currency || 'EGP';

    if (data.status) {
      const validStatuses = ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(data.status)) {
        const err = new Error(`حالة غير صالحة: ${data.status}`);
        err.statusCode = 400;
        throw err;
      }
      updateData.status = data.status;
    }

    await prisma.customerOrder.update({
      where: { id },
      data: updateData,
    });

    return await this.getCustomerOrderById(companyId, id);
  }

  /**
   * Link an existing Production Order OR create a new linked Production Order (WO Split)
   */
  static async linkOrCreateChildOrder(companyId, customerOrderId, data, userId = null) {
    const prisma = getSharedPrismaClient();
    const customerOrder = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
    });

    if (!customerOrder) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // Branch A: Link existing production order by orderId
    if (data.orderId) {
      const productionOrder = await prisma.productionOrder.findFirst({
        where: { id: data.orderId, companyId },
      });

      if (!productionOrder) {
        const err = new Error('أمر الإنتاج المراد ربطه غير موجود أو لا ينتمي لنفس الشركة');
        err.statusCode = 404;
        throw err;
      }

      if (productionOrder.customerOrderId && productionOrder.customerOrderId !== customerOrderId) {
        const err = new Error('أمر الإنتاج مرتبط بالفعل بأمر عميل آخر');
        err.statusCode = 400;
        throw err;
      }

      const orderUpdate = {
        customerOrderId,
      };
      if (data.salePricePerUnit !== undefined && data.salePricePerUnit !== null) {
        orderUpdate.salePricePerUnit = round2(data.salePricePerUnit);
      }
      if (data.orderType) orderUpdate.orderType = data.orderType;
      if (!productionOrder.customerId && customerOrder.customerId) {
        orderUpdate.customerId = customerOrder.customerId;
      }
      if (!productionOrder.brandName && customerOrder.brandName) {
        orderUpdate.brandName = customerOrder.brandName;
      }
      if (!productionOrder.customerCountry && customerOrder.customerCountry) {
        orderUpdate.customerCountry = customerOrder.customerCountry;
      }

      await prisma.productionOrder.update({
        where: { id: productionOrder.id },
        data: orderUpdate,
      });

      return await this.getCustomerOrderById(companyId, customerOrderId);
    }

    // Branch B: Create a new production order linked to this Customer Order
    const ManufacturingService = require('./manufacturingService');
    const childPayload = {
      ...data,
      customerOrderId,
      customerId: data.customerId || customerOrder.customerId,
      brandName: data.brandName || customerOrder.brandName,
      customerCountry: data.customerCountry || customerOrder.customerCountry,
      responsibleUserId: data.responsibleUserId || customerOrder.responsibleUserId,
      dueDate: data.dueDate || customerOrder.expectedDelivery,
      orderType: data.orderType || 'FULL_PACKAGE',
      salePricePerUnit: data.salePricePerUnit !== undefined && data.salePricePerUnit !== null
        ? round2(data.salePricePerUnit)
        : null,
    };

    await ManufacturingService.createOrder(companyId, childPayload, userId);
    return await this.getCustomerOrderById(companyId, customerOrderId);
  }

  /**
   * List payments for a customer order
   */
  static async listCustomerOrderPayments(companyId, customerOrderId) {
    const prisma = getSharedPrismaClient();
    const customerOrder = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
    });

    if (!customerOrder) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    return await prisma.customerOrderPayment.findMany({
      where: { customerOrderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Generate default commercial contract payment schedule:
   * 70% Deposit (ON_CONFIRMATION) + 20% Installment (ON_START) + 10% Final (ON_DELIVERY)
   *
   * Permission: Company Admin / Owner only
   */
  static async generateDefaultPayments(companyId, customerOrderId, user) {
    if (!this.isCompanyAdminOrOwner(user)) {
      const err = new Error('توليد أو إعادة ضبط سياسة الدفعات متاح لمدير الشركة أو المالك فقط');
      err.statusCode = 403;
      throw err;
    }

    const prisma = getSharedPrismaClient();
    const customerOrder = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
      include: {
        orders: true,
        payments: true,
      },
    });

    if (!customerOrder) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const totals = this.computeOrderTotals(customerOrder.orders, customerOrder.payments);
    const contractTotal = totals.totalAmount;

    // Check if there are already PAID payments to protect cash ledger
    const hasPaid = customerOrder.payments.some((p) => p.status === 'PAID');
    if (hasPaid) {
      const err = new Error('لا يمكن إعادة توليد جدول الدفعات الافتراضي لوجود دفعات مسجلة كمدفوعة بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const depositAmount = round2(contractTotal * 0.70);
    const startAmount = round2(contractTotal * 0.20);
    // Exact rounding balance for 10%
    const deliveryAmount = round2(contractTotal - depositAmount - startAmount);

    return await prisma.$transaction(async (tx) => {
      // Remove any existing unpaid payments
      await tx.customerOrderPayment.deleteMany({
        where: { customerOrderId, status: { not: 'PAID' } },
      });

      const p1 = await tx.customerOrderPayment.create({
        data: {
          customerOrderId,
          kind: 'DEPOSIT',
          label: 'دفعة مقدمة عند التأكيد (70%)',
          percent: 70.0,
          amount: depositAmount,
          dueTrigger: 'ON_CONFIRMATION',
          status: 'PENDING',
        },
      });

      const p2 = await tx.customerOrderPayment.create({
        data: {
          customerOrderId,
          kind: 'INSTALLMENT',
          label: 'دفعة بدء التشغيل (20%)',
          percent: 20.0,
          amount: startAmount,
          dueTrigger: 'ON_START',
          status: 'PENDING',
        },
      });

      const p3 = await tx.customerOrderPayment.create({
        data: {
          customerOrderId,
          kind: 'FINAL',
          label: 'دفعة الاستلام والتسليم النهائي (10%)',
          percent: 10.0,
          amount: deliveryAmount,
          dueTrigger: 'ON_DELIVERY',
          status: 'PENDING',
        },
      });

      return [p1, p2, p3];
    });
  }

  /**
   * Add a custom payment installment
   * Permission: Company Admin / Owner only
   */
  static async createCustomerOrderPayment(companyId, customerOrderId, data, user) {
    if (!this.isCompanyAdminOrOwner(user)) {
      const err = new Error('إضافة بنود دفعات مخصصة متاح لمدير الشركة أو المالك فقط');
      err.statusCode = 403;
      throw err;
    }

    const prisma = getSharedPrismaClient();
    const customerOrder = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
    });

    if (!customerOrder) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const amount = round2(data.amount);
    if (isNaN(amount) || amount < 0) {
      const err = new Error('مبلغ الدفعة يجب أن يكون رقماً موجباً');
      err.statusCode = 400;
      throw err;
    }

    return await prisma.customerOrderPayment.create({
      data: {
        customerOrderId,
        kind: data.kind || 'CUSTOM',
        label: data.label ? String(data.label).trim() : 'دفعة مخصصة',
        percent: data.percent !== undefined && data.percent !== null ? round2(data.percent) : null,
        amount,
        dueTrigger: data.dueTrigger || 'MANUAL',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || 'PENDING',
        notes: data.notes || null,
      },
    });
  }

  /**
   * Update payment item OR mark payment as PAID
   * - Marking as PAID: allowed for all manufacturing users.
   * - Editing financial amount, trigger, percent or label: Company Admin / Owner only.
   */
  static async updateCustomerOrderPayment(companyId, customerOrderId, paymentId, data, user) {
    const prisma = getSharedPrismaClient();
    const customerOrder = await prisma.customerOrder.findFirst({
      where: { id: customerOrderId, companyId },
    });

    if (!customerOrder) {
      const err = new Error('أمر العميل غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const payment = await prisma.customerOrderPayment.findFirst({
      where: { id: paymentId, customerOrderId },
    });

    if (!payment) {
      const err = new Error('الدفعة غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const isMarkingPaid = data.status === 'PAID' && payment.status !== 'PAID';
    const isModifyingSchedule =
      data.amount !== undefined ||
      data.percent !== undefined ||
      data.dueTrigger !== undefined ||
      data.dueDate !== undefined ||
      data.kind !== undefined ||
      data.label !== undefined;

    if (isModifyingSchedule && !this.isCompanyAdminOrOwner(user)) {
      const err = new Error('تعديل مبالغ ومواعيد سياسة الدفعات متاح لمدير الشركة أو المالك فقط');
      err.statusCode = 403;
      throw err;
    }

    const updateData = {};

    if (data.status) {
      const validStatuses = ['PENDING', 'PAID', 'CANCELLED'];
      if (!validStatuses.includes(data.status)) {
        const err = new Error(`حالة دفعة غير صالحة: ${data.status}`);
        err.statusCode = 400;
        throw err;
      }
      updateData.status = data.status;

      if (data.status === 'PAID') {
        updateData.paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
        updateData.paidAmount = data.paidAmount !== undefined
          ? round2(data.paidAmount)
          : payment.amount;
        updateData.method = data.method ? String(data.method) : 'CASH';
      }
    }

    if (data.amount !== undefined) updateData.amount = round2(data.amount);
    if (data.percent !== undefined) updateData.percent = data.percent !== null ? round2(data.percent) : null;
    if (data.label !== undefined) updateData.label = data.label ? String(data.label).trim() : null;
    if (data.kind !== undefined) updateData.kind = data.kind;
    if (data.dueTrigger !== undefined) updateData.dueTrigger = data.dueTrigger;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.method !== undefined && !updateData.method) updateData.method = String(data.method);

    const updatedPayment = await prisma.customerOrderPayment.update({
      where: { id: paymentId },
      data: updateData,
    });

    // Return updated payment along with refreshed order totals
    const fullOrder = await this.getCustomerOrderById(companyId, customerOrderId);
    return {
      payment: updatedPayment,
      customerOrder: fullOrder,
    };
  }
}

module.exports = ManufacturingContractService;
