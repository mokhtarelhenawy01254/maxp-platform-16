const jwt = require('jsonwebtoken');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const { getJwtSecret } = require('./jwtSecret');

const dentalPortalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'رمز المصادقة مطلوب' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const dentistId = decoded.dentistId || decoded.id;
    if (!dentistId || decoded.role !== 'DENTAL_DOCTOR') {
      return res.status(401).json({ success: false, error: 'رمز المصادقة غير صحيح' });
    }

    const prisma = await getSharedPrismaClientAsync();
    const dentist = await prisma.dentalLabDoctor.findUnique({
      where: { id: dentistId },
      select: {
        id: true,
        companyId: true,
        name: true,
        phone: true,
        clinicName: true,
        governorate: true,
        creditLimit: true,
        isActive: true,
      },
    });

    if (!dentist) {
      return res.status(401).json({ success: false, error: 'الطبيب غير موجود' });
    }
    if (!dentist.isActive) {
      return res.status(403).json({ success: false, error: 'الحساب غير نشط' });
    }

    req.dentist = dentist;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'رمز المصادقة غير صحيح' });
  }
};

module.exports = { dentalPortalAuth };