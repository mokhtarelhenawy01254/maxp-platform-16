const jwt = require('jsonwebtoken');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { getJwtSecret } = require('./jwtSecret');

const authenticateTeacherToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة مطلوب' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const teacherId = decoded.teacherId || decoded.id;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
    }

    const prisma = await getSharedPrismaClientAsync();
    const teacher = await prisma.educationTeacher.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, email: true, phone: true, companyId: true, isActive: true, avatarUrl: true }
    });

    if (!teacher) {
      return res.status(401).json({ success: false, message: 'المدرس غير موجود' });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ success: false, message: 'الحساب غير نشط' });
    }

    req.teacher = teacher;
    req.teacher.companyId = req.teacher.companyId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
  }
};

module.exports = { authenticateTeacherToken };
