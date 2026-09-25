const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
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
  parseSettingValue,
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
    const { search, page, limit, isActive, archived, all } = req.query;
    const where = { companyId };

    if (all === 'true') {
      // return both active and inactive
    } else if (archived === 'true' || isActive === 'false' || isActive === false) {
      where.isActive = false;
    } else if (isActive === 'true' || isActive === true) {
      where.isActive = true;
    } else if (isActive !== undefined && isActive !== '') {
      where.isActive = normalizeBool(isActive);
    } else {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total, activeCount, archivedCount] = await Promise.all([
      prisma.dentalLabDoctor.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.dentalLabDoctor.count({ where }),
      prisma.dentalLabDoctor.count({ where: { companyId, isActive: true } }),
      prisma.dentalLabDoctor.count({ where: { companyId, isActive: false } }),
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
        where: { companyId, doctorId: { in: ids }, isDeleted: false, status: { notIn: ['DELIVERED', 'CLOSED'] } },
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
      where: { companyId, doctorId: { in: ids }, isDeleted: false, dueDate: { lt: new Date() }, status: { notIn: ['DELIVERED', 'CLOSED'] } },
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

    // Company-wide summary across all doctors (eliminates page 1 vs dashboard discrepancy)
    const [allInvAgg, allCreditAgg] = await Promise.all([
      prisma.dentalInvoice.aggregate({
        where: { companyId, status: { not: 'VOID' } },
        _sum: { total: true, paid: true, remaining: true },
      }),
      prisma.dentalCreditNote.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
    ]);
    const totalBilled = round2(allInvAgg._sum.total || 0);
    const totalPaid = round2(allInvAgg._sum.paid || 0);
    const totalOutstanding = round2(Math.max(0, (allInvAgg._sum.remaining || 0) - (allCreditAgg._sum.amount || 0)));

    res.json({
      success: true,
      data: {
        items: enriched,
        total,
        activeCount,
        archivedCount,
        page: pageNum,
        limit: limitNum,
        summary: {
          totalBilled,
          totalPaid,
          totalOutstanding,
        },
      },
    });
  } catch (error) {
    console.error('Error listing dental doctors:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأطباء' });
  }
};

const getDoctorDetail = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const doctor = await prisma.dentalLabDoctor.findFirst({
      where: { id, companyId },
    });
    if (!doctor) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const [invAgg, creditAgg, casesCount, activeCasesCount, completedCasesCount, overdueCasesCount] = await Promise.all([
      prisma.dentalInvoice.aggregate({
        where: { companyId, doctorId: id, status: { not: 'VOID' } },
        _sum: { total: true, paid: true, remaining: true },
        _count: { _all: true },
      }),
      prisma.dentalCreditNote.aggregate({
        where: { companyId, doctorId: id },
        _sum: { amount: true },
      }),
      prisma.dentalLabCase.count({
        where: { companyId, doctorId: id, isDeleted: false },
      }),
      prisma.dentalLabCase.count({
        where: { companyId, doctorId: id, isDeleted: false, status: { notIn: ['DELIVERED', 'CLOSED'] } },
      }),
      prisma.dentalLabCase.count({
        where: { companyId, doctorId: id, isDeleted: false, status: { in: ['DELIVERED', 'CLOSED'] } },
      }),
      prisma.dentalLabCase.count({
        where: {
          companyId,
          doctorId: id,
          isDeleted: false,
          dueDate: { lt: new Date() },
          status: { notIn: ['DELIVERED', 'CLOSED'] },
        },
      }),
    ]);

    const totalBilled = round2(Number(invAgg._sum.total) || 0);
    const totalPaid = round2(Number(invAgg._sum.paid) || 0);
    const creditTotal = round2(Number(creditAgg._sum.amount) || 0);
    const outstanding = round2(Math.max(0, (Number(invAgg._sum.remaining) || 0) - creditTotal));
    const creditLimit = Number(doctor.creditLimit) || 0;
    const creditExceeded = creditLimit > 0 && outstanding > creditLimit;

    const rows = await prisma.dentalSetting.findMany({ where: { companyId } });
    const merged = mergeSettings(rows);
    const customPricing = (merged.doctorPricing || {})[id] || {};

    const { portalPin, ...safeDoctor } = doctor;

    res.json({
      success: true,
      data: {
        ...safeDoctor,
        hasPortalPin: Boolean(portalPin),
        totalBilled,
        totalPaid,
        outstanding,
        creditTotal,
        creditLimit,
        creditExceeded,
        invoicesCount: invAgg._count._all || 0,
        casesCount,
        activeCases: activeCasesCount,
        completedCases: completedCasesCount,
        overdueCases: overdueCasesCount,
        customPricing,
      },
    });
  } catch (error) {
    console.error('Error fetching dental doctor detail:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تفاصيل الطبيب' });
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

    const bcrypt = require('bcryptjs');
    let hashedPin = null;
    if (body.portalPin) {
      const pinStr = String(body.portalPin);
      hashedPin = bcrypt.hashSync(pinStr, 10);
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.dentalLabDoctor.create({
      data: {
        companyId,
        name,
        phone: body.phone ? String(body.phone) : null,
        clinicName: body.clinicName ? String(body.clinicName) : null,
        governorate: body.governorate ? String(body.governorate) : null,
        portalPin: hashedPin,
        creditLimit: creditResult.value,
        notes: body.notes ? String(body.notes) : null,
        doctors: Array.isArray(body.doctors) ? body.doctors : undefined,
        isActive: normalizeBool(body.isActive, true),
      },
    });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('Error creating dental doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطبيب' });
  }
};


const DOCTOR_UPDATE_FIELDS = ['name', 'phone', 'clinicName', 'governorate', 'portalPin', 'creditLimit', 'notes', 'isActive', 'doctors'];

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
    if ('portalPin' in data) {
      if (data.portalPin) {
        const bcrypt = require('bcryptjs');
        data.portalPin = bcrypt.hashSync(String(data.portalPin), 10);
      } else {
        data.portalPin = null;
      }
    }
    if ('creditLimit' in data) {
      const creditResult = toNonNegativeNumber(data.creditLimit, 0);
      if (!creditResult.valid) return res.status(400).json({ success: false, error: 'حد الائتمان غير صحيح' });
      data.creditLimit = creditResult.value;
    }
    if ('doctors' in data) {
      data.doctors = Array.isArray(data.doctors) ? data.doctors : null;
    }
    if ('isActive' in data) data.isActive = normalizeBool(data.isActive, true);

    const doctor = await prisma.dentalLabDoctor.update({ where: { id }, data });

    // P2 Backfill: تحديث النسخ غير المقفولة في نفس العملية
    if (data.name && data.name !== existing.name) {
      try {
        await prisma.$transaction([
          prisma.dentalLabCase.updateMany({
            where: { companyId, doctorId: id, status: { notIn: ['CLOSED'] } },
            data: { doctorName: data.name },
          }),
          prisma.dentalInvoice.updateMany({
            where: { companyId, doctorId: id, status: { notIn: ['PAID', 'VOID'] } },
            data: { doctorName: data.name },
          }),
        ]);
      } catch (backfillErr) {
        console.warn('Warning: Doctor name backfill failed:', backfillErr.message);
      }
    }

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

    // Check associated cases and invoices
    const [casesCount, invoicesCount] = await Promise.all([
      prisma.dentalLabCase.count({ where: { doctorId: id, companyId } }),
      prisma.dentalInvoice.count({ where: { doctorId: id, companyId } }),
    ]);

    if (casesCount === 0 && invoicesCount === 0) {
      // Safe hard delete: no history
      await prisma.dentalLabDoctor.delete({ where: { id } });
      dentalNotificationService.cancelPendingNotificationsForDoctor(companyId, existing.phone).catch(() => {});
      return res.json({ success: true, mode: 'DELETED', message: 'تم حذف الطبيب نهائياً من النظام' });
    }

    // Doctor has history -> Soft Archive to protect financial ledger
    const doctor = await prisma.dentalLabDoctor.update({ where: { id }, data: { isActive: false } });
    dentalNotificationService.cancelPendingNotificationsForDoctor(companyId, existing.phone).catch(() => {});
    res.json({
      success: true,
      mode: 'ARCHIVED',
      data: doctor,
      message: `تم نقل الطبيب إلى الأرشيف لحماية سجلاته المالية (${casesCount} حالة و ${invoicesCount} فاتورة)`,
    });
  } catch (error) {
    console.error('Error deleting dental doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الطبيب' });
  }
};

const restoreDoctor = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const doctor = await prisma.dentalLabDoctor.update({ where: { id }, data: { isActive: true } });
    res.json({ success: true, data: doctor, message: 'تمت استعادة الطبيب إلى القائمة النشطة بنجاح' });
  } catch (error) {
    console.error('Error restoring dental doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في استعادة الطبيب' });
  }
};

const permanentDeleteDoctor = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const [casesCount, invoicesCount] = await Promise.all([
      prisma.dentalLabCase.count({ where: { doctorId: id, companyId } }),
      prisma.dentalInvoice.count({ where: { doctorId: id, companyId } }),
    ]);

    if (casesCount > 0 || invoicesCount > 0) {
      return res.status(400).json({
        success: false,
        error: `لا يمكن الحذف النهائي للطبيب لوجود ${casesCount} حالة و ${invoicesCount} فاتورة مسجلة باسمه لحماية القيود المالية. يمكنك إبقاؤه في الأرشيف فقط.`,
      });
    }

    await prisma.dentalLabDoctor.delete({ where: { id } });
    dentalNotificationService.cancelPendingNotificationsForDoctor(companyId, existing.phone).catch(() => {});
    res.json({ success: true, message: 'تم حذف الطبيب نهائياً من قاعدة البيانات' });
  } catch (error) {
    console.error('Error permanently deleting dental doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الحذف النهائي للطبيب' });
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
    if (req.query.all === 'true') {
      // return all
    } else if (isActive !== undefined && isActive !== '') {
      where.isActive = normalizeBool(isActive);
    } else {
      where.isActive = true;
    }

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

    const pricingMode = body.pricingMode === 'FLAT' ? 'FLAT' : 'PER_UNIT';
    const costPriceResult = toNonNegativeNumber(body.costPrice, 0);
    const defaultMaterial = body.defaultMaterial ? String(body.defaultMaterial).trim() : null;
    const materialBrand = body.materialBrand ? String(body.materialBrand).trim() : null;
    const instructions = body.instructions ? String(body.instructions).trim() : null;
    const defaultWarrantyYears = Number.isFinite(parseInt(body.defaultWarrantyYears, 10)) ? Math.max(0, parseInt(body.defaultWarrantyYears, 10)) : 0;
    const defaultCrownCount = Number.isFinite(parseInt(body.defaultCrownCount, 10)) ? Math.max(1, parseInt(body.defaultCrownCount, 10)) : 1;

    const prisma = getSharedPrismaClient();
    const workType = await prisma.dentalWorkType.create({
      data: {
        companyId,
        name,
        category: body.category ? String(body.category) : null,
        pricingMode,
        price: priceResult.value,
        costPrice: costPriceResult.value,
        leadTimeDays: Number.isFinite(parseInt(body.leadTimeDays, 10)) ? parseInt(body.leadTimeDays, 10) : 5,
        defaultMaterial,
        materialBrand,
        instructions,
        defaultWarrantyYears,
        defaultCrownCount,
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

const WORK_TYPE_UPDATE_FIELDS = ['name', 'category', 'pricingMode', 'price', 'costPrice', 'leadTimeDays', 'defaultMaterial', 'materialBrand', 'instructions', 'defaultWarrantyYears', 'defaultCrownCount', 'isActive', 'sortOrder'];

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
    if ('pricingMode' in data) {
      data.pricingMode = data.pricingMode === 'FLAT' ? 'FLAT' : 'PER_UNIT';
    }
    if ('price' in data) {
      const priceResult = toNonNegativeNumber(data.price, 0);
      if (!priceResult.valid) return res.status(400).json({ success: false, error: 'سعر نوع الشغل غير صحيح' });
      data.price = priceResult.value;
    }
    if ('costPrice' in data) {
      const costResult = toNonNegativeNumber(data.costPrice, 0);
      data.costPrice = costResult.value;
    }
    if ('materialBrand' in data) {
      data.materialBrand = data.materialBrand ? String(data.materialBrand).trim() : null;
    }
    if ('instructions' in data) {
      data.instructions = data.instructions ? String(data.instructions).trim() : null;
    }
    if ('leadTimeDays' in data) data.leadTimeDays = parseInt(data.leadTimeDays, 10) || 5;
    if ('defaultWarrantyYears' in data) data.defaultWarrantyYears = Math.max(0, parseInt(data.defaultWarrantyYears, 10) || 0);
    if ('defaultCrownCount' in data) data.defaultCrownCount = Math.max(1, parseInt(data.defaultCrownCount, 10) || 1);
    if ('urgentLeadTimeDays' in body) {
      data.urgentLeadTimeDays = body.urgentLeadTimeDays ? Math.max(1, parseInt(body.urgentLeadTimeDays, 10)) : null;
    }
    if ('sortOrder' in data) data.sortOrder = parseInt(data.sortOrder, 10) || 0;
    if ('isActive' in data) data.isActive = normalizeBool(data.isActive, true);

    const workType = await prisma.dentalWorkType.update({ where: { id }, data });

    // P2 Backfill: تحديث النسخ غير المقفولة في نفس العملية
    if (data.name && data.name !== existing.name) {
      try {
        await prisma.dentalLabCase.updateMany({
          where: { companyId, workTypeId: id, status: { notIn: ['CLOSED'] } },
          data: { workTypeName: data.name },
        });
      } catch (backfillErr) {
        console.warn('Warning: WorkType name backfill failed:', backfillErr.message);
      }
    }

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
    if (req.query.all === 'true') {
      // return all
    } else if (isActive !== undefined && isActive !== '') {
      where.isActive = normalizeBool(isActive);
    } else {
      where.isActive = true;
    }

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalTechnician.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.dentalTechnician.count({ where }),
    ]);
    const earnings = await computeTechnicianEarnings(prisma, companyId, { from, to });
    const earningById = new Map(earnings.map((e) => [e.technicianId, e]));

    // Fetch linked user accounts for portal login details
    const userIds = items.map((t) => t.userId).filter(Boolean);
    let userMap = new Map();
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        });
        userMap = new Map(users.map((u) => [u.id, u]));
      } catch (userErr) {
        console.warn('Could not fetch user details for technicians:', userErr.message);
      }
    }

    let payoutAggByTech = new Map();
    if (prisma.dentalTechnicianPayout && typeof prisma.dentalTechnicianPayout.findMany === 'function') {
      try {
        const techIds = items.map((t) => t.id);
        const allPayouts = techIds.length ? ((await prisma.dentalTechnicianPayout.findMany({
          where: { companyId, technicianId: { in: techIds } },
          select: { technicianId: true, type: true, amount: true },
        })) || []) : [];
        for (const p of allPayouts) {
          if (!payoutAggByTech.has(p.technicianId)) {
            payoutAggByTech.set(p.technicianId, { paid: 0, bonuses: 0, deductions: 0 });
          }
          const curr = payoutAggByTech.get(p.technicianId);
          const amt = Number(p.amount) || 0;
          if (p.type === 'PAYOUT' || p.type === 'ADVANCE') curr.paid += amt;
          else if (p.type === 'BONUS') curr.bonuses += amt;
          else if (p.type === 'DEDUCTION') curr.deductions += amt;
        }
      } catch (err) {
        console.warn('Could not aggregate technician payouts:', err.message);
      }
    }

    const enriched = items.map((t) => {
      const e = earningById.get(t.id) || { completedStages: 0, wage: 0 };
      const pAgg = payoutAggByTech.get(t.id) || { paid: 0, bonuses: 0, deductions: 0 };
      const wage = round2(e.wage || 0);
      const totalPaid = round2(pAgg.paid);
      const balanceDue = round2((wage + pAgg.bonuses) - (totalPaid + pAgg.deductions));
      const linkedUser = t.userId ? userMap.get(t.userId) : null;
      return {
        ...t,
        user: linkedUser || null,
        userEmail: linkedUser?.email || null,
        completedStages: e.completedStages || 0,
        totalEarnings: wage,
        totalPaid,
        totalBonuses: round2(pAgg.bonuses),
        totalDeductions: round2(pAgg.deductions),
        balanceDue,
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
    const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : 'GENERAL_TECHNICIAN';
    let wagePerStage = null;
    if (body.wagePerStage !== undefined && body.wagePerStage !== null && body.wagePerStage !== '') {
      const wr = toNonNegativeNumber(body.wagePerStage, 0);
      if (!wr.valid) return res.status(400).json({ success: false, error: 'أجر الفني غير صحيح' });
      wagePerStage = wr.value;
    }

    const prisma = getSharedPrismaClient();

    // Direct User Account creation for Technician
    let userId = body.userId ? String(body.userId).trim() : null;
    if (userId) {
      const uc = await prisma.userCompany.findFirst({ where: { userId, companyId } });
      if (!uc) {
        return res.status(400).json({ success: false, error: 'المستخدم المحدد غير مسجل في هذه الشركة' });
      }
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!userId && (email || password)) {
      if (!email) {
        return res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب لإنشاء حساب الفني' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف' });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({ where: { email } });
      if (existingUser) {
        // Security guard S1: verify if user already belongs to this company
        const uc = await prisma.userCompany.findFirst({ where: { userId: existingUser.id, companyId } });
        if (!uc) {
          return res.status(400).json({
            success: false,
            error: 'هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر على المنصة، ولا يمكن الاستيلاء عليه أو تغيير كلمة مروره',
          });
        }
        // Verify if user is already tied to another active technician in this company
        const existingTech = await prisma.dentalTechnician.findFirst({
          where: { companyId, userId: existingUser.id, isActive: true },
        });
        if (existingTech) {
          return res.status(400).json({ success: false, error: 'هذا البريد الإلكتروني مرتبط بالفعل بعضو آخر في فريق العمل' });
        }
        // Link existing employee to technician profile WITHOUT overwriting their password!
        userId = existingUser.id;
      } else {
        // Create new User record
        const hashedPassword = await bcrypt.hash(password, 10);
        const nameParts = name.split(/\s+/);
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(' ') || '';

        const newUser = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone: body.phone ? String(body.phone).trim() : null,
            role: 'AGENT',
            isActive: true,
            companyId,
          },
        });

        await prisma.userCompany.create({
          data: {
            userId: newUser.id,
            companyId,
            role: 'AGENT',
            isActive: true,
            isDefault: true,
          },
        });

        userId = newUser.id;
      }

      // Assign dental role 'TECHNICIAN' in dental settings
      if (userId) {
        try {
          const dentalRoles = require('../services/dentalRoles');
          const teamRoles = { ...(await dentalRoles.loadTeamRoles(companyId)) };
          teamRoles[userId] = 'TECHNICIAN';
          await prisma.dentalSetting.upsert({
            where: { companyId_key: { companyId, key: 'teamRoles' } },
            update: { value: teamRoles },
            create: { companyId, key: 'teamRoles', value: teamRoles },
          });
        } catch (roleErr) {
          console.warn('Could not set dental role for technician user:', roleErr.message);
        }
      }
    }

    const workingDays = Array.isArray(body.workingDays) ? body.workingDays : undefined;
    const vacations = Array.isArray(body.vacations) ? body.vacations : undefined;
    const dailyCap = Number.isInteger(parseInt(body.dailyCap, 10)) ? Math.max(0, parseInt(body.dailyCap, 10)) : 0;
    const backupTechnicianId = body.backupTechnicianId ? String(body.backupTechnicianId) : null;

    const technician = await prisma.dentalTechnician.create({
      data: {
        companyId,
        userId,
        name,
        phone: body.phone ? String(body.phone).trim() : null,
        role,
        wagePerStage,
        workingDays,
        vacations,
        dailyCap,
        backupTechnicianId,
        isActive: normalizeBool(body.isActive, true),
      },
    });

    res.json({
      success: true,
      data: {
        ...technician,
        userEmail: email || null,
      },
    });
  } catch (error) {
    console.error('Error creating dental technician:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ في إنشاء الفني' });
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
    if ('phone' in data) data.phone = data.phone ? String(data.phone).trim() : null;
    if ('role' in data) data.role = data.role ? String(data.role).trim() : 'GENERAL_TECHNICIAN';
    if ('userId' in data) {
      data.userId = data.userId ? String(data.userId).trim() : null;
      if (data.userId) {
        const uc = await prisma.userCompany.findFirst({ where: { userId: data.userId, companyId } });
        if (!uc) {
          return res.status(400).json({ success: false, error: 'المستخدم المحدد غير مسجل في هذه الشركة' });
        }
      }
    }
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

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (password && password.length < 6) {
      return res.status(400).json({ success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف' });
    }

    // Security S1: strictly ban changing the password of ANY existing user from technician updates
    const targetUserId = data.userId !== undefined ? data.userId : existing.userId;
    if (password && targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن تعديل كلمة مرور مستخدم قائم من خلال إدارة الفنيين، يجب تعديلها من إعدادات المستخدمين أو ملف المستخدم الشخصي',
      });
    }

    // If technician had no linked user, and email (+ optional password) provided:
    if (!targetUserId && email) {
      const existingUser = await prisma.user.findFirst({ where: { email } });
      if (existingUser) {
        const uc = await prisma.userCompany.findFirst({ where: { userId: existingUser.id, companyId } });
        if (!uc) {
          return res.status(400).json({
            success: false,
            error: 'هذا البريد الإلكتروني مسجل بالفعل لمستخدم في شركة أخرى ولا يمكن ربطه',
          });
        }
        // Link existing employee to technician WITHOUT overwriting their password!
        data.userId = existingUser.id;
      } else if (password && password.length >= 6) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const nameParts = (data.name || existing.name).split(/\s+/);
        const firstName = nameParts[0] || existing.name;
        const lastName = nameParts.slice(1).join(' ') || '';

        const newUser = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone: data.phone || existing.phone,
            role: 'AGENT',
            isActive: true,
            companyId,
          },
        });
        await prisma.userCompany.create({
          data: {
            userId: newUser.id,
            companyId,
            role: 'AGENT',
            isActive: true,
            isDefault: true,
          },
        });
        data.userId = newUser.id;
      }

      if (data.userId) {
        try {
          const dentalRoles = require('../services/dentalRoles');
          const teamRoles = { ...(await dentalRoles.loadTeamRoles(companyId)) };
          teamRoles[data.userId] = 'TECHNICIAN';
          await prisma.dentalSetting.upsert({
            where: { companyId_key: { companyId, key: 'teamRoles' } },
            update: { value: teamRoles },
            create: { companyId, key: 'teamRoles', value: teamRoles },
          });
        } catch (roleErr) {
          console.warn('Could not set dental role for technician user:', roleErr.message);
        }
      }
    }

    if ('workingDays' in body) data.workingDays = Array.isArray(body.workingDays) ? body.workingDays : null;
    if ('vacations' in body) data.vacations = Array.isArray(body.vacations) ? body.vacations : null;
    if ('dailyCap' in body) data.dailyCap = Math.max(0, parseInt(body.dailyCap, 10) || 0);
    if ('backupTechnicianId' in body) data.backupTechnicianId = body.backupTechnicianId ? String(body.backupTechnicianId) : null;

    const technician = await prisma.dentalTechnician.update({ where: { id }, data });

    // P2 Backfill: تحديث النسخ غير المقفولة للمراحل غير المكتملة
    if (data.name && data.name !== existing.name) {
      try {
        await prisma.$transaction([
          prisma.dentalCaseStage.updateMany({
            where: { companyId, assigneeId: id, status: { not: 'DONE' } },
            data: { assigneeName: data.name },
          }),
          prisma.dentalStageAssignee.updateMany({
            where: { companyId, technicianId: id },
            data: { technicianName: data.name },
          }),
        ]);
      } catch (backfillErr) {
        console.warn('Warning: Technician name backfill failed:', backfillErr.message);
      }
    }

    res.json({ success: true, data: technician });
  } catch (error) {
    console.error('Error updating dental technician:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ في تحديث الفني' });
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

