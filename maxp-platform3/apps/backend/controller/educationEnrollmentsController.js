const { getSharedPrismaClient } = require('../services/sharedDatabase');
const educationNotificationService = require('../services/educationNotificationService');

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { studentId, teacherId, subjectId } = req.query;
    const where = { companyId };
    if (studentId) where.studentId = studentId;
    if (teacherId) where.teacherId = teacherId;
    if (subjectId) where.package = { subjectId };

    const data = await getSharedPrismaClient().educationEnrollment.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        package: { include: { subject: { select: { id: true, name: true } } } },
        teacher: { select: { id: true, name: true } }
      },
      orderBy: { enrollmentDate: 'desc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التسجيلات' });
  }
};

const getById = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationEnrollment.findFirst({
      where: { id, companyId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, phone: true } },
        package: { include: { subject: { select: { id: true, name: true } } } },
        teacher: { select: { id: true, name: true, phone: true } },
        sessions: { orderBy: { scheduledAt: 'desc' } }
      }
    });
    if (!data) return res.status(404).json({ success: false, error: 'التسجيل غير موجود' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب التسجيل' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { studentId, packageId, teacherId, amountPaid, paymentStatus, expiresAt } = req.body;
    if (!studentId) return res.status(400).json({ success: false, error: 'الطالب مطلوب' });
    if (!packageId) return res.status(400).json({ success: false, error: 'الباقة مطلوبة' });

    const pkg = await getSharedPrismaClient().educationPackage.findFirst({ where: { id: packageId, companyId } });
    if (!pkg) return res.status(400).json({ success: false, error: 'الباقة غير موجودة' });

    const data = await getSharedPrismaClient().educationEnrollment.create({
      data: {
        companyId,
        studentId,
        packageId,
        teacherId: teacherId || null,
        totalHours: pkg.hoursCount,
        remainingHours: pkg.hoursCount,
        amountPaid: amountPaid || 0,
        paymentStatus: paymentStatus || 'PENDING',
        expiresAt
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        package: { include: { subject: { select: { id: true, name: true } } } },
        teacher: { select: { id: true, name: true } }
      }
    });
    educationNotificationService.notifyEnrollmentCreated(companyId, data).catch(e =>
      console.error('[EnrollmentNotify]', e.message)
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء التسجيل' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { teacherId, amountPaid, paymentStatus, remainingHours, expiresAt, isActive } = req.body;

    const existing = await getSharedPrismaClient().educationEnrollment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التسجيل غير موجود' });

    const data = await getSharedPrismaClient().educationEnrollment.update({
      where: { id },
      data: { teacherId, amountPaid, paymentStatus, remainingHours, expiresAt, isActive },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        package: { include: { subject: { select: { id: true, name: true } } } },
        teacher: { select: { id: true, name: true } }
      }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث التسجيل' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationEnrollment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التسجيل غير موجود' });

    await getSharedPrismaClient().educationEnrollment.delete({ where: { id } });
    res.json({ success: true, message: 'تم حذف التسجيل' });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف التسجيل' });
  }
};

module.exports = { getAll, getById, create, update, remove };
