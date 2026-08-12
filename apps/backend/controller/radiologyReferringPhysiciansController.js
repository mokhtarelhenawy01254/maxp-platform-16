const { getSharedPrismaClient } = require('../services/sharedDatabase');

const COMMISSION_TYPES = ['NONE', 'PERCENTAGE', 'FIXED'];

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const clampValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
};

const listPhysicians = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, includeInactive, limit } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { specialty: { contains: term, mode: 'insensitive' } },
      ];
    }
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const items = await getSharedPrismaClient().radiologyReferringPhysician.findMany({ where, orderBy: { name: 'asc' }, take: limitNum });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error listing radiology referring physicians:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأطباء المحوّلين' });
  }
};

const createPhysician = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, phone, specialty, commissionType, commissionValue } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم الطبيب مطلوب' });
    const type = String(commissionType || 'NONE').toUpperCase();
    if (!COMMISSION_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'نوع العمولة غير صالح' });

    const item = await getSharedPrismaClient().radiologyReferringPhysician.create({
      data: {
        companyId,
        name: String(name).trim(),
        phone: normalizeText(phone),
        specialty: normalizeText(specialty),
        commissionType: type,
        commissionValue: clampValue(commissionValue),
      },
    });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating radiology referring physician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطبيب المحوّل' });
  }
};

const updatePhysician = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyReferringPhysician.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم الطبيب مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.phone !== undefined) data.phone = normalizeText(body.phone);
    if (body.specialty !== undefined) data.specialty = normalizeText(body.specialty);
    if (body.commissionType !== undefined) {
      const type = String(body.commissionType).toUpperCase();
      if (!COMMISSION_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'نوع العمولة غير صالح' });
      data.commissionType = type;
    }
    if (body.commissionValue !== undefined) data.commissionValue = clampValue(body.commissionValue);
    if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';

    const item = await prisma.radiologyReferringPhysician.update({ where: { id }, data });
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating radiology referring physician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الطبيب المحوّل' });
  }
};

const deletePhysician = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyReferringPhysician.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطبيب غير موجود' });

    const item = await prisma.radiologyReferringPhysician.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف الطبيب', data: item });
  } catch (error) {
    console.error('Error deleting radiology referring physician:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الطبيب المحوّل' });
  }
};

const physicianCommissions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { dateFrom, dateTo, physicianId } = req.query;
    const prisma = getSharedPrismaClient();
    const physicians = await prisma.radiologyReferringPhysician.findMany({ where: { companyId, isActive: true } });

    const where = { companyId, referringPhysicianId: { not: null } };
    if (dateFrom || dateTo) {
      const f = {};
      if (dateFrom) f.gte = new Date(dateFrom);
      if (dateTo) f.lte = new Date(dateTo);
      where.createdAt = f;
    }
    if (physicianId) where.referringPhysicianId = String(physicianId);

    const studies = await prisma.radiologyStudy.findMany({ where, select: { referringPhysicianId: true, examTypeId: true, additionAmount: true, priceSnapshot: true, examTypeName: true } });
    const examTypePrices = new Map();
    const examTypes = await prisma.radiologyExamType.findMany({ where: { companyId }, select: { id: true, price: true } });
    examTypes.forEach(et => examTypePrices.set(et.id, et.price));

    const byPhysician = new Map();
    for (const s of studies) {
      if (!s.referringPhysicianId) continue;
      const base = Number.isFinite(s.priceSnapshot) && s.priceSnapshot > 0
        ? s.priceSnapshot
        : (examTypePrices.get(s.examTypeId || '') || 0);
      const amount = base + (s.additionAmount || 0);
      const row = byPhysician.get(s.referringPhysicianId) || { physicianId: s.referringPhysicianId, name: '', count: 0, amount: 0, commission: 0 };
      row.count += 1;
      row.amount += amount;
      byPhysician.set(s.referringPhysicianId, row);
    }

    for (const p of physicians) {
      const row = byPhysician.get(p.id);
      if (!row) continue;
      row.name = p.name;
      row.physicianId = p.id;
      if (p.commissionType === 'PERCENTAGE') row.commission = row.amount * (p.commissionValue / 100);
      else if (p.commissionType === 'FIXED') row.commission = row.count * p.commissionValue;
      else row.commission = 0;
      row.commissionType = p.commissionType;
      row.commissionValue = p.commissionValue;
    }

    const rows = Array.from(byPhysician.values()).sort((a, b) => b.commission - a.commission);
    const totalCommission = rows.reduce((acc, r) => acc + r.commission, 0);
    res.json({ success: true, data: { rows, totalCommission } });
  } catch (error) {
    console.error('Error computing radiology physician commissions:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حساب العمولات' });
  }
};

module.exports = { listPhysicians, createPhysician, updatePhysician, deletePhysician, physicianCommissions };
