const { createPortalTokenVerifier } = require('./portalAuthFactory');

const authenticateParentToken = createPortalTokenVerifier({
  role: 'PARENT',
  idClaimKeys: ['parentId', 'id'],
  model: 'customer',
  attachAs: 'parent',
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    companyId: true,
    status: true,
    avatar: true,
  },
  isInactive: (p) => p.status === 'BLOCKED' || p.status === 'INACTIVE',
  getActorName: (p) => [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
  messages: {
    missingToken: 'رمز المصادقة مطلوب',
    invalid: 'رمز المصادقة غير صحيح',
    notFound: 'ولي الأمر غير موجود',
    inactive: 'الحساب غير نشط',
  },
});

module.exports = { authenticateParentToken };
