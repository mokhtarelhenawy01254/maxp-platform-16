const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const prisma = getSharedPrismaClient();
    const teacher = await prisma.educationTeacher.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { phone: email }
        ],
        isActive: true
      },
      select: {
        id: true, name: true, email: true, phone: true, password: true,
        companyId: true, avatarUrl: true, bio: true, qualifications: true,
        subjectRates: { include: { subject: { select: { id: true, name: true } } } }
      }
    });

    if (!teacher || !teacher.password) {
      return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const isPasswordValid = await bcrypt.compare(password, teacher.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { teacherId: teacher.id, companyId: teacher.companyId, role: 'TEACHER' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    const { password: _, ...teacherData } = teacher;
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: { teacher: teacherData, token, expiresIn: '24h' }
    });
  } catch (error) {
    console.error('[TeacherAuth] Login error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تسجيل الدخول' });
  }
};

const me = async (req, res) => {
  try {
    const teacherId = req.teacher?.id;
    if (!teacherId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const prisma = getSharedPrismaClient();
    const teacher = await prisma.educationTeacher.findUnique({
      where: { id: teacherId },
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
    if (!teacherId) return res.status(401).json({ success: false, message: 'غير مصرح' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    const prisma = getSharedPrismaClient();
    const teacher = await prisma.educationTeacher.findUnique({
      where: { id: teacherId },
      select: { password: true }
    });

    if (!teacher || !teacher.password) {
      return res.status(400).json({ success: false, message: 'لا يمكن تغيير كلمة المرور' });
    }

    const isValid = await bcrypt.compare(currentPassword, teacher.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.educationTeacher.update({
      where: { id: teacherId },
      data: { password: hashedPassword }
    });

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('[TeacherAuth] Change password error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تغيير كلمة المرور' });
  }
};

module.exports = { login, me, changePassword };
