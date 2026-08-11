const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getStartOfDayInTimezone, getEndOfDayInTimezone, getDateStringInTimezone } = require('../utils/dateUtils');

const INVOICE_STATUSES = new Set(['OPEN', 'PARTIAL', 'PAID']);
const LEDGER_TYPES = new Set(['PAYMENT', 'ADJUSTMENT']);

const parseDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const generateInvoiceNumber = () => {
  const datePart = getDateStringInTimezone(new Date()).replace(/-/g, '');
  const rand = crypto.randomInt(1000, 10000);
  return `INS-${datePart}-${rand}`;
};

const resolveCompanyEntity = async (prisma, companyId, insuranceCompanyId) => {
  if (!insuranceCompanyId || !String(insuranceCompanyId).trim()) return { entity: null, error: 'شركة التأمين مطلوبة' };
  const entity = await prisma.insuranceCompany.findFirst({
    where: { id: String(insuranceCompanyId).trim(), companyId },
  });
  if (!entity) return { entity: null, error: 'شركة التأمين غير موجودة' };
  return { entity, error: null };
};

const applyDateFilter = (where, dateFrom, dateTo) => {
  if (dateFrom || dateTo) {
    const createdAtFilter = {};
    if (dateFrom) createdAtFilter.gte = getStartOfDayInTimezone(new Date(dateFrom));
    if (dateTo) createdAtFilter.lte = getEndOfDayInTimezone(new Date(dateTo));
    where.createdAt = createdAtFilter;
  }
};

const resolveStudyAmounts = async (prisma, companyId, studies) => {
  const examTypeIds = [...new Set(studies.map(s => s.examTypeId).filter(Boolean))];
  let priceMap = new Map();
  if (examTypeIds.length) {
    const examTypes = await prisma.radiologyExamType.findMany({
      where: { id: { in: examTypeIds }, companyId },
      select: { id: true, price: true },
    });
    priceMap = new Map(examTypes.map(e => [e.id, e.price]));
  }
  return studies.map(study => ({
    studyId: study.id,
    patientName: study.patientName,
    examTypeName: study.examTypeName || null,
    amount: Number.isFinite(priceMap.get(study.examTypeId)) ? priceMap.get(study.examTypeId) : 0,
  }));
};

const assignStudyInsurance = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const insuranceCompanyId = req.body?.insuranceCompanyId === undefined || req.body.insuranceCompanyId === null
      ? null
      : String(req.body.insuranceCompanyId).trim();

    const prisma = getSharedPrismaClient();
    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    let insuranceCompanyName = null;
    let priceSnapshot = study.priceSnapshot || 0;
    if (insuranceCompanyId) {
      const entity = await prisma.insuranceCompany.findFirst({
        where: { id: insuranceCompanyId, companyId },
        select: { id: true, name: true, priceListId: true },
      });
      if (!entity) return res.status(400).json({ success: false, error: 'شركة التأمين غير موجودة' });
      insuranceCompanyName = entity.name;
      // Resolve entity-specific price (RadiologyEntityPrice first, then booking PriceListItem, else exam price)
      if (study.examTypeId) {
        const entityPrice = await prisma.radiologyEntityPrice.findFirst({
          where: { insuranceCompanyId, examTypeId: study.examTypeId, isActive: true },
          select: { price: true },
        }).catch(() => null);
        if (entityPrice && Number.isFinite(entityPrice.price)) {
          priceSnapshot = entityPrice.price;
        } else if (entity.priceListId) {
          try {
            const item = await prisma.priceListItem.findFirst({
              where: { priceListId: entity.priceListId, serviceId: study.examTypeId, isActive: true },
              select: { price: true },
            });
            if (item && Number.isFinite(item.price)) priceSnapshot = item.price;
          } catch { /* graceful fallback */ }
        }
      }
    }

    const updated = await prisma.radiologyStudy.update({
      where: { id },
      data: {
        insuranceCompanyId: insuranceCompanyId || null,
        insuranceCompanyName,
        billingType: insuranceCompanyId ? 'INSURANCE' : 'PATIENT',
        priceSnapshot,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error assigning radiology study insurance:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في ربط شركة التأمين بالدراسة' });
  }
};

const createInvoice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const { entity, error } = await resolveCompanyEntity(prisma, companyId, body.insuranceCompanyId);
    if (error) return res.status(400).json({ success: false, error });

    const studyIds = Array.isArray(body.studyIds)
      ? body.studyIds.map(id => String(id).trim()).filter(Boolean)
      : [];

    const where = { companyId, insuranceCompanyId: entity.id };
    if (studyIds.length) where.id = { in: studyIds };
    const periodFrom = parseDate(body.periodFrom);
    const periodTo = parseDate(body.periodTo);
    applyDateFilter(where, periodFrom, periodTo);

    const studies = await prisma.radiologyStudy.findMany({
      where,
      select: { id: true, patientName: true, examTypeId: true, examTypeName: true },
    });
    if (!studies.length) return res.status(400).json({ success: false, error: 'لا توجد دراسات لإنشاء الفاتورة' });

    const lineItems = await resolveStudyAmounts(prisma, companyId, studies);
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

    let invoice;
    for (let attempt = 0; attempt < 4; attempt++) {
      const invoiceNumber = generateInvoiceNumber();
      try {
        invoice = await prisma.$transaction(async (tx) => {
          const created = await tx.radiologyInsuranceInvoice.create({
            data: {
              companyId,
              invoiceNumber,
              insuranceCompanyId: entity.id,
              insuranceCompanyName: entity.name,
              totalAmount,
              paidAmount: 0,
              remainingAmount: totalAmount,
              status: 'OPEN',
              periodFrom,
              periodTo,
              notes: body.notes ? String(body.notes).trim() : null,
            },
          });
          if (lineItems.length) {
            await tx.radiologyInsuranceInvoiceItem.createMany({
              data: lineItems.map(item => ({ ...item, invoiceId: created.id })),
            });
          }
          return created;
        });
        break;
      } catch (error) {
        if (error?.code === 'P2002' && attempt < 3) continue;
        throw error;
      }
    }

    res.json({ success: true, data: { ...invoice, items: lineItems } });
  } catch (error) {
    console.error('Error creating radiology insurance invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء فاتورة التأمين' });
  }
};

