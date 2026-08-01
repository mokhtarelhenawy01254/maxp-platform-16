const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');

const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني أو الهاتف وكلمة المرور مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier },
        ],
        isActive: true,
      },
      select: {
        id: true, title: true, name: true, email: true, phone: true, password: true,
        companyId: true, branchId: true, avatarUrl: true, specialty: true,
        consultationFee: true, commissionRate: true,
      },
    });

    if (!doctor || !doctor.password) {
      return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const isPasswordValid = await bcrypt.compare(password, doctor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { doctorId: doctor.id, companyId: doctor.companyId, role: 'DOCTOR' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...doctorData } = doctor;
    res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', data: { doctor: doctorData, token, expiresIn: '24h' } });
  } catch (error) {
    console.error('[DoctorAuth] Login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الدخول' });
  }
};

const me = async (req, res) => {
  try {
    const doctorId = req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true, title: true, name: true, email: true, phone: true, companyId: true,
        branchId: true, avatarUrl: true, specialty: true, consultationFee: true,
        commissionRate: true, bio: true, isActive: true,
        branch: { select: { id: true, name: true } },
      },
    });

    if (!doctor) return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[DoctorAuth] Me error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ' });
  }
};

const changePassword = async (req, res) => {
  try {
    const doctorId = req.doctor?.id;
    if (!doctorId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    const prisma = getSharedPrismaClient();
    const doctor = await prisma.bookingDoctor.findUnique({ where: { id: doctorId }, select: { password: true } });

    if (!doctor || !doctor.password) {
      return res.status(400).json({ success: false, message: 'لا يمكن تغيير كلمة المرور' });
    }

    const isValid = await bcrypt.compare(currentPassword, doctor.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    await prisma.bookingDoctor.update({ where: { id: doctorId }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('[DoctorAuth] Change password error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

module.exports = { login, me, changePassword };
