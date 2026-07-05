const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const data = await getSharedPrismaClient().educationTeacher.findMany({
      where: { companyId },
      select: {
        id: true, companyId: true, employeeId: true, name: true, phone: true, email: true,
        bio: true, qualifications: true, avatarUrl: true, isActive: true, createdAt: true, updatedAt: true,
        subjectRates: { include: { subject: { select: { id: true, name: true } } } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المدرسين' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationTeacher.findFirst({
      where: { id, companyId },
      include: {
        subjectRates: { include: { subject: { select: { id: true, name: true } } } },
        availability: true
      }
    });
    if (!data) return res.status(404).json({ success: false, error: 'المدرس غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المدرس' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { name, phone, email, password, employeeId, bio, qualifications, avatarUrl, subjectRates } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'اسم المدرس مطلوب' });

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const data = await getSharedPrismaClient().educationTeacher.create({
      data: {
        companyId,
        employeeId,
        name: name.trim(),
        phone,
        email,
        password: hashedPassword,
        bio,
        qualifications,
        avatarUrl,
        subjectRates: Array.isArray(subjectRates) && subjectRates.length > 0 ? {
          create: subjectRates.map(sr => ({
            subjectId: sr.subjectId,
            hourlyRate: sr.hourlyRate
          }))
        } : undefined
      },
      include: { subjectRates: { include: { subject: { select: { id: true, name: true } } } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء المدرس' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { name, phone, email, password, employeeId, isActive, bio, qualifications, avatarUrl, subjectRates } = req.body;

    const existing = await getSharedPrismaClient().educationTeacher.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المدرس غير موجود' });

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const data = await getSharedPrismaClient().educationTeacher.update({
      where: { id },
      data: {
        name, phone, email, password: hashedPassword, employeeId, isActive, bio, qualifications, avatarUrl,
        subjectRates: Array.isArray(subjectRates) ? {
          deleteMany: {},
          create: subjectRates.map(sr => ({ subjectId: sr.subjectId, hourlyRate: sr.hourlyRate }))
        } : undefined
      },
      include: { subjectRates: { include: { subject: { select: { id: true, name: true } } } } }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث المدرس' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationTeacher.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'المدرس غير موجود' });

    await getSharedPrismaClient().educationTeacher.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف المدرس' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المدرس' });
  }
};

module.exports = { getAll, getById, create, update, remove };
