/**
 * 👤 Employee Profile Service
 * تشذيب وتجهيز الملف الشخصي للموظف دون تسريب كلمات مرور أو رموز أمان
 */

const SELF_FIELDS = [
  'id', 'employeeNumber', 'firstName', 'lastName', 'email', 'phone', 'hireDate',
  'contractType', 'workLocation', 'status', 'baseSalary', 'currency',
  'annualLeaveBalance', 'sickLeaveBalance'
];

function toSelfProfile(employee, user) {
  if (!employee) return null;
  const out = {};
  for (const k of SELF_FIELDS) {
    if (employee[k] !== undefined) {
      out[k] = employee[k];
    }
  }
  out.department = employee.department ? { id: employee.department.id, name: employee.department.name } : null;
  out.position   = employee.position   ? { id: employee.position.id, title: employee.position.title } : null;
  out.manager    = employee.manager    ? { id: employee.manager.id, name: `${employee.manager.firstName || ''} ${employee.manager.lastName || ''}`.trim() } : null;
  out.user       = user ? { id: user.id, email: user.email, role: user.role } : null;
  return out; // ممنوع password / tokens / reset fields
}

module.exports = { toSelfProfile };
