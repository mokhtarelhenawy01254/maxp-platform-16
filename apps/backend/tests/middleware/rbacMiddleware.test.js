const { hasPermission, normalizeRole } = require('../../middleware/rbacMiddleware');

describe('rbacMiddleware legacy role compatibility', () => {
  test('normalizes legacy owner and admin roles to company admin scope', () => {
    expect(normalizeRole('OWNER')).toBe('COMPANY_ADMIN');
    expect(normalizeRole('ADMIN')).toBe('COMPANY_ADMIN');
  });

  test('grants inbox admin permissions to legacy owner accounts', () => {
    expect(hasPermission('OWNER', 'dashboard.view')).toBe(true);
    expect(hasPermission('OWNER', 'numbers.manage')).toBe(true);
    expect(hasPermission('OWNER', 'teams.manage')).toBe(true);
  });

  test('normalizes agent and manager to moderator hierarchy roles', () => {
    expect(normalizeRole('AGENT')).toBe('MODERATOR');
    expect(normalizeRole('MANAGER')).toBe('TEAM_LEADER');
  });
});
