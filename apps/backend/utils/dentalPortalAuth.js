const { createPortalTokenVerifier } = require('./portalAuthFactory');

const dentalPortalAuth = createPortalTokenVerifier({
  role: 'DENTAL_DOCTOR',
  idClaimKeys: ['dentistId', 'id'],
  model: 'dentalLabDoctor',
  attachAs: 'dentist',
  errorMessageKey: 'error',
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
  isInactive: (d) => !d.isActive,
  getActorName: (d) => d.name || '',
  messages: {
    missingToken: 'رمز المصادقة مطلوب',
    invalid: 'رمز المصادقة غير صحيح',
    notFound: 'الطبيب غير موجود',
    inactive: 'الحساب غير نشط',
  },
  afterVerify: async (dentist, prisma) => {
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
      return {
        status: 403,
        body: { success: false, error: 'اشتراك معمل الأسنان غير مفعل حالياً، يرجى مراجعة إدارة المعمل' },
      };
    }
    return null;
  },
});

module.exports = { dentalPortalAuth };
