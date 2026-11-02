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
const ManufacturingNotificationService = require('./manufacturingNotificationService');
const sampleComponentMath = require('./sampleComponentMath');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

const normalizeExpenseName = (v) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, 100);
const normalizeAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 10000000) return null;
  return round2(n);
};

const httpErr = (code, msg) => {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
};

const isCompanyAdminOrOwner = (user) => {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();
  return (
    role === 'SUPER_ADMIN' ||
    role === 'COMPANY_ADMIN' ||
    role === 'OWNER' ||
    user.isOwner === true
  );
};

const businessToday = (tz = 'Africa/Cairo') =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const remainingOf = (s) => {
  const total = s.totalAmount !== null && s.totalAmount !== undefined ? Number(s.totalAmount) : Number(s.fee || 0);
  return round2(total - Number(s.paidAmount || 0));
};

const overdueDaysOf = (s, received) => {
  if (!s.expectedDeliveryAt) return 0;
  if (['CONVERTED', 'REJECTED'].includes(s.status)) return 0;
  if (received) return 0;
  const d = new Date(s.expectedDeliveryAt);
  if (isNaN(d.getTime())) return 0;
  const due = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(d);
  if (businessToday() <= due) return 0;
  return Math.round((new Date(businessToday()) - new Date(due)) / 86400000);
};

const isOverdueOf = (s, received) => overdueDaysOf(s, received) > 0;

