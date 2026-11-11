const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');
const { resolvePortalLoginCandidates, verifySecretHash } = require('../utils/portalAuthFactory');

const login = async (req, res) => {
  try {
    const { phone, email, identifier: rawIdentifier, password } = req.body || {};
    const identifier = phone || email || rawIdentifier;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف أو البريد الإلكتروني وكلمة المرور مطلوبان' });
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
      model: 'patient',
      identifier: String(identifier).trim(),
      companyId: targetCompanyId,
      whereExtra: { isActive: true },
      select: {
        id: true, firstName: true, lastName: true, phone: true, email: true,
        password: true, companyId: true, gender: true, bloodType: true,
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
      return res.status(401).json({ success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }

    const patient = result.actor;
    const token = jwt.sign(
      { patientId: patient.id, companyId: patient.companyId, role: 'PATIENT' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...patientData } = patient;
    res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', data: { patient: patientData, token, company: result.company || null, expiresIn: '24h' } });
  } catch (error) {
    console.error('[PatientAuth] Login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الدخول' });
  }
};

const me = async (req, res) => {
  try {
    const patientId = req.patient?.id;
    const companyId = req.patient?.companyId;
    if (!patientId || !companyId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, companyId },
      select: {
        id: true, firstName: true, lastName: true, phone: true, email: true,
        companyId: true, gender: true, birthDate: true, bloodType: true,
        allergies: true, chronicDiseases: true, medications: true, isActive: true,
      },
    });

    if (!patient) return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('[PatientAuth] Me error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
};

const changePassword = async (req, res) => {
  try {
    const patientId = req.patient?.id;
    const companyId = req.patient?.companyId;
    if (!patientId || !companyId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, companyId }, select: { id: true, password: true } });

    if (!patient || !patient.password) {
      return res.status(400).json({ success: false, message: 'لا يمكن تغيير كلمة المرور' });
    }

    const isValid = await verifySecretHash(currentPassword, patient.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.patient.updateMany({ where: { id: patientId, companyId }, data: { password: hashedPassword } });
    if (!updated || updated.count !== 1) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('[PatientAuth] Change password error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

module.exports = { login, me, changePassword };
