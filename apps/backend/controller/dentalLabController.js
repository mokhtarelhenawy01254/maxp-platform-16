const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getStartOfDayInTimezone, getEndOfDayInTimezone } = require('../utils/dateUtils');
const {
  CASE_STATUS_CHAIN,
  DEFAULT_STAGE_NAMES,
  round2,
  toNonNegativeNumber,
  toPositiveNumber,
  parseDate,
  derivePaymentStatus,
  deriveInvoiceStatus,
  generateCaseNumber,
  generateInvoiceNumber,
  getStageTemplates,
  buildStagesData,
  findActiveStage,
  stageForStatus,
} = require('../utils/dentalLabHelpers');
const { recordDentalLabStatusHistory, adminDisplayName, syncCasePayments } = require('../utils/dentalLabStatusHistory');
const { dentalLabDir } = require('../utils/dentalLabUpload');
const dentalNotificationService = require('../services/dentalLabNotificationService');
const { resolveDentalRole } = require('../services/dentalRoles');
const { suggestDueDate, estimateLeadDays } = require('../services/dentalDeliveryEstimate');
const { parseScanImage } = require('../services/dentalScanParser');
const { getBillingPolicy, assertCreditLimit, DEFAULT_BILLING_POLICY } = require('../services/dentalBillingPolicy');

const CASE_STATUSES = new Set(CASE_STATUS_CHAIN);
const ATTACHMENT_KINDS = new Set(['SCAN', 'PHOTO', 'XRAY', 'PRESCRIPTION', 'WORK_ORDER', 'DESIGN_REVIEW', 'OTHER']);
const INVOICE_STATUSES = new Set(['OPEN', 'PARTIAL', 'PAID', 'VOID']);
const PAYMENT_METHODS = new Set(['CASH', 'CARD', 'BANK', 'VODAFONE_CASH', 'OTHER']);

const DEFAULT_SETTINGS = {
  workOrderHeader: { labName: '', address: '', phone: '' },
  stageTemplates: { __default: DEFAULT_STAGE_NAMES },
  whatsappTemplates: { ready: '', received: '', overdue: '' },
enabledCustomFields: [],
  teamRoles: {},
  guards: {},
  billingPolicy: {
    invoiceMode: 'AUTO_ON_DELIVERY', // AUTO_ON_RECEIPT | AUTO_ON_DELIVERY | MANUAL
    requireInvoiceBeforeDelivery: true,
    requireFullPaymentBeforeDelivery: false,
    enforceCreditLimit: false,
  },
  wages: { defaultPerStage: 0 },
  doctorPricing: {},
  notifications: { dunningEnabled: false, dunningAgingDays: 15, dunningIntervalHours: 6 },
};

/**
 * ينشئ فاتورة تلقائية من بيانات الحالة (idempotent — يتخطى إن كانت موجودة).
 * الالتزام المالي على الطبيب (العميل)، وفريق العمل مسؤول عن الإنتاج وليس عن السداد.
 */
const autoCreateInvoiceForCase = async (prisma, companyId, dentalCase, meta = {}) => {
  if (!dentalCase) return null;
  const existing = await prisma.dentalInvoice.findFirst({
    where: { companyId, caseId: dentalCase.id },
    select: { id: true },
  });
  if (existing) return null;

  const total = Number(dentalCase.total) || 0;
  const paid = Number(dentalCase.paid) || 0;
  const remaining = round2(Math.max(0, total - paid));
  const status = deriveInvoiceStatus(total, paid);

  let invoice = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      invoice = await prisma.dentalInvoice.create({
        data: {
          companyId,
          invoiceNumber: await generateInvoiceNumber(prisma, companyId),
          caseId: dentalCase.id,
          doctorId: dentalCase.doctorId || null,
          doctorName: dentalCase.doctorName || null,
          total,
          discount: Number(dentalCase.discount) || 0,
          paid,
          remaining,
          status,
          dueDate: dentalCase.dueDate || null,
          notes: 'فاتورة تلقائية من الحالة',
          payments: paid > 0
            ? { create: { companyId, amount: paid, method: 'CASH', note: 'دفعة عند الإنشاء', paidBy: meta.changedBy || null } }
            : undefined,
        },
        include: { payments: { orderBy: { createdAt: 'desc' } } },
      });
      break;
    } catch (error) {
      if (error?.code === 'P2002') {
        const target = error?.meta?.target;
        const targetStr = Array.isArray(target) ? target.join(',') : String(target || '');
        // فاتورة لنفس الحالة موجودة بالفعل — سلوك متكرر آمن
        if (targetStr.includes('caseId') || targetStr.includes('companyId_caseId')) {
          const dup = await prisma.dentalInvoice.findFirst({ where: { companyId, caseId: dentalCase.id }, select: { id: true } });
          if (dup) return null;
        }
        if (attempt < 3) continue;
      }
      throw error;
    }
  }

  if (invoice) {
    await syncCasePayments(prisma, companyId, dentalCase.id, {
      changedBy: meta.changedBy || null,
      userName: meta.userName || 'النظام',
    });
    await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: dentalCase.id,
      dimension: 'INVOICE',
      status: status || 'OPEN',
      oldStatus: null,
      changedBy: meta.changedBy || null,
      userName: meta.userName || 'النظام',
      reason: 'إنشاء فاتورة تلقائية',
    });
  }
return invoice;
};

const mergeSettings = (rows) => {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const row of rows || []) {
    if (!row || !row.key) continue;
    const value = require('../utils/dentalLabHelpers').parseSettingValue(row);
    const target = settings[row.key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value) &&
        target !== null && typeof target === 'object' && !Array.isArray(target)) {
      settings[row.key] = { ...target, ...value };
    } else {
      settings[row.key] = value;
    }
  }
  return settings;
};

// ==================== TECHNICIAN WAGES ====================

const {
  getTechnicianWageDefaults,
  computeTechnicianEarnings,
  resolveDoctorWorkTypePrice,
  setDoctorWorkTypePrice,
} = require('../services/dentalPricing');

const parsePagination = (query) => {
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

const getCompanyId = (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(403).json({ success: false, error: 'غير مصرح' });
    return null;
  }
  return companyId;
};

const normalizeBool = (value, fallback = undefined) => {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

// ==================== DOCTORS ====================

const listDoctors = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { search, page, limit } = req.query;
    const where = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalLabDoctor.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.dentalLabDoctor.count({ where }),
    ]);

    // دفتر الذمم: حساب كل طبيب (عميل) — الفواتير غير الملغاة + الحالات النشطة - الائتمانات
    const ids = items.map((d) => d.id);
    const [invAgg, caseAgg, creditAgg] = await Promise.all([
      prisma.dentalInvoice.groupBy({
        by: ['doctorId'],
        where: { companyId, doctorId: { in: ids }, status: { not: 'VOID' } },
        _sum: { total: true, paid: true, remaining: true },
      }),
      prisma.dentalLabCase.groupBy({
        by: ['doctorId'],
        where: { companyId, doctorId: { in: ids }, status: { notIn: ['DELIVERED', 'CLOSED'] } },
        _count: { _all: true },
      }),
      prisma.dentalCreditNote.groupBy({
        by: ['doctorId'],
        where: { companyId, doctorId: { in: ids } },
        _sum: { amount: true },
      }),
    ]);
    const invByDoctor = new Map(invAgg.map((r) => [r.doctorId, r._sum]));
    const casesByDoctor = new Map(caseAgg.map((r) => [r.doctorId, r._count._all || 0]));
    const creditByDoctor = new Map(creditAgg.map((r) => [r.doctorId, Number(r._sum.amount) || 0]));
    const overdueRows = await prisma.dentalLabCase.findMany({
      where: { companyId, doctorId: { in: ids }, dueDate: { lt: new Date() }, status: { notIn: ['DELIVERED', 'CLOSED'] } },
      select: { doctorId: true },
    });
    const overdueCount = {};
    for (const row of overdueRows) overdueCount[row.doctorId] = (overdueCount[row.doctorId] || 0) + 1;

    const enriched = items.map((d) => {
      const sums = invByDoctor.get(d.id) || {};
      const credit = creditByDoctor.get(d.id) || 0;
      const outstanding = round2(Math.max(0, (Number(sums.remaining) || 0) - credit));
      const creditLimit = Number(d.creditLimit) || 0;
      return {
        ...d,
        totalBilled: round2(Number(sums.total) || 0),
        totalPaid: round2(Number(sums.paid) || 0),
        outstanding,
        activeCases: casesByDoctor.get(d.id) || 0,
        overdueCases: overdueCount[d.id] || 0,
        creditExceeded: creditLimit > 0 && outstanding > creditLimit,
      };
    });

    res.json({ success: true, data: { items: enriched, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing dental doctors:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأطباء' });
  }
};

const createDoctor = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return res.status(400).json({ success: false, error: 'اسم الطبيب مطلوب' });
    const creditResult = toNonNegativeNumber(body.creditLimit, 0);
    if (!creditResult.valid) return res.status(400).json({ success: false, error: 'حد الائتمان غير صحيح' });

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.dentalLabDoctor.create({
      data: {
        companyId,
        name,
        phone: body.phone ? String(body.phone) : null,
        clinicName: body.clinicName ? String(body.clinicName) : null,
        governorate: body.governorate ? String(body.governorate) : null,
        portalPin: body.portalPin ? String(body.portalPin) : null,
        creditLimit: creditResult.value,
        notes: body.notes ? String(body.notes) : null,
        isActive: normalizeBool(body.isActive, true),
      },
    });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('Error creating dental doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطبيب' });
  }
};

const DOCTOR_UPDATE_FIELDS = ['name', 'phone', 'clinicName', 'governorate', 'portalPin', 'creditLimit', 'notes', 'isActive'];

const updateDoctor = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const data = {};
    for (const field of DOCTOR_UPDATE_FIELDS) {
      if (field in body) data[field] = body[field];
    }
    if ('name' in data) {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) return res.status(400).json({ success: false, error: 'اسم الطبيب مطلوب' });
      data.name = name;
    }
    if ('phone' in data) data.phone = data.phone ? String(data.phone) : null;
    if ('portalPin' in data) data.portalPin = data.portalPin ? String(data.portalPin) : null;
    if ('creditLimit' in data) {
      const creditResult = toNonNegativeNumber(data.creditLimit, 0);
      if (!creditResult.valid) return res.status(400).json({ success: false, error: 'حد الائتمان غير صحيح' });
      data.creditLimit = creditResult.value;
    }
    if ('isActive' in data) data.isActive = normalizeBool(data.isActive, true);

    const doctor = await prisma.dentalLabDoctor.update({ where: { id }, data });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('Error updating dental doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الطبيب' });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });
    const doctor = await prisma.dentalLabDoctor.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('Error deleting dental doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الطبيب' });
  }
};

// ==================== WORK TYPES ====================

const listWorkTypes = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { search, isActive } = req.query;
    const where = { companyId };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (isActive !== undefined && isActive !== '') where.isActive = normalizeBool(isActive);

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalWorkType.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], skip, take: limitNum }),
      prisma.dentalWorkType.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing dental work types:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أنواع الشغل' });
  }
};

