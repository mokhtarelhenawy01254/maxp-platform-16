const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getDateStringInTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone } = require('../utils/dateUtils');

const LAB_ORDER_CHAIN = ['PENDING', 'COLLECTED', 'IN_PROGRESS', 'REVIEWED', 'SIGNED', 'DELIVERED'];
const LAB_REPORT_CHAIN = ['PENDING', 'RESULTS_ENTERED', 'REVIEWED', 'SIGNED', 'DELIVERED'];
const LAB_ORDER_TEST_CHAIN = ['PENDING', 'RESULTS_ENTERED', 'REVIEWED', 'SIGNED'];

const ORDER_STATUSES = new Set(LAB_ORDER_CHAIN);
const REPORT_STATUSES = new Set(LAB_REPORT_CHAIN);

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toNonNegativeNumber = (value, fallback = 0) => {
  const num = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(num) || num < 0) return { valid: false };
  return { valid: true, value: round2(num) };
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => (value ? new Date(value).toISOString() : null);

const nextStatus = (chain, from) => {
  const index = chain.indexOf(from);
  if (index === -1 || index === chain.length - 1) return null;
  return chain[index + 1];
};

const nextReportStatus = (from) => nextStatus(LAB_REPORT_CHAIN, from);
const nextOrderStatus = (from) => nextStatus(LAB_ORDER_CHAIN, from);
const nextOrderTestStatus = (from) => nextStatus(LAB_ORDER_TEST_CHAIN, from);

const validateTransition = (chain, from, to, message) => {
  if (!chain.includes(from) || !chain.includes(to)) {
    return { valid: false, error: 'الحالة المطلوبة غير صحيحة' };
  }
  if (from === to) return { valid: false, error: `لا يمكن الانتقال إلى نفس الحالة "${from}"` };
  if (nextStatus(chain, from) !== to) return { valid: false, error: message(from, to) };
  return { valid: true };
};

const validateLabReportTransition = (from, to) =>
  validateTransition(LAB_REPORT_CHAIN, from, to, (f, t) => `لا يمكن الانتقال في التقرير من "${f}" إلى "${t}"`);

const validateLabOrderTransition = (from, to) =>
  validateTransition(LAB_ORDER_CHAIN, from, to, (f, t) => `لا يمكن الانتقال في الطلب من "${f}" إلى "${t}"`);

const validateLabOrderTestTransition = (from, to) =>
  validateTransition(LAB_ORDER_TEST_CHAIN, from, to, (f, t) => `لا يمكن الانتقال في الاختبار من "${f}" إلى "${t}"`);

const generateOrderNumber = () => {
  const datePart = getDateStringInTimezone(new Date()).replace(/-/g, '');
  const rand = crypto.randomInt(100000, 1000000);
  return `LAB-${datePart}-${rand}`;
};

const ORDER_LIST_TEST_INCLUDE = {
  include: {
    test: { select: { id: true, name: true, abbreviation: true, category: true } },
  },
};

const ORDER_DETAIL_TEST_INCLUDE = {
  include: {
    test: {
      include: {
        parameters: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    },
  },
};

const ORDER_DETAIL_INCLUDE = {
  tests: ORDER_DETAIL_TEST_INCLUDE,
};

const formatOrderTest = (ot) => ({
  id: ot.id,
  orderId: ot.orderId,
  testId: ot.testId,
  price: ot.price,
  status: ot.status,
  results: ot.results || null,
  test: ot.test || undefined,
});

const formatOrder = (order) => ({
  id: order.id,
  companyId: order.companyId,
  orderNumber: order.orderNumber || null,
  patientId: order.patientId || null,
  patientName: order.patientName,
  patientPhone: order.patientPhone || null,
  patientGender: order.patientGender || null,
  patientAge: order.patientAge || null,
  contractId: order.contractId || null,
  branchId: order.branchId || null,
  doctorName: order.doctorName || null,
  doctorType: order.doctorType || null,
  fastingHours: order.fastingHours ?? null,
  externalSample: !!order.externalSample,
  collectionDate: formatDate(order.collectionDate),
  receiveDate: formatDate(order.receiveDate),
  status: order.status,
  reportStatus: order.reportStatus,
  subtotal: order.subtotal,
  discount: order.discount,
  total: order.total,
  paid: order.paid,
  remaining: order.remaining,
  patientFlags: order.patientFlags || null,
  notes: order.notes || null,
  signedBy: order.signedBy || null,
  signedAt: formatDate(order.signedAt),
  createdAt: formatDate(order.createdAt),
  updatedAt: formatDate(order.updatedAt),
  tests: Array.isArray(order.tests) ? order.tests.map(formatOrderTest) : undefined,
});

const parsePatientFlags = (value) => {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { error: 'بيانات علم المريض غير صحيحة' };
      }
      return { value: parsed };
    } catch {
      return { error: 'بيانات علم المريض غير صحيحة' };
    }
  }
  if (typeof value !== 'object' || Array.isArray(value)) return { error: 'بيانات علم المريض غير صحيحة' };
  return { value };
};

