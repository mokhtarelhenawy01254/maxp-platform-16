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

    // Check if the dental lab company has an active subscription for dental-lab-app (H8)
    const company = await prisma.company.findUnique({
      where: { id: dentist.companyId },
      select: {
        trialModeEnabled: true,
        trialEndsAt: true,
        installedApps: {
          where: { status: { in: ['ACTIVE', 'TRIAL', 'active', 'trial'] } },
          select: { app: { select: { slug: true } } },
        },
      },
    });
    const hasDentalApp = company?.installedApps?.some((a) => ['dental-lab-app', 'dental-lab'].includes(a.app?.slug));
    const isTrial = company?.trialModeEnabled && company?.trialEndsAt && new Date(company.trialEndsAt) > new Date();
    if (!hasDentalApp && !isTrial) {
      return res.status(403).json({ success: false, error: 'اشتراك معمل الأسنان غير مفعل حالياً، يرجى مراجعة إدارة المعمل' });
    }

    req.dentist = dentist;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'رمز المصادقة غير صحيح' });
  }
};

module.exports = { dentalPortalAuth };