const createWorkType = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return res.status(400).json({ success: false, error: 'اسم نوع الشغل مطلوب' });
    const priceResult = toNonNegativeNumber(body.price, 0);
    if (!priceResult.valid) return res.status(400).json({ success: false, error: 'سعر نوع الشغل غير صحيح' });

    const prisma = getSharedPrismaClient();
    const workType = await prisma.dentalWorkType.create({
      data: {
        companyId,
        name,
        category: body.category ? String(body.category) : null,
        price: priceResult.value,
        leadTimeDays: Number.isFinite(parseInt(body.leadTimeDays, 10)) ? parseInt(body.leadTimeDays, 10) : 5,
        isActive: normalizeBool(body.isActive, true),
        sortOrder: Number.isFinite(parseInt(body.sortOrder, 10)) ? parseInt(body.sortOrder, 10) : 0,
      },
    });
    res.json({ success: true, data: workType });
  } catch (error) {
    console.error('Error creating dental work type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء نوع الشغل' });
  }
};

const WORK_TYPE_UPDATE_FIELDS = ['name', 'category', 'price', 'leadTimeDays', 'isActive', 'sortOrder'];

const updateWorkType = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalWorkType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع الشغل غير موجود' });

    const data = {};
    for (const field of WORK_TYPE_UPDATE_FIELDS) {
      if (field in body) data[field] = body[field];
    }
    if ('name' in data) {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) return res.status(400).json({ success: false, error: 'اسم نوع الشغل مطلوب' });
      data.name = name;
    }
    if ('price' in data) {
      const priceResult = toNonNegativeNumber(data.price, 0);
      if (!priceResult.valid) return res.status(400).json({ success: false, error: 'سعر نوع الشغل غير صحيح' });
      data.price = priceResult.value;
    }
    if ('leadTimeDays' in data) data.leadTimeDays = parseInt(data.leadTimeDays, 10) || 5;
    if ('sortOrder' in data) data.sortOrder = parseInt(data.sortOrder, 10) || 0;
    if ('isActive' in data) data.isActive = normalizeBool(data.isActive, true);

    const workType = await prisma.dentalWorkType.update({ where: { id }, data });
    res.json({ success: true, data: workType });
  } catch (error) {
    console.error('Error updating dental work type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث نوع الشغل' });
  }
};

const deleteWorkType = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalWorkType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع الشغل غير موجود' });
    const workType = await prisma.dentalWorkType.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, data: workType });
  } catch (error) {
    console.error('Error deleting dental work type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف نوع الشغل' });
  }
};

// ==================== TECHNICIANS ====================

const listTechnicians = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { search, isActive, from, to } = req.query;
    const where = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined && isActive !== '') where.isActive = normalizeBool(isActive);

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalTechnician.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.dentalTechnician.count({ where }),
    ]);
    const earnings = await computeTechnicianEarnings(prisma, companyId, { from, to });
    const earningById = new Map(earnings.map((e) => [e.technicianId, e]));
    const enriched = items.map((t) => {
      const e = earningById.get(t.id) || { completedStages: 0, wage: 0 };
      return {
        ...t,
        completedStages: e.completedStages || 0,
        totalEarnings: e.wage || 0,
      };
    });
    const defaults = await getTechnicianWageDefaults(prisma, companyId);
    res.json({ success: true, data: { items: enriched, total, page: pageNum, limit: limitNum, wageDefaults: defaults } });
  } catch (error) {
    console.error('Error listing dental technicians:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفنيين' });
  }
};

const createTechnician = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return res.status(400).json({ success: false, error: 'اسم الفني مطلوب' });
    const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'TECHNICIAN';
    let wagePerStage = null;
    if (body.wagePerStage !== undefined && body.wagePerStage !== null && body.wagePerStage !== '') {
      const wr = toNonNegativeNumber(body.wagePerStage, 0);
      if (!wr.valid) return res.status(400).json({ success: false, error: 'أجر الفني غير صحيح' });
      wagePerStage = wr.value;
    }

    const prisma = getSharedPrismaClient();
    const technician = await prisma.dentalTechnician.create({
      data: {
        companyId,
        userId: body.userId ? String(body.userId) : null,
        name,
        phone: body.phone ? String(body.phone) : null,
        role,
        wagePerStage,
        isActive: normalizeBool(body.isActive, true),
      },
    });
    res.json({ success: true, data: technician });
  } catch (error) {
    console.error('Error creating dental technician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفني' });
  }
};

const TECHNICIAN_UPDATE_FIELDS = ['name', 'phone', 'role', 'isActive', 'userId', 'wagePerStage'];

const updateTechnician = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalTechnician.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفني غير موجود' });

    const data = {};
    for (const field of TECHNICIAN_UPDATE_FIELDS) {
      if (field in body) data[field] = body[field];
    }
    if ('name' in data) {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) return res.status(400).json({ success: false, error: 'اسم الفني مطلوب' });
      data.name = name;
    }
    if ('phone' in data) data.phone = data.phone ? String(data.phone) : null;
    if ('role' in data) data.role = data.role ? String(data.role) : 'TECHNICIAN';
    if ('userId' in data) data.userId = data.userId ? String(data.userId) : null;
    if ('wagePerStage' in data) {
      if (data.wagePerStage === null || data.wagePerStage === undefined || data.wagePerStage === '') {
        data.wagePerStage = null;
      } else {
        const wr = toNonNegativeNumber(data.wagePerStage, 0);
        if (!wr.valid) return res.status(400).json({ success: false, error: 'أجر الفني غير صحيح' });
        data.wagePerStage = wr.value;
      }
    }
    if ('isActive' in data) data.isActive = normalizeBool(data.isActive, true);

    const technician = await prisma.dentalTechnician.update({ where: { id }, data });
    res.json({ success: true, data: technician });
  } catch (error) {
    console.error('Error updating dental technician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفني' });
  }
};

const deleteTechnician = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalTechnician.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفني غير موجود' });
    const technician = await prisma.dentalTechnician.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, data: technician });
  } catch (error) {
    console.error('Error deleting dental technician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفني' });
  }
};

// ==================== CASES ====================

const CASE_LIST_INCLUDE = {
  doctor: { select: { id: true, name: true, clinicName: true, phone: true } },
  workType: { select: { id: true, name: true, category: true, price: true } },
};

const CASE_DETAIL_INCLUDE = {
  ...CASE_LIST_INCLUDE,
  stages: { orderBy: { sortOrder: 'asc' } },
  assignments: {
    include: { technician: { select: { id: true, name: true, role: true } } },
    orderBy: { assignedAt: 'desc' },
  },
  attachments: { orderBy: { createdAt: 'desc' } },
  invoices: { include: { payments: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' } },
  customValues: { include: { field: true } },
history: { orderBy: { createdAt: 'asc' } },
  qualityChecks: { orderBy: { checkedAt: 'desc' } },
  refabrications: { orderBy: { createdAt: 'desc' } },
  creditNotes: { orderBy: { createdAt: 'desc' } },
};

const listCases = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { status, doctorId, search } = req.query;
    const where = { companyId };
    if (status) {
      const s = String(status).toUpperCase();
      if (!CASE_STATUSES.has(s)) return res.status(400).json({ success: false, error: 'حالة الشغل غير صحيحة' });
      where.status = s;
    }
    if (doctorId) where.doctorId = doctorId;
    if (search) {
      where.OR = [
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { patientName: { contains: search, mode: 'insensitive' } },
        { doctorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalLabCase.findMany({ where, include: CASE_LIST_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.dentalLabCase.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing dental cases:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب حالات المعمل' });
  }
};

const createCase = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    let doctorId = body.doctorId || null;
    if (doctorId) {
      const doctor = await prisma.dentalLabDoctor.findFirst({ where: { id: doctorId, companyId } });
      if (!doctor) return res.status(400).json({ success: false, error: 'الطبيب لا ينتمي لهذه الشركة' });
    }

    let workType = null;
    if (body.workTypeId) {
      workType = await prisma.dentalWorkType.findFirst({ where: { id: body.workTypeId, companyId } });
      if (!workType) return res.status(400).json({ success: false, error: 'نوع الشغل لا ينتمي لهذه الشركة' });
    }
    const workTypeName =
      typeof body.workTypeName === 'string' && body.workTypeName.trim()
        ? body.workTypeName.trim()
        : (workType && workType.name) || '';
    if (!workTypeName) return res.status(400).json({ success: false, error: 'اسم نوع الشغل مطلوب' });

    let dueDate = parseDate(body.dueDate);
    if (!dueDate && body.workTypeId) {
      dueDate = await suggestDueDate(prisma, companyId, body.workTypeId);
    }

let priceSnapshot = workType ? (Number(workType.price) || 0) : 0;
    if ((body.priceSnapshot === undefined || body.priceSnapshot === null || body.priceSnapshot === '') && doctorId && workType) {
      priceSnapshot = await resolveDoctorWorkTypePrice(prisma, companyId, doctorId, workType);
    }
    if (body.priceSnapshot !== undefined && body.priceSnapshot !== null && body.priceSnapshot !== '') {
      const priceResult = toNonNegativeNumber(body.priceSnapshot);
      if (!priceResult.valid) return res.status(400).json({ success: false, error: 'سعر الحالة غير صحيح' });
      priceSnapshot = priceResult.value;
    }
    const discountResult = toNonNegativeNumber(body.discount, 0);
    if (!discountResult.valid) return res.status(400).json({ success: false, error: 'قيمة الخصم غير صحيحة' });
    const paidResult = toNonNegativeNumber(body.paid, 0);
    if (!paidResult.valid) return res.status(400).json({ success: false, error: 'قيمة المدفوع غير صحيحة' });

    const discount = discountResult.value;
    const paid = paidResult.value;
    if (discount > priceSnapshot) return res.status(400).json({ success: false, error: 'الخصم أكبر من السعر' });
    const total = round2(priceSnapshot - discount);
    const remaining = round2(Math.max(0, total - paid));
    const paymentStatus = derivePaymentStatus(total, paid);

    const priority = typeof body.priority === 'string' ? body.priority.toUpperCase() : 'NORMAL';
    if (!['NORMAL', 'URGENT', 'STAT'].includes(priority)) {
      return res.status(400).json({ success: false, error: 'أولوية الحالة غير صحيحة' });
    }

    const stageNames = await getStageTemplates(prisma, companyId, workType ? workType.category : null);
    const stagesData = buildStagesData(companyId, stageNames);

const doctorRow = doctorId
      ? await prisma.dentalLabDoctor.findFirst({ where: { id: doctorId, companyId }, select: { name: true } })
      : null;

    const billingPolicy = await getBillingPolicy(prisma, companyId);
    if (billingPolicy.enforceCreditLimit && doctorId) {
      const creditCheck = await assertCreditLimit(prisma, companyId, doctorId, total);
      if (creditCheck) {
        return res.status(400).json({
          success: false,
          error: `تجاوز حد الائتمان للطبيب (الحد ${creditCheck.creditLimit}، المستحق بعده ${creditCheck.after})`,
        });
      }
    }

    let dentalCase = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        dentalCase = await prisma.dentalLabCase.create({
          data: {
            companyId,
            caseNumber: await generateCaseNumber(prisma, companyId),
            doctorId,
            doctorName: (body.doctorName && String(body.doctorName).trim()) || (doctorRow && doctorRow.name) || null,
            patientName: body.patientName ? String(body.patientName).trim() : null,
            patientPhone: body.patientPhone ? String(body.patientPhone) : null,
            workTypeId: body.workTypeId || null,
            workTypeName,
            teeth: body.teeth ? String(body.teeth) : null,
            shade: body.shade ? String(body.shade) : null,
            material: body.material ? String(body.material) : null,
            status: 'RECEIVED',
            orderStatus: 'PENDING',
            priority,
            dueDate,
            source: 'MANUAL',
            priceSnapshot,
            discount,
            total,
            paid,
            remaining,
            paymentStatus,
            notes: body.notes ? String(body.notes) : null,
            createdBy: req.user?.id || req.user?.email || null,
            stages: { create: stagesData },
          },
          include: CASE_LIST_INCLUDE,
        });
        break;
      } catch (error) {
        if (error?.code === 'P2002' && attempt < 3) {
          continue;
        }
        throw error;
      }
    }

await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: dentalCase.id,
      dimension: 'STAGE',
      status: 'RECEIVED',
      oldStatus: null,
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
    });

    if (billingPolicy.invoiceMode === 'AUTO_ON_RECEIPT') {
      await autoCreateInvoiceForCase(prisma, companyId, dentalCase, {
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
      });
    }

    res.json({ success: true, data: dentalCase });
    dentalNotificationService.notifyCaseReceived(dentalCase.id).catch(() => {});
  } catch (error) {
    console.error('Error creating dental case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء حالة المعمل' });
  }
};