const parseFastingHours = (value) => {
  if (value === undefined || value === null || value === '') return { value: null };
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return { error: 'قيمة الصيام غير صحيحة' };
  return { value: parsed };
};

const resolveOrderTests = async (prisma, companyId, testItems) => {
  if (!Array.isArray(testItems) || testItems.length === 0) return { error: 'يجب اختيار اختبار واحد على الأقل' };

  const testIdList = [];
  const requestedById = new Map();
  for (const item of testItems) {
    if (!item || !item.testId) continue;
    if (!requestedById.has(item.testId)) {
      requestedById.set(item.testId, item);
      testIdList.push(item.testId);
    }
  }
  if (testIdList.length === 0) return { error: 'معرف الاختبار مطلوب' };

  const tests = await prisma.labTest.findMany({ where: { id: { in: testIdList }, companyId } });
  if (tests.length !== testIdList.length) {
    return { error: 'أحد الاختبارات المحددة لا ينتمي لهذه الشركة' };
  }

  const testById = new Map(tests.map((t) => [t.id, t]));
  const orderTests = [];
  let subtotal = 0;
  for (const id of testIdList) {
    const test = testById.get(id);
    const item = requestedById.get(id);
    let price = item.price === undefined || item.price === null ? test.price : Number(item.price);
    if (!Number.isFinite(price) || price < 0) return { error: 'سعر الاختبار غير صالح' };
    price = round2(price);
    subtotal += price;
    orderTests.push({ testId: test.id, price, status: 'PENDING', companyId });
  }

  return { orderTests, subtotal: round2(subtotal) };
};

const getAllOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { status, reportStatus, branchId, search, dateFrom, dateTo, page, limit } = req.query;
    const where = { companyId };

    if (status) {
      const s = String(status).toUpperCase();
      if (!ORDER_STATUSES.has(s)) return res.status(400).json({ success: false, error: 'حالة الطلب غير صحيحة' });
      where.status = s;
    }
    if (reportStatus) {
      const rs = String(reportStatus).toUpperCase();
      if (!REPORT_STATUSES.has(rs)) return res.status(400).json({ success: false, error: 'حالة التقرير غير صحيحة' });
      where.reportStatus = rs;
    }
    if (branchId) where.branchId = branchId;

    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: 'insensitive' } },
        { patientPhone: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      const createdAtFilter = {};
      if (dateFrom) createdAtFilter.gte = getStartOfDayInTimezone(new Date(dateFrom));
      if (dateTo) createdAtFilter.lte = getEndOfDayInTimezone(new Date(dateTo));
      where.createdAt = createdAtFilter;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [orders, total] = await Promise.all([
      prisma.labOrder.findMany({
        where,
        include: {
          tests: ORDER_LIST_TEST_INCLUDE,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.labOrder.count({ where }),
    ]);

    res.json({ success: true, data: { items: orders.map(formatOrder), total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب طلبات التحاليل' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const order = await getSharedPrismaClient().labOrder.findFirst({
      where: { id, companyId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error fetching lab order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب طلب التحاليل' });
  }
};

const getOrderPdf = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const order = await prisma.labOrder.findFirst({
      where: { id, companyId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    const { generateOrderPdf } = require('../services/labPdfService');
    const pdfBuffer = await generateOrderPdf(order, company);

    const filename = `report-${(order.orderNumber || order.id).replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating lab PDF:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في توليد التقرير', detail: String(error?.message || error) });
  }
};

const getOrderLabel = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const order = await prisma.labOrder.findFirst({
      where: { id, companyId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    const { generateLabelPdf } = require('../services/labPdfService');
    const pdfBuffer = await generateLabelPdf(order);

    const filename = `label-${(order.orderNumber || order.id).replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating lab label:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في توليد اللاصقة' });
  }
};

const createOrder = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const patientName = typeof body.patientName === 'string' ? body.patientName.trim() : '';
    if (!patientName) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });
    if (!Array.isArray(body.testIds) || body.testIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار اختبار واحد على الأقل' });
    }

    const prisma = getSharedPrismaClient();

    let patientId = body.patientId || null;
    if (patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId } });
      if (!patient) return res.status(400).json({ success: false, error: 'المريض لا ينتمي لهذه الشركة' });
    }

    const resolved = await resolveOrderTests(prisma, companyId, body.testIds);
    if (resolved.error) return res.status(400).json({ success: false, error: resolved.error });

    const discountResult = toNonNegativeNumber(body.discount, 0);
    if (!discountResult.valid) return res.status(400).json({ success: false, error: 'قيمة الخصم غير صالحة' });
    const paidResult = toNonNegativeNumber(body.paid, 0);
    if (!paidResult.valid) return res.status(400).json({ success: false, error: 'قيمة المدفوع غير صالحة' });

    const discount = discountResult.value;
    const paid = paidResult.value;
    if (discount > resolved.subtotal) return res.status(400).json({ success: false, error: 'الخصم أكبر من الإجمالي' });

    const subtotal = resolved.subtotal;
    const total = round2(subtotal - discount);
    const remaining = round2(Math.max(0, total - paid));

    const flags = parsePatientFlags(body.patientFlags);
    if (flags.error) return res.status(400).json({ success: false, error: flags.error });
    const fasting = parseFastingHours(body.fastingHours);
    if (fasting.error) return res.status(400).json({ success: false, error: fasting.error });

    const clientProvidedOrderNumber =
      typeof body.orderNumber === 'string' && body.orderNumber.trim() ? body.orderNumber.trim() : null;
    let orderNumber = clientProvidedOrderNumber || generateOrderNumber();

    let order;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        order = await prisma.labOrder.create({
          data: {
            companyId,
            orderNumber,
            patientId,
            patientName,
            patientPhone: body.patientPhone ? String(body.patientPhone) : null,
            patientGender: body.patientGender || null,
            patientAge: body.patientAge ? String(body.patientAge) : null,
            contractId: body.contractId || null,
            branchId: body.branchId || null,
            doctorName: body.doctorName || null,
            doctorType: body.doctorType || null,
            fastingHours: fasting.value,
            externalSample: body.externalSample === true || body.externalSample === 'true',
            collectionDate: parseDate(body.collectionDate),
            receiveDate: parseDate(body.receiveDate),
            status: 'PENDING',
            reportStatus: 'PENDING',
            subtotal,
            discount,
            total,
            paid,
            remaining,
            patientFlags: flags.value,
            notes: body.notes || null,
            tests: { create: resolved.orderTests },
          },
          include: ORDER_DETAIL_INCLUDE,
        });
        break;
      } catch (error) {
        if (error?.code === 'P2002' && !clientProvidedOrderNumber && attempt < 3) {
          orderNumber = generateOrderNumber();
          continue;
        }
        if (error?.code === 'P2002' && clientProvidedOrderNumber) {
          return res.status(409).json({ success: false, error: 'رقم الطلب مستخدم من قبل' });
        }
        throw error;
      }
    }

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error creating lab order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء طلب التحاليل' });
  }
};

const UPDATE_FIELDS = [
  'patientId',
  'patientName',
  'patientPhone',
  'patientGender',
  'patientAge',
  'contractId',
  'branchId',
  'doctorName',
  'doctorType',
  'fastingHours',
  'externalSample',
  'collectionDate',
  'receiveDate',
  'patientFlags',
  'notes',
  'status',
];

