const jwt = require('jsonwebtoken');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { getJwtSecret } = require('./jwtSecret');

const authenticatePatientToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة مطلوب' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const patientId = decoded.patientId || decoded.id;
    if (!patientId) {
      return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
    }

    const prisma = await getSharedPrismaClientAsync();
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, companyId: true, isActive: true }
    });

    if (!patient) {
      return res.status(401).json({ success: false, message: 'المريض غير موجود' });
    }

    if (!patient.isActive) {
      return res.status(403).json({ success: false, message: 'الحساب غير نشط' });
    }

    req.patient = patient;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'رمز المصادقة غير صحيح' });
  }
};

module.exports = { authenticatePatientToken };
