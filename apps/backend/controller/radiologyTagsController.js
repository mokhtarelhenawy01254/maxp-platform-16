const { getSharedPrismaClient } = require('../services/sharedDatabase');

const normalizeBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
};

// ==================== EXAM TAGS ====================

const listTags = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { search, includeInactive } = req.query;
    const where = { companyId };
    if (includeInactive !== 'true') where.isActive = true;
    if (search && String(search).trim()) {
      where.name = { contains: String(search).trim(), mode: 'insensitive' };
    }

    const tags = await getSharedPrismaClient().radiologyExamTag.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error fetching radiology exam tags:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب تاجات الإكزام' });
  }
};

const createTag = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم التاج مطلوب' });

    const tag = await getSharedPrismaClient().radiologyExamTag.create({
      data: { companyId, name: String(name).trim() },
    });
    res.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error creating radiology exam tag:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء التاج' });
  }
};

const updateTag = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const body = req.body || {};
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamTag.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التاج غير موجود' });

    const data = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return res.status(400).json({ success: false, error: 'اسم التاج مطلوب' });
      data.name = String(body.name).trim();
    }
    if (body.isActive !== undefined) data.isActive = normalizeBool(body.isActive, true);

    const tag = await prisma.radiologyExamTag.update({ where: { id }, data });
    res.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error updating radiology exam tag:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث التاج' });
  }
};

const deleteTag = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.radiologyExamTag.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التاج غير موجود' });

    const tag = await prisma.radiologyExamTag.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف التاج', data: tag });
  } catch (error) {
    console.error('Error deleting radiology exam tag:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف التاج' });
  }
};

// ==================== MODALITIES ====================

const listModalities = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const rows = await prisma.radiologyExamType.findMany({
      where: { companyId },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = rows.map((row) => row.category).filter((category) => category && String(category).trim());
    const counts = await Promise.all(
      categories.map((category) => prisma.radiologyExamType.count({ where: { companyId, category } }))
    );

    const data = categories
      .map((category, index) => ({ category, count: counts[index] }))
      .sort((a, b) => a.category.localeCompare(b.category));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching radiology modalities:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الموديولات' });
  }
};

module.exports = {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  listModalities,
};