const updateOrder = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    const existing = await prisma.labOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    const data = {};
    for (const field of UPDATE_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    if ('patientName' in data) {
      const name = typeof data.patientName === 'string' ? data.patientName.trim() : '';
      if (!name) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });
      data.patientName = name;
    }
    if ('patientPhone' in data) data.patientPhone = data.patientPhone ? String(data.patientPhone) : null;
    if ('patientAge' in data) data.patientAge = data.patientAge ? String(data.patientAge) : null;
    if ('fastingHours' in data) {
      const fasting = parseFastingHours(data.fastingHours);
      if (fasting.error) return res.status(400).json({ success: false, error: fasting.error });
      data.fastingHours = fasting.value;
    }
    if ('externalSample' in data) data.externalSample = data.externalSample === true || data.externalSample === 'true';
    if ('collectionDate' in data) data.collectionDate = parseDate(data.collectionDate);
    if ('receiveDate' in data) data.receiveDate = parseDate(data.receiveDate);

    if ('patientId' in data && data.patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: data.patientId, companyId } });
      if (!patient) return res.status(400).json({ success: false, error: 'المريض لا ينتمي لهذه الشركة' });
    } else if ('patientId' in data) {
      data.patientId = null;
    }

    if ('patientFlags' in data) {
      const flags = parsePatientFlags(data.patientFlags);
      if (flags.error) return res.status(400).json({ success: false, error: flags.error });
      data.patientFlags = flags.value;
    }

    if ('status' in data) {
      const status = String(data.status).toUpperCase();
      if (!ORDER_STATUSES.has(status)) return res.status(400).json({ success: false, error: 'حالة الطلب غير صحيحة' });
      if (status !== existing.status) {
        const transition = validateLabOrderTransition(existing.status, status);
        if (!transition.valid) return res.status(400).json({ success: false, error: transition.error });
      }
      data.status = status;
    }

    const hasTestReplacements = Array.isArray(body.testIds);
    if (hasTestReplacements && existing.reportStatus !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'لا يمكن تعديل اختبارات الطلب بعد بدء إدخال النتائج' });
    }
    let replacementTests = [];
    let subtotal = existing.subtotal || 0;
    if (hasTestReplacements) {
      const resolved = await resolveOrderTests(prisma, companyId, body.testIds);
      if (resolved.error) return res.status(400).json({ success: false, error: resolved.error });
      replacementTests = resolved.orderTests;
      subtotal = resolved.subtotal;
      data.subtotal = subtotal;
    }

    let discount = existing.discount || 0;
    if ('discount' in body) {
      const discountResult = toNonNegativeNumber(body.discount, 0);
      if (!discountResult.valid) return res.status(400).json({ success: false, error: 'قيمة الخصم غير صالحة' });
      discount = discountResult.value;
    }
    let paid = existing.paid || 0;
    if ('paid' in body) {
      const paidResult = toNonNegativeNumber(body.paid, 0);
      if (!paidResult.valid) return res.status(400).json({ success: false, error: 'قيمة المدفوع غير صالحة' });
      paid = paidResult.value;
    }
    if (discount > subtotal) return res.status(400).json({ success: false, error: 'الخصم أكبر من الإجمالي' });

    data.discount = discount;
    data.paid = paid;
    data.total = round2(subtotal - discount);
    data.remaining = round2(Math.max(0, subtotal - discount - paid));

    let order;
    if (hasTestReplacements) {
      order = await prisma.$transaction(async (tx) => {
        await tx.labOrderTest.deleteMany({ where: { orderId: id } });
        if (replacementTests.length > 0) await tx.labOrderTest.createMany({ data: replacementTests });
        return tx.labOrder.update({ where: { id }, data, include: ORDER_DETAIL_INCLUDE });
      });
    } else {
      order = await prisma.labOrder.update({ where: { id }, data, include: ORDER_DETAIL_INCLUDE });
    }

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error updating lab order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث طلب التحاليل' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    await prisma.labOrder.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting lab order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف طلب التحاليل' });
  }
};

