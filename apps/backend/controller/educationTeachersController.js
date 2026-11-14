const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { logEducationEvent } = require('../services/educationAuditService');
const { getSingularTeacherLabel } = require('../services/educationLabelService');
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
    const { password: _pw, ...safeData } = data;
    res.json({ success: true, data: safeData });
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

    const teacherLabel = await getSingularTeacherLabel(companyId, 'ar');
    logEducationEvent({
      companyId,
      action: 'CREATE_TEACHER',
      entityType: 'TEACHER',
      entityId: data.id,
      entityName: data.name,
      description: `تم إضافة ${teacherLabel} جديد: ${data.name} (هاتف: ${data.phone || 'غير مسجل'})`,
      details: { phone: data.phone, email: data.email, subjectRatesCount: subjectRates?.length || 0 },
      req,
    }).catch(e => console.error('[TeacherAudit]', e.message));

    const { password: _createdPw, ...safeCreated } = data;
    res.status(201).json({ success: true, data: safeCreated });
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

    const updateTeacherLabel = await getSingularTeacherLabel(companyId, 'ar');
    logEducationEvent({
      companyId,
      action: 'UPDATE_TEACHER',
      entityType: 'TEACHER',
      entityId: data.id,
      entityName: data.name,
      description: `تم تحديث بيانات ${updateTeacherLabel}: ${data.name}`,
      details: {
        before: { name: existing.name, phone: existing.phone, isActive: existing.isActive },
        after: { name: data.name, phone: data.phone, isActive: data.isActive }
      },
      req,
    }).catch(e => console.error('[TeacherAudit]', e.message));

    const { password: _updatedPw, ...safeUpdated } = data;
    res.json({ success: true, data: safeUpdated });
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

    const deleteTeacherLabel = await getSingularTeacherLabel(companyId, 'ar');
    const { password: _removedPassword, ...safeDeletedTeacher } = existing;
    logEducationEvent({
      companyId,
      action: 'DELETE_TEACHER',
      entityType: 'TEACHER',
      entityId: id,
      entityName: existing.name,
      description: `تم حذف ${deleteTeacherLabel}: ${existing.name}`,
      details: { deletedTeacher: safeDeletedTeacher },
      severity: 'HIGH',
      req,
    }).catch(e => console.error('[TeacherAudit]', e.message));

    res.json({ success: true, message: 'تم حذف المدرس' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف المدرس' });
  }
};

module.exports = { getAll, getById, create, update, remove };
