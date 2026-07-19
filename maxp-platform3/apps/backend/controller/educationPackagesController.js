const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { subjectId } = req.query;
    const where = { companyId };
    if (subjectId) where.subjectId = subjectId;

    const data = await getSharedPrismaClient().educationPackage.findMany({
      where,
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الباقات' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { subjectId, name, description, hoursCount, sessionDuration, price } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الباقة مطلوب' });
    if (!subjectId) return res.status(400).json({ success: false, error: 'المادة مطلوبة' });
    if (!hoursCount || hoursCount <= 0) return res.status(400).json({ success: false, error: 'عدد الساعات يجب أن يكون أكبر من صفر' });

    const data = await getSharedPrismaClient().educationPackage.create({
      data: { companyId, subjectId, name: name.trim(), description, hoursCount, sessionDuration, price },
      include: { subject: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الباقة' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { subjectId, name, description, hoursCount, sessionDuration, price, isActive } = req.body;

    const existing = await getSharedPrismaClient().educationPackage.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });

    const data = await getSharedPrismaClient().educationPackage.update({
      where: { id },
      data: { subjectId, name, description, hoursCount, sessionDuration, price, isActive },
      include: { subject: { select: { id: true, name: true } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الباقة' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationPackage.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });

    await getSharedPrismaClient().educationPackage.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الباقة' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الباقة' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationPackage.findFirst({
      where: { id, companyId },
      include: { subject: { select: { id: true, name: true } } }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الباقة' });
  }
};

module.exports = { getAll, getById, create, update, remove };
