const { createPortalTokenVerifier } = require('./portalAuthFactory');

const authenticateTeacherToken = createPortalTokenVerifier({
  role: 'TEACHER',
  idClaimKeys: ['teacherId', 'id'],
  model: 'educationTeacher',
  attachAs: 'teacher',
  select: {
    id: true,
    name: true,
    email: true,
    phone: true,
    companyId: true,
    isActive: true,
    avatarUrl: true,
  },
  isInactive: (t) => !t.isActive,
  getActorName: (t) => t.name || '',
  messages: {
    missingToken: 'رمز المصادقة مطلوب',
    invalid: 'رمز المصادقة غير صحيح',
    notFound: 'المدرس غير موجود',
    inactive: 'الحساب غير نشط',
  },
});

module.exports = { authenticateTeacherToken };
