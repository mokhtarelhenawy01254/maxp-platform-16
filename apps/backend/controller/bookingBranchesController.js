const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllBranches = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const branches = await getSharedPrismaClient().bookingBranch.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الفروع' });
  }
};

const createBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, address, phone, workingDays, genderDays } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });

    const branch = await getSharedPrismaClient().bookingBranch.create({
      data: { companyId, name: name.trim(), address, phone, workingDays, genderDays }
    });
    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الفرع' });
  }
};

const updateBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name, address, phone, workingDays, genderDays, isActive } = req.body;

    const existing = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    const branch = await getSharedPrismaClient().bookingBranch.update({
      where: { id },
      data: { name, address, phone, workingDays, genderDays, isActive }
    });
    res.json({ success: true, data: branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الفرع' });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الفرع غير موجود' });

    await getSharedPrismaClient().bookingBranch.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الفرع' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الفرع' });
  }
};

module.exports = { getAllBranches, createBranch, updateBranch, deleteBranch };
