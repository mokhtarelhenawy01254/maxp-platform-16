const { getSharedPrismaClient } = require('../services/sharedDatabase');
const educationNotificationService = require('../services/educationNotificationService');

const ALLOWED_PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED'];

const normalizePaymentStatus = (status, fallback = 'PENDING') => {
  if (!status) return fallback;
  const upper = String(status).toUpperCase();
  if (upper === 'PAID') return 'COMPLETED';
  if (ALLOWED_PAYMENT_STATUSES.includes(upper)) return upper;
  return fallback;
};

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

    // Multi-tenant validation: ensure student belongs to company
    const student = await getSharedPrismaClient().educationStudent.findFirst({
      where: { id: studentId, companyId }
    });
    if (!student) return res.status(400).json({ success: false, error: 'الطالب غير موجود' });

    // Multi-tenant validation: ensure package belongs to company
    const pkg = await getSharedPrismaClient().educationPackage.findFirst({
      where: { id: packageId, companyId }
    });
    if (!pkg) return res.status(400).json({ success: false, error: 'الباقة غير موجودة' });

    // Multi-tenant validation: ensure teacher belongs to company if assigned
    const safeTeacherId = teacherId || null;
    if (safeTeacherId) {
      const teacher = await getSharedPrismaClient().educationTeacher.findFirst({
        where: { id: safeTeacherId, companyId }
      });
      if (!teacher) return res.status(400).json({ success: false, error: 'المدرس المعين غير موجود' });
    }

    const parsedExpiresAt = (expiresAt && !isNaN(new Date(expiresAt).getTime()))
      ? new Date(expiresAt)
      : null;
    const safePaymentStatus = normalizePaymentStatus(paymentStatus, 'PENDING');

    const data = await getSharedPrismaClient().educationEnrollment.create({
      data: {
        companyId,
        studentId,
        packageId,
        teacherId: safeTeacherId,
        totalHours: Number(pkg.hoursCount) || 0,
        remainingHours: Number(pkg.hoursCount) || 0,
        amountPaid: Number(amountPaid) || 0,
        paymentStatus: safePaymentStatus,
        expiresAt: parsedExpiresAt
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
    const { teacherId, amountPaid, paymentStatus, remainingHours, expiresAt } = req.body;

    const existing = await getSharedPrismaClient().educationEnrollment.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'التسجيل غير موجود' });

    // Validate teacher tenant isolation if teacherId is being updated
    let safeTeacherId = undefined;
    if (teacherId !== undefined) {
      safeTeacherId = teacherId || null;
      if (safeTeacherId) {
        const teacher = await getSharedPrismaClient().educationTeacher.findFirst({
          where: { id: safeTeacherId, companyId }
        });
        if (!teacher) return res.status(400).json({ success: false, error: 'المدرس المعين غير موجود' });
      }
    }

    const parsedExpiresAt = expiresAt !== undefined
      ? ((expiresAt && !isNaN(new Date(expiresAt).getTime())) ? new Date(expiresAt) : null)
      : undefined;

    const safePaymentStatus = paymentStatus !== undefined
      ? normalizePaymentStatus(paymentStatus, existing.paymentStatus)
      : undefined;

    const data = await getSharedPrismaClient().educationEnrollment.update({
      where: { id },
      data: {
        teacherId: safeTeacherId,
        amountPaid: amountPaid !== undefined ? Number(amountPaid) || 0 : undefined,
        paymentStatus: safePaymentStatus,
        remainingHours: remainingHours !== undefined ? Number(remainingHours) || 0 : undefined,
        expiresAt: parsedExpiresAt,
      },
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