const serializeDentalCaseDetail = (dentalCase) => {
  if (!dentalCase) return dentalCase;
  const attachments = Array.isArray(dentalCase.attachments)
    ? dentalCase.attachments.map((a) => ({ ...a, storedName: a.storedPath || null }))
    : dentalCase.attachments;
  return { ...dentalCase, attachments };
};

const getCaseDetail = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: CASE_DETAIL_INCLUDE,
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    // الفني يفتح فقط الحالات التي في مرحلته (IN_PROGRESS/PENDING لمرحلة مسندة له)
    const teamRoles = await require('../services/dentalRoles').loadTeamRoles(companyId);
    const role = resolveDentalRole(req.user, teamRoles);
    if (role === 'TECHNICIAN') {
      const technician = await prisma.dentalTechnician.findFirst({ where: { companyId, userId: req.user?.id, isActive: true } });
      const hasMyStage = (dentalCase.stages || []).some(
        (s) => s.assigneeId === (technician ? technician.id : null) && ['IN_PROGRESS', 'PENDING'].includes(s.status)
      );
      if (!technician || !hasMyStage) {
        return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
      }
    }

    res.json({ success: true, data: serializeDentalCaseDetail(dentalCase) });
  } catch (error) {
    console.error('Error fetching dental case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحالة' });
  }
};

const CASE_UPDATE_FIELDS = ['patientName', 'patientPhone', 'teeth', 'shade', 'material', 'priority', 'notes', 'dueDate'];

const updateCase = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    // RECEPTION لا يعدل الحقول المالية
    const financialFields = ['priceSnapshot', 'discount', 'paid', 'doctorId', 'workTypeId', 'workTypeName'];
    const hasFinancialChange = financialFields.some((f) => f in body);
    if (hasFinancialChange) {
      const teamRolesUpd = await require('../services/dentalRoles').loadTeamRoles(companyId);
      const roleUpd = resolveDentalRole(req.user, teamRolesUpd);
      if (roleUpd === 'RECEPTION') {
        return res.status(403).json({ success: false, error: 'غير مصرح بتعديل الحقول المالية' });
      }
    }

    const data = {};
    for (const field of CASE_UPDATE_FIELDS) {
      if (field in body) data[field] = body[field];
    }
    if ('patientName' in data) data.patientName = data.patientName ? String(data.patientName).trim() : null;
    if ('patientPhone' in data) data.patientPhone = data.patientPhone ? String(data.patientPhone) : null;
    if ('teeth' in data) data.teeth = data.teeth ? String(data.teeth) : null;
    if ('shade' in data) data.shade = data.shade ? String(data.shade) : null;
    if ('material' in data) data.material = data.material ? String(data.material) : null;
    if ('notes' in data) data.notes = data.notes ? String(data.notes) : null;
    if ('dueDate' in data) data.dueDate = parseDate(data.dueDate);
    if ('priority' in data) {
      const priority = String(data.priority).toUpperCase();
      if (!['NORMAL', 'URGENT', 'STAT'].includes(priority)) {
        return res.status(400).json({ success: false, error: 'أولوية الحالة غير صحيحة' });
      }
      data.priority = priority;
    }

    if ('doctorId' in body) {
      const doctorId = body.doctorId || null;
      if (doctorId) {
        const doctor = await prisma.dentalLabDoctor.findFirst({ where: { id: doctorId, companyId } });
        if (!doctor) return res.status(400).json({ success: false, error: 'الطبيب لا ينتمي لهذه الشركة' });
        data.doctorId = doctorId;
        data.doctorName = doctor.name;
      } else {
        data.doctorId = null;
        data.doctorName = null;
      }
    }

    let priceSnapshot = Number(existing.priceSnapshot) || 0;
    if ('priceSnapshot' in body) {
      const priceResult = toNonNegativeNumber(body.priceSnapshot);
      if (!priceResult.valid) return res.status(400).json({ success: false, error: 'سعر الحالة غير صحيح' });
      priceSnapshot = priceResult.value;
    }

    if ('workTypeId' in body) {
      const workTypeId = body.workTypeId || null;
      if (workTypeId) {
        const workType = await prisma.dentalWorkType.findFirst({ where: { id: workTypeId, companyId } });
        if (!workType) return res.status(400).json({ success: false, error: 'نوع الشغل لا ينتمي لهذه الشركة' });
        data.workTypeId = workTypeId;
        data.workTypeName = workType.name;
        if (!('priceSnapshot' in body)) priceSnapshot = Number(workType.price) || 0;
      } else {
        data.workTypeId = null;
        data.workTypeName = null;
      }
    } else if ('workTypeName' in body) {
      data.workTypeName = body.workTypeName ? String(body.workTypeName).trim() : null;
    }

    let discount = Number(existing.discount) || 0;
    if ('discount' in body) {
      const discountResult = toNonNegativeNumber(body.discount, 0);
      if (!discountResult.valid) return res.status(400).json({ success: false, error: 'قيمة الخصم غير صحيحة' });
      discount = discountResult.value;
    }
    let paid = Number(existing.paid) || 0;
    if ('paid' in body) {
      const paidResult = toNonNegativeNumber(body.paid, 0);
      if (!paidResult.valid) return res.status(400).json({ success: false, error: 'قيمة المدفوع غير صحيحة' });
      paid = paidResult.value;
    }
    if (discount > priceSnapshot) return res.status(400).json({ success: false, error: 'الخصم أكبر من السعر' });

    const total = round2(priceSnapshot - discount);
    const remaining = round2(Math.max(0, total - paid));
    if (total > (Number(existing.total) || 0)) {
      const billingPolicyUpdate = await getBillingPolicy(prisma, companyId);
      if (billingPolicyUpdate.enforceCreditLimit) {
        const doctorIdForCheck = data.doctorId !== undefined ? data.doctorId : existing.doctorId;
        if (doctorIdForCheck) {
          const delta = round2(total - (Number(existing.total) || 0));
          const check = await assertCreditLimit(prisma, companyId, doctorIdForCheck, delta);
          if (check && check.blocked) return res.status(400).json({ success: false, error: `تجاوز حد الائتمان للطبيب (الحد ${check.creditLimit}، المستحق بعده ${check.after})` });
        }
      }
    }
    data.priceSnapshot = priceSnapshot;
    data.discount = discount;
    data.total = total;
    data.paid = paid;
    data.remaining = remaining;
    data.paymentStatus = derivePaymentStatus(total, paid);

    const dentalCase = await prisma.dentalLabCase.update({ where: { id }, data, include: CASE_LIST_INCLUDE });
    res.json({ success: true, data: dentalCase });
  } catch (error) {
    console.error('Error updating dental case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الحالة' });
  }
};

const advanceCaseStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    // الفني يقدّم مرحلته هو فقط
    const teamRoles = await require('../services/dentalRoles').loadTeamRoles(companyId);
    const role = resolveDentalRole(req.user, teamRoles);
    if (role === 'TECHNICIAN') {
      const technician = await prisma.dentalTechnician.findFirst({ where: { companyId, userId: req.user?.id, isActive: true } });
      const hasMyStage = (existing.stages || []).some(
        (s) => s.assigneeId === (technician ? technician.id : null) && s.status === 'IN_PROGRESS'
      );
      if (!technician || !hasMyStage) {
        return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
      }
    }

    const current = existing.status;
    if (!CASE_STATUSES.has(current)) return res.status(400).json({ success: false, error: 'الحالة الحالية غير صحيحة' });
    const currentIndex = CASE_STATUS_CHAIN.indexOf(current);
    const nextInChain = currentIndex < CASE_STATUS_CHAIN.length - 1 ? CASE_STATUS_CHAIN[currentIndex + 1] : null;

    let target = null;
    if (body.to !== undefined && body.to !== null && body.to !== '') {
      target = String(body.to).toUpperCase();
      if (!CASE_STATUSES.has(target)) return res.status(400).json({ success: false, error: 'الحالة المطلوبة غير صحيحة' });
      if (target !== nextInChain) {
        return res.status(400).json({ success: false, error: `لا يمكن الانتقال من "${current}" إلى "${target}"` });
      }
    } else if (body.status !== undefined && body.status !== null && body.status !== '') {
      target = String(body.status).toUpperCase();
      if (!CASE_STATUSES.has(target)) return res.status(400).json({ success: false, error: 'الحالة المطلوبة غير صحيحة' });
      if (target !== nextInChain) {
        return res.status(400).json({ success: false, error: `لا يمكن الانتقال من "${current}" إلى "${target}"` });
      }
    } else {
      target = nextInChain;
    }

    if (!target) return res.status(400).json({ success: false, error: 'الحالة الحالية هي الحالة الأخيرة' });
    if (target === current) return res.status(400).json({ success: false, error: 'لا يمكن الانتقال إلى نفس الحالة' });

if (target === 'READY') {
      const settingRows = await prisma.dentalSetting.findMany({ where: { companyId } });
      const settings = mergeSettings(settingRows);
      const guards = settings.guards || {};
      if (guards.requireQualityCheckBeforeReady === true) {
        const passedCheck = await prisma.dentalQualityCheck.findFirst({
          where: { companyId, caseId: id, passed: true },
          select: { id: true },
        });
        if (!passedCheck) {
          return res.status(400).json({ success: false, error: 'مطلوب فحص جودة ناجح قبل التسليم' });
        }
      }
    }

    // السياسة المالية: فاتورة تلقائية + حماية التسليم قبل التحصيل
    if (target === 'READY' || target === 'DELIVERED' || target === 'CLOSED') {
      const billing = await getBillingPolicy(prisma, companyId);
      const meta = { changedBy: req.user?.id || req.user?.email || null, userName: adminDisplayName(req) };
      if (billing.invoiceMode !== 'MANUAL') {
        await autoCreateInvoiceForCase(prisma, companyId, existing, meta);
      }
      if (target === 'DELIVERED' || target === 'CLOSED') {
        const invoices = await prisma.dentalInvoice.findMany({
          where: { companyId, caseId: id, status: { not: 'VOID' } },
          select: { id: true, remaining: true },
        });
        if (billing.requireInvoiceBeforeDelivery && invoices.length === 0) {
          return res.status(400).json({ success: false, error: 'لا يمكن تسليم الحالة قبل إنشاء فاتورة على الطبيب' });
        }
        if (billing.requireFullPaymentBeforeDelivery) {
          const remainingTotal = round2(invoices.reduce((s, i) => s + (Number(i.remaining) || 0), 0));
          if (remainingTotal > 0) {
            return res.status(400).json({ success: false, error: `لا يمكن تسليم الحالة قبل سداد كامل المستحقات (المتبقي ${remainingTotal})` });
          }
        }
      }
    }

