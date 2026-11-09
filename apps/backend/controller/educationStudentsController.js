let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  bcrypt = null;
}
const crypto = require('crypto');

const hashPassword = async (pwd) => {
  if (!pwd) return null;
  if (bcrypt && typeof bcrypt.hash === 'function') {
    return await bcrypt.hash(pwd, 10);
  }
  return crypto.createHash('sha256').update(pwd).digest('hex');
};

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { logEducationEvent } = require('../services/educationAuditService');

const normalizeGender = (g) => {
  if (!g) return null;
  const upper = String(g).trim().toUpperCase();
  if (upper === 'MALE' || upper === 'FEMALE') return upper;
  if (upper === 'ذكر' || upper === 'M') return 'MALE';
  if (upper === 'أنثى' || upper === 'انثى' || upper === 'F') return 'FEMALE';
  return null;
};

const getAll = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { customerId } = req.query;
    const where = { companyId };
    if (customerId) where.customerId = customerId;

    const data = await getSharedPrismaClient().educationStudent.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, phone2: true, email: true } }
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
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationStudent.findFirst({
      where: { id, companyId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, phone2: true, email: true, password: true } },
        enrollments: {
          include: {
            package: { include: { subject: { select: { id: true, name: true } } } },
            teacher: { select: { id: true, name: true } }
          }
        }
      }
    });
    if (!data) return res.status(404).json({ success: false, error: 'الطالب غير موجود' });
    if (data.customer) {
      data.customer.hasPassword = !!data.customer.password;
      delete data.customer.password;
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الطالب' });
  }
};

