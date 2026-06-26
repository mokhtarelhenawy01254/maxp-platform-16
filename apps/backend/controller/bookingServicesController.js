const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllServices = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { branchId } = req.query;
    const where = { companyId };
    if (branchId) where.branchId = branchId;

    const services = await getSharedPrismaClient().bookingService.findMany({
      where,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الخدمات' });
  }
};

const createService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { branchId, name, description, hasPackages, packages, requiresConsultation } = req.body;
    if (!branchId) return res.status(400).json({ success: false, error: 'الفرع مطلوب' });
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الخدمة مطلوب' });

    const branch = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id: branchId, companyId } });
    if (!branch) return res.status(400).json({ success: false, error: 'الفرع غير موجود' });

    const service = await getSharedPrismaClient().bookingService.create({
      data: {
        companyId, branchId, name: name.trim(), description,
        hasPackages: hasPackages !== false, packages,
        requiresConsultation: requiresConsultation !== false
      }
    });
    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الخدمة' });
  }
};

const updateService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name, description, hasPackages, packages, requiresConsultation, isActive } = req.body;

    const existing = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    const service = await getSharedPrismaClient().bookingService.update({
      where: { id },
      data: { name, description, hasPackages, packages, requiresConsultation, isActive }
    });
    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الخدمة' });
  }
};

const deleteService = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingService.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الخدمة غير موجودة' });

    await getSharedPrismaClient().bookingService.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الخدمة' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الخدمة' });
  }
};

module.exports = { getAllServices, createService, updateService, deleteService };
