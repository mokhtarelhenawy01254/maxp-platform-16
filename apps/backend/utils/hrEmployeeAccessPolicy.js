/**
 * 🔐 HR Employee Access Policy
 * سياسة الوصول لبيانات الموظفين — دوال نقية (بدون Prisma/Express) قابلة للاختبار مباشرة.
 *
 * TICKET-2026-11-06-RBAC-01:
 *   F-01 — allowlist صريح للأدوار القابلة للتعيين من مسار إدارة الموظفين.
 *   F-03 — إخفاء الحقول الحساسة عن المستدعين غير المصرح لهم.
 *
 * تحذير: أي تعديل هنا يغيّر سلوك مسارات HR لكل الشركات — عدّل بحذر.
 */

const { UnauthorizedError, ValidationError } = require('./hrErrors');

/**
 * نسخة JS من enum `UserCompaniesRole` في `prisma/schema/enums.prisma`.
 * يحرسها اختبار `tests/hrAccessPolicy.test.js` ضد الانحراف عن الـ schema.
 */
const USER_COMPANIES_ROLES = Object.freeze([
  'OWNER',
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'AGENT',
  'AFFILIATE',
]);

/**
 * الأدوار الوحيدة المسموح تعيينها عبر `POST/PUT /api/hr/employees`.
 * OWNER / SUPER_ADMIN ترقية على مستوى المنصة — لها مسار أدمن منفصل وليست هنا.
 */
const ASSIGNABLE_EMPLOYEE_ROLES = Object.freeze([
  'AGENT',
  'MANAGER',
  'COMPANY_ADMIN',
]);

/** أدوار من يحق لها رؤية الحقول الحساسة في قائمة الموظفين (F-03). */
const PRIVILEGED_EMPLOYEE_VIEW_ROLES = Object.freeze([
  'OWNER',
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
]);

/** الحقول التي تُحذف من استجابة قائمة الموظفين لغير المصرح لهم. */
const SENSITIVE_EMPLOYEE_FIELDS = Object.freeze([
  'baseSalary',
  'phone',
  'mobile',
  'nationalId',
  'contractType',
  'hireDate',
]);

/**
 * تطبيع قيمة الدور (بدون رمي أخطاء) — تُرجع null لو القيمة غير صالحة كنص.
 */
function normalizeRoleInput(rawRole) {
  if (typeof rawRole !== 'string') return null;
  const normalized = rawRole.trim().toUpperCase();
  return normalized || null;
}

/**
 * تتحقق من الدور المطلوب تعيينه عبر مسار إدارة الموظفين.
 *
 * - null/undefined/'' → null (لا تغيير، يستخدم المستدعي القيمة الافتراضية 'AGENT')
 * - دور غير موجود في UserCompaniesRole → 400
 * - OWNER / SUPER_ADMIN / AFFILIATE (موجود لكن غير قابل للتعيين) → 403
 * - AGENT / MANAGER / COMPANY_ADMIN → يُرجع الدور مُطبَّعاً
 *
 * @param {unknown} rawRole
 * @returns {string|null}
 */
function resolveAssignableEmployeeRole(rawRole) {
  if (rawRole === undefined || rawRole === null) return null;
  if (typeof rawRole !== 'string') {
    throw new ValidationError('قيمة الدور غير صالحة', [
      { field: 'role', message: 'role must be a string' },
    ]);
  }

  const role = normalizeRoleInput(rawRole);
  if (!role) return null;

  if (!USER_COMPANIES_ROLES.includes(role)) {
    throw new ValidationError(`الدور "${rawRole}" غير موجود في نظام الأدوار`, [
      { field: 'role', message: `allowed: ${ASSIGNABLE_EMPLOYEE_ROLES.join(', ')}` },
    ]);
  }

  if (!ASSIGNABLE_EMPLOYEE_ROLES.includes(role)) {
    throw new UnauthorizedError(
      `غير مصرح بتعيين الدور "${role}" من مسار إدارة الموظفين`,
    );
  }

  return role;
}

/**
 * هل دور المستدعي يحق له رؤية الحقول الحساسة؟
 */
function isPrivilegedEmployeeViewer(role) {
  const normalized = normalizeRoleInput(role);
  return Boolean(normalized) && PRIVILEGED_EMPLOYEE_VIEW_ROLES.includes(normalized);
}

/**
 * يحذف الحقول الحساسة من قائمة الموظفين لغير المصرح لهم.
 * للمصرح لهم تُرجع نفس المرجع كما هو (شكل الاستجابة لا يتغيّر).
 *
 * @param {Array<object>} employees
 * @param {string} role دور المستدعي (req.user.role)
 * @returns {Array<object>}
 */
function stripSensitiveEmployeeFields(employees, role) {
  if (!Array.isArray(employees)) return employees;
  if (isPrivilegedEmployeeViewer(role)) return employees;

  return employees.map((employee) => {
    if (!employee || typeof employee !== 'object') return employee;
    const safeEmployee = { ...employee };
    for (const field of SENSITIVE_EMPLOYEE_FIELDS) {
      delete safeEmployee[field];
    }
    return safeEmployee;
  });
}

module.exports = {
  USER_COMPANIES_ROLES,
  ASSIGNABLE_EMPLOYEE_ROLES,
  PRIVILEGED_EMPLOYEE_VIEW_ROLES,
  SENSITIVE_EMPLOYEE_FIELDS,
  normalizeRoleInput,
  resolveAssignableEmployeeRole,
  isPrivilegedEmployeeViewer,
  stripSensitiveEmployeeFields,
};