const create = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    let { customerId, firstName, lastName, phone, phone2, address, gender, grade, subjects, notes, guardianName, guardianPhone, guardianPhone2, guardianEmail, guardianPassword, isSelfGuardian } = req.body;
    if (!firstName || !firstName.trim()) return res.status(400).json({ success: false, error: 'اسم الطالب مطلوب' });

    const safeLastName = (lastName && typeof lastName === 'string' && lastName.trim()) ? lastName.trim() : '';
    const safeGender = normalizeGender(gender);
    const safePhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;
    const safePhone2 = (phone2 && typeof phone2 === 'string' && phone2.trim()) ? phone2.trim() : null;
    const safeAddress = (address && typeof address === 'string' && address.trim()) ? address.trim() : null;
    const safeGuardianPhone2 = (guardianPhone2 && typeof guardianPhone2 === 'string' && guardianPhone2.trim())
      ? guardianPhone2.trim()
      : (isSelfGuardian ? safePhone2 : null);
    let safeSubjects = [];
    if (Array.isArray(subjects)) {
      safeSubjects = subjects.filter(Boolean);
    } else if (typeof subjects === 'string' && subjects.trim()) {
      try {
        const parsed = JSON.parse(subjects);
        safeSubjects = Array.isArray(parsed) ? parsed : [subjects.trim()];
      } catch {
        safeSubjects = [subjects.trim()];
      }
    }
    const safeGrade = (grade && typeof grade === 'string' && grade.trim()) ? grade.trim() : null;
    const safeNotes = (notes && typeof notes === 'string' && notes.trim()) ? notes.trim() : null;
    const safeGuardianEmail = (guardianEmail && typeof guardianEmail === 'string' && guardianEmail.trim())
      ? guardianEmail.trim().toLowerCase()
      : null;
    if (safeGuardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeGuardianEmail)) {
      return res.status(400).json({ success: false, error: 'صيغة البريد الإلكتروني لولي الأمر غير صحيحة' });
    }

    if (guardianPassword && typeof guardianPassword === 'string' && guardianPassword.trim()) {
      if (guardianPassword.trim().length < 6) {
        return res.status(400).json({ success: false, error: 'كلمة مرور ولي الأمر يجب ألا تقل عن 6 أحرف' });
      }
    }

    const safeHashedPassword = (guardianPassword && typeof guardianPassword === 'string' && guardianPassword.trim())
      ? await hashPassword(guardianPassword.trim())
      : null;

    if (!customerId) {
      const typedGuardianName = (guardianName && typeof guardianName === 'string') ? guardianName.trim() : '';
      const gPhone = (guardianPhone && typeof guardianPhone === 'string' && guardianPhone.trim())
        ? guardianPhone.trim()
        : (safePhone || null);

      // ممنوع نعمل عميل باسم «ولي أمر —» من غير رقم: كان بيسيب ولي أمر وهمي
      // في الـ CRM وبيرمي الاسم والرقم اللي المستخدم كتبهم.
      if (!typedGuardianName && !isSelfGuardian) {
        return res.status(400).json({
          success: false,
          error: 'لازم تختار ولي أمر موجود، أو تكتب اسم ولي الأمر ورقم هاتفه'
        });
      }
      if (!gPhone) {
        return res.status(400).json({
          success: false,
          error: 'رقم هاتف ولي الأمر مطلوب — من غيره مش هنقدر نتواصل معاه'
        });
      }

      let gFirstName;
      let gLastName;
      if (typedGuardianName) {
        const parts = typedGuardianName.split(/\s+/);
        gFirstName = parts[0];
        gLastName = parts.slice(1).join(' ');
      } else {
        gFirstName = firstName.trim();
        gLastName = safeLastName;
      }

      let customer = null;
      if (gPhone) {
        customer = await getSharedPrismaClient().customer.findFirst({
          where: { companyId, phone: gPhone }
        });
      }

      if (!customer) {
        customer = await getSharedPrismaClient().customer.create({
          data: {
            companyId,
            firstName: gFirstName,
            lastName: gLastName,
            phone: gPhone,
            phone2: safeGuardianPhone2,
            status: 'ACTIVE',
            email: safeGuardianEmail,
            password: safeHashedPassword
          }
        });
      }
      else if (safeGuardianEmail || safeHashedPassword || safeGuardianPhone2) {
        const custUpdate = {};
        if (safeGuardianEmail) custUpdate.email = safeGuardianEmail;
        if (safeHashedPassword) custUpdate.password = safeHashedPassword;
        if (safeGuardianPhone2) custUpdate.phone2 = safeGuardianPhone2;
        customer = await getSharedPrismaClient().customer.update({
          where: { id: customer.id },
          data: custUpdate
        });
      }
      customerId = customer.id;
    } else {
      let customer = await getSharedPrismaClient().customer.findFirst({ where: { id: customerId, companyId } });
      if (!customer) return res.status(400).json({ success: false, error: 'ولي الأمر غير موجود' });
      if (safeGuardianEmail || safeHashedPassword || safeGuardianPhone2) {
        const custUpdate = {};
        if (safeGuardianEmail) custUpdate.email = safeGuardianEmail;
        if (safeHashedPassword) custUpdate.password = safeHashedPassword;
        if (safeGuardianPhone2) custUpdate.phone2 = safeGuardianPhone2;
        await getSharedPrismaClient().customer.update({
          where: { id: customer.id },
          data: custUpdate
        });
      }
    }

    const data = await getSharedPrismaClient().educationStudent.create({
      data: {
        companyId,
        customerId,
        firstName: firstName.trim(),
        lastName: safeLastName,
        phone: safePhone,
        phone2: safePhone2,
        address: safeAddress,
        gender: safeGender,
        grade: safeGrade,
        subjects: safeSubjects,
        notes: safeNotes
      },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true, phone2: true, email: true } } }
    });
    const studentFullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    logEducationEvent({
      companyId,
      action: 'CREATE_STUDENT',
      entityType: 'STUDENT',
      entityId: data.id,
      entityName: studentFullName,
      description: `تم تسجيل طالب جديد: ${studentFullName} (${data.grade || 'بدون مرحلة'} - هاتف: ${data.phone || 'غير مسجل'})`,
      details: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        grade: data.grade,
        customerId: data.customerId,
      },
      req,
    }).catch(e => console.error('[StudentAudit]', e.message));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في إنشاء الطالب' });
  }
};