class ManufacturingSampleService {
  /**
   * Idempotent runtime DDL guard for PostgreSQL
   */
  static async ensureSchema() {
    if (this._schemaEnsured) return;
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      const stmts = [
        `DO $$ BEGIN
          CREATE TYPE "SampleOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CONVERTED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;`,
        `DO $$ BEGIN
          CREATE TYPE "SampleMaterialSource" AS ENUM ('CUSTOMER', 'COMPANY');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;`,
        `DO $$ BEGIN
          CREATE TYPE "SampleFileKind" AS ENUM ('IMAGE', 'PDF', 'OTHER');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;`,
        `CREATE TABLE IF NOT EXISTS "sample_orders" (
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
          "expectedDeliveryAt" TIMESTAMP(3),
          "sampleReceived" BOOLEAN NOT NULL DEFAULT false,
          "receivedAt" TIMESTAMP(3),
          "designNotes" TEXT,
          "resultNotes" TEXT,
          "convertedOrderId" TEXT,
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "sample_orders_companyId_sampleNumber_key" ON "sample_orders"("companyId", "sampleNumber");`,
        `CREATE INDEX IF NOT EXISTS "sample_orders_companyId_status_idx" ON "sample_orders"("companyId", "status");`,
        `CREATE INDEX IF NOT EXISTS "sample_orders_companyId_customerId_idx" ON "sample_orders"("companyId", "customerId");`,
        `CREATE INDEX IF NOT EXISTS "sample_orders_companyId_productId_idx" ON "sample_orders"("companyId", "productId");`,
        `CREATE INDEX IF NOT EXISTS "sample_orders_companyId_convertedOrderId_idx" ON "sample_orders"("companyId", "convertedOrderId");`,
        `CREATE TABLE IF NOT EXISTS "sample_order_stages" (
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
        );`,
        `CREATE INDEX IF NOT EXISTS "sample_order_stages_sampleOrderId_idx" ON "sample_order_stages"("sampleOrderId");`,
        `CREATE INDEX IF NOT EXISTS "sample_order_stages_sampleOrderId_sequence_idx" ON "sample_order_stages"("sampleOrderId", "sequence");`,
        `CREATE TABLE IF NOT EXISTS "sample_order_attachments" (
          "id" TEXT PRIMARY KEY,
          "sampleOrderId" TEXT NOT NULL,
          "fileName" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "kind" "SampleFileKind" NOT NULL DEFAULT 'IMAGE',
          "uploadedBy" TEXT,
          "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "sample_order_attachments_sampleOrderId_idx" ON "sample_order_attachments"("sampleOrderId");`,
        `ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "sourceSampleOrderId" TEXT;`,
        `CREATE INDEX IF NOT EXISTS "production_orders_companyId_sourceSampleOrderId_idx" ON "production_orders"("companyId", "sourceSampleOrderId");`,
        `ALTER TABLE "sample_orders" ADD COLUMN IF NOT EXISTS "partnerFactoryId" TEXT;`,
        `ALTER TABLE "sample_orders" ADD COLUMN IF NOT EXISTS "expectedDeliveryAt" TIMESTAMP(3);`,
        `ALTER TABLE "sample_orders" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(12,2);`,
        `ALTER TABLE "sample_orders" ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;`,
        `ALTER TABLE "sample_orders" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;`,
        `ALTER TABLE "sample_orders" ADD COLUMN IF NOT EXISTS "sampleReceived" BOOLEAN NOT NULL DEFAULT false;`,
        `ALTER TABLE "sample_orders" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);`,
        `CREATE INDEX IF NOT EXISTS "sample_orders_companyId_partnerFactoryId_idx" ON "sample_orders"("companyId","partnerFactoryId");`,
        `CREATE INDEX IF NOT EXISTS "sample_orders_companyId_expectedDeliveryAt_idx" ON "sample_orders"("companyId","expectedDeliveryAt");`,
        `CREATE INDEX IF NOT EXISTS "sample_orders_companyId_sampleReceived_idx" ON "sample_orders"("companyId","sampleReceived");`,
        `CREATE TABLE IF NOT EXISTS "sample_payments" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "sampleOrderId" TEXT NOT NULL,
          "kind" "CustomerOrderPaymentKind" NOT NULL DEFAULT 'DEPOSIT',
          "amount" DECIMAL(12,2) NOT NULL,
          "method" "PaymentMethod",
          "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "reference" TEXT,
          "notes" TEXT,
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "sample_payments_sampleOrderId_paidAt_idx" ON "sample_payments"("sampleOrderId","paidAt");`,
        `CREATE INDEX IF NOT EXISTS "sample_payments_companyId_paidAt_idx" ON "sample_payments"("companyId","paidAt");`,
        `CREATE TABLE IF NOT EXISTS "sample_expense_catalog" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "defaultAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "sample_expense_catalog_companyId_name_key" ON "sample_expense_catalog"("companyId","name");`,
        `CREATE INDEX IF NOT EXISTS "sample_expense_catalog_companyId_isActive_idx" ON "sample_expense_catalog"("companyId","isActive");`,
        `CREATE TABLE IF NOT EXISTS "sample_order_expenses" (
          "id" TEXT PRIMARY KEY,
          "sampleOrderId" TEXT NOT NULL REFERENCES "sample_orders"("id") ON DELETE CASCADE,
          "catalogId" TEXT REFERENCES "sample_expense_catalog"("id") ON DELETE SET NULL,
          "name" TEXT NOT NULL,
          "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "sample_order_expenses_sampleOrderId_idx" ON "sample_order_expenses"("sampleOrderId");`,
        `CREATE INDEX IF NOT EXISTS "sample_order_expenses_catalogId_idx" ON "sample_order_expenses"("catalogId");`,
        `CREATE TABLE IF NOT EXISTS "sample_order_components" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "sampleOrderId" TEXT NOT NULL REFERENCES "sample_orders"("id") ON DELETE CASCADE,
          "name" TEXT NOT NULL,
          "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
          "unit" TEXT NOT NULL DEFAULT 'قطعة',
          "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
          "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
          "priceSnapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS "sample_order_components_company_sample_idx" ON "sample_order_components"("companyId","sampleOrderId");`
      ];

      for (const stmt of stmts) {
        try {
          await prisma.$executeRawUnsafe(stmt);
        } catch (e) {
          // ignore individual duplicate/exists errors
        }
      }
      this._schemaEnsured = true;
    } catch (err) {
      // In SQLite/test mock environments, silently ignore
    }
  }

  /**
   * إجماليات العينة: fee (يدوي) + مجموع المصاريف snapshot.
   * ملاحظة T08: componentsTotal هيتضاف هنا — الكود ده جاهز ليه (Array.isArray guard).
   */
  static decorateTotals(sample) {
    if (!sample) return sample;
    const expenses = Array.isArray(sample.expenses) ? sample.expenses : [];
    const components = Array.isArray(sample.components) ? sample.components : [];
    const expensesTotal = round2(expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0));
    const componentsTotal = round2(components.reduce((s, c) => s + (Number(c.totalCost) || 0), 0));
    const baseFee = round2(sample.fee || 0);
    const received = sample.sampleReceived === true;
    const overdueDays = overdueDaysOf(sample, received);
    return {
      ...sample,
      expensesTotal,
      componentsTotal,
      totalCost: round2(baseFee + expensesTotal + componentsTotal),
      remaining: sample.remaining !== undefined ? sample.remaining : remainingOf(sample),
      isOverdue: sample.isOverdue !== undefined ? sample.isOverdue : overdueDays > 0,
      overdueDays: sample.overdueDays !== undefined ? sample.overdueDays : overdueDays,
    };
  }

  /**
   * مزامنة بنود مصاريف العينة (snapshot + حفظ تلقائي في الكتالوج)
   */
  static async syncSampleExpenses(tx, companyId, sampleId, incomingExpenses) {
    if (!Array.isArray(incomingExpenses)) return;
    for (const ex of incomingExpenses) {
      const exName = normalizeExpenseName(ex.name);

      let catalogId = ex.catalogId ? String(ex.catalogId) : null;
      let catalogRow = null;
      if (catalogId) {
        catalogRow = await tx.sampleExpenseCatalog.findFirst({ where: { id: catalogId, companyId } });
        if (!catalogRow) catalogId = null;
      }

      const finalName = exName || normalizeExpenseName(catalogRow?.name);
      const hasAmount = ex.amount !== undefined && ex.amount !== null && ex.amount !== '';
      const amountSource = hasAmount
        ? ex.amount
        : (catalogRow ? catalogRow.defaultAmount : ex.defaultAmount);
      const exAmount = normalizeAmount(amountSource);

      if (!finalName || exAmount === null) {
        const err = new Error('اسم المصروف ومبلغه مطلوبان (المبلغ رقم ≥ 0)');
        err.statusCode = 400;
        throw err;
      }

      if (!catalogId && ex.saveToCatalog !== false) {
        const existing = await tx.sampleExpenseCatalog.findFirst({ where: { companyId, name: finalName } });
        const cat = existing || await tx.sampleExpenseCatalog.create({
          data: { companyId, name: finalName, defaultAmount: exAmount },
        });
        catalogId = cat.id;
      }

      await tx.sampleOrderExpense.create({
        data: { sampleOrderId: sampleId, catalogId, name: finalName, amount: exAmount },
      });
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
    if (query.customerLinked === 'true') where.customerId = { not: null };
    if (query.customerLinked === 'false') where.customerId = null;
    if (query.partnerFactoryId) {
      where.partnerFactoryId = query.partnerFactoryId;
    }
    if (query.sampleReceived !== undefined && query.sampleReceived !== 'ALL' && query.sampleReceived !== '') {
      where.sampleReceived = String(query.sampleReceived) === 'true';
    }
    if (String(query.overdue) === 'true') {
      const todayCairoStr = businessToday('Africa/Cairo');
      const cairoStartOfDay = new Date(`${todayCairoStr}T00:00:00+03:00`);
      where.expectedDeliveryAt = { lt: cairoStartOfDay };
      where.status = { notIn: ['CONVERTED', 'REJECTED'] };
      where.sampleReceived = false;
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

    let items, total;
    try {
      [items, total] = await Promise.all([
        prisma.sampleOrder.findMany({
          where,
          include: {
            stages: { orderBy: { sequence: 'asc' } },
            attachments: { orderBy: { uploadedAt: 'desc' } },
            partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            bom: { select: { id: true, code: true, name: true } },
            expenses: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.sampleOrder.count({ where }),
      ]);
    } catch (err) {
      if (err.message && err.message.includes("Unknown field 'bom'")) {
        [items, total] = await Promise.all([
          prisma.sampleOrder.findMany({
            where,
            include: {
              stages: { orderBy: { sequence: 'asc' } },
              attachments: { orderBy: { uploadedAt: 'desc' } },
              customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
              expenses: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
          }),
          prisma.sampleOrder.count({ where }),
        ]);
      } else {
        throw err;
      }
    }

    // Enhance with bom details if not populated by include
    const missingBomIds = items.filter((s) => s.bomId && !s.bom).map((s) => s.bomId);
    let bomMap = {};
    if (missingBomIds.length > 0) {
      try {
        const boms = await prisma.billOfMaterials.findMany({
          where: { id: { in: Array.from(new Set(missingBomIds)) }, companyId },
          select: { id: true, code: true, name: true },
        });
        boms.forEach((b) => {
          bomMap[b.id] = b;
        });
      } catch (_) {}
    }

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

    const enrichedItems = items.map((s) => {
      const received = s.sampleReceived === true;
      const overdueDays = overdueDaysOf(s, received);
      return this.decorateTotals({
        ...s,
        bom: s.bom || (s.bomId ? bomMap[s.bomId] || null : null),
        convertedOrder: s.convertedOrderId ? orderMap[s.convertedOrderId] || null : null,
        remaining: remainingOf(s),
        isOverdue: overdueDays > 0,
        overdueDays,
      });
    });

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

    let sample;
    try {
      sample = await prisma.sampleOrder.findFirst({
        where: { id, companyId },
        include: {
          stages: { orderBy: { sequence: 'asc' } },
          attachments: { orderBy: { uploadedAt: 'desc' } },
          partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
          payments: { orderBy: { paidAt: 'desc' } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          bom: { select: { id: true, code: true, name: true } },
          expenses: { orderBy: { createdAt: 'asc' } },
        },
      });
    } catch (err) {
      if (err.message && err.message.includes("Unknown field 'bom'")) {
        sample = await prisma.sampleOrder.findFirst({
          where: { id, companyId },
          include: {
            stages: { orderBy: { sequence: 'asc' } },
            attachments: { orderBy: { uploadedAt: 'desc' } },
            partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
            payments: { orderBy: { paidAt: 'desc' } },
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            expenses: { orderBy: { createdAt: 'asc' } },
          },
        });
      } else {
        throw err;
      }
    }

    if (!sample) {
      const err = new Error('أمر تصنيع العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (sample.bomId && !sample.bom) {
      try {
        sample.bom = await prisma.billOfMaterials.findFirst({
          where: { id: sample.bomId, companyId },
          select: { id: true, code: true, name: true },
        });
      } catch (_) {}
    }

    let convertedOrder = null;
    if (sample.convertedOrderId) {
      convertedOrder = await prisma.productionOrder.findFirst({
        where: { id: sample.convertedOrderId, companyId },
        select: { id: true, orderNumber: true, status: true, plannedQuantity: true, orderType: true },
      });
    }

    const received = sample.sampleReceived === true;
    const overdueDays = overdueDaysOf(sample, received);
    return this.decorateTotals({
      ...sample,
      convertedOrder,
      remaining: remainingOf(sample),
      isOverdue: overdueDays > 0,
      overdueDays,
    });
  }

  /**
   * Create new sample order
   */
  static async createSampleOrder(companyId, user, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    let productId = data.productId ? String(data.productId) : null;
    let productName = String(data.productName || '').trim();
    if (productId) {
      const product = await prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true, name: true } });
      if (!product) throw httpErr(400, 'المنتج المختار غير موجود في هذه الشركة');
      if (!productName) productName = product.name;
    }
    if (!productName && !productId) throw httpErr(400, 'اسم المنتج إلزامي لإنشاء أمر العينة');
    if (!productName) {
      const err = new Error('اسم المنتج إلزامي لإنشاء أمر العينة');
      err.statusCode = 400;
      throw err;
    }

    const plannedQuantity = Math.max(1, parseInt(data.plannedQuantity, 10) || 1);
    const materialSource = data.materialSource === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY';
    const fee = data.fee !== undefined && data.fee !== null && data.fee !== '' ? round2(data.fee) : null;

    const totalAmount = data.totalAmount !== undefined && data.totalAmount !== null && data.totalAmount !== ''
      ? round2(data.totalAmount)
      : (fee !== null ? fee : null);
    const depositAmount = data.depositAmount !== undefined && data.depositAmount !== null && data.depositAmount !== ''
      ? round2(data.depositAmount) : 0;
    if (depositAmount < 0) throw httpErr(400, 'العربون لا يمكن أن يكون بالسالب');
    if (totalAmount !== null && depositAmount > totalAmount) throw httpErr(400, 'العربون أكبر من إجمالي العينة');
    if (data.partnerFactoryId) {
      const factory = await prisma.partnerFactory.findFirst({
        where: { id: String(data.partnerFactoryId), companyId },
        select: { id: true },
      });
      if (!factory) throw httpErr(400, 'المصنع الشريك غير موجود في هذه الشركة');
    }
    const expectedDeliveryAt = data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : null;
    if (expectedDeliveryAt && isNaN(expectedDeliveryAt.getTime())) throw httpErr(400, 'موعد استلام العينة غير صحيح');

    const sampleReceived = data.sampleReceived === true || data.sampleReceived === 'true';
    let receivedAt = null;
    if (sampleReceived) {
      receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date();
      if (isNaN(receivedAt.getTime())) receivedAt = new Date();
    } else if (data.receivedAt) {
      receivedAt = new Date(data.receivedAt);
      if (isNaN(receivedAt.getTime())) receivedAt = null;
    }

    let customerId = data.customerId ? String(data.customerId) : null;
    let customerName = data.customerName ? String(data.customerName).trim() : null;
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!customer) {
        const err = new Error('العميل غير موجود في هذه الشركة');
        err.statusCode = 400;
        throw err;
      }
      if (!customerName) customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
    }

    // Retry loop for atomic sequence collision protection
    const incomingExpenses = Array.isArray(data.expenses) ? data.expenses : [];
    let attempts = 0;
    while (attempts < 5) {
      try {
        attempts++;
        const sampleNumber = data.sampleNumber || (await this.generateSampleNumber(companyId));

        const created = await prisma.$transaction(async (tx) => {
          const sample = await tx.sampleOrder.create({
            data: {
              companyId,
              sampleNumber,
              customerId,
              customerName,
              brandName: data.brandName ? String(data.brandName).trim() : null,
              productName,
              productId,
              bomId: data.bomId || null,
              techPackId: data.techPackId || null,
              plannedQuantity,
              size: data.size ? String(data.size).trim().toUpperCase() : null,
              color: data.color ? String(data.color).trim().toUpperCase() : null,
              materialSource,
              fee,
              status: 'DRAFT',
              dueDate: data.dueDate ? new Date(data.dueDate) : null,
              partnerFactoryId: data.partnerFactoryId ? String(data.partnerFactoryId).trim() : null,
              expectedDeliveryAt,
              sampleReceived,
              receivedAt,
              totalAmount,
              depositAmount,
              paidAmount: 0,
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

          let paid = 0;
          if (depositAmount > 0) {
            await tx.samplePayment.create({
              data: {
                companyId,
                sampleOrderId: sample.id,
                kind: 'DEPOSIT',
                amount: depositAmount,
                paidAt: new Date(),
                notes: 'عربون العينة',
                createdById: user?.id ? String(user.id) : null,
              },
            });
            paid = depositAmount;
            await tx.sampleOrder.update({ where: { id: sample.id }, data: { paidAmount: paid } });
          }

          // مزامنة مصاريف العينة (T07)
          await this.syncSampleExpenses(tx, companyId, sample.id, incomingExpenses);

          let createdRecord;
          try {
            createdRecord = await tx.sampleOrder.findFirst({
              where: { id: sample.id, companyId },
              include: {
                stages: { orderBy: { sequence: 'asc' } },
                attachments: true,
                partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
                payments: { orderBy: { paidAt: 'desc' } },
                customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
                bom: { select: { id: true, code: true, name: true } },
                expenses: { orderBy: { createdAt: 'asc' } },
              },
            });
          } catch (err) {
            if (err.message && err.message.includes("Unknown field 'bom'")) {
              createdRecord = await tx.sampleOrder.findFirst({
                where: { id: sample.id, companyId },
                include: {
                  stages: { orderBy: { sequence: 'asc' } },
                  attachments: true,
                  partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
                  payments: { orderBy: { paidAt: 'desc' } },
                  customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
                  expenses: { orderBy: { createdAt: 'asc' } },
                },
              });
            } else {
              throw err;
            }
          }
          if (createdRecord?.bomId && !createdRecord.bom) {
            try {
              createdRecord.bom = await tx.billOfMaterials.findFirst({
                where: { id: createdRecord.bomId, companyId },
                select: { id: true, code: true, name: true },
              });
            } catch (_) {}
          }
          const received = createdRecord.sampleReceived === true;
          const overdueDays = overdueDaysOf(createdRecord, received);
          return this.decorateTotals({
            ...createdRecord,
            remaining: remainingOf(createdRecord),
            isOverdue: overdueDays > 0,
            overdueDays,
          });
        });
        ManufacturingNotificationService.emit('SAMPLE_CREATED', { companyId, sampleOrder: created, actorId: user?.id }).catch(() => {});
        return created;
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

    if (existing.status === 'CONVERTED' || existing.convertedOrderId) {
      const err = new Error('لا يمكن تعديل عينة تم تحويلها بالفعل إلى أمر إنتاج');
      err.statusCode = 400;
      throw err;
    }

    const nonReceiptKeys = Object.keys(data).filter(
      (k) => !['sampleReceived', 'receivedAt', 'status', 'allowNonDraft'].includes(k)
    );
    if (!data.allowNonDraft && existing.status !== 'DRAFT' && nonReceiptKeys.length > 0) {
      const err = new Error('لا يمكن تعديل بيانات العينة إلا في حالة المسودة (DRAFT)');
      err.statusCode = 400;
      throw err;
    }

    const updateData = {};
    if (data.status !== undefined) {
      const validStatuses = ['DRAFT', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED'];
      if (validStatuses.includes(data.status)) {
        updateData.status = data.status;
      }
    }
    if (data.sampleReceived !== undefined) {
      const isRec = data.sampleReceived === true || data.sampleReceived === 'true';
      updateData.sampleReceived = isRec;
      if (isRec) {
        const rDate = data.receivedAt ? new Date(data.receivedAt) : (existing.receivedAt || new Date());
        updateData.receivedAt = isNaN(rDate.getTime()) ? new Date() : rDate;
      } else {
        updateData.receivedAt = null;
      }
    } else if (data.receivedAt !== undefined) {
      if (data.receivedAt) {
        const rDate = new Date(data.receivedAt);
        if (!isNaN(rDate.getTime())) {
          updateData.receivedAt = rDate;
          updateData.sampleReceived = true;
        }
      } else {
        updateData.receivedAt = null;
        updateData.sampleReceived = false;
      }
    }
    if (data.customerId !== undefined) {
      if (data.customerId) {
        const cId = String(data.customerId);
        const customer = await prisma.customer.findFirst({
          where: { id: cId, companyId },
          select: { id: true, firstName: true, lastName: true },
        });
        if (!customer) {
          const err = new Error('العميل غير موجود في هذه الشركة');
          err.statusCode = 400;
          throw err;
        }
        updateData.customerId = cId;
        if (data.customerName === undefined && !existing.customerName) {
          updateData.customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
        }
      } else {
        updateData.customerId = null;
      }
    }
    if (data.productId !== undefined) {
      if (data.productId) {
        const pId = String(data.productId);
        const product = await prisma.product.findFirst({
          where: { id: pId, companyId },
          select: { id: true, name: true },
        });
        if (!product) throw httpErr(400, 'المنتج المختار غير موجود في هذه الشركة');
        updateData.productId = pId;
        if (data.productName === undefined && !existing.productName) {
          updateData.productName = product.name;
        }
      } else {
        updateData.productId = null;
      }
    }
    if (data.productName !== undefined) updateData.productName = String(data.productName).trim();
    if (data.customerName !== undefined) updateData.customerName = data.customerName ? String(data.customerName).trim() : null;
    if (data.brandName !== undefined) updateData.brandName = data.brandName ? String(data.brandName).trim() : null;
    if (data.bomId !== undefined) updateData.bomId = data.bomId || null;
    if (data.techPackId !== undefined) updateData.techPackId = data.techPackId || null;
    if (data.plannedQuantity !== undefined) updateData.plannedQuantity = Math.max(1, parseInt(data.plannedQuantity, 10) || 1);
    if (data.size !== undefined) updateData.size = data.size ? String(data.size).trim().toUpperCase() : null;
    if (data.color !== undefined) updateData.color = data.color ? String(data.color).trim().toUpperCase() : null;
    if (data.materialSource !== undefined) updateData.materialSource = data.materialSource === 'CUSTOMER' ? 'CUSTOMER' : 'COMPANY';
    if (data.fee !== undefined) updateData.fee = data.fee !== null && data.fee !== '' ? round2(data.fee) : null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.partnerFactoryId !== undefined) {
      if (data.partnerFactoryId) {
        const fId = String(data.partnerFactoryId).trim();
        const factory = await prisma.partnerFactory.findFirst({
          where: { id: fId, companyId },
          select: { id: true },
        });
        if (!factory) throw httpErr(400, 'المصنع الشريك غير موجود في هذه الشركة');
        updateData.partnerFactoryId = fId;
      } else {
        updateData.partnerFactoryId = null;
      }
    }
    if (data.expectedDeliveryAt !== undefined) {
      updateData.expectedDeliveryAt = data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : null;
    }
    if (data.totalAmount !== undefined) {
      updateData.totalAmount = data.totalAmount !== null && data.totalAmount !== '' ? round2(data.totalAmount) : null;
    }
    if (data.depositAmount !== undefined) {
      const dep = data.depositAmount !== null && data.depositAmount !== '' ? round2(data.depositAmount) : 0;
      if (dep < 0) throw httpErr(400, 'العربون لا يمكن أن يكون بالسالب');
      const pCount = await prisma.samplePayment.count({ where: { sampleOrderId: id } });
      if (pCount > 0) {
        throw httpErr(400, 'العربون تحول إلى دفعة مسجلة، يرجى تعديل الدفعات بدلاً من تعديل العربون');
      }
      updateData.depositAmount = dep;
    }
    if (data.designNotes !== undefined) updateData.designNotes = data.designNotes ? String(data.designNotes).trim() : null;

    let updatedRecord;
    return await prisma.$transaction(async (tx) => {
      if (data.expenses !== undefined) {
        await tx.sampleOrderExpense.deleteMany({ where: { sampleOrderId: id } });
        await this.syncSampleExpenses(tx, companyId, id, data.expenses);
      }

      try {
        updatedRecord = await tx.sampleOrder.update({
          where: { id },
          data: updateData,
          include: {
            stages: { orderBy: { sequence: 'asc' } },
            attachments: true,
            partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
            payments: { orderBy: { paidAt: 'desc' } },
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            bom: { select: { id: true, code: true, name: true } },
            expenses: { orderBy: { createdAt: 'asc' } },
          },
        });
      } catch (err) {
        if (err.message && err.message.includes("Unknown field 'bom'")) {
          updatedRecord = await tx.sampleOrder.update({
            where: { id },
            data: updateData,
            include: {
              stages: { orderBy: { sequence: 'asc' } },
              attachments: true,
              partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
              payments: { orderBy: { paidAt: 'desc' } },
              customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
              expenses: { orderBy: { createdAt: 'asc' } },
            },
          });
        } else {
          throw err;
        }
      }

      if (updatedRecord?.bomId && !updatedRecord.bom) {
        try {
          updatedRecord.bom = await tx.billOfMaterials.findFirst({
            where: { id: updatedRecord.bomId, companyId },
            select: { id: true, code: true, name: true },
          });
        } catch (_) {}
      }

      const received = updatedRecord.sampleReceived === true;
      const overdueDays = overdueDaysOf(updatedRecord, received);
      return this.decorateTotals({
        ...updatedRecord,
        remaining: remainingOf(updatedRecord),
        isOverdue: overdueDays > 0,
        overdueDays,
      });
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

    if (existing.status === 'CONVERTED' || existing.convertedOrderId) {
      let activeOrder = null;
      if (existing.convertedOrderId && prisma.productionOrder) {
        activeOrder = await prisma.productionOrder.findFirst({
          where: { id: existing.convertedOrderId, companyId },
          select: { id: true, orderNumber: true },
        });
      }
      if (activeOrder) {
        const err = new Error(`لا يمكن حذف عينة تم تحويلها بالفعل إلى أمر إنتاج قائم (${activeOrder.orderNumber})`);
        err.statusCode = 400;
        throw err;
      }
    }

    await prisma.$transaction(async (tx) => {
      if (tx.sampleOrderExpense) {
        await tx.sampleOrderExpense.deleteMany({ where: { sampleOrderId: id } });
      }
      if (tx.samplePayment) {
        await tx.samplePayment.deleteMany({ where: { sampleOrderId: id } });
      }
      if (tx.sampleComponent) {
        await tx.sampleComponent.deleteMany({ where: { sampleOrderId: id } });
      }
      if (tx.sampleShareLink) {
        await tx.sampleShareLink.deleteMany({ where: { sampleOrderId: id } });
      }
      if (tx.sampleOrderStage) {
        await tx.sampleOrderStage.deleteMany({ where: { sampleOrderId: id } });
      }
      if (tx.sampleOrderAttachment) {
        await tx.sampleOrderAttachment.deleteMany({ where: { sampleOrderId: id } });
      }
      if (tx.manufacturingNotificationLog) {
        await tx.manufacturingNotificationLog.deleteMany({
          where: { entityType: 'SAMPLE_ORDER', entityId: id },
        });
      }
      if (tx.productionOrder) {
        await tx.productionOrder.updateMany({
          where: { sourceSampleOrderId: id, companyId },
          data: { sourceSampleOrderId: null },
        });
      }
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
   * Delete attachment / file from sample order
   */
  static async deleteSampleFile(companyId, user, sampleId, fileId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id: sampleId, companyId },
    });
    if (!sample) throw httpErr(404, 'أمر العينة غير موجود');

    const att = await prisma.sampleOrderAttachment.findFirst({
      where: { id: fileId, sampleOrderId: sampleId },
    });
    if (!att) throw httpErr(404, 'الملف المرفق غير موجود');

    await prisma.sampleOrderAttachment.delete({
      where: { id: fileId },
    });

    return { success: true, message: 'تم حذف المرفق بنجاح' };
  }

  /**
   * Mark sample order as received or not received
   */
  static async markSampleReceived(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
    });
    if (!sample) throw httpErr(404, 'أمر العينة غير موجود');

    const isReceived = data.received !== undefined
      ? (data.received === true || data.received === 'true')
      : true;

    let receivedAt = null;
    if (isReceived) {
      receivedAt = data.receivedAt ? new Date(data.receivedAt) : (sample.receivedAt || new Date());
      if (isNaN(receivedAt.getTime())) receivedAt = new Date();
    }

    const updated = await prisma.sampleOrder.update({
      where: { id },
      data: {
        sampleReceived: isReceived,
        receivedAt,
      },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: { orderBy: { uploadedAt: 'desc' } },
        partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
        payments: { orderBy: { paidAt: 'desc' } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        bom: { select: { id: true, code: true, name: true } },
        expenses: { orderBy: { createdAt: 'asc' } },
      },
    });

    return this.decorateTotals(updated);
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

    const updated = await prisma.sampleOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        resultNotes,
      },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: true,
        expenses: { orderBy: { createdAt: 'asc' } },
      },
    });
    ManufacturingNotificationService.emit('SAMPLE_APPROVED', { companyId, sampleOrder: { ...sample, ...updated } }).catch(() => {});
    return this.decorateTotals(updated);
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

    const updated = await prisma.sampleOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        resultNotes: reason,
      },
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: true,
        expenses: { orderBy: { createdAt: 'asc' } },
      },
    });
    ManufacturingNotificationService.emit('SAMPLE_REJECTED', { companyId, sampleOrder: { ...sample, ...updated } }).catch(() => {});
    return this.decorateTotals(updated);
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
        expenses: { orderBy: { createdAt: 'asc' } },
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

    // T03: اختيار المصنع الصريح (نفس مصنع العينة / مصنع مختلف)
    // ملاحظة: sample.partnerFactoryId ملك T06 — بنقراه بشكل متسامح (مفيش crash لو الحقل مش موجود)
    const sampleFactoryId = sample.partnerFactoryId ? String(sample.partnerFactoryId) : null;
    const factoryMode = String(data.factoryMode || '').toUpperCase();       // 'SAME' | 'DIFFERENT' | ''
    const requestedFactoryId = data.partnerFactoryId ? String(data.partnerFactoryId) : null;

    let resolvedFactoryId = null;
    if (factoryMode === 'SAME' || (!factoryMode && sampleFactoryId && !requestedFactoryId)) {
      resolvedFactoryId = sampleFactoryId;
    } else if (factoryMode === 'DIFFERENT' || requestedFactoryId) {
      resolvedFactoryId = requestedFactoryId;
    }

    if (!resolvedFactoryId) {
      const err = new Error('اختار مصنع التنفيذ قبل التحويل: العينة مش مربوطة بمصنع، فلازم تحدد «مصنع مختلف»');
      err.statusCode = 400;
      throw err;
    }

    // تحقق الملكية + النشاط (نفس رسالة createOrder عشان الاتساق)
    const factory = await prisma.partnerFactory.findFirst({
      where: { id: resolvedFactoryId, companyId },
      select: { id: true, name: true, isActive: true },
    });
    if (!factory) {
      const err = new Error('المصنع الشريك غير موجود أو لا ينتمي لهذه الشركة');
      err.statusCode = 400;
      throw err;
    }
    if (factory.isActive === false) {
      const err = new Error(`المصنع «${factory.name}» غير نشط — اختار مصنع تاني`);
      err.statusCode = 400;
      throw err;
    }

    const conversionNote = `محوّل من أمر العينة ${sample.sampleNumber} — مصنع التنفيذ: ${factory.name}`;
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
      defaultPartnerFactoryId: resolvedFactoryId,
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
        expenses: { orderBy: { createdAt: 'asc' } },
      },
    });

    ManufacturingNotificationService.emit('SAMPLE_CONVERTED', {
      companyId,
      sampleOrder: updatedSample,
      productionOrder: createdOrder,
      actorId: user?.id,
    }).catch(() => {});

    return {
      success: true,
      message: `تم تحويل العينة بنجاح إلى أمر تصنيع (مصنع التنفيذ: ${factory.name})`,
      order: createdOrder,
      factory: { id: factory.id, name: factory.name },
      sampleOrder: this.decorateTotals({
        ...updatedSample,
        convertedOrder: createdOrder,
      }),
    };
  }

  /**
   * Update sample order commercial data (factory, expected delivery, total amount, deposit)
   * Available in any status except CONVERTED
   */
  static async updateSampleCommercial(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
    });
    if (!sample) throw httpErr(404, 'أمر العينة غير موجود');
    if (sample.status === 'CONVERTED') {
      throw httpErr(400, 'لا يمكن تعديل البيانات التجارية لعينة تم تحويلها بالفعل');
    }

    const isModifyingAmounts = data.totalAmount !== undefined || data.depositAmount !== undefined;
    if (isModifyingAmounts && !isCompanyAdminOrOwner(user)) {
      throw httpErr(403, 'تعديل المبالغ المالية للعينة يتطلب صلاحيات مسؤول الشركة أو المالك');
    }

    const updateData = {};
    if (data.partnerFactoryId !== undefined) {
      if (data.partnerFactoryId) {
        const fId = String(data.partnerFactoryId).trim();
        const factory = await prisma.partnerFactory.findFirst({
          where: { id: fId, companyId },
          select: { id: true },
        });
        if (!factory) throw httpErr(400, 'المصنع الشريك غير موجود في هذه الشركة');
        updateData.partnerFactoryId = fId;
      } else {
        updateData.partnerFactoryId = null;
      }
    }
    if (data.expectedDeliveryAt !== undefined) {
      updateData.expectedDeliveryAt = data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : null;
    }
    if (data.totalAmount !== undefined) {
      const tot = data.totalAmount !== null && data.totalAmount !== '' ? round2(data.totalAmount) : null;
      if (tot !== null && tot < 0) throw httpErr(400, 'إجمالي العينة لا يمكن أن يكون بالسالب');
      if (tot !== null && Number(sample.paidAmount || 0) > tot) {
        throw httpErr(400, `إجمالي العينة لا يمكن أن يكون أقل من المدفوع الحالي (${sample.paidAmount})`);
      }
      updateData.totalAmount = tot;
    }
    if (data.depositAmount !== undefined) {
      const dep = data.depositAmount !== null && data.depositAmount !== '' ? round2(data.depositAmount) : 0;
      if (dep < 0) throw httpErr(400, 'العربون لا يمكن أن يكون بالسالب');
      const pCount = await prisma.samplePayment.count({ where: { sampleOrderId: id } });
      if (pCount > 0) {
        throw httpErr(400, 'العربون تحول إلى دفعة مسجلة، يرجى تعديل الدفعات بدلاً من تعديل العربون');
      }
      const currentTotal = updateData.totalAmount !== undefined
        ? updateData.totalAmount
        : (sample.totalAmount !== null && sample.totalAmount !== undefined ? Number(sample.totalAmount) : Number(sample.fee || 0));
      if (currentTotal !== null && dep > currentTotal) {
        throw httpErr(400, 'العربون أكبر من إجمالي العينة');
      }
      updateData.depositAmount = dep;
    }

    const updated = await prisma.sampleOrder.update({
      where: { id },
      data: updateData,
      include: {
        stages: { orderBy: { sequence: 'asc' } },
        attachments: true,
        partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
        payments: { orderBy: { paidAt: 'desc' } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        expenses: { orderBy: { createdAt: 'asc' } },
      },
    });

    return this.decorateTotals(updated);
  }

  /**
   * Add payment to sample order
   */
  static async addSamplePayment(companyId, user, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    const amount = round2(data.amount);
    if (!amount || amount <= 0) throw httpErr(400, 'مبلغ الدفعة يجب أن يكون رقماً موجباً');

    const validMethods = [
      'CASH',
      'CREDIT_CARD',
      'BANK_TRANSFER',
      'PAYPAL',
      'STRIPE',
      'WALLET',
      'INSTAPAY',
      'VISA',
      'MASTERCARD',
      'VODAFONE_CASH',
    ];
    let method = data.method ? String(data.method).trim().toUpperCase() : null;
    if (method && !validMethods.includes(method)) {
      throw httpErr(400, `طريقة الدفع غير صحيحة: ${method}`);
    }

    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    if (isNaN(paidAt.getTime())) throw httpErr(400, 'تاريخ الدفعة غير صحيح');

    return await prisma.$transaction(async (tx) => {
      const sample = await tx.sampleOrder.findFirst({
        where: { id, companyId },
        include: { payments: true },
      });
      if (!sample) throw httpErr(404, 'أمر العينة غير موجود');

      const remaining = remainingOf(sample);
      if (amount > remaining) throw httpErr(400, `المبلغ أكبر من المتبقي (${remaining})`);

      const validKinds = ['DEPOSIT', 'INSTALLMENT', 'FINAL', 'CUSTOM'];
      let kind = data.kind ? String(data.kind).trim().toUpperCase() : (Number(sample.paidAmount || 0) === 0 ? 'DEPOSIT' : 'INSTALLMENT');
      if (!validKinds.includes(kind)) kind = 'INSTALLMENT';

      await tx.samplePayment.create({
        data: {
          companyId,
          sampleOrderId: id,
          kind,
          amount,
          method,
          paidAt,
          reference: data.reference ? String(data.reference).trim() : null,
          notes: data.notes ? String(data.notes).trim() : null,
          createdById: user?.id ? String(user.id) : null,
        },
      });

      const agg = await tx.samplePayment.aggregate({
        where: { sampleOrderId: id },
        _sum: { amount: true },
      });
      const paid = round2(agg._sum.amount || 0);

      const updated = await tx.sampleOrder.update({
        where: { id },
        data: { paidAmount: paid },
        include: {
          stages: { orderBy: { sequence: 'asc' } },
          attachments: true,
          partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
          payments: { orderBy: { paidAt: 'desc' } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          expenses: { orderBy: { createdAt: 'asc' } },
        },
      });

      return this.decorateTotals(updated);
    });
  }

  /**
   * Delete payment from sample order (Company Admin / Owner only)
   */
  static async deleteSamplePayment(companyId, user, id, paymentId) {
    await this.ensureSchema();
    if (!isCompanyAdminOrOwner(user)) {
      throw httpErr(403, 'حذف الدفعة يتطلب صلاحيات مسؤول الشركة أو المالك');
    }

    const prisma = getSharedPrismaClient();
    return await prisma.$transaction(async (tx) => {
      const sample = await tx.sampleOrder.findFirst({
        where: { id, companyId },
      });
      if (!sample) throw httpErr(404, 'أمر العينة غير موجود');

      const payment = await tx.samplePayment.findFirst({
        where: { id: paymentId, sampleOrderId: id, companyId },
      });
      if (!payment) throw httpErr(404, 'الدفعة غير موجودة');

      await tx.samplePayment.delete({ where: { id: paymentId } });

      const agg = await tx.samplePayment.aggregate({
        where: { sampleOrderId: id },
        _sum: { amount: true },
      });
      const paid = round2(agg._sum.amount || 0);

      const updated = await tx.sampleOrder.update({
        where: { id },
        data: { paidAmount: paid },
        include: {
          stages: { orderBy: { sequence: 'asc' } },
          attachments: true,
          partnerFactory: { select: { id: true, name: true, code: true, contactPerson: true, phone: true, email: true } },
          payments: { orderBy: { paidAt: 'desc' } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          expenses: { orderBy: { createdAt: 'asc' } },
        },
      });

      return this.decorateTotals(updated);
    });
  }

  /**
   * List payments for a sample order
   */
  static async listSamplePayments(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    const sample = await prisma.sampleOrder.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!sample) throw httpErr(404, 'أمر العينة غير موجود');

    return await prisma.samplePayment.findMany({
      where: { sampleOrderId: id, companyId },
      orderBy: { paidAt: 'desc' },
    });
  }

  // ==========================================================================
  // T07: Recurring Expenses Catalog & Order Expenses
  // ==========================================================================

  // ===== كتالوج المصاريف المتكررة =====

  static async listExpenseCatalog(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    const includeInactive = String(query.includeInactive || '') === '1' || query.includeInactive === true || String(query.includeInactive) === 'true';
    return await prisma.sampleExpenseCatalog.findMany({
      where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  static async createExpenseCatalogItem(companyId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    const name = normalizeExpenseName(data.name);
    const amount = normalizeAmount(data.defaultAmount);
    if (!name) { const e = new Error('اسم المصروف إلزامي'); e.statusCode = 400; throw e; }
    if (amount === null) { const e = new Error('السعر الافتراضي لازم يكون رقم ≥ 0'); e.statusCode = 400; throw e; }
    const dup = await prisma.sampleExpenseCatalog.findFirst({ where: { companyId, name } });
    if (dup) { const e = new Error('اسم المصروف موجود بالفعل في الكتالوج'); e.statusCode = 409; throw e; }
    return await prisma.sampleExpenseCatalog.create({ data: { companyId, name, defaultAmount: amount } });
  }

  static async updateExpenseCatalogItem(companyId, id, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    const item = await prisma.sampleExpenseCatalog.findFirst({ where: { id, companyId } });
    if (!item) { const e = new Error('بند المصروف غير موجود'); e.statusCode = 404; throw e; }
    const patch = {};
    if (data.name !== undefined) {
      const name = normalizeExpenseName(data.name);
      if (!name) { const e = new Error('اسم المصروف إلزامي'); e.statusCode = 400; throw e; }
      const dup = await prisma.sampleExpenseCatalog.findFirst({ where: { companyId, name, id: { not: id } } });
      if (dup) { const e = new Error('اسم المصروف موجود بالفعل في الكتالوج'); e.statusCode = 409; throw e; }
      patch.name = name;
    }
    if (data.defaultAmount !== undefined) {
      const amount = normalizeAmount(data.defaultAmount);
      if (amount === null) { const e = new Error('السعر الافتراضي لازم يكون رقم ≥ 0'); e.statusCode = 400; throw e; }
      patch.defaultAmount = amount;
    }
    if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);
    return await prisma.sampleExpenseCatalog.update({ where: { id }, data: patch });
  }

  static async archiveExpenseCatalogItem(companyId, id) {
    // soft delete: البنود القديمة بتفضل مرتبطة (catalogId)، والكتالوج بيخفيها
    return await this.updateExpenseCatalogItem(companyId, id, { isActive: false });
  }

  // ===== مصاريف العينة =====

  static async addSampleExpense(companyId, user, sampleId, data = {}) {
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
    if (sample.status === 'CONVERTED') {
      const err = new Error('لا يمكن إضافة مصاريف لعينة تم تحويلها بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const exName = normalizeExpenseName(data.name);
    let catalogId = data.catalogId ? String(data.catalogId) : null;
    let catalogRow = null;
    if (catalogId) {
      catalogRow = await prisma.sampleExpenseCatalog.findFirst({ where: { id: catalogId, companyId } });
      if (!catalogRow) catalogId = null;
    }

    const finalName = exName || normalizeExpenseName(catalogRow?.name);
    const hasAmount = data.amount !== undefined && data.amount !== null && data.amount !== '';
    const amountSource = hasAmount
      ? data.amount
      : (catalogRow ? catalogRow.defaultAmount : data.defaultAmount);
    const exAmount = normalizeAmount(amountSource);

    if (!finalName || exAmount === null) {
      const err = new Error('اسم المصروف ومبلغه مطلوبان (المبلغ رقم ≥ 0)');
      err.statusCode = 400;
      throw err;
    }

    if (!catalogId && data.saveToCatalog !== false) {
      const existing = await prisma.sampleExpenseCatalog.findFirst({ where: { companyId, name: finalName } });
      const cat = existing || await prisma.sampleExpenseCatalog.create({
        data: { companyId, name: finalName, defaultAmount: exAmount },
      });
      catalogId = cat.id;
    }

    const expense = await prisma.sampleOrderExpense.create({
      data: {
        sampleOrderId: sampleId,
        catalogId,
        name: finalName,
        amount: exAmount,
      },
    });

    return expense;
  }

  static async updateSampleExpense(companyId, user, sampleId, expenseId, data = {}) {
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
    if (sample.status === 'CONVERTED') {
      const err = new Error('لا يمكن تعديل مصاريف عينة تم تحويلها بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const expense = await prisma.sampleOrderExpense.findFirst({
      where: { id: expenseId, sampleOrderId: sampleId },
    });
    if (!expense) {
      const err = new Error('بند المصروف غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const patch = {};
    if (data.name !== undefined) {
      const name = normalizeExpenseName(data.name);
      if (!name) {
        const err = new Error('اسم المصروف إلزامي');
        err.statusCode = 400;
        throw err;
      }
      patch.name = name;
    }
    if (data.amount !== undefined) {
      const amount = normalizeAmount(data.amount);
      if (amount === null) {
        const err = new Error('المبلغ لازم يكون رقم ≥ 0');
        err.statusCode = 400;
        throw err;
      }
      patch.amount = amount;
    }

    return await prisma.sampleOrderExpense.update({
      where: { id: expenseId },
      data: patch,
    });
  }

  static async deleteSampleExpense(companyId, user, sampleId, expenseId) {
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
    if (sample.status === 'CONVERTED') {
      const err = new Error('لا يمكن حذف مصاريف عينة تم تحويلها بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const expense = await prisma.sampleOrderExpense.findFirst({
      where: { id: expenseId, sampleOrderId: sampleId },
    });
    if (!expense) {
      const err = new Error('بند المصروف غير موجود');
      err.statusCode = 404;
      throw err;
    }

    await prisma.sampleOrderExpense.delete({
      where: { id: expenseId },
    });

    return { success: true, message: 'تم حذف بند المصروف بنجاح' };
  }

  // ===== مكونات العينة (Task 83791d03) =====

  /**
   * حساب إجمالي بند المكوّن = الكمية × سعر الوحدة، مقرّب لخانتين عشريتين.
   */
  static computeComponentTotal(quantity, unitPrice) {
    return sampleComponentMath.computeComponentTotal(quantity, unitPrice);
  }

  static normalizeComponentQuantity(value) {
    return sampleComponentMath.normalizeQuantity(value);
  }

  static normalizeComponentPrice(value) {
    return sampleComponentMath.normalizePrice(value);
  }

  static async assertSampleEditable(prisma, companyId, sampleId, actionLabel = 'تعديل') {
    const sample = await prisma.sampleOrder.findFirst({
      where: { id: sampleId, companyId },
      select: { id: true, status: true },
    });
    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }
    if (sample.status === 'CONVERTED') {
      const err = new Error(`لا يمكن ${actionLabel} مكونات عينة تم تحويلها بالفعل`);
      err.statusCode = 400;
      throw err;
    }
    return sample;
  }

  static async listSampleComponents(companyId, sampleId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const sample = await prisma.sampleOrder.findFirst({
      where: { id: sampleId, companyId },
      select: { id: true, status: true },
    });
    if (!sample) {
      const err = new Error('أمر العينة غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const components = await prisma.sampleComponent.findMany({
      where: { companyId, sampleOrderId: sampleId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      components,
      totalCost: this.sumComponentTotals(components),
      count: components.length,
    };
  }

  static sumComponentTotals(components) {
    const total = (Array.isArray(components) ? components : []).reduce((acc, item) => {
      const value = Number(item && item.totalCost);
      return acc + (Number.isFinite(value) ? value : 0);
    }, 0);
    return Math.round(total * 100) / 100;
  }

  static async addSampleComponent(companyId, user, sampleId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    await this.assertSampleEditable(prisma, companyId, sampleId, 'إضافة');

    const name = String(data.name || '').trim();
    if (!name) {
      const err = new Error('اسم المكوّن إلزامي');
      err.statusCode = 400;
      throw err;
    }

    const quantity = this.normalizeComponentQuantity(data.quantity);
    if (quantity === null) {
      const err = new Error('الكمية لازم تكون رقم أكبر من صفر');
      err.statusCode = 400;
      throw err;
    }

    const unitPrice = this.normalizeComponentPrice(data.unitPrice);
    if (unitPrice === null) {
      const err = new Error('سعر الوحدة لازم يكون رقم ≥ 0');
      err.statusCode = 400;
      throw err;
    }

    const unit = String(data.unit || '').trim() || 'قطعة';
    const totalCost = this.computeComponentTotal(quantity, unitPrice);

    return await prisma.sampleComponent.create({
      data: {
        companyId,
        sampleOrderId: sampleId,
        name,
        quantity,
        unit,
        unitPrice,
        totalCost,
        sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
      },
    });
  }

  static async updateSampleComponent(companyId, user, sampleId, componentId, data = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    await this.assertSampleEditable(prisma, companyId, sampleId, 'تعديل');

    const component = await prisma.sampleComponent.findFirst({
      where: { id: componentId, sampleOrderId: sampleId, companyId },
    });
    if (!component) {
      const err = new Error('المكوّن غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const patch = {};

    if (data.name !== undefined) {
      const name = String(data.name || '').trim();
      if (!name) {
        const err = new Error('اسم المكوّن إلزامي');
        err.statusCode = 400;
        throw err;
      }
      patch.name = name;
    }

    if (data.quantity !== undefined) {
      const quantity = this.normalizeComponentQuantity(data.quantity);
      if (quantity === null) {
        const err = new Error('الكمية لازم تكون رقم أكبر من صفر');
        err.statusCode = 400;
        throw err;
      }
      patch.quantity = quantity;
    }

    if (data.unit !== undefined) {
      patch.unit = String(data.unit || '').trim() || 'قطعة';
    }

    const priceChanged = data.unitPrice !== undefined;
    if (priceChanged) {
      const unitPrice = this.normalizeComponentPrice(data.unitPrice);
      if (unitPrice === null) {
        const err = new Error('سعر الوحدة لازم يكون رقم ≥ 0');
        err.statusCode = 400;
        throw err;
      }
      patch.unitPrice = unitPrice;
    }

    if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
      const nextQuantity = patch.quantity !== undefined ? patch.quantity : component.quantity;
      const nextPrice = patch.unitPrice !== undefined ? patch.unitPrice : component.unitPrice;
      patch.totalCost = this.computeComponentTotal(nextQuantity, nextPrice);
    }

    // تحديث لحظة تثبيت السعر فقط لو السعر اتغيّر فعلًا
    if (priceChanged) {
      patch.priceSnapshotAt = new Date();
    }

    if (data.sortOrder !== undefined && Number.isFinite(Number(data.sortOrder))) {
      patch.sortOrder = Number(data.sortOrder);
    }

    return await prisma.sampleComponent.update({
      where: { id: componentId },
      data: patch,
    });
  }

  static async deleteSampleComponent(companyId, user, sampleId, componentId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    await this.assertSampleEditable(prisma, companyId, sampleId, 'حذف');

    const component = await prisma.sampleComponent.findFirst({
      where: { id: componentId, sampleOrderId: sampleId, companyId },
      select: { id: true },
    });
    if (!component) {
      const err = new Error('المكوّن غير موجود');
      err.statusCode = 404;
      throw err;
    }

    await prisma.sampleComponent.delete({ where: { id: componentId } });

    return { success: true, message: 'تم حذف المكوّن بنجاح' };
  }
}

module.exports = ManufacturingSampleService;
