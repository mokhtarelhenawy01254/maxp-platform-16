const fs = require('fs');
const path = require('path');

describe('SharedDatabase RLS - SQL Injection Fix', () => {
  const sourcePath = path.resolve(__dirname, '../../services/sharedDatabase.js');
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('لا يستخدم String interpolation\'${companyId}\' في SET app.current_company_id', () => {
    const match = source.match(/SET\s+app\.current_company_id\s*=\s*'\$\{/);
    expect(match).toBeNull();
  });

  it('يستخدم $executeRaw (وليس $executeRawUnsafe) في SET app.current_company_id', () => {
    const match = source.match(/SET\s+app\.current_company_id/);
    expect(match).not.toBeNull();

    const line = source.split('\n').find(l => l.includes('current_company_id'));
    expect(line).toContain('$executeRaw');
    expect(line).not.toContain('$executeRawUnsafe');
    expect(line).toContain('${companyId}');
  });

  it('تستخدم القيمة كـ parameter موضعي وليس كـ string مدمج', () => {
    const line = source.split('\n').find(l => l.includes('current_company_id'));
    expect(line).toMatch(/set\s+app\.current_company_id\s*=\s*\$\{companyId\}/i);
  });
});