// ==================== TECHNICIAN PAYOUTS & ADVANCES ====================

const listTechnicianPayouts = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const technician = await prisma.dentalTechnician.findFirst({
      where: { id, companyId },
      select: { id: true, name: true, role: true, phone: true, wagePerStage: true },
    });
    if (!technician) {
      return res.status(404).json({ success: false, error: 'الفني غير موجود' });
    }

    const { type, from, to } = req.query || {};
    const where = { companyId, technicianId: id };
    if (type) where.type = String(type).toUpperCase();
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (fromDate || toDate) {
      where.paidAt = {};
      if (fromDate) where.paidAt.gte = fromDate;
      if (toDate) where.paidAt.lte = getEndOfDayInTimezone(toDate);
    }

    let payouts = [];
    if (prisma.dentalTechnicianPayout && typeof prisma.dentalTechnicianPayout.findMany === 'function') {
      payouts = await prisma.dentalTechnicianPayout.findMany({
        where,
        orderBy: { paidAt: 'desc' },
      });
    }

    const { computeTechnicianEarnings } = require('../services/dentalPricing');
    const earnings = await computeTechnicianEarnings(prisma, companyId, { technicianId: id, from, to });
    const totalEarned = earnings.length ? round2(earnings[0].wage || 0) : 0;
    const completedStages = earnings.length ? (earnings[0].completedStages || 0) : 0;
    const completedUnits = earnings.length ? (earnings[0].completedUnits || 0) : 0;

    let totalPayouts = 0;
    let totalAdvances = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;

    for (const p of payouts) {
      const amt = Number(p.amount) || 0;
      if (p.type === 'PAYOUT') totalPayouts += amt;
      else if (p.type === 'ADVANCE') totalAdvances += amt;
      else if (p.type === 'BONUS') totalBonuses += amt;
      else if (p.type === 'DEDUCTION') totalDeductions += amt;
    }

    totalPayouts = round2(totalPayouts);
    totalAdvances = round2(totalAdvances);
    totalBonuses = round2(totalBonuses);
    totalDeductions = round2(totalDeductions);

    const totalPaid = round2(totalPayouts + totalAdvances);
    const netDue = round2((totalEarned + totalBonuses) - (totalPaid + totalDeductions));

    res.json({
      success: true,
      data: {
        technician,
        payouts,
        summary: {
          totalEarned,
          completedStages,
          completedUnits,
          totalPayouts,
          totalAdvances,
          totalPaid,
          totalBonuses,
          totalDeductions,
          netDue,
        },
      },
    });
  } catch (error) {
    console.error('Error listing dental technician payouts:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب مدفوعات الفني' });
  }
};

const recordTechnicianPayout = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const { amount, type = 'PAYOUT', paymentMethod = 'CASH', reference, notes, paidAt } = req.body || {};

    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'المبلغ يجب أن يكون رقماً موجباً أكبر من الصفر' });
    }

    const validTypes = ['PAYOUT', 'ADVANCE', 'BONUS', 'DEDUCTION'];
    const normType = String(type).toUpperCase();
    if (!validTypes.includes(normType)) {
      return res.status(400).json({ success: false, error: 'نوع الحركة غير صالح' });
    }

    const prisma = getSharedPrismaClient();
    const technician = await prisma.dentalTechnician.findFirst({
      where: { id, companyId },
    });
    if (!technician) {
      return res.status(404).json({ success: false, error: 'الفني غير موجود' });
    }

    const createdBy = req.user?.id || null;
    const createdByName = req.user?.name || req.user?.email || null;

    const payout = await prisma.dentalTechnicianPayout.create({
      data: {
        companyId,
        technicianId: id,
        type: normType,
        amount: round2(amt),
        paymentMethod: String(paymentMethod || 'CASH').toUpperCase(),
        reference: reference ? String(reference).trim() : null,
        notes: notes ? String(notes).trim() : null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        createdBy,
        createdByName,
      },
    });

    // P1: ترحيل صرف أجر أو سلفة الفني للخزينة (Idempotent)
    let financialPosting = null;
    if (normType === 'PAYOUT' || normType === 'ADVANCE') {
      try {
        const { createOrGetFinancialPosting, SOURCE_TYPES } = require('../services/financialPostingService');
        const finResult = await createOrGetFinancialPosting({
          companyId,
          sourceType: SOURCE_TYPES.TECHNICIAN_PAYOUT,
          sourceId: payout.id,
          treasuryAccountId: req.body.treasuryAccountId || null,
          direction: 'OUT',
          amount: round2(amt),
          reference: reference || `صرف مستحقات فني: ${technician.name}`,
          notes: notes || `صرف ${normType === 'ADVANCE' ? 'سلفة' : 'أجر'} للفني ${technician.name}`,
          metadata: { technicianId: id, technicianName: technician.name, payoutType: normType },
          userId: req.user?.id || req.user?.email,
        });
        financialPosting = finResult?.posting || null;
      } catch (finErr) {
        console.warn('Warning: Failed to create financial posting for technician payout:', finErr.message);
      }
    }

    res.status(201).json({ success: true, data: payout, financialPosting, message: 'تم تسجيل الحركة المالية بنجاح' });
  } catch (error) {
    console.error('Error recording technician payout:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفعة' });
  }
};

const requestTechnicianAdvance = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const technician = await prisma.dentalTechnician.findFirst({
      where: { companyId, userId: req.user?.id, isActive: true },
    });
    if (!technician) {
      return res.status(403).json({ success: false, error: 'أنت غير مسجل كفني في هذا المعمل' });
    }
    const { amount, notes } = req.body || {};
    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ السلفة يجب أن يكون أكبر من الصفر' });
    }

    const createdBy = req.user?.id || null;
    const createdByName = req.user?.name || req.user?.email || technician.name;

    const payout = await prisma.dentalTechnicianPayout.create({
      data: {
        companyId,
        technicianId: technician.id,
        type: 'ADVANCE',
        amount: round2(amt),
        paymentMethod: 'CASH',
        reference: 'طلب سلفة',
        notes: notes ? `طلب سلفة من الفني: ${String(notes).trim()}` : 'طلب سلفة من بوابة الفني',
        paidAt: new Date(),
        createdBy,
        createdByName,
      },
    });

    res.status(201).json({ success: true, data: payout, message: 'تم تسجيل وإرسال طلب السلفة بنجاح' });
  } catch (error) {
    console.error('Error requesting technician advance:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء تسجيل طلب السلفة' });
  }
};

const deleteTechnicianPayout = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { payoutId } = req.params;

    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalTechnicianPayout.findFirst({
      where: { id: payoutId, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'السند غير موجود' });
    }

    await prisma.dentalTechnicianPayout.delete({
      where: { id: payoutId },
    });

    res.json({ success: true, message: 'تم حذف السند بنجاح' });
  } catch (error) {
    console.error('Error deleting technician payout:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف السند' });
  }
};

// ==================== CASES ====================