const updateData = { status: target };
    if (target === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      updateData.orderStatus = 'COMPLETED';
    }
    if (target === 'CLOSED') {
      updateData.orderStatus = 'COMPLETED';
      if (!updateData.deliveredAt) updateData.deliveredAt = existing.deliveredAt || new Date();
    }

    // منع الرجوع للخلف (إلا عبر إعادة التصنيع)
    const targetIndex = CASE_STATUS_CHAIN.indexOf(target);
    if (targetIndex >= 0 && targetIndex < currentIndex) {
      return res.status(400).json({ success: false, error: 'لا يمكن الرجوع بالحالة إلى مرحلة سابقة' });
    }

    const assigneeId = body.assigneeId || null;
    let assigneeName = null;
    if (assigneeId) {
      const tech = await prisma.dentalTechnician.findFirst({ where: { id: assigneeId, companyId } });
      if (tech) assigneeName = tech.name;
    }

    const stages = existing.stages || [];
    const targetStage = stageForStatus(stages, target);
    const targetStageSort = targetStage ? Number(targetStage.sortOrder ?? 9999) : 9999;

    const stageOps = [];
    // أكمل كل المراحل قبل المرحلة المستهدفة (يدعم القفز المتقدم بدون ترك مراحل معلّقة)
    for (const st of stages) {
      const so = Number(st.sortOrder ?? 0);
      if (so < targetStageSort && st.status !== 'DONE') {
        stageOps.push({ id: st.id, data: { status: 'DONE', completedAt: new Date() } });
      }
    }
    if (targetStage) {
      const targetData = { status: 'IN_PROGRESS', startedAt: new Date() };
      if (assigneeId && !targetStage.assigneeId) {
        targetData.assigneeId = assigneeId;
        targetData.assigneeName = assigneeName;
      }
      stageOps.push({ id: targetStage.id, data: targetData });
    }

    let dentalCase;
    if (stageOps.length > 0) {
      dentalCase = await prisma.$transaction(async (tx) => {
        for (const op of stageOps) {
          await tx.dentalCaseStage.update({ where: { id: op.id }, data: op.data });
        }
        return tx.dentalLabCase.update({ where: { id }, data: updateData, include: CASE_LIST_INCLUDE });
      });
    } else {
      dentalCase = await prisma.dentalLabCase.update({ where: { id }, data: updateData, include: CASE_LIST_INCLUDE });
    }

    await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: id,
      dimension: 'STAGE',
      status: target,
      oldStatus: current,
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
      reason: body.reason ? String(body.reason) : null,
    });

    res.json({ success: true, data: dentalCase });
    if (target === 'READY') dentalNotificationService.notifyCaseReady(id).catch(() => {});
    if (target === 'DELIVERED') dentalNotificationService.notifyCaseDelivered(id).catch(() => {});
  } catch (error) {
    console.error('Error advancing dental case status:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة الشغل' });
  }
};

const assignTechnician = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const technicianId = body.technicianId || null;
    if (!technicianId) return res.status(400).json({ success: false, error: 'معرف الفني مطلوب' });
    const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'TECHNICIAN';

    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const technician = await prisma.dentalTechnician.findFirst({ where: { id: technicianId, companyId } });
    if (!technician) return res.status(400).json({ success: false, error: 'الفني لا ينتمي لهذه الشركة' });

    const activeStage = findActiveStage(existing.stages || []);

    await prisma.$transaction(async (tx) => {
      await tx.dentalCaseAssignment.create({
        data: { companyId, caseId: id, technicianId, role },
      });
      if (activeStage && !activeStage.assigneeId) {
        await tx.dentalCaseStage.update({
          where: { id: activeStage.id },
          data: { assigneeId: technicianId, assigneeName: technician.name, startedAt: new Date() },
        });
      }
    });

    await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: id,
      dimension: 'STAGE',
      status: 'ASSIGNED',
      oldStatus: existing.status,
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
      reason: `تم إسناد العمل إلى ${technician.name}`,
    });

    const dentalCase = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, include: CASE_DETAIL_INCLUDE });
    res.json({ success: true, data: dentalCase });
  } catch (error) {
    console.error('Error assigning dental technician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إسناد الفني' });
  }
};

const uploadCaseAttachment = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!existing) {
      const leftovers = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      for (const f of leftovers) { if (f && f.path) fs.unlink(f.path, () => {}); }
      return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    }

    // يقبل رفع ملف واحد (req.file) أو متعدد (req.files)
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    if (files.length === 0) return res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });

    // يحدد نوع كل مرفق:
    //  - req.body.kind (string) → يطبق على كل الملفات (توافق عكسي)
    //  - req.body.kinds (array) → نوع مستقل لكل ملف (مهم في الـmulti-upload)
    const normalizeKinds = (raw) => {
      if (raw == null) return [];
      if (Array.isArray(raw)) return raw.map((k) => String(k).toUpperCase());
      if (typeof raw === 'object') {
        // multer قد يحوّل list-form-fields إلى object مرقّم
        return Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => String(raw[k]).toUpperCase());
      }
      return [String(raw).toUpperCase()];
    };
    let perFileKinds = normalizeKinds(req.body?.kinds);
    if (perFileKinds.length === 0 && req.body?.kind) {
      perFileKinds = normalizeKinds(req.body.kind);
    }
    // pad/truncate to match file count
    if (perFileKinds.length < files.length) {
      const last = perFileKinds[perFileKinds.length - 1] || 'SCAN';
      while (perFileKinds.length < files.length) perFileKinds.push(last);
    } else if (perFileKinds.length > files.length) {
      perFileKinds = perFileKinds.slice(0, files.length);
    }
    // validate all kinds
    for (const k of perFileKinds) {
      if (!ATTACHMENT_KINDS.has(k)) {
        for (const f of files) { if (f && f.path) fs.unlink(f.path, () => {}); }
        return res.status(400).json({ success: false, error: 'نوع المرفق غير صحيح' });
      }
    }

    // رفع مراجعة التصميم (HTML من exocad) لمالك/مدير فقط
    if (perFileKinds.includes('DESIGN_REVIEW')) {
      const teamRoles = await require('../services/dentalRoles').loadTeamRoles(companyId);
      const role = resolveDentalRole(req.user, teamRoles);
      if (!['OWNER', 'MANAGER'].includes(role)) {
        for (const f of files) { if (f && f.path) fs.unlink(f.path, () => {}); }
        return res.status(403).json({ success: false, error: 'غير مصرح برفع مراجعة التصميم' });
      }
    }

    // رفع مراجعة التصميم يجب أن يكون ملف HTML واحد على الأقل، والملفات غير HTML مسموحة فقط للأنواع الأخرى.
    const isHtmlFile = (f) => {
      const ext = path.extname(f.originalname || f.filename || '').toLowerCase();
      const mime = String(f.mimetype || '').toLowerCase();
      return ext === '.html' || mime === 'text/html';
    };
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const k = perFileKinds[i];
      if (k === 'DESIGN_REVIEW' && !isHtmlFile(f)) {
        for (const ff of files) { if (ff && ff.path) fs.unlink(ff.path, () => {}); }
        return res.status(400).json({ success: false, error: 'مراجعة التصميم يجب أن تكون ملف HTML من exocad' });
      }
      if (k !== 'DESIGN_REVIEW' && isHtmlFile(f)) {
        for (const ff of files) { if (ff && ff.path) fs.unlink(ff.path, () => {}); }
        return res.status(400).json({ success: false, error: 'ملفات HTML مسموحة فقط لمراجعة التصميم (DESIGN_REVIEW)' });
      }
    }

    const uploader = req.user?.id || req.user?.email || null;
    const created = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const att = await prisma.dentalCaseAttachment.create({
        data: {
          companyId,
          caseId: id,
          uploadedBy: uploader,
          kind: perFileKinds[i],
          fileName: f.originalname || f.filename,
          storedPath: f.filename,
          mimeType: f.mimetype || null,
          size: f.size || 0,
        },
      });
      created.push(att);
    }

    res.json({
      success: true,
      data: created.length === 1 ? created[0] : created,
      meta: { count: created.length, kinds: perFileKinds },
    });
  } catch (error) {
    console.error('Error uploading dental attachment:', error);
    const leftovers = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    for (const f of leftovers) { if (f && f.path) fs.unlink(f.path, () => {}); }
    res.status(500).json({ success: false, error: 'حدث خطأ في رفع المرفق' });
  }
};

const deleteCaseAttachment = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id, attachmentId } = req.params;
    const prisma = getSharedPrismaClient();
    const attachment = await prisma.dentalCaseAttachment.findFirst({
      where: { id: attachmentId, companyId, caseId: id },
    });
    if (!attachment) return res.status(404).json({ success: false, error: 'المرفق غير موجود' });
    if (attachment.storedPath) {
      const filePath = path.join(dentalLabDir, path.basename(attachment.storedPath));
      if (path.resolve(filePath).startsWith(path.resolve(dentalLabDir))) {
        fs.unlink(filePath, () => {});
      }
    }
    await prisma.dentalCaseAttachment.delete({ where: { id: attachmentId } });
    res.json({ success: true, data: { id: attachmentId } });
  } catch (error) {
    console.error('Error deleting dental attachment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المرفق' });
  }
};

// ==================== INVOICES ====================