const listInvoices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { insuranceCompanyId, status, dateFrom, dateTo, page, limit } = req.query;
    const where = { companyId };
    if (insuranceCompanyId) where.insuranceCompanyId = String(insuranceCompanyId);
    if (status) {
      const s = String(status).toUpperCase();
      if (!INVOICE_STATUSES.has(s)) return res.status(400).json({ success: false, error: 'حالة الفاتورة غير صحيحة' });
      where.status = s;
    }
    applyDateFilter(where, dateFrom, dateTo);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [invoices, total] = await Promise.all([
      prisma.radiologyInsuranceInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: { items: true },
      }),
      prisma.radiologyInsuranceInvoice.count({ where }),
    ]);

    res.json({ success: true, data: { items: invoices, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing radiology insurance invoices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب فواتير التأمين' });
  }
};

const getInvoice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const invoice = await prisma.radiologyInsuranceInvoice.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching radiology insurance invoice:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفاتورة' });
  }
};

const recordPayment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });

    const prisma = getSharedPrismaClient();
    const invoice = await prisma.radiologyInsuranceInvoice.findFirst({ where: { id, companyId } });
    if (!invoice) return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });

    const paidAmount = invoice.paidAmount + amount;
    const remainingAmount = Math.max(0, invoice.totalAmount - paidAmount);
    const status = remainingAmount <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'OPEN');

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.radiologyInsuranceInvoice.update({
        where: { id },
        data: { paidAmount, remainingAmount, status },
      });
      await tx.radiologyInsuranceLedgerEntry.create({
        data: {
          companyId,
          insuranceCompanyId: invoice.insuranceCompanyId,
          insuranceCompanyName: invoice.insuranceCompanyName,
          type: 'PAYMENT',
          amount,
          note: body.note ? String(body.note).trim() : null,
        },
      });
      return result;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error recording radiology insurance payment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدفعة' });
  }
};

const createLedgerEntry = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { insuranceCompanyId, type, amount, note } = req.body || {};
    if (!insuranceCompanyId) return res.status(400).json({ success: false, error: 'اختر الجهة' });
    const t = String(type || 'PAYMENT').toUpperCase();
    if (!LEDGER_TYPES.has(t)) return res.status(400).json({ success: false, error: 'نوع القيد غير صحيح' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, error: 'المبلغ غير صحيح' });

    const prisma = getSharedPrismaClient();
    const entity = await prisma.insuranceCompany.findFirst({ where: { id: insuranceCompanyId, companyId } });
    if (!entity) return res.status(400).json({ success: false, error: 'الجهة غير موجودة' });

    const entry = await prisma.radiologyInsuranceLedgerEntry.create({
      data: {
        companyId,
        insuranceCompanyId,
        insuranceCompanyName: entity.name,
        type: t,
        amount: amt,
        note: note ? String(note) : null,
      },
    });
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error creating radiology insurance ledger entry:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل القيد' });
  }
};

