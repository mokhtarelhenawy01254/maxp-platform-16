const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');

const login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    const identifier = phone || email;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف أو البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true, firstName: true, lastName: true, phone: true, email: true,
        password: true, companyId: true, gender: true, bloodType: true,
      },
    });

    if (!patient || !patient.password) {
      return res.status(401).json({ success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }

    const isPasswordValid = await bcrypt.compare(password, patient.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { patientId: patient.id, companyId: patient.companyId, role: 'PATIENT' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...patientData } = patient;
    res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', data: { patient: patientData, token, expiresIn: '24h' } });
  } catch (error) {
    console.error('[PatientAuth] Login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الدخول' });
  }
};

const me = async (req, res) => {
  try {
    const patientId = req.patient?.id;
    if (!patientId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
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
    if (!patientId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    const prisma = getSharedPrismaClient();
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { password: true } });

    if (!patient || !patient.password) {
      return res.status(400).json({ success: false, message: 'لا يمكن تغيير كلمة المرور' });
    }

    const isValid = await bcrypt.compare(currentPassword, patient.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    await prisma.patient.update({ where: { id: patientId }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('[PatientAuth] Change password error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

module.exports = { login, me, changePassword };
