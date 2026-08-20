const { getSharedPrismaClient } = require('../services/sharedDatabase');

const VISIT_STATUSES = ['SCHEDULED', 'DONE', 'CANCELLED'];

const normalizeText = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const parseVisitDate = (value) => {
  if (value === undefined || value === null || value === '') return { value: undefined, error: null };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { value: null, error: 'تاريخ الزيارة غير صحيح' };
  return { value: d, error: null };
};

const normalizeStatus = (value, fallback) => {
  if (value === undefined || value === null || value === '') return { value: fallback, error: null };
  const s = String(value).toUpperCase();
  if (!VISIT_STATUSES.includes(s)) return { value: null, error: 'حالة الزيارة غير صحيحة' };
  return { value: s, error: null };
};

const getAllVisits = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { status, dateFrom, dateTo, search, page, limit } = req.query;
    const where = { companyId };

    if (status && String(status).trim()) {
      const s = String(status).toUpperCase();
      if (!VISIT_STATUSES.includes(s)) return res.status(400).json({ success: false, error: 'حالة الزيارة غير صحيحة' });
      where.status = s;
    }
    if (dateFrom && String(dateFrom).trim()) {
      const from = new Date(String(dateFrom));
      if (isNaN(from.getTime())) return res.status(400).json({ success: false, error: 'تاريخ البداية غير صحيح' });
      where.visitDate = { ...(where.visitDate || {}), gte: from };
    }
    if (dateTo && String(dateTo).trim()) {
      const to = new Date(String(dateTo));
      if (isNaN(to.getTime())) return res.status(400).json({ success: false, error: 'تاريخ النهاية غير صحيح' });
      where.visitDate = { ...(where.visitDate || {}), lte: to };
    }
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [
        { patientName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const prisma = getSharedPrismaClient();
    const [visits, total] = await Promise.all([
      prisma.labHomeVisit.findMany({
        where,
        orderBy: { visitDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.labHomeVisit.count({ where }),
    ]);

    res.json({ success: true, data: visits, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Error fetching lab home visits:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الزيارات المنزلية' });
  }
};

const createVisit = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { patientName, phone, address, visitDate, status, notes } = req.body || {};
    if (!patientName || !String(patientName).trim()) {
      return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });
    }

    const dateCheck = parseVisitDate(visitDate);
    if (dateCheck.error) return res.status(400).json({ success: false, error: dateCheck.error });
    const statusCheck = normalizeStatus(status, 'SCHEDULED');
    if (statusCheck.error) return res.status(400).json({ success: false, error: statusCheck.error });

    const visit = await getSharedPrismaClient().labHomeVisit.create({
      data: {
        companyId,
        patientName: String(patientName).trim(),
        phone: normalizeText(phone),
        address: normalizeText(address),
        visitDate: dateCheck.value,
        status: statusCheck.value,
        notes: normalizeText(notes),
      },
    });

    res.json({ success: true, data: visit });
  } catch (error) {
    console.error('Error creating lab home visit:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الزيارة المنزلية' });
  }
};

const updateVisit = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labHomeVisit.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الزيارة غير موجودة' });

    const data = {};
    if (body.patientName !== undefined) {
      if (!String(body.patientName).trim()) return res.status(400).json({ success: false, error: 'اسم المريض مطلوب' });
      data.patientName = String(body.patientName).trim();
    }
    if (body.phone !== undefined) data.phone = normalizeText(body.phone);
    if (body.address !== undefined) data.address = normalizeText(body.address);
    if (body.notes !== undefined) data.notes = normalizeText(body.notes);
    if (body.visitDate !== undefined) {
      const dateCheck = parseVisitDate(body.visitDate);
      if (dateCheck.error) return res.status(400).json({ success: false, error: dateCheck.error });
      data.visitDate = dateCheck.value;
    }
    if (body.reviewed !== undefined) {
      data.reviewed = body.reviewed === true || body.reviewed === 'true' || body.reviewed === 1 || body.reviewed === '1';
    }
    if (body.status !== undefined) {
      const statusCheck = normalizeStatus(body.status);
      if (statusCheck.error) return res.status(400).json({ success: false, error: statusCheck.error });
      data.status = statusCheck.value;
      if (statusCheck.value === 'DONE') data.reviewed = true;
    }

    if (Object.keys(data).length) {
      await prisma.labHomeVisit.update({ where: { id }, data });
    }

    const visit = await prisma.labHomeVisit.findFirst({ where: { id, companyId } });
    res.json({ success: true, data: visit });
  } catch (error) {
    console.error('Error updating lab home visit:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الزيارة المنزلية' });
  }
};

const deleteVisit = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labHomeVisit.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الزيارة غير موجودة' });

    const visit = await prisma.labHomeVisit.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الزيارة', data: visit });
  } catch (error) {
    console.error('Error deleting lab home visit:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الزيارة' });
  }
};

module.exports = {
  getAllVisits,
  createVisit,
  updateVisit,
  deleteVisit,
};
