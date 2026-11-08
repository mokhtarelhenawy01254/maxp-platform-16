const { getSharedPrismaClient } = require('../services/sharedDatabase');

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
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const data = await getSharedPrismaClient().educationStudent.findFirst({
      where: { id, companyId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, password: true } },
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

    let { customerId, firstName, lastName, phone, gender, grade, notes, guardianName, guardianPhone, isSelfGuardian } = req.body;
    if (!firstName || !firstName.trim()) return res.status(400).json({ success: false, error: 'اسم الطالب مطلوب' });

    const safeLastName = (lastName && typeof lastName === 'string' && lastName.trim()) ? lastName.trim() : '';
    const safeGender = normalizeGender(gender);
    const safePhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;
    const safeGrade = (grade && typeof grade === 'string' && grade.trim()) ? grade.trim() : null;
    const safeNotes = (notes && typeof notes === 'string' && notes.trim()) ? notes.trim() : null;

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
            status: 'ACTIVE'
          }
        });
      }
      customerId = customer.id;
    } else {
      const customer = await getSharedPrismaClient().customer.findFirst({ where: { id: customerId, companyId } });
      if (!customer) return res.status(400).json({ success: false, error: 'ولي الأمر غير موجود' });
    }

    const data = await getSharedPrismaClient().educationStudent.create({
      data: {
        companyId,
        customerId,
        firstName: firstName.trim(),
        lastName: safeLastName,
        phone: safePhone,
        gender: safeGender,
        grade: safeGrade,
        notes: safeNotes
      },
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
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const { id } = req.params;
    const { customerId, firstName, lastName, phone, gender, grade, notes, isActive } = req.body;

    const existing = await getSharedPrismaClient().educationStudent.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ success: false, error: 'الطالب غير موجود' });

    const safeCustomerId = (customerId && typeof customerId === 'string' && customerId.trim())
      ? customerId.trim()
      : undefined;

    if (safeCustomerId && safeCustomerId !== existing.customerId) {
      const cust = await getSharedPrismaClient().customer.findFirst({ where: { id: safeCustomerId, companyId } });
      if (!cust) return res.status(400).json({ success: false, error: 'ولي الأمر غير موجود' });
    }

    const safeLastName = lastName !== undefined ? ((lastName && typeof lastName === 'string' && lastName.trim()) ? lastName.trim() : '') : undefined;
    const safeGender = gender !== undefined ? normalizeGender(gender) : undefined;
    const safePhone = phone !== undefined ? ((phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null) : undefined;
    const safeGrade = grade !== undefined ? ((grade && typeof grade === 'string' && grade.trim()) ? grade.trim() : null) : undefined;
    const safeNotes = notes !== undefined ? ((notes && typeof notes === 'string' && notes.trim()) ? notes.trim() : null) : undefined;

    const data = await getSharedPrismaClient().educationStudent.update({
      where: { id },
      data: {
        customerId: safeCustomerId,
        firstName: firstName ? firstName.trim() : undefined,
        lastName: safeLastName,
        phone: safePhone,
        gender: safeGender,
        grade: safeGrade,
        notes: safeNotes,
        isActive
      },
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
    const companyId = req.user?.companyId || req.user?.effectiveCompanyId;
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
