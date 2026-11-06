/**
 * TICKET-2026-11-06-RBAC-01 (follow-up bug)
 * تعديل نوع العقد من فورم الموظف كان بيضيع: القيمة كانت بتتحدّث على User فقط
 * بينما القراءة بتفضّل سجل HR، والقيم كانت بتتحول لـ enum غلط (INTERN/CONTRACTOR
 * مش موجودين في ContractType الخاص بـ Employee).
 */
const {
  EMPLOYEE_CONTRACT_TYPES,
  USER_CONTRACT_TYPES,
  normalizeEmployeeContractType,
  normalizeUserContractType,
} = require('../../utils/hrContractType');

describe('hrContractType normalizers', () => {
  test('employee enums match the Prisma ContractType enum', () => {
    expect(EMPLOYEE_CONTRACT_TYPES).toEqual([
      'FULL_TIME',
      'PART_TIME',
      'CONTRACT',
      'TEMPORARY',
      'INTERNSHIP',
      'FREELANCE',
    ]);
    expect(USER_CONTRACT_TYPES).toEqual([
      'FULL_TIME',
      'PART_TIME',
      'CONTRACTOR',
      'INTERN',
    ]);
  });

  test('employee normalizer keeps values valid for the Employee enum', () => {
    expect(normalizeEmployeeContractType('FULL_TIME')).toBe('FULL_TIME');
    expect(normalizeEmployeeContractType('part_time')).toBe('PART_TIME');
    expect(normalizeEmployeeContractType('CONTRACT')).toBe('CONTRACT');
    expect(normalizeEmployeeContractType('TEMPORARY')).toBe('TEMPORARY');
    expect(normalizeEmployeeContractType('INTERNSHIP')).toBe('INTERNSHIP');
    expect(normalizeEmployeeContractType('FREELANCE')).toBe('FREELANCE');
  });

  test('employee normalizer translates User-only enum values', () => {
    expect(normalizeEmployeeContractType('INTERN')).toBe('INTERNSHIP');
    expect(normalizeEmployeeContractType('CONTRACTOR')).toBe('CONTRACT');
  });

  test('user normalizer collapses to the UsersContractType enum', () => {
    expect(normalizeUserContractType('PART_TIME')).toBe('PART_TIME');
    expect(normalizeUserContractType('INTERNSHIP')).toBe('INTERN');
    expect(normalizeUserContractType('CONTRACT')).toBe('CONTRACTOR');
    expect(normalizeUserContractType('TEMPORARY')).toBe('CONTRACTOR');
    expect(normalizeUserContractType('FREELANCE')).toBe('CONTRACTOR');
  });

  test('unknown / empty values resolve to null instead of an invalid enum write', () => {
    expect(normalizeEmployeeContractType('')).toBeNull();
    expect(normalizeEmployeeContractType(undefined)).toBeNull();
    expect(normalizeEmployeeContractType(null)).toBeNull();
    expect(normalizeEmployeeContractType('WHATEVER')).toBeNull();
    expect(normalizeUserContractType('WHATEVER')).toBeNull();
  });
});
