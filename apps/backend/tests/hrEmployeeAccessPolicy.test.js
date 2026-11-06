/**
 * TICKET-2026-11-06-RBAC-01 — Phase 1 regression tests.
 *
 *  F-01: دور الموظف يجب أن يمر عبر allowlist صريح (create/update/reactivate).
 *  F-03: الحقول الحساسة تُحذف من قائمة الموظفين لغير المصرح لهم.
 *  F-04: PUT /settings/company محمي بـ settings.manage + denylist لمفاتيح التجاوز.
 *  F-07: /hr/debug/user/:id محذوف.
 *
 * Dependency-free on purpose: runs with `node tests/hrEmployeeAccessPolicy.test.js`
 * and is picked up by jest (testMatch = tests/**\/*.test.js).
 */
const fs = require('fs');
const path = require('path');

const policy = require('../utils/hrEmployeeAccessPolicy');

const ROOT = path.resolve(__dirname, '..');

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

const assertEqual = (actual, expected, label) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label || 'assertion'}: expected ${e}, got ${a}`);
};
const assertTrue = (value, label) => {
  if (!value) throw new Error(`${label || 'assertion'}: expected truthy, got ${value}`);
};
const assertThrows = (fn, expectedStatusCode, label) => {
  try {
    fn();
  } catch (error) {
    assertEqual(error.statusCode, expectedStatusCode, `${label} statusCode`);
    return error;
  }
  throw new Error(`${label}: expected throw, got none`);
};

// ─────────────────────────────────────────────────────────────────────────────
// F-01 — role allowlist
// ─────────────────────────────────────────────────────────────────────────────
check('F-01: assignable roles are exactly AGENT/MANAGER/COMPANY_ADMIN', () => {
  assertEqual(policy.ASSIGNABLE_EMPLOYEE_ROLES, ['AGENT', 'MANAGER', 'COMPANY_ADMIN']);
});

check('F-01: UserCompaniesRole allowlist matches prisma schema enum', () => {
  const schemaDir = path.join(ROOT, 'prisma', 'schema');
  const sources = fs
    .readdirSync(schemaDir)
    .filter((file) => file.endsWith('.prisma'))
    .map((file) => fs.readFileSync(path.join(schemaDir, file), 'utf8'));

  const block = sources
    .map((src) => src.match(/enum\s+UserCompaniesRole\s*\{([\s\S]*?)\}/))
    .find(Boolean);

  assertTrue(Boolean(block), 'UserCompaniesRole enum found in prisma/schema');

  const schemaRoles = block[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'))
    .map((line) => line.split(/\s+/)[0]);

  assertEqual(
    [...policy.USER_COMPANIES_ROLES].sort(),
    schemaRoles.sort(),
    'policy roles vs schema enum'
  );
});

check('F-01: allowed roles are returned normalized', () => {
  assertEqual(policy.resolveAssignableEmployeeRole('agent'), 'AGENT');
  assertEqual(policy.resolveAssignableEmployeeRole(' Manager '), 'MANAGER');
  assertEqual(policy.resolveAssignableEmployeeRole('company_admin'), 'COMPANY_ADMIN');
});

check('F-01: empty role keeps the legacy AGENT default (returns null)', () => {
  assertEqual(policy.resolveAssignableEmployeeRole(undefined), null);
  assertEqual(policy.resolveAssignableEmployeeRole(null), null);
  assertEqual(policy.resolveAssignableEmployeeRole(''), null);
  assertEqual(policy.resolveAssignableEmployeeRole('   '), null);
});

check('F-01: OWNER and SUPER_ADMIN are rejected with 403', () => {
  assertThrows(() => policy.resolveAssignableEmployeeRole('SUPER_ADMIN'), 403, 'SUPER_ADMIN');
  assertThrows(() => policy.resolveAssignableEmployeeRole('super_admin'), 403, 'super_admin');
  assertThrows(() => policy.resolveAssignableEmployeeRole('OWNER'), 403, 'OWNER');
});

check('F-01: roles outside UserCompaniesRole are rejected with 400', () => {
  for (const role of ['MODERATOR', 'EMPLOYEE', 'HR_MANAGER', 'TEAM_LEADER', 'root']) {
    assertThrows(() => policy.resolveAssignableEmployeeRole(role), 400, role);
  }
});

check('F-01: non-string role is rejected with 400', () => {
  assertThrows(() => policy.resolveAssignableEmployeeRole(['SUPER_ADMIN']), 400, 'array role');
});

// ─────────────────────────────────────────────────────────────────────────────
// F-03 — sensitive field stripping
// ─────────────────────────────────────────────────────────────────────────────
const makeEmployee = () => ({
  id: 'u1',
  firstName: 'A',
  baseSalary: 12000,
  phone: '01000000000',
  mobile: '01000000000',
  nationalId: '29001010101010',
  contractType: 'FULL_TIME',
  hireDate: '2024-01-01',
  department: { id: 'd1', name: 'Sales' },
});

check('F-03: AGENT does not see salary/national id/phone', () => {
  const [safe] = policy.stripSensitiveEmployeeFields([makeEmployee()], 'AGENT');
  for (const field of policy.SENSITIVE_EMPLOYEE_FIELDS) {
    assertTrue(!(field in safe), `AGENT must not receive "${field}"`);
  }
  assertTrue(!('baseSalary' in safe), 'AGENT must not receive baseSalary');
  assertTrue(!('nationalId' in safe), 'AGENT must not receive nationalId');
  assertEqual(safe.firstName, 'A', 'non-sensitive fields kept');
  assertEqual(safe.department, { id: 'd1', name: 'Sales' }, 'nested objects kept');
});

check('F-03: unknown/AFFILIATE roles are treated as non-privileged', () => {
  for (const role of ['AFFILIATE', undefined, null, 'CUSTOM_ROLE']) {
    const [safe] = policy.stripSensitiveEmployeeFields([makeEmployee()], role);
    assertTrue(!('baseSalary' in safe), `role ${role} must not receive baseSalary`);
  }
});

check('F-03: privileged roles keep the response shape untouched', () => {
  for (const role of policy.PRIVILEGED_EMPLOYEE_VIEW_ROLES) {
    const employees = [makeEmployee()];
    const result = policy.stripSensitiveEmployeeFields(employees, role);
    assertTrue(result === employees, `${role} must receive the same array reference`);
    assertEqual(Object.keys(result[0]).sort(), Object.keys(makeEmployee()).sort());
  }
});

check('F-03: stripping never mutates the service response', () => {
  const employees = [makeEmployee()];
  policy.stripSensitiveEmployeeFields(employees, 'AGENT');
  assertEqual(employees[0].baseSalary, 12000, 'original salary untouched');
});

check('F-03: non-array input passes through', () => {
  assertEqual(policy.stripSensitiveEmployeeFields(undefined, 'AGENT'), undefined);
  assertEqual(policy.stripSensitiveEmployeeFields(null, 'AGENT'), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// F-04 / F-07 — route guards (source-level regression guards)
// ─────────────────────────────────────────────────────────────────────────────
check('F-07: /hr/debug/user/:id route and handler are gone', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'routes', 'hrRoutes.js'), 'utf8');
  const controller = fs.readFileSync(path.join(ROOT, 'controller', 'hrController.js'), 'utf8');
  assertTrue(!routes.includes("'/debug/user"), 'hrRoutes must not register /debug/user');
  assertTrue(!controller.includes('debugGetUser'), 'hrController must not keep debugGetUser');
});

check('F-04: PUT /settings/company requires settings.manage', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'routes', 'settingsRoutes.js'), 'utf8');
  assertTrue(
    /router\.put\(\s*'\/company'\s*,\s*requireDbPermission\('settings\.manage'\)/.test(routes),
    "PUT /company must call requireDbPermission('settings.manage')"
  );
  for (const key of [
    'bypassExpiry',
    'allowAccessWhenExpired',
    'graceAccess',
    'bypassAppExpiry',
    'whatsappAccessBypass',
  ]) {
    assertTrue(routes.includes(`'${key}'`), `denylist must contain "${key}"`);
  }
});

check('F-04: settings.manage exists in the permission seed (no lockout)', () => {
  const seed = fs.readFileSync(
    path.join(ROOT, 'prisma', 'seeds', 'seedPermissions.js'),
    'utf8'
  );
  assertTrue(
    /key:\s*'settings\.manage'/.test(seed),
    "seedPermissions.js must define 'settings.manage'"
  );
  assertTrue(
    /OWNER:\s*\{[\s\S]*?permissions:\s*ALL_PERMISSION_KEYS/.test(seed),
    'OWNER must keep all permissions (bypass stays intact)'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
if (typeof test === 'function' && typeof expect === 'function') {
  for (const { name, fn } of checks) {
    test(name, () => {
      expect(fn).not.toThrow();
    });
  }
} else {
  let failed = 0;
  for (const { name, fn } of checks) {
    try {
      fn();
      console.log(`ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}\n     ${error.message}`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed}/${checks.length} checks failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} checks passed`);
}