const CASE_LIST_INCLUDE = {
  doctor: { select: { id: true, name: true, clinicName: true, phone: true } },
  workType: { select: { id: true, name: true, category: true, price: true } },
  assignments: {
    include: { technician: { select: { id: true, name: true, role: true } } },
    orderBy: { assignedAt: 'desc' },
  },
  stages: {
    where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
    select: {
      id: true,
      name: true,
      status: true,
      assigneeId: true,
      assigneeName: true,
      assignees: {
        include: { technician: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { sortOrder: 'asc' },
    take: 2,
  },
};

const CASE_DETAIL_INCLUDE = {
  ...CASE_LIST_INCLUDE,
  stages: {
    orderBy: { sortOrder: 'asc' },
    include: {
      assignees: {
        include: { technician: { select: { id: true, name: true, role: true } } },
        orderBy: { assignedAt: 'asc' },
      },
    },
  },
  attachments: { orderBy: { createdAt: 'desc' } },
  invoices: { include: { payments: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' } },
  customValues: { include: { field: true } },
  history: { orderBy: { createdAt: 'asc' } },
  qualityChecks: { orderBy: { checkedAt: 'desc' } },
  refabrications: { orderBy: { createdAt: 'desc' } },
  creditNotes: { orderBy: { createdAt: 'desc' } },
  materialUsages: { include: { material: true, stock: true }, orderBy: { recordedAt: 'desc' } },
};

const listCases = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const {
      status,
      doctorId,
      search,
      trash,
      isDeleted,
      overdueOnly,
      workTypeId,
      priority,
      paymentStatus,
      technicianId,
      dueDateFrom,
      dueDateTo,
      receivedDateFrom,
      receivedDateTo,
    } = req.query;
    const where = { companyId };

    const isTrash = trash === 'true' || isDeleted === 'true' || status === 'TRASH';
    where.isDeleted = isTrash ? true : false;

    if (status && status !== 'TRASH') {
      const s = String(status).toUpperCase();
      if (!CASE_STATUSES.has(s)) return res.status(400).json({ success: false, error: 'حالة الشغل غير صحيحة' });
      where.status = s;
    }
    if (overdueOnly === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['DELIVERED', 'CLOSED'] };
    }
    if (doctorId) where.doctorId = doctorId;
    if (workTypeId) where.workTypeId = String(workTypeId);
    if (priority) {
      const p = String(priority).toUpperCase();
      if (['NORMAL', 'URGENT', 'STAT'].includes(p)) {
        where.priority = p;
      }
    }
    if (paymentStatus) {
      const ps = String(paymentStatus).toUpperCase();
      if (['UNPAID', 'PARTIAL', 'PAID'].includes(ps)) {
        where.paymentStatus = ps;
      }
    }
    if (req.query.patientPhone) {
      where.patientPhone = { contains: String(req.query.patientPhone).trim(), mode: 'insensitive' };
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = where.dueDate || {};
      if (dueDateFrom) {
        const df = parseDate(dueDateFrom);
        if (df) {
          df.setHours(0, 0, 0, 0);
          where.dueDate.gte = df;
        }
      }
      if (dueDateTo) {
        const dt = parseDate(dueDateTo);
        if (dt) {
          dt.setHours(23, 59, 59, 999);
          where.dueDate.lte = dt;
        }
      }
    }

    if (receivedDateFrom || receivedDateTo) {
      where.receivedDate = where.receivedDate || {};
      if (receivedDateFrom) {
        const rf = parseDate(receivedDateFrom);
        if (rf) {
          rf.setHours(0, 0, 0, 0);
          where.receivedDate.gte = rf;
        }
      }
      if (receivedDateTo) {
        const rt = parseDate(receivedDateTo);
        if (rt) {
          rt.setHours(23, 59, 59, 999);
          where.receivedDate.lte = rt;
        }
      }
    }

    // فلتر الأجندة بتاريخ محدد (يوم معين بالكامل 00:00 إلى 23:59:59)
    if (req.query.date) {
      const d = parseDate(req.query.date);
      if (d) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        const targetField = req.query.dateFilterField === 'dueDate' ? 'dueDate' : 'receivedDate';
        where[targetField] = { gte: start, lte: end };
      }
    }

    const searchOr = search ? [
      { caseNumber: { contains: search, mode: 'insensitive' } },
      { patientName: { contains: search, mode: 'insensitive' } },
      { doctorName: { contains: search, mode: 'insensitive' } },
      { patientPhone: { contains: search, mode: 'insensitive' } },
    ] : null;

    let techOr = null;
    if (technicianId) {
      const techId = String(technicianId);
      techOr = [
        { assignments: { some: { technicianId: techId } } },
        { stages: { some: { OR: [{ assigneeId: techId }, { assignees: { some: { technicianId: techId } } }] } } },
      ];
    }

    if (searchOr && techOr) {
      where.AND = [{ OR: searchOr }, { OR: techOr }];
    } else if (searchOr) {
      where.OR = searchOr;
    } else if (techOr) {
      where.OR = techOr;
    }

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total, trashCount] = await Promise.all([
      prisma.dentalLabCase.findMany({
        where,
        include: CASE_LIST_INCLUDE,
        orderBy: [{ receivedDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      prisma.dentalLabCase.count({ where }),
      prisma.dentalLabCase.count({ where: { companyId, isDeleted: true } }),
    ]);
    res.json({ success: true, data: { items, total, trashCount, page: pageNum, limit: limitNum } });
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

    // التحقق من سياسات المعمل (الحقول المطلوبة وأرقام الهواتف)
    const { getLabPolicies } = require('./dentalPolicyController');
    const labPolicies = await getLabPolicies(prisma, companyId);
    if (labPolicies?.fields?.patientPhoneRequired && !body.patientPhone) {
      return res.status(400).json({ success: false, error: 'رقم هاتف المريض إلزامي بحسب سياسة المعمل' });
    }
    if (body.patientPhone) {
      const phoneClean = String(body.patientPhone).trim();
      const egPhoneRegex = /^(?:\+20|0)?1[0125][0-9]{8}$/;
      if (!egPhoneRegex.test(phoneClean)) {
        return res.status(400).json({ success: false, error: 'رقم هاتف المريض غير صحيح (يجب أن يكون رقماً مصرياً صحيحاً مثل 01012345678)' });
      }
    }

    let dueDate = parseDate(body.dueDate);
    if (!dueDate && (body.workTypeId || workType)) {
      const { calculateExpectedDueDate } = require('../services/dentalAssignmentService');
      dueDate = calculateExpectedDueDate({
        workType,
        priority: body.priority,
        orderDate: (body.receivedDate && parseDate(body.receivedDate)) || new Date(),
        policies: labPolicies,
      });
    }
    if (!dueDate) {
      dueDate = await suggestDueDate(prisma, companyId, null, new Date(), { priority: body.priority });
    }

    // Calculation of unitsCount & unitPrice
    const teethStr = body.teeth ? String(body.teeth).trim() : null;
    let unitsCount = Number.isFinite(parseInt(body.unitsCount, 10)) ? Math.max(1, parseInt(body.unitsCount, 10)) : null;
    if (!unitsCount && teethStr) {
      const parsedTeeth = teethStr.split(',').map((s) => s.trim()).filter(Boolean);
      if (parsedTeeth.length > 0) unitsCount = parsedTeeth.length;
    }
    if (!unitsCount) unitsCount = (workType && workType.defaultCrownCount) || 1;

    let unitPrice = workType ? (Number(workType.price) || 0) : 0;
    if (body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== '') {
      const upRes = toNonNegativeNumber(body.unitPrice);
      if (upRes.valid) unitPrice = upRes.value;
    }

    const pricingMode = (workType && workType.pricingMode) || 'PER_UNIT';
    let basePrice = pricingMode === 'FLAT' ? unitPrice : round2(unitPrice * unitsCount);

    let priceSnapshot = basePrice;
    if ((body.priceSnapshot === undefined || body.priceSnapshot === null || body.priceSnapshot === '') && doctorId && workType) {
      const resolvedDocPrice = await resolveDoctorWorkTypePrice(prisma, companyId, doctorId, workType);
      unitPrice = resolvedDocPrice;
      priceSnapshot = pricingMode === 'FLAT' ? resolvedDocPrice : round2(resolvedDocPrice * unitsCount);
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

    const { buildCaseStagesFromWorkType } = require('../services/dentalStageTemplateService');
    const stagesData = await buildCaseStagesFromWorkType(
      prisma,
      companyId,
      body.workTypeId,
      workType ? workType.category : null
    );

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

    const material = body.material ? String(body.material) : (workType ? workType.defaultMaterial : null);
    const warrantyYears = Number(body.warrantyYears) >= 0 ? Number(body.warrantyYears) : (workType ? workType.defaultWarrantyYears || 0 : 0);

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
            patientPhone: body.patientPhone ? String(body.patientPhone).trim() : null,
            workTypeId: body.workTypeId || null,
            workTypeName,
            unitsCount,
            unitPrice,
            teeth: body.teeth ? String(body.teeth) : null,
            shade: body.shade ? String(body.shade) : null,
            material,
            lotNumber: body.lotNumber ? String(body.lotNumber).trim() : null,
            materialBrand: body.materialBrand ? String(body.materialBrand).trim() : (workType ? workType.materialBrand : null),
            warrantyYears,
            status: 'RECEIVED',
            orderStatus: 'PENDING',
            priority,
            dueDate,
            receivedDate: (body.receivedDate && parseDate(body.receivedDate)) || new Date(),
            source: 'MANUAL',
            priceSnapshot,
            discount,
            total,
            paid,
            remaining,
            paymentStatus,
            notes: body.notes ? String(body.notes) : null,
            externalLabName: body.externalLabName ? String(body.externalLabName).trim() : null,
            outsourceCost: body.outsourceCost != null ? Number(body.outsourceCost) || null : null,
            outsourcedAt: body.outsourcedAt ? parseDate(body.outsourcedAt) : null,
            expectedReturnAt: body.expectedReturnAt ? parseDate(body.expectedReturnAt) : null,
            outsourceNotes: body.outsourceNotes ? String(body.outsourceNotes).trim() : null,
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

    if (!body.technicianId && labPolicies?.assignment?.mode === 'AUTO') {
      try {
        const { selectTechnicianForAssignment } = require('../services/dentalAssignmentService');
        const autoTech = await selectTechnicianForAssignment(prisma, companyId, {
          workTypeId: body.workTypeId,
          requiredRole: 'TECHNICIAN',
          policies: labPolicies,
        });
        if (autoTech) {
          body.technicianId = autoTech.id;
        }
      } catch (autoErr) {
        console.warn('Auto assignment failed during createCase:', autoErr.message);
      }
    }

    if (body.technicianId) {
      try {
        const tech = await prisma.dentalTechnician.findFirst({
          where: { id: String(body.technicianId), companyId, isActive: true },
        });
        if (tech) {
          const techRole = body.technicianRole || tech.role || 'TECHNICIAN';
          await prisma.dentalCaseAssignment.create({
            data: {
              companyId,
              caseId: dentalCase.id,
              technicianId: tech.id,
              role: techRole,
            },
          });
          const firstStage = await prisma.dentalCaseStage.findFirst({
            where: { caseId: dentalCase.id, companyId },
            orderBy: { sortOrder: 'asc' },
          });
          if (firstStage && !firstStage.assigneeId) {
            await prisma.dentalCaseStage.update({
              where: { id: firstStage.id },
              data: {
                assigneeId: tech.id,
                assigneeName: tech.name,
                startedAt: new Date(),
              },
            });
          }
          await recordDentalLabStatusHistory(prisma, {
            companyId,
            caseId: dentalCase.id,
            dimension: 'STAGE',
            status: 'ASSIGNED',
            oldStatus: null,
            changedBy: req.user?.id || req.user?.email || null,
            userName: adminDisplayName(req),
            reason: `تم إسناد العمل إلى ${tech.name}`,
          });
          const updatedCase = await prisma.dentalLabCase.findFirst({
            where: { id: dentalCase.id, companyId },
            include: CASE_LIST_INCLUDE,
          });
          if (updatedCase) dentalCase = updatedCase;
        }
      } catch (assignErr) {
        console.error('Error assigning technician on createCase:', assignErr);
      }
    }

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
      const techId = technician ? technician.id : null;
      const hasMyStage = (dentalCase.stages || []).some(
        (s) => (s.assigneeId === techId || (Array.isArray(s.assignees) && s.assignees.some((a) => a.technicianId === techId))) &&
          ['IN_PROGRESS', 'PENDING'].includes(s.status)
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

const CASE_UPDATE_FIELDS = [
  'patientName', 'patientPhone', 'teeth', 'shade', 'material', 'lotNumber',
  'materialBrand', 'warrantyYears', 'priority', 'notes', 'dueDate', 'receivedDate',
  'unitsCount', 'unitPrice', 'externalLabName', 'outsourceCost', 'outsourcedAt',
  'expectedReturnAt', 'returnedAt', 'outsourceNotes'
];

const updateCase = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: { assignments: true, stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    // RECEPTION لا يعدل الحقول المالية إلا إذا تغيرت قيمتها فعلياً
    const financialFields = ['priceSnapshot', 'discount', 'paid', 'doctorId', 'workTypeId', 'workTypeName', 'unitPrice', 'unitsCount'];
    const hasFinancialChange = financialFields.some((f) => {
      if (!(f in body)) return false;
      const newVal = body[f];
      const oldVal = existing[f];
      if (newVal === undefined || newVal === null || newVal === '') {
        return oldVal !== null && oldVal !== undefined && oldVal !== '' && oldVal !== 0;
      }
      if (typeof oldVal === 'number' || typeof newVal === 'number') {
        return Number(newVal) !== Number(oldVal);
      }
      return String(newVal).trim() !== String(oldVal || '').trim();
    });
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
    if ('lotNumber' in data) data.lotNumber = data.lotNumber ? String(data.lotNumber).trim() : null;
    if ('materialBrand' in data) data.materialBrand = data.materialBrand ? String(data.materialBrand).trim() : null;
    if ('warrantyYears' in data) data.warrantyYears = Number(data.warrantyYears) >= 0 ? Number(data.warrantyYears) : 0;
    if ('notes' in data) data.notes = data.notes ? String(data.notes) : null;
    if ('dueDate' in data) data.dueDate = parseDate(data.dueDate);
    if ('receivedDate' in data) data.receivedDate = parseDate(data.receivedDate) || existing.receivedDate;
    if ('externalLabName' in data) data.externalLabName = data.externalLabName ? String(data.externalLabName).trim() : null;
    if ('outsourceCost' in data) {
      const oc = toNonNegativeNumber(data.outsourceCost, 0);
      data.outsourceCost = oc.valid ? oc.value : null;
    }
    if ('outsourcedAt' in data) data.outsourcedAt = parseDate(data.outsourcedAt);
    if ('expectedReturnAt' in data) data.expectedReturnAt = parseDate(data.expectedReturnAt);
    if ('returnedAt' in data) data.returnedAt = parseDate(data.returnedAt);
    if ('outsourceNotes' in data) data.outsourceNotes = data.outsourceNotes ? String(data.outsourceNotes).trim() : null;
    if ('priority' in data) {
      const priority = String(data.priority).toUpperCase();
      if (!['NORMAL', 'URGENT', 'STAT'].includes(priority)) {
        return res.status(400).json({ success: false, error: 'أولوية الحالة غير صحيحة' });
      }
      data.priority = priority;
    }

    if ('unitsCount' in body) {
      const uc = parseInt(body.unitsCount, 10);
      data.unitsCount = !isNaN(uc) && uc > 0 ? uc : 1;
    }
    if ('unitPrice' in body) {
      const up = toNonNegativeNumber(body.unitPrice, 0);
      if (up.valid) data.unitPrice = up.value;
    }

    if ('doctorId' in body) {
      const doctorId = body.doctorId || null;
      if (doctorId) {
        const doctor = await prisma.dentalLabDoctor.findFirst({ where: { id: doctorId, companyId } });
        if (!doctor) return res.status(400).json({ success: false, error: 'الطبيب لا ينتمي لهذه الشركة' });
        data.doctorId = doctorId;
        data.doctorName = (body.doctorName && String(body.doctorName).trim()) || doctor.name;
      } else {
        data.doctorId = null;
        data.doctorName = null;
      }
    } else if ('doctorName' in body) {
      data.doctorName = body.doctorName ? String(body.doctorName).trim() : null;
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
        if (!('unitPrice' in body)) {
          data.unitPrice = Number(workType.price) || 0;
        }
        if (!('priceSnapshot' in body)) {
          const uc = data.unitsCount !== undefined ? data.unitsCount : (existing.unitsCount || 1);
          const up = data.unitPrice !== undefined ? data.unitPrice : (Number(workType.price) || 0);
          priceSnapshot = round2(uc * up);
        }
      } else {
        data.workTypeId = null;
        data.workTypeName = null;
      }
    } else if ('workTypeName' in body) {
      data.workTypeName = body.workTypeName ? String(body.workTypeName).trim() : null;
    } else if (('unitsCount' in body || 'unitPrice' in body) && !('priceSnapshot' in body)) {
      const uc = data.unitsCount !== undefined ? data.unitsCount : (existing.unitsCount || 1);
      const up = data.unitPrice !== undefined ? data.unitPrice : (existing.unitPrice || 0);
      if (up > 0) {
        priceSnapshot = round2(uc * up);
      }
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

    let dentalCase = await prisma.dentalLabCase.update({ where: { id }, data, include: CASE_DETAIL_INCLUDE });

    if ('technicianId' in body) {
      const newTechId = body.technicianId ? String(body.technicianId).trim() : null;
      const currentAssignment = (existing.assignments || [])[0];
      const currentTechId = currentAssignment?.technicianId || null;

      if (newTechId !== currentTechId) {
        if (!newTechId) {
          await prisma.dentalCaseAssignment.deleteMany({ where: { caseId: id, companyId } });
          if (currentTechId) {
            await prisma.dentalCaseStage.updateMany({
              where: { caseId: id, companyId, assigneeId: currentTechId },
              data: { assigneeId: null, assigneeName: null },
            });
            if (prisma.dentalStageAssignee && typeof prisma.dentalStageAssignee.deleteMany === 'function') {
              const stageIds = (existing.stages || []).map((s) => s.id);
              if (stageIds.length > 0) {
                await prisma.dentalStageAssignee.deleteMany({
                  where: { stageId: { in: stageIds }, technicianId: currentTechId },
                });
              }
            }
          }
        } else {
          const newTech = await prisma.dentalTechnician.findFirst({ where: { id: newTechId, companyId } });
          if (newTech) {
            await prisma.dentalCaseAssignment.deleteMany({ where: { caseId: id, companyId } });
            await prisma.dentalCaseAssignment.create({
              data: { companyId, caseId: id, technicianId: newTechId, role: body.technicianRole || 'TECHNICIAN' },
            });
            const activeStage = findActiveStage(existing.stages || []);
            if (activeStage) {
              if (currentTechId && prisma.dentalStageAssignee && typeof prisma.dentalStageAssignee.deleteMany === 'function') {
                await prisma.dentalStageAssignee.deleteMany({
                  where: { stageId: activeStage.id, technicianId: currentTechId },
                });
              }
              if (prisma.dentalStageAssignee && typeof prisma.dentalStageAssignee.upsert === 'function') {
                await prisma.dentalStageAssignee.upsert({
                  where: { stageId_technicianId: { stageId: activeStage.id, technicianId: newTechId } },
                  create: {
                    companyId,
                    caseId: id,
                    stageId: activeStage.id,
                    technicianId: newTechId,
                    technicianName: newTech.name,
                    role: body.technicianRole || 'TECHNICIAN',
                    sharePercent: 100,
                  },
                  update: { role: body.technicianRole || 'TECHNICIAN' },
                });
              }
              await prisma.dentalCaseStage.update({
                where: { id: activeStage.id },
                data: { assigneeId: newTechId, assigneeName: newTech.name, startedAt: activeStage.startedAt || new Date() },
              });
            }
          }
        }
        dentalCase = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, include: CASE_DETAIL_INCLUDE });
      }
    }

    // مزامنة الفواتير غير المسددة وسجل الحالة عند تغيير الطبيب
    if ('doctorId' in body && body.doctorId !== existing.doctorId) {
      if (body.syncInvoices !== false) {
        await prisma.dentalInvoice.updateMany({
          where: {
            caseId: id,
            companyId,
            status: { notIn: ['PAID', 'VOID'] },
          },
          data: {
            doctorId: data.doctorId || null,
            doctorName: data.doctorName || null,
          },
        }).catch((err) => console.warn('Could not sync open invoices on doctor change:', err.message));
      }

      await prisma.dentalCaseStatusHistory.create({
        data: {
          companyId,
          caseId: id,
          dimension: 'ORDER',
          status: 'TRANSFER_DOCTOR',
          oldStatus: existing.status,
          changedBy: req.user?.id || req.user?.email || null,
          userName: adminDisplayName(req),
          reason: body.transferReason || `نقل الحالة من الطبيب (${existing.doctorName || 'غير محدد'}) إلى (${data.doctorName || 'غير محدد'})`,
        },
      }).catch(() => null);
    }

    res.json({ success: true, data: serializeDentalCaseDetail(dentalCase) });
  } catch (error) {
    console.error('Error updating dental case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الحالة' });
  }
};

const trashCase = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    if (existing.isDeleted) return res.status(400).json({ success: false, error: 'الحالة موجودة بالفعل في سلة المهملات' });

    const dentalCase = await prisma.dentalLabCase.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
      include: CASE_LIST_INCLUDE,
    });

    await prisma.dentalCaseStatusHistory.create({
      data: {
        companyId,
        caseId: id,
        dimension: 'ORDER',
        status: 'TRASHED',
        oldStatus: existing.status,
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
        reason: req.body?.reason || 'نقل إلى سلة المهملات',
      },
    }).catch(() => null);

    dentalNotificationService.cancelPendingNotificationsForCase(companyId, id).catch(() => {});

    res.json({ success: true, data: dentalCase, message: 'تم نقل الحالة إلى سلة المهملات بنجاح' });
  } catch (error) {
    console.error('Error trashing dental case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في نقل الحالة إلى سلة المهملات' });
  }
};

const restoreCase = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    if (!existing.isDeleted) return res.status(400).json({ success: false, error: 'الحالة ليست في سلة المهملات' });

    const dentalCase = await prisma.dentalLabCase.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      include: CASE_LIST_INCLUDE,
    });

    await prisma.dentalCaseStatusHistory.create({
      data: {
        companyId,
        caseId: id,
        dimension: 'ORDER',
        status: 'RESTORED',
        oldStatus: 'TRASHED',
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
        reason: 'استعادة من سلة المهملات',
      },
    }).catch(() => null);

    res.json({ success: true, data: dentalCase, message: 'تمت استعادة الحالة بنجاح' });
  } catch (error) {
    console.error('Error restoring dental case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في استعادة الحالة' });
  }
};

const permanentDeleteCase = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalLabCase.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    await prisma.$transaction(async (tx) => {
      await tx.dentalInvoice.updateMany({ where: { caseId: id, companyId }, data: { caseId: null } });
      await tx.dentalLabCase.delete({ where: { id } });
    });

    dentalNotificationService.cancelPendingNotificationsForCase(companyId, id).catch(() => {});

    res.json({ success: true, message: 'تم حذف الحالة نهائياً من النظام' });
  } catch (error) {
    console.error('Error permanently deleting dental case:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الحذف النهائي للحالة' });
  }
};

const bulkAdvanceCases = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { caseIds, to, status: targetStatus, reason } = req.body || {};
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار حالة واحدة على الأقل' });
    }
    const target = String(to || targetStatus || '').toUpperCase();
    if (!CASE_STATUSES.has(target)) {
      return res.status(400).json({ success: false, error: 'حالة المرحلة المستهدفة غير صالحة' });
    }

    const prisma = getSharedPrismaClient();
    const cases = await prisma.dentalLabCase.findMany({
      where: { id: { in: caseIds }, companyId, isDeleted: false },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });

    let updatedCount = 0;
    const meta = {
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
      reason: reason || `ترقية جماعية إلى ${target}`,
    };

    for (const c of cases) {
      const current = c.status;
      if (current === target) continue;
      const currentIndex = CASE_STATUS_CHAIN.indexOf(current);
      const targetIndex = CASE_STATUS_CHAIN.indexOf(target);
      if (targetIndex < currentIndex) continue; // لا يرجع للخلف

      const updateData = { status: target };
      if (target === 'DELIVERED') {
        updateData.deliveredAt = new Date();
        updateData.orderStatus = 'COMPLETED';
      }
      if (target === 'CLOSED') {
        updateData.orderStatus = 'COMPLETED';
        if (!updateData.deliveredAt) updateData.deliveredAt = c.deliveredAt || new Date();
      }

      const stages = c.stages || [];
      const targetStage = stageForStatus(stages, target);
      const targetStageSort = targetStage ? Number(targetStage.sortOrder ?? 9999) : 9999;

      await prisma.$transaction(async (tx) => {
        for (const st of stages) {
          const so = Number(st.sortOrder ?? 0);
          if (so < targetStageSort && st.status !== 'DONE') {
            await tx.dentalCaseStage.update({ where: { id: st.id }, data: { status: 'DONE', completedAt: new Date() } });
          }
        }
        if (targetStage) {
          await tx.dentalCaseStage.update({
            where: { id: targetStage.id },
            data: { status: 'IN_PROGRESS', startedAt: new Date() },
          });
        }
        await tx.dentalLabCase.update({ where: { id: c.id }, data: updateData });
      });

      await recordDentalLabStatusHistory(prisma, {
        companyId,
        caseId: c.id,
        dimension: 'STAGE',
        status: target,
        oldStatus: current,
        changedBy: meta.changedBy,
        userName: meta.userName,
        reason: meta.reason,
      }).catch(() => null);

      updatedCount += 1;
    }

    const STAGE_NAMES_AR = {
      RECEIVED: 'تم الاستلام',
      DESIGN: 'التصميم',
      MANUFACTURING: 'التصنيع',
      QC: 'مراجعة الجودة',
      READY: 'جاهز للتسليم',
      DELIVERED: 'تم التسليم',
      CLOSED: 'مغلق',
    };
    const targetLabel = STAGE_NAMES_AR[target] || target;

    res.json({ success: true, count: updatedCount, message: `تمت ترقية ${updatedCount} حالة إلى "${targetLabel}" بنجاح` });
  } catch (error) {
    console.error('Error bulk advancing dental cases:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الترقية الجماعية للحالات' });
  }
};

const bulkAssignTechnician = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { caseIds, technicianId, role = 'PRIMARY' } = req.body || {};
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار حالة واحدة على الأقل' });
    }
    if (!technicianId) {
      return res.status(400).json({ success: false, error: 'يرجى اختيار الفني' });
    }

    const prisma = getSharedPrismaClient();
    const technician = await prisma.dentalTechnician.findFirst({ where: { id: technicianId, companyId } });
    if (!technician) return res.status(400).json({ success: false, error: 'الفني غير موجود أو لا ينتمي لهذه الشركة' });

    const cases = await prisma.dentalLabCase.findMany({
      where: { id: { in: caseIds }, companyId, isDeleted: false },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });

    let assignedCount = 0;
    for (const c of cases) {
      const activeStage = findActiveStage(c.stages || []);
      await prisma.$transaction(async (tx) => {
        await tx.dentalCaseAssignment.create({
          data: { companyId, caseId: c.id, technicianId, role },
        });
        if (activeStage) {
          if (tx.dentalStageAssignee && typeof tx.dentalStageAssignee.upsert === 'function') {
            await tx.dentalStageAssignee.upsert({
              where: {
                stageId_technicianId: { stageId: activeStage.id, technicianId },
              },
              create: {
                companyId,
                caseId: c.id,
                stageId: activeStage.id,
                technicianId,
                technicianName: technician.name,
                role,
                sharePercent: 100,
              },
              update: { role },
            });
          }
          if (!activeStage.assigneeId) {
            await tx.dentalCaseStage.update({
              where: { id: activeStage.id },
              data: { assigneeId: technicianId, assigneeName: technician.name, startedAt: new Date() },
            });
          }
        }
      });

      await recordDentalLabStatusHistory(prisma, {
        companyId,
        caseId: c.id,
        dimension: 'STAGE',
        status: 'ASSIGNED',
        oldStatus: c.status,
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
        reason: `إسناد جماعي إلى الفني ${technician.name}`,
      }).catch(() => null);

      assignedCount++;
    }

    res.json({ success: true, count: assignedCount, message: `تم إسناد ${assignedCount} حالة إلى ${technician.name} بنجاح` });
  } catch (error) {
    console.error('Error bulk assigning dental technician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في الإسناد الجماعي للفني' });
  }
};

