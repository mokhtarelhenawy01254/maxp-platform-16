const fs = require('fs');
const path = require('path');

describe('SharedDatabase - 2026 Multi-Tenant AST Isolation Verification', () => {
  const sourcePath = path.resolve(__dirname, '../../services/sharedDatabase.js');
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('يحتوي على ملحق العزل التلقائي للشركات (Auto-Tenant Isolation Extension)', () => {
    expect(source).toContain('GLOBAL_MODELS');
    expect(source).toContain('tenantContext.getCompanyId()');
    expect(source).toContain('tenantContext.isBypassed()');
  });

  it('يحقن companyId برمجياً عبر AST دون الحاجة لـ transactions وهمية لكل استعلام', () => {
    expect(source).toContain("args.where = { ...args.where, companyId }");
    expect(source).toContain("args.data = { ...args.data, companyId }");
  });

  it('يستثني الجداول العامة (GLOBAL_MODELS) تلقائياً', () => {
    expect(source).toContain("GLOBAL_MODELS.has(model)");
  });
});

