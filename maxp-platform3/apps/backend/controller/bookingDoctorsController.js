const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAllDoctors = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { branchId } = req.query;
    const where = { companyId };
    if (branchId) where.branchId = branchId;

    const doctors = await getSharedPrismaClient().bookingDoctor.findMany({
      where,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { title: 'asc' }
    });
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الأطباء' });
  }
};

const createDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let { branchId, title, name, specialty, phone, gender } = req.body;
    if (!branchId) return res.status(400).json({ success: false, error: 'الفرع مطلوب' });
    if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'اللقب مطلوب' });

    const branch = await getSharedPrismaClient().bookingBranch.findFirst({ where: { id: branchId, companyId } });
    if (!branch) return res.status(400).json({ success: false, error: 'الفرع غير موجود' });

    const doctor = await getSharedPrismaClient().bookingDoctor.create({
      data: { companyId, branchId, title: title.trim(), name, specialty, phone, gender }
    });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الدكتور' });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    let { branchId, title, name, specialty, phone, gender, isActive } = req.body;

    const existing = await getSharedPrismaClient().bookingDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الدكتور غير موجود' });

    const doctor = await getSharedPrismaClient().bookingDoctor.update({
      where: { id },
      data: { branchId, title, name, specialty, phone, gender, isActive }
    });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الدكتور' });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().bookingDoctor.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الدكتور غير موجود' });

    await getSharedPrismaClient().bookingDoctor.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الدكتور' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الدكتور' });
  }
};

module.exports = { getAllDoctors, createDoctor, updateDoctor, deleteDoctor };
