const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');
const { logEducationEvent } = require('../services/educationAuditService');
const { getSingularTeacherLabel } = require('../services/educationLabelService');
const { resolvePortalLoginCandidates, verifySecretHash } = require('../utils/portalAuthFactory');

const login = async (req, res) => {
  try {
    const rawIdentifier = req.body?.email || req.body?.phone || req.body?.identifier;
    const { password } = req.body || {};
    if (!rawIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const bodyCompanyId = req.body?.companyId ? String(req.body.companyId).trim() : null;
    if (req.company?.id && bodyCompanyId && bodyCompanyId !== req.company.id) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_HOST_MISMATCH',
        message: 'تعارض في معرف الشركة مع النطاق الحالي',
      });
    }

    const targetCompanyId = req.company?.id || bodyCompanyId || null;
    const prisma = getSharedPrismaClient();
    const result = await resolvePortalLoginCandidates({
      prisma,
      model: 'educationTeacher',
      identifier: String(rawIdentifier).trim(),
      companyId: targetCompanyId,
      whereExtra: { isActive: true },
      select: {
        id: true, name: true, email: true, phone: true, password: true,
        companyId: true, avatarUrl: true, bio: true, qualifications: true,
        subjectRates: { include: { subject: { select: { id: true, name: true } } } }
      },
      includeCompanyRelation: true,
      searchFields: { phoneFields: ['phone'], emailFields: ['email'] },
      verifySecret: (candidate) => verifySecretHash(password, candidate.password),
      formatCompanyOption: (candidate, comp) => ({
        companyId: candidate.companyId,
        companyName: comp?.name || '',
        companySlug: comp?.slug || null,
        companyLogo: comp?.logo || null,
        label: comp?.name || '',
      }),
    });

    if (result.status === 'select_company') {
      return res.status(200).json({
        success: false,
        requiresCompanySelection: true,
        code: 'COMPANY_SELECTION_REQUIRED',
        message: 'تم العثور على حسابك في أكثر من جهة — اختر الجهة للمتابعة',
        companies: result.companies,
      });
    }

    if (result.status === 'inactive_company') {
      return res.status(403).json({
        success: false,
        message: 'حساب الجهة غير نشط حالياً',
      });
    }

    if (result.status === 'invalid' || !result.actor) {
      return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const teacher = result.actor;
    const token = jwt.sign(
      { teacherId: teacher.id, companyId: teacher.companyId, role: 'TEACHER' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...teacherData } = teacher;
    const teacherLabel = await getSingularTeacherLabel(teacher.companyId, 'ar');

    logEducationEvent({
      companyId: teacher.companyId,
      action: 'TEACHER_LOGIN',
      entityType: 'PORTAL',
      entityId: teacher.id,
      entityName: teacher.name,
      description: `تسجيل دخول ${teacherLabel} ${teacher.name} إلى بوابة التدريس`,
      actorType: 'TEACHER',
      userName: teacher.name,
      userRole: 'TEACHER',
      req,
    }).catch(e => console.error('[TeacherLoginAudit]', e.message));

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: { teacher: teacherData, token, company: result.company || null, expiresIn: '24h' }
    });
  } catch (error) {
    console.error('[TeacherAuth] Login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الدخول' });
  }
};

const me = async (req, res) => {
  try {
    const teacherId = req.teacher?.id;
    const companyId = req.teacher?.companyId;
    if (!teacherId || !companyId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const teacher = await prisma.educationTeacher.findFirst({
      where: { id: teacherId, companyId },
      select: {
        id: true, name: true, email: true, phone: true, companyId: true,
        avatarUrl: true, bio: true, qualifications: true, isActive: true,
        subjectRates: { include: { subject: { select: { id: true, name: true } } } }
      }
    });

    if (!teacher) return res.status(404).json({ success: false, message: 'المدرس غير موجود' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    console.error('[TeacherAuth] Me error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
};

const changePassword = async (req, res) => {
  try {
    const teacherId = req.teacher?.id;
    const companyId = req.teacher?.companyId;
    if (!teacherId || !companyId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    const prisma = getSharedPrismaClient();
    const teacher = await prisma.educationTeacher.findFirst({
      where: { id: teacherId, companyId },
      select: { id: true, password: true }
    });

    if (!teacher || !teacher.password) {
      return res.status(400).json({ success: false, message: 'لا يمكن تغيير كلمة المرور' });
    }

    const isValid = await verifySecretHash(currentPassword, teacher.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.educationTeacher.updateMany({
      where: { id: teacherId, companyId },
      data: { password: hashedPassword }
    });

    if (!updated || updated.count !== 1) {
      return res.status(404).json({ success: false, message: 'المدرس غير موجود' });
    }

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('[TeacherAuth] Change password error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

module.exports = { login, me, changePassword };