const listInvoices = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { doctorId, status } = req.query;
    const where = { companyId };
    if (doctorId) where.doctorId = doctorId;
    if (status) {
      const s = String(status).toUpperCase();
      if (!INVOICE_STATUSES.has(s)) return res.status(400).json({ success: false, error: 'حالة الفاتورة غير صحيحة' });
      where.status = s;
    }

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalInvoice.findMany({
        where,
        include: {
          case: { select: { id: true, caseNumber: true, patientName: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.dentalInvoice.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing dental invoices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفواتير' });
  }
};

const createInvoice = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    let dentalCase = null;
    if (body.caseId) {
      dentalCase = await prisma.dentalLabCase.findFirst({ where: { id: body.caseId, companyId } });
      if (!dentalCase) return res.status(400).json({ success: false, error: 'الحالة لا تنتمي لهذه الشركة' });
    }

    let doctorId = body.doctorId || (dentalCase && dentalCase.doctorId) || null;
    let doctorName = body.doctorName ? String(body.doctorName).trim() : (dentalCase && dentalCase.doctorName) || null;
    if (doctorId && !body.doctorName) {
      const doctor = await prisma.dentalLabDoctor.findFirst({
        where: { id: doctorId, companyId },
        select: { name: true },
      });
      if (!doctor) return res.status(400).json({ success: false, error: 'الطبيب لا ينتمي لهذه الشركة' });
      doctorName = doctor.name;
    }

    let total = dentalCase ? Number(dentalCase.total) || 0 : 0;
    if (body.total !== undefined && body.total !== null && body.total !== '') {
      const totalResult = toNonNegativeNumber(body.total);
      if (!totalResult.valid) return res.status(400).json({ success: false, error: 'إجمالي الفاتورة غير صحيح' });
      total = totalResult.value;
    }
    let discount = dentalCase ? Number(dentalCase.discount) || 0 : 0;
    if (body.discount !== undefined && body.discount !== null && body.discount !== '') {
      const discountResult = toNonNegativeNumber(body.discount, 0);
      if (!discountResult.valid) return res.status(400).json({ success: false, error: 'قيمة الخصم غير صحيحة' });
      discount = discountResult.value;
    }
    if (discount > total) return res.status(400).json({ success: false, error: 'الخصم أكبر من الإجمالي' });
    const paidResult = toNonNegativeNumber(body.paid, 0);
    if (!paidResult.valid) return res.status(400).json({ success: false, error: 'قيمة المدفوع غير صحيحة' });
    const paid = paidResult.value;
    const remaining = round2(Math.max(0, total - paid));
    const status = deriveInvoiceStatus(total, paid);

    let method = body.paymentMethod ? String(body.paymentMethod).toUpperCase() : 'OTHER';
    if (!PAYMENT_METHODS.has(method)) method = 'OTHER';

    let invoice = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        invoice = await prisma.dentalInvoice.create({
          data: {
            companyId,
            invoiceNumber: await generateInvoiceNumber(prisma, companyId),
            caseId: body.caseId || null,
            doctorId,
            doctorName,
            total,
            discount,
            paid,
            remaining,
            status,
            dueDate: parseDate(body.dueDate),
            notes: body.notes ? String(body.notes) : null,
            payments: paid > 0 ? { create: { companyId, amount: paid, method, note: 'دفعة عند الإنشاء', paidBy: req.user?.id || req.user?.email || null } } : undefined,
          },
          include: { payments: { orderBy: { createdAt: 'desc' } } },
        });
        break;
      } catch (error) {
        if (error?.code === 'P2002') {
          const target = error?.meta?.target;
          const targetStr = Array.isArray(target) ? target.join(',') : String(target || '');
          if (targetStr.includes('caseId') || targetStr.includes('companyId_caseId')) {
            return res.status(400).json({ success: false, error: 'فاتورة موجودة بالفعل لهذه الحالة' });
          }
          if (attempt < 3) continue;
        }
        throw error;
      }
    }

    if (body.caseId) {
      await syncCasePayments(prisma, companyId, body.caseId, {
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
      });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error creating dental invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفاتورة' });
  }
};

const recordInvoicePayment = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const amountResult = toPositiveNumber(body.amount);
    if (!amountResult.valid) return res.status(400).json({ success: false, error: 'مبلغ الدفعة غير صحيح' });
    let method = body.method ? String(body.method).toUpperCase() : null;
    if (method && !PAYMENT_METHODS.has(method)) method = 'OTHER';

const prisma = getSharedPrismaClient();
    const invoice = await prisma.dentalInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    if (invoice.status === 'VOID') return res.status(400).json({ success: false, error: 'لا يمكن تحصيل فاتورة ملغاة' });

    const total = round2(Number(invoice.total) || 0);
    const paidSoFar = round2(Number(invoice.paid) || 0);
    const remaining = round2(Math.max(0, total - paidSoFar));
    if (remaining <= 0) return res.status(400).json({ success: false, error: 'الفاتورة مسددة بالكامل' });
    if (amountResult.value > remaining) {
      return res.status(400).json({ success: false, error: 'المبلغ أكبر من المتبقي على الفاتورة' });
    }

    const oldStatus = invoice.status;
    let invoiceStatus = oldStatus;
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        // قفل صف الفاتورة لمنع سباق الدفع المتزامن
        if (typeof tx.$queryRawUnsafe === 'function') {
          await tx.$queryRawUnsafe(`SELECT "id" FROM "dental_invoices" WHERE "id" = $1 FOR UPDATE`, id);
        }
        const fresh = await tx.dentalInvoice.findFirst({ where: { id }, select: { total: true, paid: true } });
        const freshTotal = round2(Number(fresh.total) || 0);
        const freshPaid = round2(Number(fresh.paid) || 0);
        const freshRemaining = round2(Math.max(0, freshTotal - freshPaid));
        if (amountResult.value > freshRemaining) {
          const err = new Error('المبلغ أكبر من المتبقي على الفاتورة');
          err.code = 'OVERPAY';
          throw err;
        }
        await tx.dentalPayment.create({
          data: {
            companyId,
            invoiceId: id,
            amount: amountResult.value,
            method,
            note: body.note ? String(body.note) : null,
            paidBy: req.user?.id || req.user?.email || null,
          },
        });

        const payments = await tx.dentalPayment.findMany({ where: { invoiceId: id } });
        const paid = round2(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
        const newRemaining = round2(Math.max(0, freshTotal - paid));
        invoiceStatus = deriveInvoiceStatus(freshTotal, paid);

        return tx.dentalInvoice.update({
          where: { id },
          data: { paid, remaining: newRemaining, status: invoiceStatus },
          include: {
            case: { select: { id: true, caseNumber: true, patientName: true } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        });
      });
    } catch (error) {
      if (error?.code === 'OVERPAY' || String(error?.message || '').includes('المبلغ أكبر من المتبقي')) {
        return res.status(400).json({ success: false, error: 'المبلغ أكبر من المتبقي على الفاتورة' });
      }
      throw error;
    }

if (invoice.caseId) {
      await syncCasePayments(prisma, companyId, invoice.caseId, {
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
        reason: `دفعة على فاتورة ${invoice.invoiceNumber}`,
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error recording dental payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفعة' });
  }
};

// ==================== DASHBOARD ====================

const getDeliveryEstimate = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { workTypeId } = req.query;
    if (!workTypeId) return res.status(400).json({ success: false, error: 'معرف نوع الشغل مطلوب' });
    const prisma = getSharedPrismaClient();
    const estimate = await estimateLeadDays(prisma, companyId, String(workTypeId));
    const dueDate = await suggestDueDate(prisma, companyId, String(workTypeId));
    res.json({ success: true, data: { ...estimate, dueDate } });
  } catch (error) {
    console.error('Error estimating delivery:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تقدير مدة التسليم' });
  }
};

const getDashboard = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const startOfToday = getStartOfDayInTimezone(now);
    const endOfToday = getEndOfDayInTimezone(now);

const [statusRows, todayReceived, readyCount, overdueCount, revenueAgg, outstandingAgg, topDoctorRows, topDebtorRows] =
      await Promise.all([
        prisma.dentalLabCase.groupBy({ by: ['status'], where: { companyId }, _count: { _all: true } }),
        prisma.dentalLabCase.count({ where: { companyId, receivedDate: { gte: startOfToday, lte: endOfToday } } }),
        prisma.dentalLabCase.count({ where: { companyId, status: 'READY' } }),
        prisma.dentalLabCase.count({
          where: { companyId, dueDate: { lt: now }, status: { notIn: ['DELIVERED', 'CLOSED'] } },
        }),
        prisma.dentalInvoice.aggregate({ where: { companyId, status: { not: 'VOID' } }, _sum: { paid: true } }),
        prisma.dentalInvoice.aggregate({ where: { companyId, status: { not: 'VOID' } }, _sum: { remaining: true } }),
prisma.dentalInvoice.groupBy({
          by: ['doctorId'],
          where: { companyId, status: { not: 'VOID' } },
          _sum: { paid: true },
          orderBy: { _sum: { paid: 'desc' } },
          take: 5,
        }),
        prisma.dentalInvoice.groupBy({
          by: ['doctorId'],
          where: { companyId, status: { not: 'VOID' } },
          _sum: { remaining: true },
          orderBy: { _sum: { remaining: 'desc' } },
          take: 5,
        }),
      ]);

    const statusCounts = {};
    for (const row of statusRows || []) {
      statusCounts[row.status] = row._count._all || 0;
    }

const doctorIds = (topDoctorRows || []).map((row) => row.doctorId).filter(Boolean);
    const doctors = doctorIds.length
      ? await prisma.dentalLabDoctor.findMany({ where: { id: { in: doctorIds } }, select: { id: true, name: true } })
      : [];
    const doctorNameById = new Map(doctors.map((d) => [d.id, d.name]));
    const topDoctors = (topDoctorRows || []).map((row) => ({
      doctorId: row.doctorId,
      doctorName: row.doctorId ? doctorNameById.get(row.doctorId) || 'غير محدد' : 'غير محدد',
      revenue: round2(row._sum.paid || 0),
    }));

    const debtorIds = (topDebtorRows || []).map((row) => row.doctorId).filter(Boolean);
    const debtors = debtorIds.length
      ? await prisma.dentalLabDoctor.findMany({ where: { id: { in: debtorIds } }, select: { id: true, name: true } })
      : [];
    const debtorNameById = new Map(debtors.map((d) => [d.id, d.name]));
    const topDebtors = (topDebtorRows || []).map((row) => ({
      doctorId: row.doctorId,
      doctorName: row.doctorId ? debtorNameById.get(row.doctorId) || 'غير محدد' : 'غير محدد',
      outstanding: round2(row._sum.remaining || 0),
    }));

    res.json({
      success: true,
      data: {
        statusCounts,
        byStatus: statusCounts,
        todayReceived,
        readyForDelivery: readyCount,
        readyCount,
        overdue: overdueCount,
        overdueCount,
        totalRevenue: round2(revenueAgg._sum.paid || 0),
        revenue: round2(revenueAgg._sum.paid || 0),
outstanding: round2(outstandingAgg._sum.remaining || 0),
        topDoctors,
        topDebtors,
      },
    });
  } catch (error) {
    console.error('Error fetching dental dashboard:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات المعمل' });
  }
};

// ==================== SETTINGS ====================

const getSettings = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const rows = await prisma.dentalSetting.findMany({ where: { companyId } });
    const settings = mergeSettings(rows);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching dental settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الإعدادات' });
  }
};

const SETTINGS_KEYS = ['workOrderHeader', 'stageTemplates', 'whatsappTemplates', 'enabledCustomFields', 'billingPolicy', 'wages', 'doctorPricing', 'notifications'];

const updateSettings = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const updated = {};
    for (const key of SETTINGS_KEYS) {
      if (key in body) {
        const value = body[key] === undefined ? null : body[key];
        const row = await prisma.dentalSetting.upsert({
          where: { companyId_key: { companyId, key } },
          update: { value },
          create: { companyId, key, value },
        });
        updated[key] = row.value;
      }
    }
    const rows = await prisma.dentalSetting.findMany({ where: { companyId } });
    const settings = mergeSettings(rows);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating dental settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الإعدادات' });
  }
};

// ==================== CUSTOM FIELDS ====================

const listCustomFields = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { isActive } = req.query;
    const where = { companyId };
    if (isActive !== undefined && isActive !== '') where.isActive = normalizeBool(isActive);
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalCustomFieldDef.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], skip, take: limitNum }),
      prisma.dentalCustomFieldDef.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing dental custom fields:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الحقول المخصصة' });
  }
};

