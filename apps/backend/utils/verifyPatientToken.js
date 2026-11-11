const { createPortalTokenVerifier } = require('./portalAuthFactory');

const authenticatePatientToken = createPortalTokenVerifier({
  role: 'PATIENT',
  idClaimKeys: ['patientId', 'id'],
  model: 'patient',
  attachAs: 'patient',
  select: {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    companyId: true,
    isActive: true,
  },
  isInactive: (p) => !p.isActive,
  getActorName: (p) => [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
  messages: {
    missingToken: 'رمز المصادقة مطلوب',
    invalid: 'رمز المصادقة غير صحيح',
    notFound: 'المريض غير موجود',
    inactive: 'الحساب غير نشط',
  },
});

module.exports = { authenticatePatientToken };
