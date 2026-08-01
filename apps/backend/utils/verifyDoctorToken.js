const jwt = require('jsonwebtoken');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { getJwtSecret } = require('./jwtSecret');

const authenticateDoctorToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة مطلوب' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const doctorId = decoded.doctorId || decoded.id;
    if (!doctorId) {
      return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
    }

    const prisma = await getSharedPrismaClientAsync();
    const doctor = await prisma.bookingDoctor.findUnique({
      where: { id: doctorId },
      select: { id: true, title: true, name: true, email: true, phone: true, companyId: true, branchId: true, isActive: true, avatarUrl: true, specialty: true, consultationFee: true }
    });

    if (!doctor) {
      return res.status(401).json({ success: false, message: 'الطبيب غير موجود' });
    }

    if (!doctor.isActive) {
      return res.status(403).json({ success: false, message: 'الحساب غير نشط' });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
  }
};

module.exports = { authenticateDoctorToken };