const bulkUpdatePriority = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { caseIds, priority } = req.body || {};
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار حالة واحدة على الأقل' });
    }
    const p = String(priority || '').toUpperCase();
    if (!['NORMAL', 'URGENT', 'STAT'].includes(p)) {
      return res.status(400).json({ success: false, error: 'درجة الأولوية غير صالحة' });
    }

    const prisma = getSharedPrismaClient();
    const result = await prisma.dentalLabCase.updateMany({
      where: { id: { in: caseIds }, companyId, isDeleted: false },
      data: { priority: p },
    });

    res.json({ success: true, count: result.count, message: `تم تحديث أولوية ${result.count} حالة بنجاح` });
  } catch (error) {
    console.error('Error bulk updating priority:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعديل الأولوية الجماعي' });
  }
};

const bulkTrashCases = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { caseIds, reason } = req.body || {};
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار حالة واحدة على الأقل' });
    }

    const prisma = getSharedPrismaClient();
    const result = await prisma.dentalLabCase.updateMany({
      where: { id: { in: caseIds }, companyId, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    dentalNotificationService.cancelPendingNotificationsForCase(companyId, caseIds).catch(() => {});

    res.json({ success: true, count: result.count, message: `تم نقل ${result.count} حالة إلى سلة المهملات` });
  } catch (error) {
    console.error('Error bulk trashing dental cases:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في نقل الحالات إلى المهملات' });
  }
};

const bulkRestoreCases = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { caseIds } = req.body || {};
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار حالة واحدة على الأقل' });
    }

    const prisma = getSharedPrismaClient();
    const result = await prisma.dentalLabCase.updateMany({
      where: { id: { in: caseIds }, companyId, isDeleted: true },
      data: { isDeleted: false, deletedAt: null },
    });

    res.json({ success: true, count: result.count, message: `تمت استعادة ${result.count} حالة بنجاح` });
  } catch (error) {
    console.error('Error bulk restoring dental cases:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في استعادة الحالات' });
  }
};

const bulkTransferCasesDoctor = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { caseIds, targetDoctorId, targetDoctorName, syncInvoices = true } = req.body || {};
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب اختيار حالة واحدة على الأقل للنقل' });
    }
    if (!targetDoctorId) {
      return res.status(400).json({ success: false, error: 'يجب تحديد الطبيب / العيادة المنقول إليها' });
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.dentalLabDoctor.findFirst({
      where: { id: targetDoctorId, companyId },
    });
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'الطبيب أو العيادة المحددة غير موجودة' });
    }

    const effectiveDocName = (targetDoctorName && String(targetDoctorName).trim()) || doctor.name;

    // Run in transaction: update cases, sync invoices, and create status history
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update cases
      const updatedCases = await tx.dentalLabCase.updateMany({
        where: { id: { in: caseIds }, companyId },
        data: {
          doctorId: targetDoctorId,
          doctorName: effectiveDocName,
        },
      });

      // 2. Sync related invoices if requested
      let updatedInvoicesCount = 0;
      if (syncInvoices) {
        const invResult = await tx.dentalInvoice.updateMany({
          where: {
            caseId: { in: caseIds },
            companyId,
            status: { not: 'VOID' },
          },
          data: {
            doctorId: targetDoctorId,
            doctorName: effectiveDocName,
          },
        });
        updatedInvoicesCount = invResult.count;
      }

      // 3. Create status history logs
      for (const cid of caseIds) {
        await tx.dentalCaseStatusHistory.create({
          data: {
            companyId,
            caseId: cid,
            dimension: 'ORDER',
            toStatus: 'TRANSFERRED',
            changedBy: req.user?.id || null,
            userName: adminDisplayName(req),
            reason: `تم نقل الحالة إلى العيادة / الطبيب: ${effectiveDocName}`,
          },
        });
      }

      return { casesCount: updatedCases.count, invoicesCount: updatedInvoicesCount };
    });

    res.json({
      success: true,
      count: result.casesCount,
      invoicesUpdated: result.invoicesCount,
      message: `تم نقل ${result.casesCount} حالة بنجاح إلى "${effectiveDocName}"${result.invoicesCount > 0 ? ` وتحديث ${result.invoicesCount} فاتورة تابعة لها` : ''}`,
    });
  } catch (error) {
    console.error('Error bulk transferring dental cases doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في نقل الحالات إلى الطبيب الجديد' });
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
    const standardNext = current === 'MANUFACTURING' ? 'QC' : (current === 'OUTSOURCED' ? 'QC' : (currentIndex < CASE_STATUS_CHAIN.length - 1 ? CASE_STATUS_CHAIN[currentIndex + 1] : null));
    const nextInChain = standardNext;

    const isValidTransition = (from, to) => {
      if (from === 'MANUFACTURING') {
        return to === 'QC' || to === 'OUTSOURCED';
      }
      if (from === 'OUTSOURCED') {
        return to === 'QC' || to === 'MANUFACTURING';
      }
      return to === nextInChain;
    };

    let target = null;
    if (body.to !== undefined && body.to !== null && body.to !== '') {
      target = String(body.to).toUpperCase();
      if (!CASE_STATUSES.has(target)) return res.status(400).json({ success: false, error: 'الحالة المطلوبة غير صحيحة' });
      if (!isValidTransition(current, target)) {
        return res.status(400).json({ success: false, error: `لا يمكن الانتقال من "${current}" إلى "${target}"` });
      }
    } else if (body.status !== undefined && body.status !== null && body.status !== '') {
      target = String(body.status).toUpperCase();
      if (!CASE_STATUSES.has(target)) return res.status(400).json({ success: false, error: 'الحالة المطلوبة غير صحيحة' });
      if (!isValidTransition(current, target)) {
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
    if (target === 'OUTSOURCED') {
      if (body.externalLabName) updateData.externalLabName = String(body.externalLabName).trim();
      if (body.outsourceCost !== undefined && body.outsourceCost !== null && body.outsourceCost !== '') {
        const oc = toNonNegativeNumber(body.outsourceCost, 0);
        if (oc.valid) updateData.outsourceCost = oc.value;
      }
      updateData.outsourcedAt = body.outsourcedAt ? parseDate(body.outsourcedAt) : new Date();
      if (body.expectedReturnAt) updateData.expectedReturnAt = parseDate(body.expectedReturnAt);
      if (body.outsourceNotes) updateData.outsourceNotes = String(body.outsourceNotes).trim();
    }
    if (current === 'OUTSOURCED' && target !== 'OUTSOURCED') {
      updateData.returnedAt = new Date();
    }
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

    // P8: ترحيل تكلفة التشغيل الخارجي للطبقة المالية
    if (target === 'OUTSOURCED') {
      const cost = Number(updateData.outsourceCost ?? existing.outsourceCost) || 0;
      if (cost > 0) {
        try {
          const { createFinancialPosting } = require('../services/financialPostingService');
          await createFinancialPosting(prisma, companyId, {
            sourceType: 'OUTSOURCE_EXPENSE',
            sourceId: id,
            direction: 'EXPENSE',
            amount: cost,
            partyType: 'EXTERNAL_LAB',
            partyName: updateData.externalLabName || existing.externalLabName || 'معمل خارجي',
            notes: `تكلفة تشغيل خارجي للحالة ${existing.caseNumber || id}: ${updateData.externalLabName || existing.externalLabName || ''}`,
            createdBy: req.user?.id || req.user?.email || null,
          });
        } catch (fErr) {
          console.warn('Failed creating financial posting for outsource cost:', fErr.message);
        }
      }
    }

    // P1: خصم مخزون الوصفة الفنية (BOM) عند الجاهزية أو التسليم أو الإغلاق
    if (target === 'READY' || target === 'DELIVERED' || target === 'CLOSED') {
      try {
        const { processCaseBOMConsumption } = require('../services/financialPostingService');
        processCaseBOMConsumption(prisma, companyId, id).catch((bomErr) => {
          console.warn('[BOM Consumption] Notice on status transition:', bomErr.message);
        });
      } catch (bomEx) {
        console.warn('[BOM Consumption] Error invoking service:', bomEx.message);
      }
    }

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
      if (activeStage) {
        if (tx.dentalStageAssignee && typeof tx.dentalStageAssignee.upsert === 'function') {
          await tx.dentalStageAssignee.upsert({
            where: {
              stageId_technicianId: {
                stageId: activeStage.id,
                technicianId,
              },
            },
            create: {
              companyId,
              caseId: id,
              stageId: activeStage.id,
              technicianId,
              technicianName: technician.name,
              role,
              sharePercent: 100,
            },
            update: {
              role,
            },
          });
        }
        if (activeStage.assigneeId && activeStage.assigneeId !== technicianId && tx.dentalStageAssignee && typeof tx.dentalStageAssignee.deleteMany === 'function') {
          await tx.dentalStageAssignee.deleteMany({
            where: { stageId: activeStage.id, technicianId: activeStage.assigneeId },
          });
        }
        await tx.dentalCaseStage.update({
          where: { id: activeStage.id },
          data: { assigneeId: technicianId, assigneeName: technician.name, startedAt: activeStage.startedAt || new Date() },
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
    res.json({ success: true, data: serializeDentalCaseDetail(dentalCase) });
  } catch (error) {
    console.error('Error assigning dental technician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إسناد الفني' });
  }
};

const removeCaseAssignment = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id, assignmentId } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalCaseAssignment.findFirst({
      where: { id: assignmentId, caseId: id, companyId },
      include: { technician: { select: { name: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'الإسناد غير موجود' });

    const techId = existing.technicianId;

    await prisma.$transaction(async (tx) => {
      await tx.dentalCaseAssignment.delete({ where: { id: assignmentId } });

      if (techId) {
        await tx.dentalCaseStage.updateMany({
          where: { caseId: id, companyId, assigneeId: techId },
          data: { assigneeId: null, assigneeName: null },
        });

        if (tx.dentalStageAssignee && typeof tx.dentalStageAssignee.deleteMany === 'function') {
          const caseStages = await tx.dentalCaseStage.findMany({
            where: { caseId: id, companyId },
            select: { id: true },
          });
          const stageIds = (caseStages || []).map((s) => s.id);
          if (stageIds.length > 0) {
            await tx.dentalStageAssignee.deleteMany({
              where: { stageId: { in: stageIds }, technicianId: techId },
            });
          }
        }
      }
    });

    await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: id,
      dimension: 'STAGE',
      status: 'ASSIGNMENT_REMOVED',
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
      reason: `تم إلغاء إسناد الفني ${existing.technician?.name || ''}`,
    }).catch(() => null);

    const dentalCase = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, include: CASE_DETAIL_INCLUDE });
    res.json({ success: true, data: serializeDentalCaseDetail(dentalCase), message: 'تم إلغاء إسناد الفني بنجاح' });
  } catch (error) {
    console.error('Error removing case assignment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إلغاء إسناد الفني' });
  }
};

const addStageAssignee = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id, stageId } = req.params;
    const body = req.body || {};
    const technicianId = body.technicianId || null;
    if (!technicianId) return res.status(400).json({ success: false, error: 'معرف الفني مطلوب' });

    const role = typeof body.role === 'string' && body.role.trim() ? body.role.trim().toUpperCase() : 'PRIMARY';
    const sharePercent = Math.min(100, Math.max(0, Number(body.sharePercent) || 100));
    const notes = body.notes ? String(body.notes).trim() : null;

    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const stage = (dentalCase.stages || []).find((s) => s.id === stageId);
    if (!stage) return res.status(404).json({ success: false, error: 'المرحلة غير موجودة في هذه الحالة' });

    const technician = await prisma.dentalTechnician.findFirst({ where: { id: technicianId, companyId } });
    if (!technician) return res.status(400).json({ success: false, error: 'الفني لا ينتمي لهذه الشركة' });

    let stageAssignee;
    await prisma.$transaction(async (tx) => {
      if (tx.dentalStageAssignee && typeof tx.dentalStageAssignee.upsert === 'function') {
        stageAssignee = await tx.dentalStageAssignee.upsert({
          where: {
            stageId_technicianId: {
              stageId,
              technicianId,
            },
          },
          create: {
            companyId,
            caseId: id,
            stageId,
            technicianId,
            technicianName: technician.name,
            role,
            sharePercent,
            notes,
          },
          update: {
            role,
            sharePercent,
            notes,
          },
        });
      }

      // إذا لم يكن هناك فني رئيسي بالمرحلة، أو كان الدور PRIMARY، يتم تعيينه كـ assigneeId
      const stageUpdates = {};
      if (!stage.assigneeId || role === 'PRIMARY') {
        stageUpdates.assigneeId = technicianId;
        stageUpdates.assigneeName = technician.name;
        if (!stage.startedAt && stage.status !== 'DONE') {
          stageUpdates.startedAt = new Date();
        }
      }
      if (Object.keys(stageUpdates).length > 0) {
        await tx.dentalCaseStage.update({
          where: { id: stageId },
          data: stageUpdates,
        });
      }

      // توفير التعيين في جدول الحركات العام dentalCaseAssignment أيضاً
      if (tx.dentalCaseAssignment && typeof tx.dentalCaseAssignment.findFirst === 'function') {
        const existingCaseAssignment = await tx.dentalCaseAssignment.findFirst({
          where: { caseId: id, technicianId },
        });
        if (!existingCaseAssignment) {
          await tx.dentalCaseAssignment.create({
            data: { companyId, caseId: id, technicianId, role },
          });
        }
      }
    });

    await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: id,
      dimension: 'STAGE',
      status: 'ASSIGNED',
      oldStatus: stage.status,
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
      reason: `تم إسناد الفني ${technician.name} للمرحلة "${stage.name}" (الدور: ${role} - النسبة: ${sharePercent}%)`,
    });

    const updated = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, include: CASE_DETAIL_INCLUDE });
    res.json({
      success: true,
      data: serializeDentalCaseDetail(updated),
      message: `تم إسناد الفني ${technician.name} للمرحلة بنجاح`,
    });
  } catch (error) {
    console.error('Error adding stage assignee:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إضافة الفني للمرحلة' });
  }
};

const removeStageAssignee = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id, stageId, technicianId } = req.params;

    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: {
        stages: {
          include: { assignees: true },
        },
      },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const stage = (dentalCase.stages || []).find((s) => s.id === stageId);
    if (!stage) return res.status(404).json({ success: false, error: 'المرحلة غير موجودة' });

    await prisma.$transaction(async (tx) => {
      if (tx.dentalStageAssignee && typeof tx.dentalStageAssignee.deleteMany === 'function') {
        await tx.dentalStageAssignee.deleteMany({
          where: { stageId, technicianId },
        });
      }

      // إذا كان الفني هو المسجل كـ assigneeId رئيسي، ننقل التعيين للفني التالي أو نلغيه
      if (stage.assigneeId === technicianId) {
        const remaining = (stage.assignees || []).filter((a) => a.technicianId !== technicianId);
        const next = remaining[0] || null;
        await tx.dentalCaseStage.update({
          where: { id: stageId },
          data: {
            assigneeId: next ? next.technicianId : null,
            assigneeName: next ? next.technicianName : null,
          },
        });
      }
    });

    await recordDentalLabStatusHistory(prisma, {
      companyId,
      caseId: id,
      dimension: 'STAGE',
      status: 'UNASSIGNED',
      oldStatus: stage.status,
      changedBy: req.user?.id || req.user?.email || null,
      userName: adminDisplayName(req),
      reason: `تم إلغاء إسناد الفني من المرحلة "${stage.name}"`,
    });

    const updated = await prisma.dentalLabCase.findFirst({ where: { id, companyId }, include: CASE_DETAIL_INCLUDE });
    res.json({
      success: true,
      data: serializeDentalCaseDetail(updated),
      message: 'تم إلغاء إسناد الفني من المرحلة بنجاح',
    });
  } catch (error) {
    console.error('Error removing stage assignee:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إلغاء إسناد الفني' });
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

    // التعرف التلقائي على ملفات HTML (Exocad 3D Web Viewer) كـ DESIGN_REVIEW
    const isHtmlFile = (f) => {
      const ext = path.extname(f.originalname || f.filename || '').toLowerCase();
      const mime = String(f.mimetype || '').toLowerCase();
      return ext === '.html' || ext === '.htm' || mime === 'text/html';
    };
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (isHtmlFile(f) && perFileKinds[i] !== 'DESIGN_REVIEW') {
        perFileKinds[i] = 'DESIGN_REVIEW';
      }
    }

    // رفع مراجعة التصميم (HTML من exocad) لفريق عمل المعمل المصرح لهم
    if (perFileKinds.includes('DESIGN_REVIEW')) {
      const teamRoles = await require('../services/dentalRoles').loadTeamRoles(companyId);
      const role = resolveDentalRole(req.user, teamRoles);
      if (!['OWNER', 'MANAGER', 'TECHNICIAN', 'RECEPTION'].includes(role)) {
        for (const f of files) { if (f && f.path) fs.unlink(f.path, () => {}); }
        return res.status(403).json({ success: false, error: 'غير مصرح برفع مراجعة التصميم' });
      }
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const k = perFileKinds[i];
      if (k === 'DESIGN_REVIEW' && !isHtmlFile(f)) {
        for (const ff of files) { if (ff && ff.path) fs.unlink(ff.path, () => {}); }
        return res.status(400).json({ success: false, error: 'مراجعة التصميم يجب أن تكون ملف HTML من exocad' });
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
    const { doctorId, status, search, from, to } = req.query;
    const where = { companyId };
    if (doctorId) where.doctorId = doctorId;
    if (status) {
      const s = String(status).toUpperCase();
      if (!INVOICE_STATUSES.has(s)) return res.status(400).json({ success: false, error: 'حالة الفاتورة غير صحيحة' });
      where.status = s;
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { doctorName: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { case: { patientName: { contains: q, mode: 'insensitive' } } },
        { case: { caseNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }
    const fromDate = parseDate(from);
    let toDate = parseDate(to); if (toDate) toDate = getEndOfDayInTimezone(toDate);
    if (fromDate) {
      where.createdAt = { ...(where.createdAt || {}), gte: fromDate };
    }
    if (toDate) {
      where.createdAt = { ...(where.createdAt || {}), lte: toDate };
    }

    const { pageNum, limitNum, skip } = parsePagination(req.query);
    const prisma = getSharedPrismaClient();
    const [items, total] = await Promise.all([
      prisma.dentalInvoice.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              patientName: true,
              patientPhone: true,
              workTypeName: true,
              unitsCount: true,
              unitPrice: true,
              teeth: true,
              shade: true,
              material: true,
              status: true,
              dueDate: true,
              total: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              phone: true,
              clinicName: true,
              creditLimit: true,
            },
          },
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

    // P1: ترحيل التحصيل للطبقة المالية والخزينة (Idempotent)
    let financialPosting = null;
    try {
      const { createOrGetFinancialPosting, SOURCE_TYPES } = require('../services/financialPostingService');
      const latestPayment = updated.payments?.[0];
      const sourceId = body.paymentId || body.idempotencyKey || (latestPayment ? latestPayment.id : `${id}:${amountResult.value}:${Date.now()}`);

      const finResult = await createOrGetFinancialPosting({
        companyId,
        sourceType: SOURCE_TYPES.CASE_INVOICE,
        sourceId,
        treasuryAccountId: body.treasuryAccountId || null,
        direction: 'IN',
        amount: amountResult.value,
        reference: `تحصيل فاتورة ${invoice.invoiceNumber}`,
        notes: body.note ? String(body.note) : `تحصيل دفعة بقيمة ${amountResult.value} ج.م على الفاتورة ${invoice.invoiceNumber}`,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          caseId: invoice.caseId,
          method,
          paymentId: latestPayment?.id,
        },
        userId: req.user?.id || req.user?.email,
      });
      financialPosting = finResult?.posting || null;
    } catch (finErr) {
      console.warn('Warning: Financial posting failed for invoice payment:', finErr.message);
    }

    res.json({ success: true, data: updated, financialPosting });
  } catch (error) {
    console.error('Error recording dental payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفعة' });
  }
};

const voidInvoice = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const { reason } = req.body || {};
    const prisma = getSharedPrismaClient();

    const existing = await prisma.dentalInvoice.findFirst({
      where: { id, companyId },
      include: { payments: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    }
    if (existing.status === 'VOID') {
      return res.status(400).json({ success: false, error: 'الفاتورة ملغاة بالفعل' });
    }

    const updated = await prisma.dentalInvoice.update({
      where: { id },
      data: {
        status: 'VOID',
        notes: [existing.notes, `تم إلغاء الفاتورة بواسطة ${adminDisplayName(req)}: ${reason || 'إلغاء يدوي'}`].filter(Boolean).join(' | '),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: `تم إلغاء الفاتورة #${existing.invoiceNumber || id.slice(0, 8)} بنجاح وتم استبعادها من الحسابات`,
    });
  } catch (error) {
    console.error('Error voiding dental invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إلغاء الفاتورة' });
  }
};


const getUninvoicedSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();

    const cases = await prisma.dentalLabCase.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['DELIVERED', 'COMPLETED', 'READY'] },
        invoices: { none: {} },
        paymentStatus: { not: 'INVOICED' },
      },
      include: {
        doctor: { select: { id: true, name: true, phone: true, clinicName: true } },
        workType: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const byDoctorMap = new Map();
    for (const c of cases) {
      const docId = c.doctorId || 'unknown';
      const docName = c.doctorName || (c.doctor && c.doctor.name) || 'غير محدد';
      const docPhone = c.doctor && c.doctor.phone;
      const clinicName = c.doctor && c.doctor.clinicName;

      if (!byDoctorMap.has(docId)) {
        byDoctorMap.set(docId, {
          doctorId: c.doctorId,
          doctorName: docName,
          phone: docPhone,
          clinicName,
          casesCount: 0,
          totalAmount: 0,
          cases: [],
        });
      }

      const docGroup = byDoctorMap.get(docId);
      docGroup.casesCount++;
      const caseTotal = Number(c.total) || 0;
      docGroup.totalAmount = round2(docGroup.totalAmount + caseTotal);
      docGroup.cases.push({
        id: c.id,
        caseNumber: c.caseNumber || c.id.slice(0, 8),
        patientName: c.patientName,
        workTypeName: c.workTypeName || (c.workType && c.workType.name) || '—',
        dueDate: c.dueDate,
        deliveredAt: c.deliveredAt,
        status: c.status,
        total: caseTotal,
      });
    }

    const doctors = Array.from(byDoctorMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    const totalCases = cases.length;
    const totalAmount = round2(doctors.reduce((sum, d) => sum + d.totalAmount, 0));

    res.json({
      success: true,
      data: {
        doctors,
        totalDoctors: doctors.length,
        totalCases,
        totalAmount,
      },
    });
  } catch (error) {
    console.error('Error getting uninvoiced summary:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تقرير الحالات غير المفوترة' });
  }
};