const createCustomField = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return res.status(400).json({ success: false, error: 'اسم الحقل مطلوب' });
    const fieldType = typeof body.fieldType === 'string' ? body.fieldType.toUpperCase() : 'TEXT';
    if (!['TEXT', 'NUMBER', 'SELECT', 'DATE'].includes(fieldType)) {
      return res.status(400).json({ success: false, error: 'نوع الحقل غير صحيح' });
    }
    const prisma = getSharedPrismaClient();
    const field = await prisma.dentalCustomFieldDef.create({
      data: {
        companyId,
        name,
        fieldType,
        options: body.options !== undefined ? body.options : null,
        isActive: normalizeBool(body.isActive, true),
        sortOrder: Number.isFinite(parseInt(body.sortOrder, 10)) ? parseInt(body.sortOrder, 10) : 0,
      },
    });
    res.json({ success: true, data: field });
  } catch (error) {
    console.error('Error creating dental custom field:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الحقل المخصص' });
  }
};

const updateCustomField = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalCustomFieldDef.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحقل المخصص غير موجود' });

    const data = {};
    if ('name' in body) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return res.status(400).json({ success: false, error: 'اسم الحقل مطلوب' });
      data.name = name;
    }
    if ('fieldType' in body) {
      const fieldType = String(body.fieldType).toUpperCase();
      if (!['TEXT', 'NUMBER', 'SELECT', 'DATE'].includes(fieldType)) {
        return res.status(400).json({ success: false, error: 'نوع الحقل غير صحيح' });
      }
      data.fieldType = fieldType;
    }
    if ('options' in body) data.options = body.options;
    if ('sortOrder' in body) data.sortOrder = parseInt(body.sortOrder, 10) || 0;
    if ('isActive' in body) data.isActive = normalizeBool(body.isActive, true);

    const field = await prisma.dentalCustomFieldDef.update({ where: { id }, data });
    res.json({ success: true, data: field });
  } catch (error) {
    console.error('Error updating dental custom field:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الحقل المخصص' });
  }
};

const deleteCustomField = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalCustomFieldDef.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحقل المخصص غير موجود' });
    const field = await prisma.dentalCustomFieldDef.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, data: field });
  } catch (error) {
    console.error('Error deleting dental custom field:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الحقل المخصص' });
  }
};

// ==================== NOTIFICATIONS ====================

const getNotificationSchedule = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const data = await dentalNotificationService.getNotificationSchedule(companyId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dental notification schedule:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب جدول الإشعارات' });
  }
};

const updateNotificationSchedule = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const patch = req.body || {};
    if (!patch.eventType) return res.status(400).json({ success: false, error: 'نوع الحدث مطلوب' });
    const data = await dentalNotificationService.saveNotificationSchedule(companyId, patch);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating dental notification schedule:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث جدول الإشعارات' });
  }
};

const scanOverdueNotifications = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const data = await dentalNotificationService.scanOverdueCases(companyId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error scanning dental overdue notifications:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في فحص الإشعارات المتأخرة' });
  }
};

// ==================== WORK ORDER PDF ====================

const getWorkOrderPdf = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        doctor: { select: { id: true, name: true } },
        workType: { select: { id: true, name: true, price: true } },
      },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const [settingsRows, company] = await Promise.all([
      prisma.dentalSetting.findMany({ where: { companyId } }),
      prisma.company.findFirst({ where: { id: companyId } }),
    ]);
    const settings = mergeSettings(settingsRows);
    const workOrderHeader = settings.workOrderHeader || {};

    const { generateWorkOrderPdf } = require('../services/dentalWorkOrderService');
    const { buffer, caseNumber } = await generateWorkOrderPdf({ company, caseRow: dentalCase, workOrderHeader });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="work-order-${caseNumber}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating dental work order PDF:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء أمر الشغل' });
  }
};

// ==================== SCAN PARSING (AI OCR + JSON profile) ====================

/**
 * يحول JSON profile (مثل 3Shape/Exocad) إلى نتيجة ScanParseResult بدون أي مفتاح AI.
 * مفيد عندما لا يتوفر Gemini أو يريد المستخدم نتيجة فورية وموثوقة من ملف JSON.
 */
function extractFromProfileJson(rawText) {
  let data;
  try { data = JSON.parse(rawText); } catch { return null; }
  if (!data || typeof data !== 'object') return null;

  const patientInfo = data.patientInfo && typeof data.patientInfo === 'object' ? data.patientInfo : null;
  const caseInfo = data.patientTreatCaseInfo && typeof data.patientTreatCaseInfo === 'object' ? data.patientTreatCaseInfo : null;
  const toothList = Array.isArray(data.toothCaseInfo) ? data.toothCaseInfo : [];

  // اسم المريض
  const patientName = (patientInfo && (patientInfo.Name || patientInfo.name)) || null;

  // الأسنان: من toothCaseInfo.ToothNumber (قد يكون array) + Comments
  const toothNumbers = Array.isArray(toothList)
    ? toothList.map((t) => (t && (t.ToothNumber ?? t.toothNumber))).filter((n) => n !== null && n !== undefined)
    : [];
  const teeth = toothNumbers.length > 0 ? String(toothNumbers.join(',')) : null;

  // اللون/الخامة: أول سن في القائمة (تطبيقات المعمل تتعامل مع سن واحد غالباً)
  const firstTooth = toothList[0] || null;
  const shade = (firstTooth && (firstTooth.ColorType || firstTooth.colorType)) || null;
  const materialCode = (firstTooth && (firstTooth.MaterialTypeCode || firstTooth.materialTypeCode)) || null;
  const preparationCode = (firstTooth && (firstTooth.PreparationTypeCode || firstTooth.preparationTypeCode)) || null;

  // اسم الخامة مفهوم للفني (تعريب مبسط للقيم الشائعة)
  const MATERIAL_LABELS = {
    ZIRCONIA: 'زيركون',
    EMAX: 'إيماكس',
    PFM: 'بورسلين على معدن',
    PMMA: 'أكريليك مؤقت',
    METAL: 'معدن',
    WAX: 'شمع',
    PEEK: 'بيك',
    COMPOSITE: 'كومبوزيت',
    LITHIUM_DISILICATE: 'ليثيوم ديسيليكات',
  };
  const material = materialCode
    ? (MATERIAL_LABELS[String(materialCode).toUpperCase()] || String(materialCode).toLowerCase())
    : null;

  // نوع الشغل: تخمين من PreparationTypeCode
  const PREPARATION_LABELS = {
    CROWN_ANATOMIC: 'تاج',
    CROWN_COPY: 'تاج',
    BRIDGE_ANATOMIC: 'جسر',
    INLAY: 'حشو مصبوب',
    ONLAY: 'حشو مصبوب',
    VENEER: 'قشور',
    POST: 'دعامة',
    IMPLANT_CROWN: 'تاج على زرعة',
    IMPLANT_BRIDGE: 'جسر على زرعات',
  };
  const workTypeHint = preparationCode
    ? (PREPARATION_LABELS[String(preparationCode).toUpperCase()] || String(preparationCode).toLowerCase())
    : null;

  // تاريخ/الطبيب
  const doctorEmail = (caseInfo && (caseInfo.CloudOrderSystemUserName || caseInfo.Doctor)) || null;
  const requestedDeliveryUTC = caseInfo && Number(caseInfo.RequestedDeliveryDateUTC);
  let dueDate = null;
  if (requestedDeliveryUTC && requestedDeliveryUTC > 0) {
    const d = new Date(requestedDeliveryUTC * 1000);
    if (!Number.isNaN(d.getTime())) dueDate = d.toISOString();
  }

  // ملاحظات: اسم الطبيب + المادة الخام
  const notesParts = [];
  if (doctorEmail) notesParts.push(`الطبيب: ${doctorEmail}`);
  if (materialCode) notesParts.push(`(Material: ${materialCode})`);
  const notes = notesParts.length > 0 ? notesParts.join(' | ') : null;

  return { patientName, teeth, shade, material, workTypeHint, notes, dueDate };
}

const parseScan = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
if (!req.file) return res.status(400).json({ success: false, error: 'لم يتم رفع أي ملف' });

    const filePath = req.file.path;
    const rawBuffer = Buffer.isBuffer(req.file.buffer)
      ? req.file.buffer
      : fs.readFileSync(filePath);
    const mimeType = (req.file.mimetype || '').toLowerCase();
    const originalName = String(req.file.originalname || '').toLowerCase();
    const isJson = mimeType === 'application/json' || originalName.endsWith('.json') || mimeType === 'text/plain';

    // 1) JSON profile → استخراج هيكلي موثوق (3Shape/Exocad-style)
    if (isJson) {
      try {
        const text = rawBuffer.toString('utf8');
        const extracted = extractFromProfileJson(text);
        if (extracted) {
          if (filePath) fs.unlink(filePath, () => {});
          return res.json({ success: true, data: extracted, source: 'profile-json' });
        }
      } catch (_) { /* ابقِ على المسار الطبيعي */ }
    }

    // 2) صور/PDF → AI (Gemini) — يفشل بـ AI_NOT_CONFIGURED عند غياب المفتاح
    const base64 = rawBuffer.toString('base64');
    const result = await parseScanImage({ base64, mimeType: req.file.mimetype || 'image/jpeg', companyId });
    if (filePath) fs.unlink(filePath, () => {});
    res.json(result);
  } catch (error) {
    if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
    console.error('Error parsing dental scan:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء تحليل صورة المسح' });
  }
};

// ==================== QUALITY CHECKS ====================

const recordQualityCheck = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const passed = body.passed === undefined ? true : normalizeBool(body.passed);
    const check = await prisma.dentalQualityCheck.create({
      data: {
        companyId,
        caseId: id,
        checkedBy: req.user?.id || req.user?.email || null,
        checkedByName: adminDisplayName(req),
        passed,
        notes: body.notes ? String(body.notes) : null,
      },
    });
    res.json({ success: true, data: check });
  } catch (error) {
    console.error('Error recording dental quality check:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل فحص الجودة' });
  }
};

const listQualityChecks = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const checks = await prisma.dentalQualityCheck.findMany({
      where: { companyId, caseId: id },
      orderBy: { checkedAt: 'desc' },
    });
    res.json({ success: true, data: checks });
  } catch (error) {
    console.error('Error listing dental quality checks:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب فحوصات الجودة' });
  }
};

// ==================== REFABRICATION ====================

