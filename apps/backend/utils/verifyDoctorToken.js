const { createPortalTokenVerifier } = require('./portalAuthFactory');

const authenticateDoctorToken = createPortalTokenVerifier({
  role: 'DOCTOR',
  idClaimKeys: ['doctorId', 'id'],
  model: 'bookingDoctor',
  attachAs: 'doctor',
  select: {
    id: true,
    title: true,
    name: true,
    email: true,
    phone: true,
    companyId: true,
    branchId: true,
    isActive: true,
    avatarUrl: true,
    specialty: true,
    consultationFee: true,
  },
  isInactive: (d) => !d.isActive,
  getActorName: (d) => d.name || '',
  messages: {
    missingToken: 'رمز المصادقة مطلوب',
    invalid: 'رمز المصادقة غير صحيح',
    notFound: 'الطبيب غير موجود',
    inactive: 'الحساب غير نشط',
  },
});

module.exports = { authenticateDoctorToken };
