/**
 * نوع العقد في MaxP موجود في مكانين بقيمتين مختلفتين:
 *   - User.contractType   → enum UsersContractType  (FULL_TIME | PART_TIME | CONTRACTOR | INTERN)
 *   - Employee.contractType → enum ContractType     (FULL_TIME | PART_TIME | CONTRACT | TEMPORARY | INTERNSHIP | FREELANCE)
 *
 * الواجهة ترسل قيم ContractType. لازم نحوّلها صح لكل موديل، وإلا Prisma بيرفض
 * القيمة (أو — الأسوأ — التحديث يروح لـ User بس وسجل HR يفضل قديم، فيظهر
 * للمستخدم إن التعديل "ما اتحفظش").
 */

const EMPLOYEE_CONTRACT_TYPES = Object.freeze([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'TEMPORARY',
  'INTERNSHIP',
  'FREELANCE',
]);

const USER_CONTRACT_TYPES = Object.freeze([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
  'INTERN',
]);

/**
 * يحوّل قيمة قادمة من الواجهة إلى قيمة صالحة في enum الـ Employee.
 * @param {unknown} value
 * @returns {string|null} قيمة صالحة أو null لو القيمة فاضية/غير معروفة
 */
const normalizeEmployeeContractType = (value) => {
  if (value === undefined || value === null) return null;
  const type = String(value).trim().toUpperCase();
  if (!type) return null;
  // توافقية: بعض الشاشات بترسل قيم enum الخاص بالـ User
  if (type === 'INTERN') return 'INTERNSHIP';
  if (type === 'CONTRACTOR') return 'CONTRACT';
  return EMPLOYEE_CONTRACT_TYPES.includes(type) ? type : null;
};

/**
 * يحوّل قيمة قادمة من الواجهة إلى قيمة صالحة في enum الـ User.
 * @param {unknown} value
 * @returns {string|null}
 */
const normalizeUserContractType = (value) => {
  if (value === undefined || value === null) return null;
  const type = String(value).trim().toUpperCase();
  if (!type) return null;
  if (type === 'INTERNSHIP') return 'INTERN';
  if (['CONTRACT', 'TEMPORARY', 'FREELANCE'].includes(type)) return 'CONTRACTOR';
  return USER_CONTRACT_TYPES.includes(type) ? type : null;
};

module.exports = {
  EMPLOYEE_CONTRACT_TYPES,
  USER_CONTRACT_TYPES,
  normalizeEmployeeContractType,
  normalizeUserContractType,
};
