/**
 * 🚨 REGRESSION TEST — Guard against TDZ ReferenceError on activeTimer in getTeamOverview
 *
 * `getTeamOverview` was referencing `activeTimer` in `evaluateOperationalSignal({ hasActiveTimer: Boolean(activeTimer) })`
 * BEFORE `const activeTimer = activeTimerMap.get(...)` was declared.
 * In JavaScript (strict mode / ES6 modules / block scoping), accessing `const` before declaration
 * throws a fatal `ReferenceError: Cannot access 'activeTimer' before initialization`.
 * This crashed GET /api/v1/employee-monitor/team/overview with a 500 error every 8 seconds,
 * resulting in 0 employees / blank team live cockpit on desktop and web.
 */
const fs = require('fs');
const path = require('path');

const SRC_PATH = path.resolve(__dirname, '../../services/monitorService.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');

describe('monitorService.getTeamOverview — activeTimer TDZ guard (production 500 prevention)', () => {
  test('activeTimer is declared before evaluateOperationalSignal in getTeamOverview', () => {
    const fnStart = SRC.indexOf('async getTeamOverview(');
    expect(fnStart).toBeGreaterThan(-1);

    const fnEnd = SRC.indexOf('async getEmployeeTimeline(', fnStart);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const fnBody = SRC.slice(fnStart, fnEnd);

    // activeTimer declaration index inside mapping loop
    const activeTimerDeclIndex = fnBody.indexOf('const activeTimer = activeTimerMap.get');
    expect(activeTimerDeclIndex).toBeGreaterThan(-1);

    // evaluateOperationalSignal call index
    const evalSignalIndex = fnBody.indexOf('const operationalSignal = evaluateOperationalSignal');
    expect(evalSignalIndex).toBeGreaterThan(-1);

    // activeTimer declaration MUST appear before evaluateOperationalSignal
    expect(activeTimerDeclIndex).toBeLessThan(evalSignalIndex);
  });

  test('activeTimerMap is populated and hasActiveTimer uses activeTimer safely', () => {
    expect(SRC).toMatch(/hasActiveTimer:\s*Boolean\(activeTimer\)/);
    expect(SRC).toMatch(/const\s+activeTimerMap\s*=\s*new\s+Map\(\)/);
  });

  test('getTeamOverview includes active company employees in roster', () => {
    const fnStart = SRC.indexOf('async getTeamOverview(');
    const fnEnd = SRC.indexOf('async getEmployeeTimeline(', fnStart);
    const fnBody = SRC.slice(fnStart, fnEnd);

    expect(fnBody).toMatch(/this\.prisma\.employee\.findMany/);
    expect(fnBody).toMatch(/status:\s*\{\s*not:\s*'TERMINATED'\s*\}/);
  });
});