const batchCreateMonthlyInvoices = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const { doctorIds, dueDate, notes, mode = 'CONSOLIDATED' } = req.body || {};

    const where = {
      companyId,
      isDeleted: false,
      status: { in: ['DELIVERED', 'COMPLETED', 'READY'] },
      invoices: { none: {} },
    };
    if (Array.isArray(doctorIds) && doctorIds.length > 0) {
      where.doctorId = { in: doctorIds };
    }

    const cases = await prisma.dentalLabCase.findMany({
      where,
      include: {
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!cases.length) {
      return res.status(400).json({ success: false, error: 'لا توجد حالات غير مفوترة لهؤلاء الأطباء' });
    }

    const createdInvoices = [];
    const now = new Date();
    const monthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;
    const parsedDueDate = parseDate(dueDate) || new Date(now.getFullYear(), now.getMonth() + 1, 10);

    if (mode === 'PER_CASE') {
      for (const c of cases) {
        const doctorName = c.doctorName || c.doctor?.name || 'غير محدد';
        const total = Number(c.total) || 0;
        const discount = Number(c.discount) || 0;
        const paid = Number(c.paid) || 0;
        const remaining = round2(Math.max(0, total - paid));
        const status = deriveInvoiceStatus(total, paid);
        const invoiceNumber = await generateInvoiceNumber(prisma, companyId);

        const inv = await prisma.dentalInvoice.create({
          data: {
            companyId,
            invoiceNumber,
            caseId: c.id,
            doctorId: c.doctorId || null,
            doctorName,
            total,
            discount,
            paid,
            remaining,
            status,
            dueDate: parsedDueDate,
            notes: notes ? String(notes) : `فاتورة حالة ${c.caseNumber || c.id.slice(0, 8)}`,
          },
        });

        if (typeof prisma.dentalLabCase?.update === 'function') {
          try {
            await prisma.dentalLabCase.update({
              where: { id: c.id },
              data: { paymentStatus: status === 'PAID' ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID') },
            });
          } catch {}
        }

        if (typeof prisma.dentalCaseStatusHistory?.create === 'function') {
          try {
            await prisma.dentalCaseStatusHistory.create({
              data: {
                companyId,
                caseId: c.id,
                dimension: 'PAYMENT',
                status: 'INVOICED',
                changedBy: req.user?.id || req.user?.email || null,
                userName: adminDisplayName(req),
                reason: `تم إصدار الفاتورة رقم ${invoiceNumber}`,
              },
            });
          } catch {}
        }

        createdInvoices.push(inv);
      }
    } else {
      const byDoctor = new Map();
      for (const c of cases) {
        const docId = c.doctorId || 'unknown';
        if (!byDoctor.has(docId)) byDoctor.set(docId, []);
        byDoctor.get(docId).push(c);
      }

      for (const [docId, docCases] of byDoctor.entries()) {
        const doctorName = docCases[0]?.doctorName || docCases[0]?.doctor?.name || 'غير محدد';
        const totalAmount = round2(docCases.reduce((sum, c) => sum + (Number(c.total) || 0), 0));
        const totalDiscount = round2(docCases.reduce((sum, c) => sum + (Number(c.discount) || 0), 0));
        const totalPaid = round2(docCases.reduce((sum, c) => sum + (Number(c.paid) || 0), 0));
        const remaining = round2(Math.max(0, totalAmount - totalPaid));
        const status = deriveInvoiceStatus(totalAmount, totalPaid);
        const invoiceItems = docCases.map((c) => ({
          caseId: c.id,
          caseNumber: c.caseNumber || '—',
          patientName: c.patientName || '—',
          workTypeName: c.workTypeName || '—',
          unitsCount: c.unitsCount || 1,
          unitPrice: c.unitPrice || (c.unitsCount ? round2(Number(c.total) / c.unitsCount) : Number(c.total)),
          total: Number(c.total) || 0,
          discount: Number(c.discount) || 0,
          paid: Number(c.paid) || 0,
          remaining: Number(c.remaining) || 0,
        }));

        const invoiceTitle = notes ? String(notes).trim() : `فاتورة مجمعة - ${new Date().toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' })}`;
        const consolidatedPayload = {
          isConsolidated: true,
          title: invoiceTitle,
          casesCount: docCases.length,
          totalUnits: invoiceItems.reduce((acc, it) => acc + (it.unitsCount || 1), 0),
          items: invoiceItems,
        };

        const invoiceNumber = await generateInvoiceNumber(prisma, companyId);
        const invoice = await prisma.dentalInvoice.create({
          data: {
            companyId,
            invoiceNumber,
            doctorId: docId !== 'unknown' ? docId : null,
            doctorName,
            total: totalAmount,
            discount: totalDiscount,
            paid: totalPaid,
            remaining,
            status,
            dueDate: parsedDueDate,
            notes: JSON.stringify(consolidatedPayload),
          },
        });

        if (typeof prisma.dentalLabCase?.updateMany === 'function') {
          const caseIds = docCases.map((c) => c.id);
          try {
            await prisma.dentalLabCase.updateMany({
              where: { id: { in: caseIds }, companyId },
              data: { paymentStatus: 'INVOICED' },
            });
          } catch {}
        }

        if (typeof prisma.dentalCaseStatusHistory?.create === 'function') {
          for (const c of docCases) {
            try {
              await prisma.dentalCaseStatusHistory.create({
                data: {
                  companyId,
                  caseId: c.id,
                  dimension: 'PAYMENT',
                  status: 'INVOICED',
                  changedBy: req.user?.id || req.user?.email || null,
                  userName: adminDisplayName(req),
                  reason: `تم تضمين الحالة في الفاتورة المجمعة رقم ${invoiceNumber}`,
                },
              });
            } catch {}
          }
        }

        createdInvoices.push(invoice);
      }
    }

    res.json({
      success: true,
      data: {
        createdCount: createdInvoices.length,
        invoicedCasesCount: cases.length,
        invoices: createdInvoices,
      },
      message: `تم إنشاء ${createdInvoices.length} فاتورة بنجاح لـ ${cases.length} حالة`,
    });
  } catch (error) {
    console.error('Error batch creating monthly invoices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفواتير المجمعة' });
  }
};

const scanBillingCycle = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { scanUninvoicedBillingCycle } = require('../services/dentalLabNotificationService');
    const result = await scanUninvoicedBillingCycle(companyId, { force: req.body?.force === true });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error scanning billing cycle:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في فحص دورة الفوترة' });
  }
};

// ==================== MONTHLY PERIOD CLOSE & SETTLEMENTS ====================

const parsePeriodKey = (key) => {
  if (!key || typeof key !== 'string') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return { year: y, month: now.getMonth() + 1, periodKey: `${y}-${m}` };
  }
  const parts = key.trim().split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
    const now = new Date();
    const ny = now.getFullYear();
    const nm = String(now.getMonth() + 1).padStart(2, '0');
    return { year: ny, month: now.getMonth() + 1, periodKey: `${ny}-${nm}` };
  }
  return { year: y, month: m, periodKey: `${y}-${String(m).padStart(2, '0')}` };
};

const getPreviousPeriodKey = (year, month) => {
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
};

const getPeriodDateRange = (year, month) => {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { from, to };
};

const listMonthlySettlements = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { period, doctorId } = req.query || {};
    const { year, month, periodKey } = parsePeriodKey(period);
    const { from, to } = getPeriodDateRange(year, month);
    const prevKey = getPreviousPeriodKey(year, month);

    const prisma = getSharedPrismaClient();

    const settlementWhere = { companyId, periodKey };
    if (doctorId) settlementWhere.doctorId = doctorId;

    let existingSettlements = [];
    if (prisma.dentalMonthlySettlement && typeof prisma.dentalMonthlySettlement.findMany === 'function') {
      existingSettlements = (await prisma.dentalMonthlySettlement.findMany({
        where: settlementWhere,
        orderBy: { doctorName: 'asc' },
      })) || [];
    }

    const settledDocIds = new Set(existingSettlements.map((s) => s.doctorId));

    const docWhere = { companyId, isActive: true };
    if (doctorId) docWhere.id = doctorId;

    const doctors = await prisma.dentalLabDoctor.findMany({
      where: docWhere,
      select: { id: true, name: true, phone: true, clinicName: true, creditLimit: true },
      orderBy: { name: 'asc' },
    });

    const pendingSettlements = [];
    for (const doc of doctors) {
      if (settledDocIds.has(doc.id)) continue;

      let openingBalance = 0;
      if (prisma.dentalMonthlySettlement && typeof prisma.dentalMonthlySettlement.findFirst === 'function') {
        const prevSettlement = await prisma.dentalMonthlySettlement.findFirst({
          where: { companyId, doctorId: doc.id, periodKey: prevKey },
        });
        if (prevSettlement) {
          openingBalance = round2(Number(prevSettlement.closingBalance) || 0);
        }
      }

      const invWhere = {
        companyId,
        doctorId: doc.id,
        status: { not: 'VOID' },
        createdAt: { gte: from, lte: to },
      };

      const [invAgg, caseCount, creditAgg, paymentsAgg] = await Promise.all([
        prisma.dentalInvoice?.aggregate ? prisma.dentalInvoice.aggregate({
          where: invWhere,
          _sum: { total: true },
          _count: { _all: true },
        }) : Promise.resolve(null),
        prisma.dentalLabCase?.count ? prisma.dentalLabCase.count({
          where: { companyId, doctorId: doc.id, receivedDate: { gte: from, lte: to } },
        }) : Promise.resolve(0),
        prisma.dentalCreditNote?.aggregate ? prisma.dentalCreditNote.aggregate({
          where: { companyId, doctorId: doc.id, createdAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }) : Promise.resolve(null),
        prisma.dentalPayment?.aggregate ? prisma.dentalPayment.aggregate({
          where: {
            companyId,
            createdAt: { gte: from, lte: to },
            invoice: { doctorId: doc.id },
          },
          _sum: { amount: true },
        }) : Promise.resolve(null),
      ]);

      const totalBilled = round2(invAgg?._sum?.total || 0);
      const invoicesCount = invAgg?._count?._all || 0;
      const totalPaid = round2(paymentsAgg?._sum?.amount || 0);
      const totalAdjustments = round2(creditAgg?._sum?.amount || 0);
      const closingBalance = round2((openingBalance + totalBilled) - (totalPaid + totalAdjustments));

      pendingSettlements.push({
        id: `preview-${doc.id}`,
        companyId,
        doctorId: doc.id,
        doctorName: doc.name,
        clinicName: doc.clinicName,
        phone: doc.phone,
        year,
        month,
        periodKey,
        openingBalance,
        totalBilled,
        totalPaid,
        totalAdjustments,
        closingBalance,
        casesCount: caseCount || 0,
        invoicesCount,
        status: 'DRAFT',
        isClosed: false,
        notes: null,
      });
    }

    const allRows = [
      ...existingSettlements.map((s) => ({ ...s, isClosed: s.status === 'CLOSED' })),
      ...pendingSettlements,
    ];

    let summaryBilled = 0;
    let summaryPaid = 0;
    let summaryAdjustments = 0;
    let summaryClosingBalance = 0;
    let closedCount = 0;

    for (const r of allRows) {
      summaryBilled += r.totalBilled || 0;
      summaryPaid += r.totalPaid || 0;
      summaryAdjustments += r.totalAdjustments || 0;
      summaryClosingBalance += r.closingBalance || 0;
      if (r.isClosed) closedCount += 1;
    }

    res.json({
      success: true,
      data: {
        periodKey,
        year,
        month,
        settlements: allRows,
        summary: {
          totalBilled: round2(summaryBilled),
          totalPaid: round2(summaryPaid),
          totalAdjustments: round2(summaryAdjustments),
          totalClosingBalance: round2(summaryClosingBalance),
          closedCount,
          totalDoctors: allRows.length,
        },
      },
    });
  } catch (error) {
    console.error('Error listing monthly settlements:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تسويات الشهر' });
  }
};

const closeMonthlySettlement = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { period, doctorId, doctorIds, notes } = req.body || {};
    const { year, month, periodKey } = parsePeriodKey(period);
    const { from, to } = getPeriodDateRange(year, month);
    const prevKey = getPreviousPeriodKey(year, month);

    const prisma = getSharedPrismaClient();

    let targetDocIds = [];
    if (Array.isArray(doctorIds) && doctorIds.length > 0) {
      targetDocIds = doctorIds;
    } else if (doctorId) {
      targetDocIds = [doctorId];
    } else {
      const allDocs = await prisma.dentalLabDoctor.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
      });
      targetDocIds = allDocs.map((d) => d.id);
    }

    if (targetDocIds.length === 0) {
      return res.status(400).json({ success: false, error: 'لم يتم العثور على أطباء للإغلاق' });
    }

    const doctors = await prisma.dentalLabDoctor.findMany({
      where: { companyId, id: { in: targetDocIds } },
      select: { id: true, name: true },
    });

    const closedBy = req.user?.id || null;
    const closedByName = req.user?.name || req.user?.email || null;
    const results = [];

    for (const doc of doctors) {
      let openingBalance = 0;
      if (prisma.dentalMonthlySettlement && typeof prisma.dentalMonthlySettlement.findFirst === 'function') {
        const prevSettlement = await prisma.dentalMonthlySettlement.findFirst({
          where: { companyId, doctorId: doc.id, periodKey: prevKey },
        });
        if (prevSettlement) {
          openingBalance = round2(Number(prevSettlement.closingBalance) || 0);
        }
      }

      const invWhere = {
        companyId,
        doctorId: doc.id,
        status: { not: 'VOID' },
        createdAt: { gte: from, lte: to },
      };

      const [invAgg, caseCount, creditAgg, paymentsAgg] = await Promise.all([
        prisma.dentalInvoice?.aggregate ? prisma.dentalInvoice.aggregate({
          where: invWhere,
          _sum: { total: true },
          _count: { _all: true },
        }) : Promise.resolve(null),
        prisma.dentalLabCase?.count ? prisma.dentalLabCase.count({
          where: { companyId, doctorId: doc.id, receivedDate: { gte: from, lte: to } },
        }) : Promise.resolve(0),
        prisma.dentalCreditNote?.aggregate ? prisma.dentalCreditNote.aggregate({
          where: { companyId, doctorId: doc.id, createdAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }) : Promise.resolve(null),
        prisma.dentalPayment?.aggregate ? prisma.dentalPayment.aggregate({
          where: {
            companyId,
            createdAt: { gte: from, lte: to },
            invoice: { doctorId: doc.id },
          },
          _sum: { amount: true },
        }) : Promise.resolve(null),
      ]);

      const totalBilled = round2(invAgg?._sum?.total || 0);
      const invoicesCount = invAgg?._count?._all || 0;
      const totalPaid = round2(paymentsAgg?._sum?.amount || 0);
      const totalAdjustments = round2(creditAgg?._sum?.amount || 0);
      const closingBalance = round2((openingBalance + totalBilled) - (totalPaid + totalAdjustments));

      const settlementData = {
        companyId,
        doctorId: doc.id,
        doctorName: doc.name,
        year,
        month,
        periodKey,
        openingBalance,
        totalBilled,
        totalPaid,
        totalAdjustments,
        closingBalance,
        casesCount: caseCount || 0,
        invoicesCount,
        status: 'CLOSED',
        notes: notes ? String(notes).trim() : null,
        closedBy,
        closedByName,
        closedAt: new Date(),
        reopenedAt: null,
        reopenedBy: null,
        reopenedReason: null,
      };

      let settlement;
      if (prisma.dentalMonthlySettlement?.upsert) {
        settlement = await prisma.dentalMonthlySettlement.upsert({
          where: {
            companyId_doctorId_periodKey: {
              companyId,
              doctorId: doc.id,
              periodKey,
            },
          },
          create: settlementData,
          update: settlementData,
        });
      } else {
        settlement = settlementData;
      }

      results.push(settlement);
    }

    res.json({
      success: true,
      data: results,
      message: `تم إغلاق واعتماد تسوية شهر ${periodKey} بنجاح لـ ${results.length} طبيب`,
    });
  } catch (error) {
    console.error('Error closing monthly settlement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إغلاق تسوية الشهر' });
  }
};