const update = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { customerId, firstName, lastName, phone, phone2, address, gender, grade, subjects, notes, isActive, guardianEmail, guardianPassword, guardianPhone2 } = req.body;

    const existing = await getSharedPrismaClient().educationStudent.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطالب غير موجود' });

    const safeCustomerId = (customerId && typeof customerId === 'string' && customerId.trim())
      ? customerId.trim()
      : undefined;

    if (safeCustomerId && safeCustomerId !== existing.customerId) {
      const cust = await getSharedPrismaClient().customer.findFirst({ where: { id: safeCustomerId, companyId } });
      if (!cust) return res.status(400).json({ success: false, error: 'ولي الأمر غير موجود' });
    }

    const targetCustomerId = safeCustomerId || existing.customerId;
    if (targetCustomerId && (guardianEmail !== undefined || guardianPassword || guardianPhone2 !== undefined)) {
      const custUpdate = {};
      if (guardianPhone2 !== undefined) {
        custUpdate.phone2 = (guardianPhone2 && typeof guardianPhone2 === 'string' && guardianPhone2.trim()) ? guardianPhone2.trim() : null;
      }
      if (guardianEmail !== undefined && typeof guardianEmail === 'string' && guardianEmail.trim()) {
        const trimmedEmail = guardianEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          return res.status(400).json({ success: false, error: 'صيغة البريد الإلكتروني لولي الأمر غير صحيحة' });
        }
        custUpdate.email = trimmedEmail;
      }
      if (guardianPassword && typeof guardianPassword === 'string' && guardianPassword.trim()) {
        if (guardianPassword.trim().length < 6) {
          return res.status(400).json({ success: false, error: 'كلمة مرور ولي الأمر يجب ألا تقل عن 6 أحرف' });
        }
        custUpdate.password = await hashPassword(guardianPassword.trim());
      }
      if (Object.keys(custUpdate).length > 0) {
        await getSharedPrismaClient().customer.update({
          where: { id: targetCustomerId },
          data: custUpdate
        });
      }
    }

    const safeLastName = lastName !== undefined ? ((lastName && typeof lastName === 'string' && lastName.trim()) ? lastName.trim() : '') : undefined;
    const safeGender = gender !== undefined ? normalizeGender(gender) : undefined;
    const safePhone = phone !== undefined ? ((phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null) : undefined;
    const safePhone2 = phone2 !== undefined ? ((phone2 && typeof phone2 === 'string' && phone2.trim()) ? phone2.trim() : null) : undefined;
    const safeAddress = address !== undefined ? ((address && typeof address === 'string' && address.trim()) ? address.trim() : null) : undefined;
    let safeSubjects = undefined;
    if (subjects !== undefined) {
      if (Array.isArray(subjects)) {
        safeSubjects = subjects.filter(Boolean);
      } else if (typeof subjects === 'string' && subjects.trim()) {
        try {
          const parsed = JSON.parse(subjects);
          safeSubjects = Array.isArray(parsed) ? parsed : [subjects.trim()];
        } catch {
          safeSubjects = [subjects.trim()];
        }
      } else {
        safeSubjects = [];
      }
    }
    const safeGrade = grade !== undefined ? ((grade && typeof grade === 'string' && grade.trim()) ? grade.trim() : null) : undefined;
    const safeNotes = notes !== undefined ? ((notes && typeof notes === 'string' && notes.trim()) ? notes.trim() : null) : undefined;

    const data = await getSharedPrismaClient().educationStudent.update({
      where: { id },
      data: {
        customerId: safeCustomerId,
        firstName: firstName ? firstName.trim() : undefined,
        lastName: safeLastName,
        phone: safePhone,
        phone2: safePhone2,
        address: safeAddress,
        gender: safeGender,
        grade: safeGrade,
        subjects: safeSubjects,
        notes: safeNotes,
        isActive
      },
      include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true, phone2: true, email: true } } }
    });

    const studentFullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    logEducationEvent({
      companyId,
      action: 'UPDATE_STUDENT',
      entityType: 'STUDENT',
      entityId: data.id,
      entityName: studentFullName,
      description: `تم تحديث بيانات الطالب: ${studentFullName}`,
      details: {
        before: { firstName: existing.firstName, lastName: existing.lastName, phone: existing.phone, grade: existing.grade, isActive: existing.isActive },
        after: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, grade: data.grade, isActive: data.isActive }
      },
      req,
    }).catch(e => console.error('[StudentAudit]', e.message));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث الطالب' });
  }
};

const remove = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const existing = await getSharedPrismaClient().educationStudent.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطالب غير موجود' });

    await getSharedPrismaClient().educationStudent.delete({ where: { id } });

    const studentFullName = `${existing.firstName || ''} ${existing.lastName || ''}`.trim();
    logEducationEvent({
      companyId,
      action: 'DELETE_STUDENT',
      entityType: 'STUDENT',
      entityId: id,
      entityName: studentFullName,
      description: `تم حذف الطالب: ${studentFullName}`,
      details: { deletedStudent: existing },
      severity: 'HIGH',
      req,
    }).catch(e => console.error('[StudentAudit]', e.message));

    res.json({ success: true, message: 'تم حذف الطالب' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في حذف الطالب' });
  }
};

const searchGuardians = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const rawQ = req.query.q || req.query.query || '';
    const q = typeof rawQ === 'string' ? rawQ.trim() : '';
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const customers = await getSharedPrismaClient().customer.findMany({
      where: {
        companyId,
        OR: [
          { phone: { contains: q } },
          { phone2: { contains: q } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        phone2: true,
        email: true
      },
      take: 15,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Error searching guardians:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء البحث' });
  }
};

module.exports = { getAll, getById, create, update, remove, searchGuardians };
