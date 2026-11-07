const { getSharedPrismaClient } = require('../services/sharedDatabase');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { customerId } = req.query;
    const where = { companyId };
    if (customerId) where.customerId = customerId;

    const data = await getSharedPrismaClient().educationStudent.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } }
      },
      orderBy: { firstName: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطلاب' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationStudent.findFirst({
      where: { id, companyId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        enrollments: {
          include: {
            package: { include: { subject: { select: { id: true, name: true } } } },
            teacher: { select: { id: true, name: true } }
          }
        }
      }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الطالب غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطالب' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { customerId, firstName, lastName, phone, gender, grade, notes } = req.body;
    if (!firstName || !firstName.trim()) return res.status(400).json({ success: false, error: 'اسم الطالب مطلوب' });
    if (!customerId) return res.status(400).json({ success: false, error: 'ولي الأمر مطلوب' });

    const customer = await getSharedPrismaClient().customer.findFirst({ where: { id: customerId, companyId } });
    if (!customer) return res.status(400).json({ success: false, error: 'ولي الأمر غير موجود' });

    const data = await getSharedPrismaClient().educationStudent.create({
      data: { companyId, customerId, firstName: firstName.trim(), lastName, phone, gender, grade, notes },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطالب' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { customerId, firstName, lastName, phone, gender, grade, notes, isActive } = req.body;

    const existing = await getSharedPrismaClient().educationStudent.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطالب غير موجود' });

    const data = await getSharedPrismaClient().educationStudent.update({
      where: { id },
      data: { customerId, firstName, lastName, phone, gender, grade, notes, isActive },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الطالب' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationStudent.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطالب غير موجود' });

    await getSharedPrismaClient().educationStudent.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف الطالب' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الطالب' });
  }
};

module.exports = { getAll, getById, create, update, remove };