const listLedger = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { insuranceCompanyId, type, dateFrom, dateTo, page, limit } = req.query;
    const where = { companyId };
    if (insuranceCompanyId) where.insuranceCompanyId = String(insuranceCompanyId);
    if (type) {
      const t = String(type).toUpperCase();
      if (!LEDGER_TYPES.has(t)) return res.status(400).json({ success: false, error: 'نوع القيد غير صحيح' });
      where.type = t;
    }
    applyDateFilter(where, dateFrom, dateTo);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [entries, total] = await Promise.all([
      prisma.radiologyInsuranceLedgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.radiologyInsuranceLedgerEntry.count({ where }),
    ]);

    res.json({ success: true, data: { items: entries, total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('Error listing radiology insurance ledger:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب دفتر التأمين' });
  }
};

const insuranceSummary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const invoices = await prisma.radiologyInsuranceInvoice.findMany({
      where: { companyId },
      select: {
        insuranceCompanyId: true,
        insuranceCompanyName: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
      },
    });

    const groups = new Map();
    for (const invoice of invoices) {
      const key = invoice.insuranceCompanyId || 'unknown';
      const entry = groups.get(key) || {
        insuranceCompanyId: key,
        name: invoice.insuranceCompanyName || '—',
        total: 0,
        paid: 0,
        remaining: 0,
      };
      entry.total += invoice.totalAmount;
      entry.paid += invoice.paidAmount;
      entry.remaining += invoice.remainingAmount;
      if (invoice.insuranceCompanyName && entry.name === '—') entry.name = invoice.insuranceCompanyName;
      groups.set(key, entry);
    }

    res.json({ success: true, data: Array.from(groups.values()) });
  } catch (error) {
    console.error('Error fetching radiology insurance summary:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب ملخص التأمين' });
  }
};

const setEntityPrice = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { insuranceCompanyId, examTypeId, price } = req.body || {};
    if (!insuranceCompanyId || !examTypeId) return res.status(400).json({ success: false, error: 'الجهة ونوع الفحص مطلوبان' });
    const amt = Number(price);
    if (!Number.isFinite(amt) || amt < 0) return res.status(400).json({ success: false, error: 'السعر غير صحيح' });

    const prisma = getSharedPrismaClient();
    const [entity, examType] = await Promise.all([
      prisma.insuranceCompany.findFirst({ where: { id: insuranceCompanyId, companyId }, select: { id: true } }),
      prisma.radiologyExamType.findFirst({ where: { id: examTypeId, companyId }, select: { id: true } }),
    ]);
    if (!entity || !examType) return res.status(400).json({ success: false, error: 'الجهة أو نوع الفحص غير موجود' });

    const existing = await prisma.radiologyEntityPrice.findUnique({
      where: { insuranceCompanyId_examTypeId: { insuranceCompanyId, examTypeId } },
    });

    const data = existing
      ? await prisma.radiologyEntityPrice.update({ where: { id: existing.id }, data: { price: amt, isActive: true } })
      : await prisma.radiologyEntityPrice.create({ data: { companyId, insuranceCompanyId, examTypeId, price: amt } });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error setting radiology entity price:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حفظ سعر الجهة' });
  }
};

const listEntityPrices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { insuranceCompanyId, examTypeId } = req.query;
    const where = { companyId };
    if (insuranceCompanyId) where.insuranceCompanyId = String(insuranceCompanyId);
    if (examTypeId) where.examTypeId = String(examTypeId);

    const items = await getSharedPrismaClient().radiologyEntityPrice.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing radiology entity prices:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أسعار الجهات' });
  }
};

const listEntityPricesSummary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const prices = await prisma.radiologyEntityPrice.findMany({ where: { companyId } });
    const byEntity = {};
    for (const p of prices) {
      if (!byEntity[p.insuranceCompanyId]) byEntity[p.insuranceCompanyId] = { insuranceCompanyId: p.insuranceCompanyId, count: 0 };
      byEntity[p.insuranceCompanyId].count += 1;
    }
    const entities = await prisma.insuranceCompany.findMany({ where: { companyId }, select: { id: true, name: true } });
    const rows = Object.values(byEntity).map(r => {
      const e = entities.find(x => x.id === r.insuranceCompanyId);
      return { insuranceCompanyId: r.insuranceCompanyId, name: e ? e.name : '—', count: r.count };
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error listing radiology entity price summary:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب ملخص أسعار الجهات' });
  }
};

module.exports = {
  assignStudyInsurance,
  createInvoice,
  listInvoices,
  getInvoice,
  recordPayment,
  listLedger,
  createLedgerEntry,
  insuranceSummary,
  setEntityPrice,
  listEntityPrices,
  listEntityPricesSummary,
};
