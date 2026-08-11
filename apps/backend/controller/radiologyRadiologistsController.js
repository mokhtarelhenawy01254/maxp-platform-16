const { getSharedPrismaClient } = require('../services/sharedDatabase');

const RADIOLOGIST_LOCATIONS = ['ON_SITE', 'OFF_SITE'];

const normalizeLocation = (value) => {
  const location = String(value === undefined || value === null ? 'ON_SITE' : value).trim().toUpperCase();
  return RADIOLOGIST_LOCATIONS.includes(location) ? location : null;
};

const normalizeBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const listRadiologists = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.OR = [{ name: { contains: term, mode: 'insensitive' } }];
    }

    const radiologists = await getSharedPrismaClient().radiologyRadiologist.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: radiologists });
  } catch (error) {
    console.error('Error fetching radiology radiologists:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أخصائيي الأشعة' });
  }
};

const createRadiologist = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, location } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم أخصائي الأشعة مطلوب' });

    const loc = normalizeLocation(location);
    if (!loc) return res.status(400).json({ success: false, error: 'موقع أخصائي الأشعة غير صحيح' });

    const radiologist = await getSharedPrismaClient().radiologyRadiologist.create({
      data: { companyId, name: String(name).trim(), location: loc },
    });
    res.json({ success: true, data: radiologist });
  } catch (error) {
    console.error('Error creating radiology radiologist:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء أخصائي الأشعة' });
  }
};

const updateRadiologist = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyRadiologist.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'أخصائي الأشعة غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم أخصائي الأشعة مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.location !== undefined) {
      const loc = normalizeLocation(body.location);
      if (!loc) return res.status(400).json({ success: false, error: 'موقع أخصائي الأشعة غير صحيح' });
      data.location = loc;
    }
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const radiologist = await prisma.radiologyRadiologist.update({ where: { id }, data });
    res.json({ success: true, data: radiologist });
  } catch (error) {
    console.error('Error updating radiology radiologist:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث أخصائي الأشعة' });
  }
};

const deleteRadiologist = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyRadiologist.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'أخصائي الأشعة غير موجود' });

    const radiologist = await prisma.radiologyRadiologist.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف أخصائي الأشعة', data: radiologist });
  } catch (error) {
    console.error('Error deleting radiology radiologist:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف أخصائي الأشعة' });
  }
};

const assignRadiologist = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { radiologistId } = req.body || {};
    const prisma = getSharedPrismaClient();

    const study = await prisma.radiologyStudy.findFirst({ where: { id, companyId } });
    if (!study) return res.status(404).json({ success: false, error: 'الدراسة غير موجودة' });

    const data = {};
    if (radiologistId === null || radiologistId === undefined || radiologistId === '') {
      data.assignedRadiologistId = null;
      data.assignedRadiologistName = null;
      data.radiologistLocation = null;
      data.reportAssignedAt = null;
    } else {
      const radiologist = await prisma.radiologyRadiologist.findFirst({
        where: { id: String(radiologistId), companyId },
      });
      if (!radiologist) return res.status(400).json({ success: false, error: 'أخصائي الأشعة لا ينتمي لهذه الشركة' });

      data.assignedRadiologistId = radiologist.id;
      data.assignedRadiologistName = radiologist.name;
      data.radiologistLocation = radiologist.location;
      data.reportAssignedAt = new Date();
    }

    const updated = await prisma.radiologyStudy.update({ where: { id }, data });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error assigning radiology radiologist:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تعيين أخصائي الأشعة' });
  }
};

module.exports = {
  listRadiologists,
  createRadiologist,
  updateRadiologist,
  deleteRadiologist,
  assignRadiologist,
};
