const { getSharedPrismaClient } = require('../services/sharedDatabase');

const normalizeText = (value) => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? null : s;
};

const normalizeBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

const getAllSampleTypes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) {
      where.name = { contains: String(search).trim(), mode: 'insensitive' };
    }

    const sampleTypes = await getSharedPrismaClient().labSampleType.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: sampleTypes });
  } catch (error) {
    console.error('Error fetching lab sample types:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أنواع العينات' });
  }
};

const createSampleType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, instructions } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم نوع العينة مطلوب' });

    const sampleType = await getSharedPrismaClient().labSampleType.create({
      data: {
        companyId,
        name: String(name).trim(),
        instructions: normalizeText(instructions),
      },
    });
    res.json({ success: true, data: sampleType });
  } catch (error) {
    console.error('Error creating lab sample type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء نوع العينة' });
  }
};

const updateSampleType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labSampleType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع العينة غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم نوع العينة مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.instructions !== undefined) data.instructions = normalizeText(body.instructions);
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const sampleType = await prisma.labSampleType.update({ where: { id }, data });
    res.json({ success: true, data: sampleType });
  } catch (error) {
    console.error('Error updating lab sample type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث نوع العينة' });
  }
};

const deleteSampleType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.labSampleType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع العينة غير موجود' });

    const sampleType = await prisma.labSampleType.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف نوع العينة', data: sampleType });
  } catch (error) {
    console.error('Error deleting lab sample type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف نوع العينة' });
  }
};

module.exports = {
  getAllSampleTypes,
  createSampleType,
  updateSampleType,
  deleteSampleType,
};
