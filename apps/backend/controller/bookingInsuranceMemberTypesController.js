const { getSharedPrismaClient } = require('../services/sharedDatabase');

const parseCoveragePercent = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return null;
  return Math.min(100, Math.max(0, num));
};

const getAllMemberTypes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const memberTypes = await getSharedPrismaClient().insuranceMemberType.findMany({
      where: { companyId },
      include: { _count: { select: { patients: true } } },
      orderBy: { coveragePercent: 'asc' },
    });
    res.json({ success: true, data: memberTypes });
  } catch (error) {
    console.error('Error fetching insurance member types:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب أنواع العضوية' });
  }
};

const createMemberType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, coveragePercent } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم نوع العضوية مطلوب' });

    const parsedCoverage = parseCoveragePercent(coveragePercent);
    if (parsedCoverage === null) return res.status(400).json({ success: false, error: 'نسبة التغطية غير صالحة' });

    const memberType = await getSharedPrismaClient().insuranceMemberType.create({
      data: {
        companyId,
        name: String(name).trim(),
        coveragePercent: parsedCoverage,
      },
    });
    res.json({ success: true, data: { ...memberType, _count: { patients: 0 } } });
  } catch (error) {
    console.error('Error creating insurance member type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء نوع العضوية' });
  }
};

const updateMemberType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name, coveragePercent, isActive } = req.body;
    if (name !== undefined && !String(name).trim()) return res.status(400).json({ success: false, error: 'اسم نوع العضوية مطلوب' });
    if (coveragePercent !== undefined) {
      const parsedCoverage = parseCoveragePercent(coveragePercent);
      if (parsedCoverage === null) return res.status(400).json({ success: false, error: 'نسبة التغطية غير صالحة' });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceMemberType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع العضوية غير موجود' });

    const memberType = await prisma.insuranceMemberType.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(coveragePercent !== undefined ? { coveragePercent: parseCoveragePercent(coveragePercent) } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
      },
    });
    res.json({ success: true, data: memberType });
  } catch (error) {
    console.error('Error updating insurance member type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث نوع العضوية' });
  }
};

const deleteMemberType = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const existing = await prisma.insuranceMemberType.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'نوع العضوية غير موجود' });

    const memberType = await prisma.insuranceMemberType.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'تم حذف نوع العضوية', data: memberType });
  } catch (error) {
    console.error('Error deleting insurance member type:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف نوع العضوية' });
  }
};

module.exports = {
  getAllMemberTypes,
  createMemberType,
  updateMemberType,
  deleteMemberType,
};
