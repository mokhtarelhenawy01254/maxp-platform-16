/**
 * سياسة الوصول لمسير الرواتب (TICKET-2026-11-06-RBAC-01 · F-02)
 *
 * المشكلة: كل مسارات الرواتب كانت مسموحة لدور MANAGER — بما فيها الاعتماد والصرف
 * والحذف — فكان نفس الشخص يقدر ينشئ كشف الراتب ويعتمده ويصرفه ويحذف أثره.
 * دور MANAGER في الـ seed لا يملك hr.payroll أصلًا.
 *
 * القاعدة:
 *  - القراءة/الإنشاء/التوليد/التعديل: ADMIN/OWNER/MANAGER (كما هي — لا تراجع وظيفي)
 *  - الاعتماد/الصرف/الحذف: SUPER_ADMIN / OWNER / COMPANY_ADMIN فقط (على مستوى الـ route)
 *  - لا أحد يعتمد أو يصرف كشفًا أنشأه بنفسه، إلا OWNER/SUPER_ADMIN
 *    (شركة بمالك واحد لازم يقدر يعتمد مسيره، وإلا تعطّل النظام).
 *
 * السجل يستخدم HRAuditLog (action: CREATE, entityType: PAYROLL) — بدون أي تغيير
 * على الـ schema.
 */

const PRIVILEGED_PAYROLL_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'OWNER',
  'COMPANY_ADMIN',
]);

const SELF_APPROVAL_EXEMPT_ROLES = Object.freeze(['SUPER_ADMIN', 'OWNER']);

const CREATE_ACTION = 'CREATE';
const ENTITY_TYPE = 'PAYROLL';

const normalizeRole = (role) =>
  typeof role === 'string' ? role.trim().toUpperCase() : '';

/**
 * يسجّل منشئ كشف الراتب حتى نستطيع لاحقًا منع الاعتماد الذاتي.
 * لا يرمي أخطاء أبدًا — التسجيل التشخيصي يجب ألا يعطّل إنشاء الراتب.
 */
const recordPayrollCreation = async (
  prisma,
  { companyId, actorId, actorName = null, payrollId, details = {} }
) => {
  try {
    if (!prisma || !companyId || !actorId || !payrollId) return;
    let resolvedName = actorName;
    if (!resolvedName) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { firstName: true, lastName: true },
      });
      resolvedName = actor ? `${actor.firstName || ''} ${actor.lastName || ''}`.trim() : null;
    }
    await prisma.hRAuditLog.create({
      data: {
        companyId,
        actorId,
        actorName: resolvedName || 'Unknown User',
        action: CREATE_ACTION,
        entityType: ENTITY_TYPE,
        entityId: String(payrollId),
        details,
      },
    });
  } catch (error) {
    console.warn('⚠️ [Payroll] تعذر تسجيل منشئ كشف الراتب:', error.message);
  }
};

/**
 * هل هذا المستخدم هو من أنشأ كشف الراتب؟
 * @returns {Promise<boolean>}
 */
const didActorCreatePayroll = async (prisma, { companyId, actorId, payrollId }) => {
  if (!prisma || !companyId || !actorId || !payrollId) return false;
  try {
    const existing = await prisma.hRAuditLog.findFirst({
      where: {
        companyId,
        actorId,
        action: CREATE_ACTION,
        entityType: ENTITY_TYPE,
        entityId: String(payrollId),
      },
      select: { id: true },
    });
    return Boolean(existing);
  } catch (error) {
    console.warn('⚠️ [Payroll] تعذر التحقق من منشئ كشف الراتب:', error.message);
    return false;
  }
};

const buildSelfApprovalError = () => {
  const error = new Error(
    'لا يمكنك اعتماد أو صرف كشف راتب أنشأته بنفسك. اطلب من مسؤول آخر اعتماده.'
  );
  error.statusCode = 409;
  error.code = 'SELF_APPROVAL_FORBIDDEN';
  return error;
};

module.exports = {
  PRIVILEGED_PAYROLL_ROLES,
  SELF_APPROVAL_EXEMPT_ROLES,
  recordPayrollCreation,
  didActorCreatePayroll,
  buildSelfApprovalError,
  normalizeRole,
};