const flagRefabrication = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) return res.status(400).json({ success: false, error: 'سبب إعادة التصنيع مطلوب' });

    let stageFrom = body.stageFrom ? String(body.stageFrom).toUpperCase() : 'DESIGN';
    if (!CASE_STATUSES.has(stageFrom)) {
      return res.status(400).json({ success: false, error: 'المرحلة غير صحيحة' });
    }
    if (stageFrom === 'DELIVERED' || stageFrom === 'CLOSED') {
      return res.status(400).json({ success: false, error: 'لا يمكن إعادة تصنيع حالة مسلمة أو مغلقة' });
    }

    const refab = await prisma.$transaction(async (tx) => {
      const created = await tx.dentalRefabrication.create({
        data: {
          companyId,
          caseId: id,
          reason,
          stageFrom,
          status: 'OPEN',
          createdBy: req.user?.id || req.user?.email || null,
          createdByName: adminDisplayName(req),
        },
      });

      await tx.dentalLabCase.update({
        where: { id },
        data: { status: stageFrom, orderStatus: 'IN_PROGRESS' },
      });

      if (Array.isArray(dentalCase.stages) && dentalCase.stages.length) {
        const fromStage = stageForStatus(dentalCase.stages, stageFrom);
        const fromOrder = fromStage ? Number(fromStage.sortOrder) : CASE_STATUS_CHAIN.indexOf(stageFrom);
        const whereStage = Number.isFinite(fromOrder) && fromOrder >= 0 ? { caseId: id, sortOrder: { gte: fromOrder } } : { caseId: id };
        await tx.dentalCaseStage.updateMany({
          where: whereStage,
          data: { status: 'PENDING', startedAt: null, completedAt: null, assigneeId: null, assigneeName: null },
        });
      }

      try {
        await tx.dentalCaseAssignment.deleteMany({ where: { caseId: id } });
      } catch (assignmentError) {
        console.error('Best-effort cleanup of dental assignments failed:', assignmentError);
      }

      return created;
    });

    await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: id,
      dimension: 'STAGE',
      status: stageFrom,
      oldStatus: dentalCase.status,
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
      reason: `إعادة تصنيع: ${reason}`,
    });

    res.json({ success: true, data: refab });
  } catch (error) {
    console.error('Error flagging dental refabrication:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل إعادة التصنيع' });
  }
};

const resolveRefabrication = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id, refabId } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const refab = await prisma.dentalRefabrication.findFirst({
      where: { id: refabId, companyId, caseId: id },
    });
    if (!refab) return res.status(404).json({ success: false, error: 'إعادة التصنيع غير موجودة' });

const updated = await prisma.dentalRefabrication.update({
      where: { id: refabId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: req.user?.id || req.user?.email || null,
        resolvedNote: body.note ? String(body.note) : null,
      },
    });

    // ائتمان على العميل عند إنهاء إعادة التصنيع (شغل مُعاد لا يُدفع مرتين)
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      select: { id: true, total: true, doctorId: true, doctorName: true },
    });
    if (dentalCase) {
      const creditCount = await prisma.dentalCreditNote.count({ where: { companyId, caseId: id } });
      if (creditCount === 0) {
        await prisma.dentalCreditNote.create({
          data: {
            companyId,
            caseId: id,
            doctorId: dentalCase.doctorId || null,
            doctorName: dentalCase.doctorName || null,
            amount: round2(Number(dentalCase.total) || 0),
            reason: body.note ? String(body.note) : 'إعادة تصنيع',
            createdBy: req.user?.id || req.user?.email || null,
            createdByName: adminDisplayName(req),
          },
        });
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error resolving dental refabrication:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنهاء إعادة التصنيع' });
  }
};

// ==================== TEAM ROLES ====================

const buildTeamList = (members, teamRoles) =>
  (members || []).map((member) => {
    const user = member.user || {};
    const dentalRole = resolveDentalRole(user, teamRoles);
    const isOwnerFlag =
      dentalRole === 'OWNER' || ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user.role);
    return {
      userId: user.id,
      email: user.email || null,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      platformRole: user.role || null,
      dentalRole,
      isOwnerFlag,
    };
  });

const listTeam = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const [members, teamRoles] = await Promise.all([
      prisma.userCompany.findMany({
        where: { companyId, isActive: true },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      require('../services/dentalRoles').loadTeamRoles(companyId),
    ]);
    const data = buildTeamList(members, teamRoles);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error listing dental team:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب فريق المعمل' });
  }
};

const setTeamRole = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { userId } = req.params;
    const body = req.body || {};
    const role = typeof body.role === 'string' ? String(body.role).toUpperCase() : '';
    if (!['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN', 'ACCOUNTANT'].includes(role)) {
      return res.status(400).json({ success: false, error: 'الدور غير صحيح' });
    }
    const prisma = getSharedPrismaClient();
    const dentalRoles = require('../services/dentalRoles');
    const teamRoles = { ...(await dentalRoles.loadTeamRoles(companyId)) };
    teamRoles[userId] = role;

    await prisma.dentalSetting.upsert({
      where: { companyId_key: { companyId, key: 'teamRoles' } },
      update: { value: teamRoles },
      create: { companyId, key: 'teamRoles', value: teamRoles },
    });

    const members = await prisma.userCompany.findMany({
      where: { companyId, isActive: true },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const data = buildTeamList(members, teamRoles);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error setting dental team role:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث دور العضو' });
  }
};

// ==================== REPORTS ====================

