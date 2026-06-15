const fs = require('fs');
const path = require('path');

describe('SharedDatabase RLS - SQL Injection Fix', () => {
  const sourcePath = path.resolve(__dirname, '../../services/sharedDatabase.js');
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('يستخدم set_config() بدلاً من SET لتمرير companyId بشكل آمن', () => {
    const line = source.split('\n').find(l => l.includes('current_company_id'));
    expect(line).toBeDefined();
    expect(line).toContain("set_config('app.current_company_id'");
  });

  it('يستخدم $executeRaw (وليس $executeRawUnsafe) مع set_config', () => {
    const line = source.split('\n').find(l => l.includes('current_company_id'));
    expect(line).toContain('$executeRaw');
    expect(line).not.toContain('$executeRawUnsafe');
    expect(line).toContain('${companyId}');
  });

  it('لا يستخدم String interpolation مباشرة داخل SQL', () => {
    // يجب ألا يكون companyId مدمجاً كـ string في الـ SQL
    const match = source.match(/set_config\([^)]*'\s*\+\s*companyId/);
    expect(match).toBeNull();
  });
});