const enterResults = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    if (!Array.isArray(body.tests) || body.tests.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب إدخال نتائج اختبار واحد على الأقل' });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.labOrder.findFirst({
      where: { id, companyId },
      include: { tests: true },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    if (existing.reportStatus === 'DELIVERED') {
      return res.status(400).json({ success: false, error: 'لا يمكن تعديل نتائج تقرير تم تسليمه' });
    }

    const orderTestByTestId = new Map(existing.tests.map((ot) => [ot.testId, ot]));

    const parameterIds = [];
    for (const entry of body.tests) {
      if (!entry || !entry.testId) return res.status(400).json({ success: false, error: 'معرف الاختبار مطلوب' });
      if (!orderTestByTestId.has(entry.testId)) {
        return res.status(400).json({ success: false, error: 'الاختبار لا ينتمي لهذا الطلب' });
      }
      if (!Array.isArray(entry.results)) {
        return res.status(400).json({ success: false, error: 'النتائج يجب أن تكون مصفوفة' });
      }
      for (const r of entry.results) {
        if (!r || !r.parameterId) return res.status(400).json({ success: false, error: 'معرف المعامل مطلوب' });
        parameterIds.push(r.parameterId);
      }
    }

    const parameters = parameterIds.length
      ? await prisma.labTestParameter.findMany({ where: { id: { in: [...new Set(parameterIds)] }, companyId } })
      : [];
    const parameterById = new Map(parameters.map((p) => [p.id, p]));

    for (const entry of body.tests) {
      for (const r of entry.results) {
        const parameter = parameterById.get(r.parameterId);
        if (!parameter || parameter.testId !== entry.testId) {
          return res.status(400).json({ success: false, error: 'المعامل لا ينتمي لهذا الاختبار' });
        }
      }
    }

    const updates = [];
    for (const entry of body.tests) {
      const orderTest = orderTestByTestId.get(entry.testId);
      const results = entry.results.map((r) => {
        const parameter = parameterById.get(r.parameterId);
        return {
          parameterId: r.parameterId,
          parameterName: parameter ? parameter.name : '',
          unit: parameter && parameter.unit ? parameter.unit : undefined,
          result: r.result === undefined ? '' : r.result,
          flag: r.flag || undefined,
        };
      });
      updates.push({ orderTestId: orderTest.id, results, status: 'RESULTS_ENTERED' });
    }

    const reportData = { reportStatus: 'RESULTS_ENTERED' };
    if (existing.reportStatus === 'REVIEWED' || existing.reportStatus === 'SIGNED') {
      reportData.signedBy = null;
      reportData.signedAt = null;
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.labOrderTest.update({
          where: { id: update.orderTestId },
          data: { results: update.results, status: update.status },
        });
      }
      return tx.labOrder.update({
        where: { id },
        data: reportData,
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error entering lab results:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إدخال نتائج التحاليل' });
  }
};

const reviewOrder = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labOrder.findFirst({
      where: { id, companyId },
      include: { tests: { select: { id: true, results: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    const validation = validateLabReportTransition(existing.reportStatus, 'REVIEWED');
    if (!validation.valid) {
      const message =
        existing.reportStatus === 'PENDING' ? 'يجب إدخال النتائج قبل المراجعة' : validation.error;
      return res.status(400).json({ success: false, error: message });
    }

    const incompleteTests = existing.tests.some((ot) => !Array.isArray(ot.results) || ot.results.length === 0);
    if (incompleteTests) {
      return res.status(400).json({ success: false, error: 'يجب إدخال نتائج جميع الاختبارات قبل المراجعة' });
    }

    const order = await prisma.$transaction(async (tx) => {
      await tx.labOrderTest.updateMany({ where: { orderId: id }, data: { status: 'REVIEWED' } });
      return tx.labOrder.update({
        where: { id },
        data: { reportStatus: 'REVIEWED' },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error reviewing lab order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في مراجعة طلب التحاليل' });
  }
};

const signOrder = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    const validation = validateLabReportTransition(existing.reportStatus, 'SIGNED');
    if (!validation.valid) {
      const message =
        existing.reportStatus === 'RESULTS_ENTERED' ? 'يجب مراجعة النتائج قبل التوقيع' : validation.error;
      return res.status(400).json({ success: false, error: message });
    }

    const signedBy = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') || req.user?.email || '';

    const order = await prisma.$transaction(async (tx) => {
      await tx.labOrderTest.updateMany({ where: { orderId: id }, data: { status: 'SIGNED' } });
      return tx.labOrder.update({
        where: { id },
        data: { reportStatus: 'SIGNED', status: 'SIGNED', signedBy, signedAt: new Date() },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error signing lab order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في توقيع طلب التحاليل' });
  }
};

const markDelivered = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    if (existing.reportStatus === 'DELIVERED' && existing.status === 'DELIVERED') {
      const already = await prisma.labOrder.findFirst({ where: { id, companyId }, include: ORDER_DETAIL_INCLUDE });
      return res.json({ success: true, data: formatOrder(already) });
    }

    if (existing.reportStatus !== 'SIGNED') {
      return res.status(400).json({ success: false, error: 'يجب توقيع التقرير قبل التسليم' });
    }

    const order = await prisma.labOrder.update({
      where: { id },
      data: { reportStatus: 'DELIVERED', status: 'DELIVERED' },
      include: ORDER_DETAIL_INCLUDE,
    });

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error delivering lab order:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسليم طلب التحاليل' });
  }
};

const rejectSample = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return res.status(400).json({ success: false, error: 'سبب رفض العينة مطلوب' });

    const prisma = getSharedPrismaClient();
    const existing = await prisma.labOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    if (existing.sampleStatus === 'REJECTED') {
      return res.status(400).json({ success: false, error: 'العينة مرفوضة بالفعل' });
    }
    if (existing.reportStatus === 'SIGNED' || existing.reportStatus === 'DELIVERED') {
      return res.status(400).json({ success: false, error: 'لا يمكن رفض العينة بعد توقيع التقرير' });
    }

    const order = await prisma.labOrder.update({
      where: { id },
      data: {
        sampleStatus: 'REJECTED',
        rejectionReason: reason,
        rejectedBy: req.user?.name || req.user?.email || null,
        rejectedAt: new Date(),
        status: 'PENDING',
        reportStatus: 'PENDING',
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error rejecting lab sample:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في رفض العينة' });
  }
};

const acceptSample = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labOrder.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'طلب التحاليل غير موجود' });

    if (existing.sampleStatus !== 'REJECTED') {
      return res.status(400).json({ success: false, error: 'العينة غير مرفوضة' });
    }

    const order = await prisma.labOrder.update({
      where: { id },
      data: { sampleStatus: 'ACCEPTED', rejectionReason: null, rejectedBy: null, rejectedAt: null },
      include: ORDER_DETAIL_INCLUDE,
    });

    res.json({ success: true, data: formatOrder(order) });
  } catch (error) {
    console.error('Error accepting lab sample:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في قبول العينة' });
  }
};

const exportOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { status, reportStatus, sampleStatus, branchId, search, dateFrom, dateTo } = req.query;
    const where = { companyId };
    if (status) where.status = String(status).toUpperCase();
    if (reportStatus) where.reportStatus = String(reportStatus).toUpperCase();
    if (sampleStatus) where.sampleStatus = String(sampleStatus).toUpperCase();
    if (branchId) where.branchId = branchId;
    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: 'insensitive' } },
        { patientPhone: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      const filter = {};
      if (dateFrom) filter.gte = getStartOfDayInTimezone(new Date(dateFrom));
      if (dateTo) filter.lte = getEndOfDayInTimezone(new Date(dateTo));
      where.createdAt = filter;
    }

    const orders = await getSharedPrismaClient().labOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      ['رقم الطلب', 'المريض', 'الهاتف', 'الحالة', 'حالة التقرير', 'حالة العينة', 'الإجمالي', 'المدفوع', 'المتبقي', 'التاريخ'],
      ...orders.map(o => [
        o.orderNumber || '', o.patientName, o.patientPhone || '', o.status, o.reportStatus, o.sampleStatus,
        o.total, o.paid, o.remaining, o.createdAt ? o.createdAt.toISOString().slice(0, 19).replace('T', ' ') : '',
      ]),
    ];
    const csv = rows.map(r => r.map(esc).join(',')).join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lab-orders.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error exporting lab orders:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تصدير الطلبات' });
  }
};

module.exports = {
  LAB_ORDER_CHAIN,
  LAB_REPORT_CHAIN,
  LAB_ORDER_TEST_CHAIN,
  nextStatus,
  nextOrderStatus,
  nextReportStatus,
  nextOrderTestStatus,
  validateLabReportTransition,
  validateLabOrderTransition,
  validateLabOrderTestTransition,
  getAllOrders,
  getOrderById,
  getOrderPdf,
  createOrder,
  updateOrder,
  deleteOrder,
  enterResults,
  reviewOrder,
  signOrder,
  markDelivered,
  rejectSample,
  acceptSample,
  exportOrders,
  getOrderLabel,
};