const getDoctorStatement = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { doctorId, from, to } = req.query;
    const prisma = getSharedPrismaClient();

    const caseWhere = { companyId };
    const invoiceWhere = { companyId, status: { not: 'VOID' } };
    if (doctorId) {
      caseWhere.doctorId = doctorId;
      invoiceWhere.doctorId = doctorId;
    }
    const fromDate = parseDate(from);
    let toDate = parseDate(to); if (toDate) toDate = getEndOfDayInTimezone(toDate);
    if (fromDate) {
      caseWhere.receivedDate = { ...(caseWhere.receivedDate || {}), gte: fromDate };
      invoiceWhere.createdAt = { ...(invoiceWhere.createdAt || {}), gte: fromDate };
    }
    if (toDate) {
      caseWhere.receivedDate = { ...(caseWhere.receivedDate || {}), lte: toDate };
      invoiceWhere.createdAt = { ...(invoiceWhere.createdAt || {}), lte: toDate };
    }

    let doctor = null;
    if (doctorId) {
      const docRow = await prisma.dentalLabDoctor.findFirst({
        where: { id: doctorId, companyId },
        select: { id: true, name: true },
      });
      if (docRow) doctor = { id: docRow.id, name: docRow.name };
    }

    const creditWhere = { companyId };
    if (doctorId) creditWhere.doctorId = doctorId;
    if (fromDate) creditWhere.createdAt = { ...(creditWhere.createdAt || {}), gte: fromDate };
    if (toDate) creditWhere.createdAt = { ...(creditWhere.createdAt || {}), lte: toDate };
    const [cases, invoices, invoiceAgg, creditAgg] = await Promise.all([
      prisma.dentalLabCase.findMany({ where: caseWhere, orderBy: { createdAt: 'desc' } }),
      prisma.dentalInvoice.findMany({
        where: invoiceWhere,
        include: { payments: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dentalInvoice.aggregate({
        where: invoiceWhere,
        _sum: { total: true, paid: true, remaining: true },
        _count: { _all: true },
      }),
      prisma.dentalCreditNote.aggregate({ where: creditWhere, _sum: { amount: true } }),
    ]);

    if (!doctor && invoices && invoices.length) {
      doctor = { id: null, name: invoices[0].doctorName || null };
    }

    const creditTotal = round2((creditAgg && creditAgg._sum && creditAgg._sum.amount) || 0);
    res.json({
      success: true,
      data: {
        doctor,
        cases,
        invoices,
        totals: {
          cases: cases.length,
          invoicesCount: (invoiceAgg && invoiceAgg._count && invoiceAgg._count._all) || 0,
          invoiced: round2((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.total) || 0),
          paid: round2((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.paid) || 0),
          remaining: round2(Math.max(0, ((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.remaining) || 0) - creditTotal)),
          creditTotal,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dental doctor statement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب كشف الحساب' });
  }
};

const getTechnicianProductivity = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { from, to } = req.query;
    const prisma = getSharedPrismaClient();

    const assignmentWhere = { companyId };
    const stageWhere = { companyId, status: 'DONE' };
    const fromDate = parseDate(from);
    let toDate = parseDate(to); if (toDate) toDate = getEndOfDayInTimezone(toDate);
    if (fromDate) {
      assignmentWhere.assignedAt = { ...(assignmentWhere.assignedAt || {}), gte: fromDate };
      stageWhere.completedAt = { ...(stageWhere.completedAt || {}), gte: fromDate };
    }
    if (toDate) {
      assignmentWhere.assignedAt = { ...(assignmentWhere.assignedAt || {}), lte: toDate };
      stageWhere.completedAt = { ...(stageWhere.completedAt || {}), lte: toDate };
    }

    const [technicians, assignmentRows, doneStages] = await Promise.all([
      prisma.dentalTechnician.findMany({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, role: true },
      }),
      prisma.dentalCaseAssignment.groupBy({
        by: ['technicianId'],
        where: assignmentWhere,
        _count: { _all: true },
      }),
      prisma.dentalCaseStage.findMany({
        where: stageWhere,
        select: { id: true, assigneeId: true, startedAt: true, completedAt: true },
      }),
    ]);

    const assignmentCounts = {};
    for (const row of assignmentRows || []) {
      assignmentCounts[row.technicianId] = (row._count && row._count._all) || 0;
    }

    const stageCounts = {};
    const durationSum = {};
    const durationCount = {};
    for (const stage of doneStages || []) {
      const techId = stage.assigneeId;
      if (!techId) continue;
      stageCounts[techId] = (stageCounts[techId] || 0) + 1;
      if (stage.startedAt && stage.completedAt) {
        const days = (new Date(stage.completedAt) - new Date(stage.startedAt)) / 86400000;
        durationSum[techId] = (durationSum[techId] || 0) + days;
        durationCount[techId] = (durationCount[techId] || 0) + 1;
      }
    }

    const data = (technicians || []).map((tech) => ({
      technicianId: tech.id,
      name: tech.name,
      role: tech.role,
      assignedCases: assignmentCounts[tech.id] || 0,
      completedStages: stageCounts[tech.id] || 0,
      avgDaysPerStage: durationCount[tech.id] ? round2(durationSum[tech.id] / durationCount[tech.id]) : 0,
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dental technician productivity:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إنتاجية الفنيين' });
  }
};

const getWorkTypeRevenue = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { from, to } = req.query;
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    const fromDate = parseDate(from);
    let toDate = parseDate(to); if (toDate) toDate = getEndOfDayInTimezone(toDate);
    if (fromDate) where.receivedDate = { ...(where.receivedDate || {}), gte: fromDate };
    if (toDate) where.receivedDate = { ...(where.receivedDate || {}), lte: toDate };

    const rows = await prisma.dentalLabCase.groupBy({
      by: ['workTypeName'],
      where,
      _count: { _all: true },
      _sum: { total: true, paid: true, remaining: true },
    });
    const data = (rows || [])
      .map((row) => ({
        workType: row.workTypeName || 'غير محدد',
        cases: row._count && row._count._all ? row._count._all : 0,
        total: round2((row._sum && row._sum.total) || 0),
        paid: round2((row._sum && row._sum.paid) || 0),
        remaining: round2((row._sum && row._sum.remaining) || 0),
      }))
      .sort((a, b) => b.total - a.total);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dental work type revenue:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إيرادات أنواع الشغل' });
  }
};

const getOverdueReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const cases = await prisma.dentalLabCase.findMany({
      where: {
        companyId,
        dueDate: { lt: now },
        status: { notIn: ['DELIVERED', 'CLOSED'] },
      },
      include: {
        doctor: { select: { id: true, name: true } },
        workType: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
    const data = (cases || []).map((dentalCase) => ({
      id: dentalCase.id,
      caseNumber: dentalCase.caseNumber,
      patientName: dentalCase.patientName,
      doctorId: dentalCase.doctorId,
      doctorName: dentalCase.doctorName || (dentalCase.doctor && dentalCase.doctor.name) || null,
      workTypeId: dentalCase.workTypeId,
      workTypeName: dentalCase.workTypeName || (dentalCase.workType && dentalCase.workType.name) || null,
      dueDate: dentalCase.dueDate,
      status: dentalCase.status,
      daysOverdue: dentalCase.dueDate
        ? Math.max(0, Math.floor((now - new Date(dentalCase.dueDate)) / 86400000))
        : 0,
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dental overdue report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير المتأخرات' });
  }
};

// ==================== TECHNICIAN SELF-SERVICE (my scope) ====================

const getMyInfo = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const [teamRoles, technician] = await Promise.all([
      require('../services/dentalRoles').loadTeamRoles(companyId),
      prisma.dentalTechnician.findFirst({ where: { companyId, userId: req.user?.id, isActive: true } }),
    ]);
    const role = resolveDentalRole(req.user, teamRoles);
    res.json({
      success: true,
      data: {
        dentalRole: role,
        technicianId: technician ? technician.id : null,
        technician: technician
          ? { id: technician.id, name: technician.name, role: technician.role, wagePerStage: technician.wagePerStage }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching dental my-info:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب معلومات المستخدم' });
  }
};

const serializeTechCase = (c) => {
  if (!c) return c;
  const activeStage = (c.stages || []).find((s) => s.status === 'IN_PROGRESS') || (c.stages || []).find((s) => s.status === 'PENDING');
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    patientName: c.patientName,
    patientPhone: c.patientPhone,
    workTypeName: c.workTypeName,
    teeth: c.teeth,
    shade: c.shade,
    material: c.material,
    status: c.status,
    priority: c.priority,
    dueDate: c.dueDate,
    notes: c.notes,
    createdAt: c.createdAt,
    myStage: activeStage
      ? { id: activeStage.id, name: activeStage.name, status: activeStage.status, assigneeName: activeStage.assigneeName, startedAt: activeStage.startedAt }
      : null,
  };
};

const getMyCases = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const technician = await prisma.dentalTechnician.findFirst({ where: { companyId, userId: req.user?.id, isActive: true } });
    if (!technician) return res.json({ success: true, data: { items: [], total: 0, technician: null } });

    const cases = await prisma.dentalLabCase.findMany({
      where: {
        companyId,
        status: { notIn: ['DELIVERED', 'CLOSED'] },
        stages: { some: { assigneeId: technician.id, status: { in: ['IN_PROGRESS', 'PENDING'] } } },
      },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({
      success: true,
      data: { items: cases.map(serializeTechCase), total: cases.length, technician: { id: technician.id, name: technician.name } },
    });
  } catch (error) {
    console.error('Error fetching my dental cases:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب حالاتي' });
  }
};

const getMyWage = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const technician = await prisma.dentalTechnician.findFirst({ where: { companyId, userId: req.user?.id, isActive: true } });
    if (!technician) {
      return res.json({ success: true, data: { technician: null, rate: 0, completedStages: 0, totalWage: 0 } });
    }
    const [all, thisMonth] = await Promise.all([
      computeTechnicianEarnings(prisma, companyId, { technicianId: technician.id }),
      computeTechnicianEarnings(prisma, companyId, {
        technicianId: technician.id,
        from: getStartOfDayInTimezone(new Date()).toISOString().split('T')[0],
      }),
    ]);
    const rate = technician.wagePerStage != null ? Number(technician.wagePerStage) : (await getTechnicianWageDefaults(prisma, companyId)).defaultPerStage;
    const total = all.find((e) => e.technicianId === technician.id) || { completedStages: 0, wage: 0 };
    const month = thisMonth.find((e) => e.technicianId === technician.id) || { completedStages: 0, wage: 0 };
    res.json({
      success: true,
      data: {
        technician: { id: technician.id, name: technician.name, role: technician.role },
        rate,
        completedStages: total.completedStages || 0,
        totalWage: total.wage || 0,
        thisMonthStages: month.completedStages || 0,
        thisMonthWage: month.wage || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching my dental wage:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أجري' });
  }
};

// ==================== AGING + CREDIT NOTES + INVOICE PDF ====================

const getAgingReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const now = new Date();
    const [invoices, creditAgg] = await Promise.all([
      prisma.dentalInvoice.findMany({
        where: { companyId, status: { not: 'VOID' } },
        select: { id: true, invoiceNumber: true, doctorName: true, total: true, paid: true, remaining: true, dueDate: true, status: true },
      }),
      prisma.dentalCreditNote.aggregate({ where: { companyId }, _sum: { amount: true } }),
    ]);
    const creditTotal = round2((creditAgg && creditAgg._sum && creditAgg._sum.amount) || 0);
    const buckets = [
      { label: 'current', min: -Infinity, max: 0, total: 0, invoices: 0 },
      { label: '0_30', min: 0, max: 30, total: 0, invoices: 0 },
      { label: '31_60', min: 30, max: 60, total: 0, invoices: 0 },
      { label: '61_90', min: 60, max: 90, total: 0, invoices: 0 },
      { label: '90_plus', min: 90, max: Infinity, total: 0, invoices: 0 },
    ];
    const isInBucket = (b, days) => {
      if (b.label === 'current') return days <= 0;
      return days > b.min && days <= b.max;
    };
    for (const inv of invoices) {
      if ((Number(inv.remaining) || 0) <= 0) continue;
      let days = 0;
      if (inv.dueDate) {
        days = Math.floor((now - new Date(inv.dueDate)) / 86400000);
      }
      const bucket = buckets.find((b) => isInBucket(b, days));
      if (bucket) {
        bucket.total += Number(inv.remaining) || 0;
        bucket.invoices += 1;
      }
    }
    for (const b of buckets) b.total = round2(b.total);
    const grossOutstanding = round2(buckets.reduce((s, b) => s + b.total, 0));
    res.json({ success: true, data: { buckets, totalOutstanding: round2(Math.max(0, grossOutstanding - creditTotal)), creditTotal, grossOutstanding } });
  } catch (error) {
    console.error('Error fetching dental aging report:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الأعمار' });
  }
};

const getCreditNotes = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const items = await prisma.dentalCreditNote.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing dental credit notes:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الائتمانات' });
  }
};

const getInvoicePdf = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const invoice = await prisma.dentalInvoice.findFirst({
      where: { id, companyId },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    const dentalCase = invoice.caseId
      ? await prisma.dentalLabCase.findFirst({
          where: { id: invoice.caseId, companyId },
          select: { id: true, caseNumber: true, patientName: true, workTypeName: true },
        })
      : null;
    const [settingsRows, company] = await Promise.all([
      prisma.dentalSetting.findMany({ where: { companyId } }),
      prisma.company.findFirst({ where: { id: companyId } }),
    ]);
    const settings = mergeSettings(settingsRows);
    const { generateInvoicePdf } = require('../services/dentalWorkOrderService');
    const { buffer, invoiceNumber } = await generateInvoicePdf({
      company,
      invoice,
      dentalCase,
      workOrderHeader: settings.workOrderHeader || {},
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoiceNumber}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating dental invoice PDF:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء فاتورة PDF' });
  }
};

// ==================== DOCTOR-SPECIFIC PRICING (rate sheet) ====================

const getDoctorPricing = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { doctorId } = req.params;
    const prisma = getSharedPrismaClient();
    const rows = await prisma.dentalSetting.findMany({ where: { companyId } });
    const merged = mergeSettings(rows);
    const map = (merged.doctorPricing || {})[doctorId] || {};
    res.json({ success: true, data: map });
  } catch (error) {
    console.error('Error fetching doctor pricing:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تسعير الطبيب' });
  }
};

const setDoctorPricing = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { doctorId } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const doctor = await prisma.dentalLabDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });
    const map = body.prices && typeof body.prices === 'object' ? body.prices : {};
    const clean = {};
    for (const [workTypeId, price] of Object.entries(map)) {
      const p = Number(price);
      if (Number.isFinite(p) && p >= 0) clean[workTypeId] = round2(p);
    }
    const workTypeIds = Object.keys(clean);
    if (workTypeIds.length) {
      const existingTypes = await prisma.dentalWorkType.findMany({ where: { companyId, id: { in: workTypeIds } }, select: { id: true } });
      const existingIds = new Set(existingTypes.map((e) => e.id));
      for (const wid of workTypeIds) {
        if (!existingIds.has(wid)) return res.status(400).json({ success: false, error: `نوع الشغل غير موجود: ${wid}` });
      }
    }
    await prisma.dentalSetting.upsert({
      where: { companyId_key: { companyId, key: 'doctorPricing' } },
      update: { value: { ...((mergeSettings(await prisma.dentalSetting.findMany({ where: { companyId } })).doctorPricing) || {}), [doctorId]: clean } },
      create: { companyId, key: 'doctorPricing', value: { [doctorId]: clean } },
    });
    res.json({ success: true, data: clean });
  } catch (error) {
    console.error('Error setting doctor pricing:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث تسعير الطبيب' });
  }
};

// ==================== ONLINE PAYMENT LINK (scaffold) ====================

const getInvoicePaymentLink = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const invoice = await prisma.dentalInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    const rows = await prisma.dentalSetting.findMany({ where: { companyId } });
    const merged = mergeSettings(rows);
    const gateway = (merged.paymentGateway || {}).provider || null;
    if (!gateway || gateway === 'NONE') {
      return res.json({ success: true, data: { configured: false, message: 'بوابة الدفع غير مضبوطة في إعدادات المعمل' } });
    }
    return res.json({
      success: true,
      data: {
        configured: true,
        provider: gateway,
        amount: invoice.remaining,
        invoiceNumber: invoice.invoiceNumber,
        // في الإنتاج: يولّد هنا رابط Checkout من مزود البوابة (Paymob/Stripe) بمفاتيح المعمل
        checkoutUrl: null,
      },
    });
  } catch (error) {
    console.error('Error fetching invoice payment link:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب رابط الدفع' });
  }
};

module.exports = {
  CASE_STATUS_CHAIN,
  listDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  listWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
  listTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  listCases,
  createCase,
  getCaseDetail,
  updateCase,
  advanceCaseStatus,
  assignTechnician,
  uploadCaseAttachment,
  deleteCaseAttachment,
  listInvoices,
  createInvoice,
  recordInvoicePayment,
  getDashboard,
  getSettings,
  updateSettings,
  listCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getNotificationSchedule,
  updateNotificationSchedule,
  scanOverdueNotifications,
  getWorkOrderPdf,
  parseScan,
  recordQualityCheck,
  listQualityChecks,
  flagRefabrication,
  resolveRefabrication,
  listTeam,
  setTeamRole,
  getDoctorStatement,
  getTechnicianProductivity,
  getWorkTypeRevenue,
getOverdueReport,
  getDeliveryEstimate,
  resolveDentalRole,
  getMyInfo,
  getMyCases,
  getMyWage,
  getAgingReport,
  getCreditNotes,
  getInvoicePdf,
  getDoctorPricing,
  setDoctorPricing,
  getInvoicePaymentLink,
};