const reopenMonthlySettlement = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'سبب إعادة فتح الشهر مطلوب للتدقيق المحاسبي' });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.dentalMonthlySettlement.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'سجل التسوية غير موجود' });
    }

    const updated = await prisma.dentalMonthlySettlement.update({
      where: { id },
      data: {
        status: 'REOPENED',
        reopenedAt: new Date(),
        reopenedBy: req.user?.id || null,
        reopenedReason: reason.trim(),
      },
    });

    res.json({ success: true, data: updated, message: 'تم إعادة فتح الشهر للتعديل بنجاح' });
  } catch (error) {
    console.error('Error reopening monthly settlement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إعادة فتح الشهر' });
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

    const [statusRows, todayReceived, todayDue, readyCount, overdueCount, revenueAgg, outstandingAgg, topDoctorRows, topDebtorRows] =
      await Promise.all([
        prisma.dentalLabCase.groupBy({ by: ['status'], where: { companyId, isDeleted: false }, _count: { _all: true } }),
        prisma.dentalLabCase.count({ where: { companyId, isDeleted: false, receivedDate: { gte: startOfToday, lte: endOfToday } } }),
        prisma.dentalLabCase.count({
          where: {
            companyId,
            isDeleted: false,
            dueDate: { gte: startOfToday, lte: endOfToday },
            status: { notIn: ['CLOSED'] },
          },
        }),
        prisma.dentalLabCase.count({ where: { companyId, isDeleted: false, status: 'READY' } }),
        prisma.dentalLabCase.count({
          where: { companyId, isDeleted: false, dueDate: { lt: now }, status: { notIn: ['DELIVERED', 'CLOSED'] } },
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
    const activeCasesCount = Object.entries(statusCounts)
      .filter(([s]) => !['DELIVERED', 'CLOSED'].includes(s))
      .reduce((acc, [, c]) => acc + (Number(c) || 0), 0);

    const doctorIds = (topDoctorRows || []).map((row) => row.doctorId).filter(Boolean);
    const debtorIds = (topDebtorRows || []).map((row) => row.doctorId).filter(Boolean);
    const allDocIds = [...new Set([...doctorIds, ...debtorIds])];

    const [doctors, caseCounts] = await Promise.all([
      allDocIds.length
        ? prisma.dentalLabDoctor.findMany({ where: { id: { in: allDocIds } }, select: { id: true, name: true } })
        : [],
      allDocIds.length
        ? prisma.dentalLabCase.groupBy({
            by: ['doctorId'],
            where: { companyId, isDeleted: false, doctorId: { in: allDocIds } },
            _count: { _all: true },
          })
        : [],
    ]);

    const doctorNameById = new Map(doctors.map((d) => [d.id, d.name]));
    const caseCountByDoctorId = new Map(caseCounts.map((c) => [c.doctorId, c._count._all || 0]));

    const topDoctors = (topDoctorRows || []).map((row) => ({
      doctorId: row.doctorId,
      doctorName: row.doctorId ? doctorNameById.get(row.doctorId) || 'غير محدد' : 'غير محدد',
      revenue: round2(row._sum.paid || 0),
      count: row.doctorId ? caseCountByDoctorId.get(row.doctorId) || 0 : 0,
    }));

    const topDebtors = (topDebtorRows || []).map((row) => ({
      doctorId: row.doctorId,
      doctorName: row.doctorId ? doctorNameById.get(row.doctorId) || 'غير محدد' : 'غير محدد',
      outstanding: round2(row._sum.remaining || 0),
      count: row.doctorId ? caseCountByDoctorId.get(row.doctorId) || 0 : 0,
    }));

    res.json({
      success: true,
      data: {
        statusCounts,
        byStatus: statusCounts,
        todayReceived,
        todayDue,
        activeCasesCount,
        activeCount: activeCasesCount,
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

const SETTINGS_KEYS = ['workOrderHeader', 'stageTemplates', 'whatsappTemplates', 'enabledCustomFields', 'billingPolicy', 'wages', 'doctorPricing', 'notifications', 'guards'];
const VALID_INVOICE_MODES = new Set(['AUTO_ON_RECEIPT', 'AUTO_ON_DELIVERY', 'MANUAL']);

const updateSettings = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();

    // Validate billingPolicy
    if (body.billingPolicy && typeof body.billingPolicy === 'object') {
      if (body.billingPolicy.invoiceMode && !VALID_INVOICE_MODES.has(body.billingPolicy.invoiceMode)) {
        return res.status(400).json({ success: false, error: 'وضع الفوترة المحدد غير صالح (يجب أن يكون AUTO_ON_DELIVERY أو AUTO_ON_RECEIPT أو MANUAL)' });
      }
    }

    // Validate wages
    if (body.wages && typeof body.wages === 'object') {
      if (body.wages.defaultPerStage !== undefined && Number(body.wages.defaultPerStage) < 0) {
        return res.status(400).json({ success: false, error: 'أجر المرحلة الافتراضي لا يمكن أن يكون سالباً' });
      }
    }

    // Validate workOrderHeader lengths
    if (body.workOrderHeader && typeof body.workOrderHeader === 'object') {
      if (body.workOrderHeader.labName && String(body.workOrderHeader.labName).length > 150) {
        body.workOrderHeader.labName = String(body.workOrderHeader.labName).slice(0, 150);
      }
      if (body.workOrderHeader.address && String(body.workOrderHeader.address).length > 250) {
        body.workOrderHeader.address = String(body.workOrderHeader.address).slice(0, 250);
      }
    }

    // Fetch existing settings for this company to enable deep merge
    const existingRows = await prisma.dentalSetting.findMany({
      where: { companyId, key: { in: SETTINGS_KEYS } },
    });
    const existingByKey = new Map();
    for (const r of existingRows) {
      existingByKey.set(r.key, parseSettingValue(r));
    }

    const updated = {};
    for (const key of SETTINGS_KEYS) {
      if (key in body) {
        let value = body[key] === undefined ? null : body[key];
        const existingVal = existingByKey.get(key);
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          existingVal &&
          typeof existingVal === 'object' &&
          !Array.isArray(existingVal)
        ) {
          value = { ...existingVal, ...value };
        }
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
    const { isActive, includeInactive } = req.query;
    const where = { companyId };
    if (isActive !== undefined && isActive !== '') {
      where.isActive = normalizeBool(isActive);
    } else if (includeInactive !== 'true') {
      where.isActive = true;
    }
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

const downloadAllAttachments = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      select: { id: true, caseNumber: true },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    const attachments = await prisma.dentalCaseAttachment.findMany({
      where: { companyId, caseId: id },
      select: { id: true, storedPath: true, fileName: true, kind: true },
    });
    if (attachments.length === 0) return res.status(404).json({ success: false, error: 'لا توجد ملفات' });

    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="case-${dentalCase.caseNumber}-files.zip"`);
    archive.on('error', (err) => {
      console.error('Error zipping dental attachments:', err);
      res.status(500).json({ success: false, error: 'حدث خطأ في ضغط الملفات' });
    });
    archive.pipe(res);
    for (const a of attachments) {
      const filePath = path.join(dentalLabDir, a.storedPath);
      if (fs.existsSync(filePath)) archive.file(filePath, { name: a.fileName || a.storedPath });
    }
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading dental attachments:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحميل الملفات' });
  }
};

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
    if (dentalCase.status === 'DELIVERED' || dentalCase.status === 'CLOSED') {
      return res.status(400).json({ success: false, error: 'لا يمكن إعادة تصنيع حالة مسلمة أو مغلقة بالفعل' });
    }

    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) return res.status(400).json({ success: false, error: 'سبب إعادة التصنيع مطلوب' });

    let stageFrom = body.stageFrom ? String(body.stageFrom).toUpperCase() : (dentalCase.status || 'DESIGN');
    if (!CASE_STATUSES.has(stageFrom)) {
      return res.status(400).json({ success: false, error: 'المرحلة غير صحيحة' });
    }
    if (stageFrom === 'DELIVERED' || stageFrom === 'CLOSED') {
      return res.status(400).json({ success: false, error: 'لا يمكن إعادة تصنيع إلى مرحلة تسليم أو إغلاق' });
    }

    const isBillable = body.isBillable !== undefined ? Boolean(body.isBillable) : Boolean(body.billable);

    const refab = await prisma.$transaction(async (tx) => {
      const created = await tx.dentalRefabrication.create({
        data: {
          companyId,
          caseId: id,
          reason,
          rootCauseCategory: body.rootCauseCategory ? String(body.rootCauseCategory).trim() : 'OTHER',
          isBillable,
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
          data: { status: 'PENDING', startedAt: null, completedAt: null },
        });
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
        include: {
          payments: { orderBy: { createdAt: 'desc' } },
          case: {
            select: {
              id: true,
              caseNumber: true,
              patientName: true,
              patientPhone: true,
              workTypeName: true,
              unitsCount: true,
              teeth: true,
              shade: true,
              status: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              phone: true,
              clinicName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dentalInvoice.aggregate({
        where: invoiceWhere,
        _sum: { total: true, paid: true, remaining: true },
        _count: { _all: true },
      }),
      prisma.dentalCreditNote.aggregate({ where: creditWhere, _sum: { amount: true } }),
    ]);

    const enrichedInvoices = (invoices || []).map((inv) => {
      let unitsCount = inv.case?.unitsCount ?? 1;
      let patientName = inv.case?.patientName || inv.patientName || null;
      let workTypeName = inv.case?.workTypeName || null;
      if (inv.notes && typeof inv.notes === 'string' && inv.notes.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(inv.notes);
          if (parsed && (parsed.isConsolidated || Array.isArray(parsed.items))) {
            const itemsCount = parsed.items ? parsed.items.length : (parsed.summary?.casesCount || 0);
            unitsCount = parsed.totalUnits || parsed.summary?.totalUnits || (parsed.items || []).reduce((sum, it) => sum + (Number(it.unitsCount) || 1), 0);
            if (!patientName || patientName === '—') {
              patientName = `فوترة مجمعة (${itemsCount} حالة)`;
            }
            if (!workTypeName) {
              workTypeName = 'متعدد (فوترة مجمعة)';
            }
          }
        } catch {}
      }
      return {
        ...inv,
        caseNumber: inv.case?.caseNumber || null,
        patientName,
        workTypeName,
        unitsCount,
        doctorName: inv.doctor?.name || inv.doctorName || doctor?.name || null,
        clinicName: inv.doctor?.clinicName || doctor?.clinicName || null,
      };
    });

    if (!doctor && enrichedInvoices.length) {
      doctor = {
        id: enrichedInvoices[0].doctorId || null,
        name: enrichedInvoices[0].doctorName || null,
        clinicName: enrichedInvoices[0].clinicName || null,
      };
    }

    let openingBalance = 0;
    if (doctorId && fromDate && prisma.dentalMonthlySettlement && typeof prisma.dentalMonthlySettlement.findFirst === 'function') {
      try {
        const parts = fromDate.toISOString().split('T')[0].split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const prevKey = getPreviousPeriodKey(y, m);
        const prevSettlement = await prisma.dentalMonthlySettlement.findFirst({
          where: { companyId, doctorId, periodKey: prevKey },
        });
        if (prevSettlement) {
          openingBalance = round2(Number(prevSettlement.closingBalance) || 0);
        }
      } catch (err) {
        console.warn('Could not read opening balance in statement:', err.message);
      }
    }

    const creditTotal = round2((creditAgg && creditAgg._sum && creditAgg._sum.amount) || 0);
    const netRemaining = round2(Math.max(0, ((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.remaining) || 0) - creditTotal));
    const closingBalance = round2(openingBalance + netRemaining);

    res.json({
      success: true,
      data: {
        doctor,
        cases,
        invoices: enrichedInvoices,
        totals: {
          cases: cases.length,
          invoicesCount: (invoiceAgg && invoiceAgg._count && invoiceAgg._count._all) || 0,
          totalCards: (invoiceAgg && invoiceAgg._count && invoiceAgg._count._all) || 0,
          totalUnits: enrichedInvoices.reduce((sum, inv) => sum + (inv.unitsCount || 1), 0),
          openingBalance,
          invoiced: round2((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.total) || 0),
          paid: round2((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.paid) || 0),
          remaining: netRemaining,
          closingBalance,
          creditTotal,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dental doctor statement:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب كشف الحساب' });
  }
};

const getDoctorStatementPdf = async (req, res) => {
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
        select: { id: true, name: true, phone: true, clinicName: true },
      });
      if (docRow) doctor = { id: docRow.id, name: docRow.name, phone: docRow.phone, clinicName: docRow.clinicName };
    }

    const creditWhere = { companyId };
    if (doctorId) creditWhere.doctorId = doctorId;
    if (fromDate) creditWhere.createdAt = { ...(creditWhere.createdAt || {}), gte: fromDate };
    if (toDate) creditWhere.createdAt = { ...(creditWhere.createdAt || {}), lte: toDate };

    const [cases, invoices, invoiceAgg, creditAgg, settingsRows, company] = await Promise.all([
      prisma.dentalLabCase.findMany({ where: caseWhere, orderBy: { createdAt: 'desc' } }),
      prisma.dentalInvoice.findMany({
        where: invoiceWhere,
        include: {
          payments: { orderBy: { createdAt: 'desc' } },
          case: {
            select: {
              id: true,
              caseNumber: true,
              patientName: true,
              patientPhone: true,
              workTypeName: true,
              unitsCount: true,
              teeth: true,
              shade: true,
              status: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              phone: true,
              clinicName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dentalInvoice.aggregate({
        where: invoiceWhere,
        _sum: { total: true, paid: true, remaining: true },
        _count: { _all: true },
      }),
      prisma.dentalCreditNote.aggregate({ where: creditWhere, _sum: { amount: true } }),
      prisma.dentalSetting.findMany({ where: { companyId } }),
      prisma.company.findFirst({ where: { id: companyId } }),
    ]);

    const enrichedInvoices = (invoices || []).map((inv) => {
      let unitsCount = inv.case?.unitsCount ?? 1;
      let patientName = inv.case?.patientName || inv.patientName || null;
      let workTypeName = inv.case?.workTypeName || null;
      if (inv.notes && typeof inv.notes === 'string' && inv.notes.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(inv.notes);
          if (parsed && (parsed.isConsolidated || Array.isArray(parsed.items))) {
            const itemsCount = parsed.items ? parsed.items.length : (parsed.summary?.casesCount || 0);
            unitsCount = parsed.totalUnits || parsed.summary?.totalUnits || (parsed.items || []).reduce((sum, it) => sum + (Number(it.unitsCount) || 1), 0);
            if (!patientName || patientName === '—') {
              patientName = `فوترة مجمعة (${itemsCount} حالة)`;
            }
            if (!workTypeName) {
              workTypeName = 'متعدد (فوترة مجمعة)';
            }
          }
        } catch {}
      }
      return {
        ...inv,
        caseNumber: inv.case?.caseNumber || null,
        patientName,
        workTypeName,
        unitsCount,
        doctorName: inv.doctor?.name || inv.doctorName || doctor?.name || null,
        clinicName: inv.doctor?.clinicName || doctor?.clinicName || null,
      };
    });

    if (!doctor && enrichedInvoices.length) {
      doctor = {
        id: enrichedInvoices[0].doctorId || null,
        name: enrichedInvoices[0].doctorName || null,
        phone: null,
        clinicName: enrichedInvoices[0].clinicName || null,
      };
    }

    let openingBalance = 0;
    if (doctorId && fromDate && prisma.dentalMonthlySettlement && typeof prisma.dentalMonthlySettlement.findFirst === 'function') {
      try {
        const parts = fromDate.toISOString().split('T')[0].split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const prevKey = getPreviousPeriodKey(y, m);
        const prevSettlement = await prisma.dentalMonthlySettlement.findFirst({
          where: { companyId, doctorId, periodKey: prevKey },
        });
        if (prevSettlement) {
          openingBalance = round2(Number(prevSettlement.closingBalance) || 0);
        }
      } catch (err) {
        console.warn('Could not read opening balance in statement PDF:', err.message);
      }
    }

    const creditTotal = round2((creditAgg && creditAgg._sum && creditAgg._sum.amount) || 0);
    const netRemaining = round2(Math.max(0, ((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.remaining) || 0) - creditTotal));
    const closingBalance = round2(openingBalance + netRemaining);

    const statement = {
      doctor,
      cases,
      invoices: enrichedInvoices,
      totals: {
        cases: cases.length,
        invoicesCount: (invoiceAgg && invoiceAgg._count && invoiceAgg._count._all) || 0,
        totalCards: (invoiceAgg && invoiceAgg._count && invoiceAgg._count._all) || 0,
        totalUnits: enrichedInvoices.reduce((sum, inv) => sum + (inv.unitsCount || 1), 0),
        openingBalance,
        invoiced: round2((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.total) || 0),
        paid: round2((invoiceAgg && invoiceAgg._sum && invoiceAgg._sum.paid) || 0),
        remaining: netRemaining,
        closingBalance,
        creditTotal,
      },
    };

    const settings = mergeSettings(settingsRows);
    const { generateDoctorStatementPdf } = require('../services/dentalWorkOrderService');
    const { buffer } = await generateDoctorStatementPdf({
      company,
      doctor: doctor || { name: 'طبيب الأسنان' },
      statement,
      workOrderHeader: settings.workOrderHeader || {},
      from,
      to,
    });

    const asciiFilename = `statement-${doctorId || 'doctor'}.pdf`;
    const encodedFilename = encodeURIComponent(`statement-${doctor?.name || 'doctor'}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating dental doctor statement PDF:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء كشف حساب PDF' });
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

    const [technicians, assignmentRows, doneStages, wageSetting, remakes] = await Promise.all([
      prisma.dentalTechnician.findMany({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, phone: true, role: true, wagePerStage: true, isActive: true },
      }),
      prisma.dentalCaseAssignment.groupBy({
        by: ['technicianId'],
        where: assignmentWhere,
        _count: { _all: true },
      }),
      prisma.dentalCaseStage.findMany({
        where: stageWhere,
        select: {
          id: true,
          assigneeId: true,
          startedAt: true,
          completedAt: true,
          name: true,
          case: {
            select: { id: true, unitsCount: true, teeth: true, workTypeName: true },
          },
        },
      }),
      Promise.resolve().then(async () => {
        try {
          if (typeof prisma.dentalSetting?.findFirst === 'function') {
            const res = await prisma.dentalSetting.findFirst({ where: { companyId, key: 'wageDefaults' } });
            if (res) return res;
          }
          if (typeof prisma.dentalSetting?.findMany === 'function') {
            const list = await prisma.dentalSetting.findMany({ where: { companyId, key: 'wageDefaults' }, take: 1 });
            return Array.isArray(list) ? list[0] : null;
          }
          return null;
        } catch {
          return null;
        }
      }),
      Promise.resolve(
        typeof prisma.dentalRefabrication?.findMany === 'function'
          ? prisma.dentalRefabrication.findMany({
              where: { companyId },
              select: {
                id: true,
                caseId: true,
                case: {
                  select: {
                    stages: { select: { assigneeId: true } },
                  },
                },
              },
            })
          : []
      ).then((r) => (Array.isArray(r) ? r : [])).catch(() => []),
    ]);

    const defaultWagePerStage = (wageSetting && wageSetting.value && Number(wageSetting.value.defaultPerStage)) || 0;

    const assignmentCounts = {};
    for (const row of assignmentRows || []) {
      assignmentCounts[row.technicianId] = (row._count && row._count._all) || 0;
    }

    const stageCounts = {};
    const unitCounts = {};
    const durationSumHours = {};
    const durationCount = {};
    for (const stage of doneStages || []) {
      const techId = stage.assigneeId;
      if (!techId) continue;
      stageCounts[techId] = (stageCounts[techId] || 0) + 1;

      const units = (stage.case && stage.case.unitsCount) || (stage.case && stage.case.teeth ? stage.case.teeth.split(',').length : 1);
      unitCounts[techId] = (unitCounts[techId] || 0) + Math.max(1, units);

      if (stage.startedAt && stage.completedAt) {
        const hours = Math.max(0.1, (new Date(stage.completedAt) - new Date(stage.startedAt)) / 3600000);
        durationSumHours[techId] = (durationSumHours[techId] || 0) + hours;
        durationCount[techId] = (durationCount[techId] || 0) + 1;
      }
    }

    // Attribute remakes to technicians
    const remakesMap = {};
    for (const r of remakes || []) {
      const stageAssignees = (r.case && r.case.stages) ? r.case.stages.map((s) => s.assigneeId).filter(Boolean) : [];
      for (const tId of new Set(stageAssignees)) {
        remakesMap[tId] = (remakesMap[tId] || 0) + 1;
      }
    }

    const data = (technicians || []).map((tech) => {
      const completedStages = stageCounts[tech.id] || 0;
      const completedUnits = unitCounts[tech.id] || 0;
      const count = durationCount[tech.id] || 0;
      const avgHoursPerStage = count ? round2(durationSumHours[tech.id] / count) : 0;
      const avgDaysPerStage = count ? round2((durationSumHours[tech.id] / 24) / count) : 0;
      const wageRate = tech.wagePerStage != null ? Number(tech.wagePerStage) : defaultWagePerStage;
      const earnedWages = round2(completedStages * wageRate);
      const techRemakes = remakesMap[tech.id] || 0;

      return {
        technicianId: tech.id,
        name: tech.name,
        phone: tech.phone || null,
        role: tech.role,
        isActive: tech.isActive,
        assignedCases: assignmentCounts[tech.id] || 0,
        completedStages,
        completedUnits,
        avgHoursPerStage,
        avgDaysPerStage,
        wagePerStage: wageRate,
        earnedWages,
        remakesCount: techRemakes,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dental technician productivity:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب إنتاجية وتحليلات فريق العمل' });
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
        isDeleted: false,
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

const serializeTechCase = (c, technicianId = null) => {
  if (!c) return c;
  const stages = c.stages || [];
  const isAssignedToMe = (s) => {
    if (!technicianId) return true;
    if (s.assigneeId === technicianId) return true;
    if (Array.isArray(s.assignees) && s.assignees.some((a) => a.technicianId === technicianId)) return true;
    return false;
  };

  const activeStage =
    stages.find((s) => s.status === 'IN_PROGRESS' && isAssignedToMe(s)) ||
    stages.find((s) => s.status === 'PENDING' && isAssignedToMe(s)) ||
    stages.find((s) => s.status === 'IN_PROGRESS') ||
    stages.find((s) => s.status === 'PENDING');

  return {
    id: c.id,
    caseNumber: c.caseNumber,
    patientName: c.patientName,
    patientPhone: c.patientPhone,
    doctorName: c.doctor?.name || c.doctorName || null,
    workTypeName: c.workTypeName,
    teeth: c.teeth,
    shade: c.shade,
    material: c.material,
    status: c.status,
    priority: c.priority,
    dueDate: c.dueDate,
    notes: c.notes,
    createdAt: c.createdAt,
    hasScan: Boolean(c.hasScan || (c.attachments && c.attachments.some((a) => (a.fileName || '').toLowerCase().endsWith('.stl') || (a.fileName || '').toLowerCase().endsWith('.ply') || (a.fileName || '').toLowerCase().endsWith('.obj')))),
    attachments: (c.attachments || []).map((a) => ({
      id: a.id,
      fileName: a.fileName,
      storedPath: a.storedPath,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      kind: a.kind,
    })),
    myStage: activeStage
      ? {
          id: activeStage.id,
          name: activeStage.name,
          status: activeStage.status,
          assigneeName: activeStage.assigneeName,
          startedAt: activeStage.startedAt,
          assignees: activeStage.assignees || [],
        }
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

    let cases = [];
    try {
      cases = await prisma.dentalLabCase.findMany({
        where: {
          companyId,
          status: { notIn: ['DELIVERED', 'CLOSED'] },
          stages: {
            some: {
              status: { in: ['IN_PROGRESS', 'PENDING'] },
              OR: [
                { assigneeId: technician.id },
                { assignees: { some: { technicianId: technician.id } } },
              ],
            },
          },
        },
        include: {
          doctor: { select: { id: true, name: true } },
          attachments: true,
          stages: {
            orderBy: { sortOrder: 'asc' },
            include: { assignees: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
    } catch {
      // Fallback if assignees relation or table is not present in mock/db
      cases = await prisma.dentalLabCase.findMany({
        where: {
          companyId,
          status: { notIn: ['DELIVERED', 'CLOSED'] },
          stages: { some: { assigneeId: technician.id, status: { in: ['IN_PROGRESS', 'PENDING'] } } },
        },
        include: {
          doctor: { select: { id: true, name: true } },
          attachments: true,
          stages: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
    }

    res.json({
      success: true,
      data: {
        items: cases.map((c) => serializeTechCase(c, technician.id)),
        total: cases.length,
        technician: { id: technician.id, name: technician.name },
      },
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
    const { computeTechnicianEarnings, getTechnicianWageDefaults } = require('../services/dentalPricing');
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

    let totalPaid = 0;
    let totalAdvances = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;
    let detailedPayouts = [];
    if (prisma.dentalTechnicianPayout && typeof prisma.dentalTechnicianPayout.findMany === 'function') {
      try {
        detailedPayouts = (await prisma.dentalTechnicianPayout.findMany({
          where: { companyId, technicianId: technician.id },
          orderBy: { paidAt: 'desc' },
          take: 100,
        })) || [];
        for (const p of detailedPayouts) {
          const amt = Number(p.amount) || 0;
          if (p.type === 'PAYOUT') totalPaid += amt;
          else if (p.type === 'ADVANCE') totalAdvances += amt;
          else if (p.type === 'BONUS') totalBonuses += amt;
          else if (p.type === 'DEDUCTION') totalDeductions += amt;
        }
      } catch (err) {
        console.warn('Could not load technician payouts in getMyWage:', err.message);
      }
    }
    const allPaid = round2(totalPaid + totalAdvances);
    const balanceDue = round2(((total.wage || 0) + totalBonuses) - (allPaid + totalDeductions));

    // Load recent completed stages for itemized ledger breakdown
    let recentStages = [];
    try {
      const stages = await prisma.dentalCaseStage.findMany({
        where: {
          status: 'DONE',
          case: { companyId },
          OR: [
            { assigneeId: technician.id },
            { assignees: { some: { technicianId: technician.id } } },
          ],
        },
        include: {
          case: { select: { id: true, caseNumber: true, patientName: true, workTypeName: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 50,
      });
      recentStages = (stages || []).map((s) => ({
        id: s.id,
        caseId: s.caseId,
        caseNumber: s.case?.caseNumber || '—',
        patientName: s.case?.patientName || '—',
        workTypeName: s.case?.workTypeName || '—',
        stageName: s.name,
        completedAt: s.completedAt,
        wage: Number(s.wage ?? rate),
      }));
    } catch (_) {
      try {
        const stages = await prisma.dentalCaseStage.findMany({
          where: {
            status: 'DONE',
            assigneeId: technician.id,
            case: { companyId },
          },
          include: {
            case: { select: { id: true, caseNumber: true, patientName: true, workTypeName: true } },
          },
          orderBy: { completedAt: 'desc' },
          take: 50,
        });
        recentStages = (stages || []).map((s) => ({
          id: s.id,
          caseId: s.caseId,
          caseNumber: s.case?.caseNumber || '—',
          patientName: s.case?.patientName || '—',
          workTypeName: s.case?.workTypeName || '—',
          stageName: s.name,
          completedAt: s.completedAt,
          wage: Number(s.wage ?? rate),
        }));
      } catch (_) {}
    }

    const todayStart = getStartOfDayInTimezone(new Date());
    const todayCompleted = recentStages.filter(s => s.completedAt && new Date(s.completedAt) >= todayStart);
    const todayStages = todayCompleted.length;
    const todayWage = round2(todayCompleted.reduce((sum, s) => sum + (s.wage || rate), 0));

    res.json({
      success: true,
      data: {
        technician: { id: technician.id, name: technician.name, role: technician.role },
        rate,
        completedStages: total.completedStages || 0,
        totalWage: total.wage || 0,
        thisMonthStages: month.completedStages || 0,
        thisMonthWage: month.wage || 0,
        todayStages,
        todayWage,
        totalPaid: allPaid,
        totalAdvances: round2(totalAdvances),
        totalBonuses: round2(totalBonuses),
        totalDeductions: round2(totalDeductions),
        balanceDue,
        payouts: detailedPayouts,
        recentStages,
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
          select: {
            id: true,
            caseNumber: true,
            patientName: true,
            workTypeName: true,
            unitsCount: true,
            unitPrice: true,
            teeth: true,
            shade: true,
            total: true,
          },
        })
      : null;

    let items = [];
    if (invoice.notes && typeof invoice.notes === 'string' && invoice.notes.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(invoice.notes);
        if (Array.isArray(parsed.items)) {
          items = parsed.items;
        }
      } catch {}
    }

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
      items,
      workOrderHeader: settings.workOrderHeader || {},
    });
    const safeInvNum = String(invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const encodedInvNum = encodeURIComponent(`invoice-${invoiceNumber || 'invoice'}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${safeInvNum}.pdf"; filename*=UTF-8''${encodedInvNum}`);
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
    const doctorId = req.params.id || req.params.doctorId;
    if (!doctorId) return res.status(400).json({ success: false, error: 'معرف الطبيب مطلوب' });
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
    const doctorId = req.params.id || req.params.doctorId;
    if (!doctorId) return res.status(400).json({ success: false, error: 'معرف الطبيب مطلوب' });
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
        checkoutUrl: null,
      },
    });
  } catch (error) {
    console.error('Error fetching invoice payment link:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب رابط الدفع' });
  }
};

const getPanLabelPdf = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: {
        doctor: { select: { id: true, name: true } },
        workType: { select: { id: true, name: true } },
      },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const [settingsRows, company] = await Promise.all([
      prisma.dentalSetting.findMany({ where: { companyId } }),
      prisma.company.findFirst({ where: { id: companyId } }),
    ]);
    const settings = mergeSettings(settingsRows);
    const workOrderHeader = settings.workOrderHeader || {};

    const { generatePanLabelPdf } = require('../services/dentalWorkOrderService');
    const { buffer, caseNumber } = await generatePanLabelPdf({ company, caseRow: dentalCase, workOrderHeader });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="pan-label-${caseNumber}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating dental pan label PDF:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء ملصق العلبة' });
  }
};

const recordDoctorBulkPayment = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id: doctorId } = req.params;
    const body = req.body || {};
    const amountResult = toPositiveNumber(body.amount);
    if (!amountResult.valid) return res.status(400).json({ success: false, error: 'مبلغ الدفعة غير صحيح' });
    let method = body.method ? String(body.method).toUpperCase() : 'OTHER';
    if (!PAYMENT_METHODS.has(method)) method = 'OTHER';

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.dentalLabDoctor.findFirst({ where: { id: doctorId, companyId } });
    if (!doctor) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const openInvoices = await prisma.dentalInvoice.findMany({
      where: { companyId, doctorId, status: { in: ['OPEN', 'PARTIAL'] } },
      orderBy: { createdAt: 'asc' },
      include: { payments: true },
    });

    if (openInvoices.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد فواتير مفتوحة لهذا الطبيب' });
    }

    const totalRemaining = round2(openInvoices.reduce((s, inv) => s + (Number(inv.remaining) || 0), 0));
    if (amountResult.value > totalRemaining) {
      return res.status(400).json({
        success: false,
        error: `مبلغ الدفعة (${amountResult.value}) أكبر من إجمالي المتبقي على فواتير الطبيب (${totalRemaining})`,
      });
    }

    let remainingToDistribute = amountResult.value;
    const paymentAllocations = [];
    const affectedCaseIds = new Set();

    await prisma.$transaction(async (tx) => {
      for (const inv of openInvoices) {
        if (remainingToDistribute <= 0) break;
        const invRemaining = round2(Number(inv.remaining) || 0);
        if (invRemaining <= 0) continue;

        const allocatedAmount = round2(Math.min(remainingToDistribute, invRemaining));
        remainingToDistribute = round2(remainingToDistribute - allocatedAmount);

        await tx.dentalPayment.create({
          data: {
            companyId,
            invoiceId: inv.id,
            amount: allocatedAmount,
            method,
            note: body.note ? `${String(body.note).trim()} (دفعة مجمعة)` : 'دفعة مجمعة على حساب الطبيب',
            paidBy: req.user?.id || req.user?.email || null,
          },
        });

        const newPaid = round2((Number(inv.paid) || 0) + allocatedAmount);
        const newRemaining = round2(Math.max(0, (Number(inv.total) || 0) - newPaid));
        const newStatus = deriveInvoiceStatus(Number(inv.total) || 0, newPaid);

        await tx.dentalInvoice.update({
          where: { id: inv.id },
          data: { paid: newPaid, remaining: newRemaining, status: newStatus },
        });

        paymentAllocations.push({ invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, amount: allocatedAmount });
        if (inv.caseId) affectedCaseIds.add(inv.caseId);
      }
    });

    for (const caseId of affectedCaseIds) {
      await syncCasePayments(prisma, companyId, caseId, {
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
        reason: 'تسوية دفعة مجمعة على حساب الطبيب',
      });
    }

    res.json({
      success: true,
      data: {
        doctorId,
        totalPaid: amountResult.value,
        allocations: paymentAllocations,
      },
    });
  } catch (error) {
    console.error('Error recording doctor bulk payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفعة المجمعة' });
  }
};

const getWarrantyCertificatePdf = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const dentalCase = await prisma.dentalLabCase.findFirst({
      where: { id, companyId },
      include: { doctor: true, workType: true },
    });
    if (!dentalCase) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });

    const [settingsRows, company] = await Promise.all([
      prisma.dentalSetting.findMany({ where: { companyId } }),
      prisma.company.findFirst({ where: { id: companyId } }),
    ]);
    const settings = mergeSettings(settingsRows);
    const workOrderHeader = settings.workOrderHeader || {};

    const { generateWarrantyCertificatePdf } = require('../services/dentalWorkOrderService');
    const { buffer, caseNumber } = await generateWarrantyCertificatePdf({ company, caseRow: dentalCase, workOrderHeader });

    const safeCaseNumber = String(caseNumber || 'case').replace(/[^\w.-]/g, '_');
    const asciiFilename = `warranty-${safeCaseNumber}.pdf`;
    const encodedFilename = encodeURIComponent(`warranty-${caseNumber || 'case'}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error generating warranty certificate:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في توليد شهادة الضمان' });
  }
};

const sendCaseToTryIn = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const { tryInStage, note } = req.body || {};
    const prisma = getSharedPrismaClient();

    const existing = await prisma.dentalLabCase.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    if (existing.status === 'DELIVERED' || existing.status === 'CLOSED') {
      return res.status(400).json({ success: false, error: 'لا يمكن إرسال حالة مغلقة أو مسلمة نهائياً لبروفة' });
    }

    const stageKind = (tryInStage && String(tryInStage).trim()) || 'TRY_IN';
    const tryInCount = (Number(existing.tryInCount) || 0) + 1;

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.dentalLabCase.update({
        where: { id },
        data: {
          isTryIn: true,
          tryInStage: stageKind,
          tryInCount,
          orderStatus: 'IN_PROGRESS',
        },
        include: CASE_LIST_INCLUDE,
      });

      await recordDentalLabStatusHistory(tx, {
        companyId,
        caseId: id,
        dimension: 'STAGE',
        status: 'OUT_FOR_TRYIN',
        oldStatus: existing.status,
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
        reason: note ? `خروج بروفة (${stageKind}): ${note}` : `خروج بروفة (${stageKind}) رقم ${tryInCount}`,
      });

      return c;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error sending case to try-in:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إرسال الحالة للبروفة' });
  }
};

const returnCaseFromTryIn = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { id } = req.params;
    const { feedbackNotes, targetStage } = req.body || {};
    const prisma = getSharedPrismaClient();

    const existing = await prisma.dentalLabCase.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    if (!existing.isTryIn) {
      return res.status(400).json({ success: false, error: 'الحالة ليست مسجلة كبروفة حالياً' });
    }

    const nextStatus = (targetStage && CASE_STATUSES.has(targetStage)) ? targetStage : 'MANUFACTURING';

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.dentalLabCase.update({
        where: { id },
        data: {
          isTryIn: false,
          status: nextStatus,
          orderStatus: 'IN_PROGRESS',
        },
        include: CASE_LIST_INCLUDE,
      });

      await recordDentalLabStatusHistory(tx, {
        companyId,
        caseId: id,
        dimension: 'STAGE',
        status: nextStatus,
        oldStatus: `TRYIN_${existing.tryInStage || 'RETURN'}`,
        changedBy: req.user?.id || req.user?.email || null,
        userName: adminDisplayName(req),
        reason: feedbackNotes ? `استلام من البروفة: ${feedbackNotes}` : 'استلام من البروفة واستئناف العمل',
      });

      return c;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error returning case from try-in:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في استلام الحالة من البروفة' });
  }
};

const kioskScanCase = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const { barcode, technicianId } = req.body || {};
    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ success: false, error: 'رمز الباركود أو رقم الحالة مطلوب' });
    }

    const code = barcode.trim();
    const prisma = getSharedPrismaClient();

    let dentalCase = await prisma.dentalLabCase.findFirst({
      where: {
        companyId,
        isDeleted: false,
        OR: [{ caseNumber: code }, { id: code }],
      },
      include: {
        doctor: { select: { id: true, name: true, phone: true } },
        workType: { select: { id: true, name: true, category: true } },
        stages: { orderBy: { sortOrder: 'asc' } },
        assignments: { include: { technician: true } },
      },
    });

    if (!dentalCase) {
      const partialMatches = (await prisma.dentalLabCase.findMany({
        where: {
          companyId,
          isDeleted: false,
          caseNumber: { endsWith: code },
        },
        select: {
          id: true,
          caseNumber: true,
          patientName: true,
          doctorName: true,
          status: true,
        },
        take: 10,
      })) || [];

      if (partialMatches.length > 1) {
        return res.status(409).json({
          success: false,
          error: `الكود الجزئي (${code}) يطابق ${partialMatches.length} حالات. يرجى مسح الباركود الكامل أو إدخال رقم الحالة كاملاً منعاً للالتباس.`,
          matches: partialMatches,
        });
      }

      if (partialMatches.length === 1) {
        dentalCase = await prisma.dentalLabCase.findUnique({
          where: { id: partialMatches[0].id },
          include: {
            doctor: { select: { id: true, name: true, phone: true } },
            workType: { select: { id: true, name: true, category: true } },
            stages: { orderBy: { sortOrder: 'asc' } },
            assignments: { include: { technician: true } },
          },
        });
      }
    }

    if (!dentalCase) {
      return res.status(404).json({ success: false, error: `لم يتم العثور على أي حالة مطابقة للباركود (${code})` });
    }

    const activeStage = dentalCase.stages.find((s) => s.status === 'PENDING' || s.status === 'IN_PROGRESS')
      || dentalCase.stages[dentalCase.stages.length - 1];

    let techName = null;
    let effectiveTechId = technicianId || activeStage?.assigneeId || null;
    if (effectiveTechId) {
      const tech = await prisma.dentalTechnician.findFirst({ where: { id: effectiveTechId, companyId } });
      if (tech) techName = tech.name;
    }

    const currentIndex = CASE_STATUS_CHAIN.indexOf(dentalCase.status);
    const nextStatus = currentIndex >= 0 && currentIndex < CASE_STATUS_CHAIN.length - 1 ? CASE_STATUS_CHAIN[currentIndex + 1] : null;

    const updated = await prisma.$transaction(async (tx) => {
      if (activeStage && activeStage.status !== 'DONE') {
        await tx.dentalCaseStage.update({
          where: { id: activeStage.id },
          data: {
            status: 'DONE',
            completedAt: new Date(),
            assigneeId: effectiveTechId || activeStage.assigneeId,
            assigneeName: techName || activeStage.assigneeName,
          },
        });
      }

      const updateData = {};
      if (nextStatus) {
        updateData.status = nextStatus;
        if (nextStatus === 'DELIVERED') {
          updateData.deliveredAt = new Date();
          updateData.orderStatus = 'COMPLETED';
        } else {
          updateData.orderStatus = 'IN_PROGRESS';
        }
      }

      const c = await tx.dentalLabCase.update({
        where: { id: dentalCase.id },
        data: updateData,
        include: CASE_LIST_INCLUDE,
      });

      await recordDentalLabStatusHistory(tx, {
        companyId,
        caseId: dentalCase.id,
        dimension: 'STAGE',
        status: nextStatus || dentalCase.status,
        oldStatus: dentalCase.status,
        changedBy: req.user?.id || req.user?.email || null,
        userName: techName ? `مسح سريع (Kiosk) - الفني: ${techName}` : 'مسح سريع (Kiosk)',
        reason: `ترقية سريعة للمرحلة عبر محطة الباركود (${activeStage ? activeStage.name : 'مسح'})`,
      });

      if (effectiveTechId) {
        const existingAssignment = await tx.dentalCaseAssignment.findFirst({
          where: { caseId: dentalCase.id, technicianId: effectiveTechId },
        });
        if (!existingAssignment) {
          await tx.dentalCaseAssignment.create({
            data: {
              companyId,
              caseId: dentalCase.id,
              technicianId: effectiveTechId,
              role: 'PRIMARY',
            },
          });
        }
      }

      return c;
    });

    return res.json({
      success: true,
      message: `تم مسح الحالة بنجاح ونقلها إلى ${nextStatus || updated.status}`,
      data: {
        case: updated,
        scannedCode: code,
        completedStage: activeStage?.name || null,
        newStatus: nextStatus || updated.status,
        technicianName: techName,
      },
    });
  } catch (error) {
    console.error('Error processing kiosk scan:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في معالجة المسح السريع' });
  }
};

const getRemakesAnalysisReport = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();

    const fromDate = parseDate(req.query.from);
    const toDate = parseDate(req.query.to);
    const where = { companyId };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) {
        const { getEndOfDayInTimezone } = require('../utils/dateUtils');
        where.createdAt.lte = getEndOfDayInTimezone(toDate);
      }
    }

    const refabs = await prisma.dentalRefabrication.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            doctorId: true,
            doctorName: true,
            workTypeId: true,
            workTypeName: true,
            material: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = refabs.length;
    const byCategory = {};
    const byDoctor = {};
    const byWorkType = {};
    let billableCount = 0;
    let freeCount = 0;

    for (const r of refabs) {
      const cat = r.rootCauseCategory || 'OTHER';
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      if (r.isBillable) billableCount++;
      else freeCount++;

      const docName = r.case?.doctorName || 'طبيب غير محدد';
      byDoctor[docName] = (byDoctor[docName] || 0) + 1;

      const wtName = r.case?.workTypeName || 'نوع غير محدد';
      byWorkType[wtName] = (byWorkType[wtName] || 0) + 1;
    }

    const topDoctors = Object.entries(byDoctor)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topWorkTypes = Object.entries(byWorkType)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.json({
      success: true,
      data: {
        totalCount,
        billableCount,
        freeCount,
        byCategory,
        topDoctors,
        topWorkTypes,
        recentRefabrications: refabs.slice(0, 30),
      },
    });
  } catch (error) {
    console.error('Error generating remakes analysis report:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في استخراج تقرير الإعادات' });
  }
};

// ==================== Dental Materials & Inventory Harmonization ====================

const listMaterials = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const includeInactive = req.query.includeInactive === 'true';
    const category = req.query.category;

    const where = { companyId };
    if (!includeInactive) where.isActive = true;
    if (category) where.category = category;

    const materials = await prisma.dentalMaterial.findMany({
      where,
      include: {
        stocks: {
          where: { isDepleted: false },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const enriched = materials.map((m) => {
      const activeStocks = m.stocks || [];
      const totalAvailableUnits = activeStocks.reduce((sum, s) => sum + (s.remainingUnits || 0), 0);
      const activeLotsCount = activeStocks.length;
      const isLowStock = totalAvailableUnits <= (m.minStockAlert || 2);
      return {
        ...m,
        totalAvailableUnits,
        activeLotsCount,
        isLowStock,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error listing dental materials:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في جلب قائمة الخامات' });
  }
};

const createMaterial = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const {
      name,
      category = 'MILLING_DISC',
      brand,
      supplierId,
      supplierName,
      defaultShade,
      unitName = 'قرص',
      standardCapacity = 20,
      costPerItem = 0,
      costPerUnit = 0,
      minStockAlert = 2,
      notes,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'اسم الخامة مطلوب' });
    }

    const calcCostPerUnit = Number(costPerUnit) > 0
      ? Number(costPerUnit)
      : (Number(standardCapacity) > 0 ? round2(Number(costPerItem) / Number(standardCapacity)) : 0);

    const material = await prisma.dentalMaterial.create({
      data: {
        companyId,
        name: String(name).trim(),
        category,
        brand: brand ? String(brand).trim() : null,
        supplierId: supplierId || null,
        supplierName: supplierName ? String(supplierName).trim() : null,
        defaultShade: defaultShade ? String(defaultShade).trim() : null,
        unitName: unitName ? String(unitName).trim() : 'قرص',
        standardCapacity: Number(standardCapacity) || 20,
        costPerItem: round2(Number(costPerItem) || 0),
        costPerUnit: calcCostPerUnit,
        minStockAlert: Number(minStockAlert) || 2,
        notes: notes ? String(notes).trim() : null,
      },
    });

    return res.status(201).json({ success: true, data: material });
  } catch (error) {
    console.error('Error creating dental material:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الخامة' });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const existing = await prisma.dentalMaterial.findFirst({ where: { id, companyId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'الخامة غير موجودة' });
    }

    const body = req.body || {};
    const data = {};
    if ('name' in body) data.name = String(body.name).trim();
    if ('category' in body) data.category = body.category;
    if ('brand' in body) data.brand = body.brand ? String(body.brand).trim() : null;
    if ('supplierId' in body) data.supplierId = body.supplierId || null;
    if ('supplierName' in body) data.supplierName = body.supplierName ? String(body.supplierName).trim() : null;
    if ('defaultShade' in body) data.defaultShade = body.defaultShade ? String(body.defaultShade).trim() : null;
    if ('unitName' in body) data.unitName = String(body.unitName).trim();
    if ('standardCapacity' in body) data.standardCapacity = Number(body.standardCapacity) || 1;
    if ('costPerItem' in body) data.costPerItem = round2(Number(body.costPerItem) || 0);
    if ('costPerUnit' in body) data.costPerUnit = round2(Number(body.costPerUnit) || 0);
    if ('minStockAlert' in body) data.minStockAlert = Number(body.minStockAlert) || 0;
    if ('isActive' in body) data.isActive = Boolean(body.isActive);
    if ('notes' in body) data.notes = body.notes ? String(body.notes).trim() : null;

    const updated = await prisma.dentalMaterial.update({
      where: { id },
      data,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating dental material:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في تحديث بيانات الخامة' });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const existing = await prisma.dentalMaterial.findFirst({ where: { id, companyId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'الخامة غير موجودة' });
    }

    await prisma.dentalMaterial.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: 'تم إيقاف تفعيل الخامة بنجاح' });
  } catch (error) {
    console.error('Error deleting dental material:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في إيقاف الخامة' });
  }
};

const recordMaterialStockIn = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const {
      materialId,
      lotNumber,
      shade,
      thicknessMm,
      diameterMm = 98,
      initialUnits,
      unitCost,
      totalCost,
      supplierId,
      supplierName,
      purchaseDate,
      expiryDate,
      notes,
    } = req.body || {};

    if (!materialId) {
      return res.status(400).json({ success: false, error: 'معرف الخامة مطلوب' });
    }
    if (!lotNumber || !String(lotNumber).trim()) {
      return res.status(400).json({ success: false, error: 'رقم التشغيلة (Lot Number) مطلوب لضمان الجودة والتتبع الطبي' });
    }

    const material = await prisma.dentalMaterial.findFirst({ where: { id: materialId, companyId } });
    if (!material) {
      return res.status(404).json({ success: false, error: 'الخامة غير موجودة' });
    }

    const unitsCount = Number(initialUnits) > 0 ? Number(initialUnits) : (material.standardCapacity || 20);
    const calculatedTotal = Number(totalCost) > 0 ? Number(totalCost) : material.costPerItem;
    const calculatedUnitCost = Number(unitCost) > 0 ? Number(unitCost) : (unitsCount > 0 ? round2(calculatedTotal / unitsCount) : 0);

    const stock = await prisma.dentalMaterialStock.create({
      data: {
        companyId,
        materialId,
        lotNumber: String(lotNumber).trim(),
        shade: shade ? String(shade).trim() : material.defaultShade,
        thicknessMm: thicknessMm ? Number(thicknessMm) : null,
        diameterMm: diameterMm ? Number(diameterMm) : 98,
        initialUnits: unitsCount,
        remainingUnits: unitsCount,
        unitCost: round2(calculatedUnitCost),
        totalCost: round2(calculatedTotal),
        supplierId: supplierId || material.supplierId || null,
        supplierName: supplierName ? String(supplierName).trim() : material.supplierName || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    return res.status(201).json({ success: true, data: stock });
  } catch (error) {
    console.error('Error recording dental material stock in:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في توريد رصيد الخامة' });
  }
};

const recordCaseMaterialConsumption = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const { caseId } = req.params;
    const {
      materialId,
      stockId,
      lotNumber,
      unitsUsed = 1,
      notes,
    } = req.body || {};

    if (!materialId) {
      return res.status(400).json({ success: false, error: 'الخامة مطلوبة' });
    }

    const dentalCase = await prisma.dentalLabCase.findFirst({ where: { id: caseId, companyId } });
    if (!dentalCase) {
      return res.status(404).json({ success: false, error: 'حالة المعمل غير موجودة' });
    }

    const material = await prisma.dentalMaterial.findFirst({ where: { id: materialId, companyId } });
    if (!material) {
      return res.status(404).json({ success: false, error: 'الخامة غير موجودة' });
    }

    const rawUnits = req.body?.unitsUsed ?? req.body?.units ?? 1;
    const usedUnitsCount = Math.max(1, Number(rawUnits) || 1);

    let resolvedStock = null;
    if (stockId) {
      resolvedStock = await prisma.dentalMaterialStock.findFirst({
        where: { id: stockId, materialId, companyId },
      });
      if (!resolvedStock) {
        return res.status(400).json({ success: false, error: 'المخزون المحدد غير موجود لهذه الخامة' });
      }
    } else if (lotNumber) {
      resolvedStock = await prisma.dentalMaterialStock.findFirst({
        where: { lotNumber: String(lotNumber).trim(), materialId, companyId, isDepleted: false },
        orderBy: { purchaseDate: 'asc' },
      });
      if (!resolvedStock) {
        return res.status(400).json({
          success: false,
          error: `لم يتم العثور على تشغيلة نشطة برقم (${lotNumber}) لهذه الخامة لتسجيل الاستهلاك وخصم المخزون.`,
        });
      }
    }

    if (resolvedStock && resolvedStock.remainingUnits < usedUnitsCount) {
      return res.status(400).json({
        success: false,
        error: `الرصيد المتبقي في هذه التشغيلة (${resolvedStock.remainingUnits}) أقل من الكمية المطلوبة (${usedUnitsCount}).`,
      });
    }

    const finalLot = resolvedStock ? resolvedStock.lotNumber : (lotNumber ? String(lotNumber).trim() : null);
    const unitPriceRecorded = resolvedStock ? resolvedStock.unitCost : material.costPerUnit;
    const totalCostRecorded = round2(unitPriceRecorded * usedUnitsCount);

    const userName = req.user?.name || req.user?.email || 'فني المعمل';
    const userId = req.user?.id || null;

    const usage = await prisma.$transaction(async (tx) => {
      const createdUsage = await tx.dentalCaseMaterialUsage.create({
        data: {
          companyId,
          caseId,
          materialId,
          stockId: resolvedStock ? resolvedStock.id : null,
          lotNumber: finalLot,
          materialName: material.name,
          unitsUsed: usedUnitsCount,
          costRecorded: totalCostRecorded,
          notes: notes ? String(notes).trim() : null,
          recordedBy: userId,
          recordedByName: userName,
        },
      });

      if (resolvedStock) {
        const remaining = Math.max(0, resolvedStock.remainingUnits - usedUnitsCount);
        await tx.dentalMaterialStock.update({
          where: { id: resolvedStock.id },
          data: {
            remainingUnits: remaining,
            isDepleted: remaining <= 0,
            depletedAt: remaining <= 0 ? new Date() : null,
          },
        });
      }

      await tx.dentalLabCase.update({
        where: { id: caseId },
        data: {
          material: material.name,
          materialBrand: material.brand || undefined,
          lotNumber: finalLot || undefined,
        },
      });

      return createdUsage;
    });

    return res.status(201).json({ success: true, data: usage });
  } catch (error) {
    console.error('Error recording case material consumption:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل استهلاك الخامة على الحالة' });
  }
};

const deleteCaseMaterialUsage = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();
    const { caseId, usageId } = req.params;

    const usage = await prisma.dentalCaseMaterialUsage.findFirst({
      where: { id: usageId, caseId, companyId },
    });
    if (!usage) {
      return res.status(404).json({ success: false, error: 'سجل استهلاك الخامة غير موجود' });
    }

    await prisma.$transaction(async (tx) => {
      if (usage.stockId) {
        const stock = await tx.dentalMaterialStock.findUnique({ where: { id: usage.stockId } });
        if (stock) {
          await tx.dentalMaterialStock.update({
            where: { id: stock.id },
            data: {
              remainingUnits: stock.remainingUnits + (usage.unitsUsed || 1),
              isDepleted: false,
              depletedAt: null,
            },
          });
        }
      }
      await tx.dentalCaseMaterialUsage.delete({ where: { id: usageId } });
    });

    return res.json({ success: true, message: 'تم حذف استهلاك الخامة وإعادة الرصيد للقرص بنجاح' });
  } catch (error) {
    console.error('Error deleting case material usage:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في إلغاء استهلاك الخامة' });
  }
};

const listDentalSuppliers = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();

    const suppliers = await prisma.supplier.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        mobile: true,
        city: true,
        currentBalance: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error listing dental suppliers:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في جلب قائمة الموردين' });
  }
};

const createDentalSupplier = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();

    const {
      name,
      contactPerson,
      phone,
      mobile,
      city,
      address,
      notes,
      taxNumber,
      paymentTerms,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'اسم المورد أو الشركة مطلوب' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyId,
        name: name.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone ? phone.trim() : null,
        mobile: mobile ? mobile.trim() : null,
        city: city ? city.trim() : null,
        address: address ? address.trim() : null,
        notes: notes ? notes.trim() : null,
        taxNumber: taxNumber ? taxNumber.trim() : null,
        paymentTerms: paymentTerms ? paymentTerms.trim() : null,
        currentBalance: 0,
        createdBy: req.user?.id || null,
        isActive: true,
      },
    });

    return res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error('Error creating dental supplier:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في إضافة المورد' });
  }
};

const getMaterialsDashboardSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req, res);
    if (!companyId) return;
    const prisma = getSharedPrismaClient();

    const [materials, totalActiveStocks, recentUsages] = await Promise.all([
      prisma.dentalMaterial.findMany({
        where: { companyId, isActive: true },
        include: {
          stocks: {
            where: { isDepleted: false },
          },
        },
      }),
      prisma.dentalMaterialStock.count({
        where: { companyId, isDepleted: false },
      }),
      prisma.dentalCaseMaterialUsage.findMany({
        where: { companyId },
        take: 10,
        orderBy: { recordedAt: 'desc' },
      }),
    ]);

    let lowStockCount = 0;
    let totalStockUnits = 0;

    materials.forEach((m) => {
      const units = (m.stocks || []).reduce((sum, s) => sum + (s.remainingUnits || 0), 0);
      totalStockUnits += units;
      if (units <= (m.minStockAlert || 2)) {
        lowStockCount++;
      }
    });

    return res.json({
      success: true,
      data: {
        totalMaterials: materials.length,
        totalActiveStocks,
        totalStockUnits,
        lowStockCount,
        recentUsages,
      },
    });
  } catch (error) {
    console.error('Error getting materials dashboard summary:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ في جلب إحصائيات الخامات' });
  }
};

module.exports = {
  CASE_STATUS_CHAIN,
  listDoctors,
  getDoctorDetail,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  restoreDoctor,
  permanentDeleteDoctor,
  listWorkTypes,
  createWorkType,
  updateWorkType,
  deleteWorkType,
  listTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  listTechnicianPayouts,
  recordTechnicianPayout,
  deleteTechnicianPayout,
  listCases,
  createCase,
  getCaseDetail,
  updateCase,
  trashCase,
  restoreCase,
  permanentDeleteCase,
  advanceCaseStatus,
  assignTechnician,
  removeCaseAssignment,
  addStageAssignee,
  removeStageAssignee,
  uploadCaseAttachment,
  deleteCaseAttachment,
  listInvoices,
  createInvoice,
  recordInvoicePayment,
  getUninvoicedSummary,
  batchCreateMonthlyInvoices,
  listMonthlySettlements,
  closeMonthlySettlement,
  reopenMonthlySettlement,
  scanBillingCycle,
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
  downloadAllAttachments,
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
  requestTechnicianAdvance,
  getAgingReport,
  getCreditNotes,
  getInvoicePdf,
  getDoctorPricing,
  setDoctorPricing,
  getInvoicePaymentLink,
  getPanLabelPdf,
  recordDoctorBulkPayment,
  getWarrantyCertificatePdf,
  sendCaseToTryIn,
  returnCaseFromTryIn,
  kioskScanCase,
  getRemakesAnalysisReport,
  bulkAdvanceCases,
  bulkAssignTechnician,
  bulkUpdatePriority,
  bulkTrashCases,
  bulkRestoreCases,
  bulkTransferCasesDoctor,
  voidInvoice,
  getDoctorStatementPdf,
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  recordMaterialStockIn,
  recordCaseMaterialConsumption,
  deleteCaseMaterialUsage,
  listDentalSuppliers,
  createDentalSupplier,
  getMaterialsDashboardSummary,
};
