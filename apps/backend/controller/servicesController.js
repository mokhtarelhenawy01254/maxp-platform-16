const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAll = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.user?.companyId;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId مطلوب' });
    const data = await getSharedPrismaClient().service.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الخدمات' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { name, description, icon, category, price } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الخدمة مطلوب' });
    const data = await getSharedPrismaClient().service.create({
      data: { companyId, name: name.trim(), description, icon, category: category || 'other', price: price ? parseFloat(price) : null }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الخدمة' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const { name, description, icon, category, price, isActive } = req.body;
    const existing = await getSharedPrismaClient().service.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });
    const data = await getSharedPrismaClient().service.update({
      where: { id },
      data: { name, description, icon, category, price: price !== undefined ? parseFloat(price) : undefined, isActive }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الخدمة' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const { id } = req.params;
    const existing = await getSharedPrismaClient().service.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });
    await getSharedPrismaClient().service.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الخدمة' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الخدمة' });
  }
};

module.exports = { getAll, create, update, remove };
