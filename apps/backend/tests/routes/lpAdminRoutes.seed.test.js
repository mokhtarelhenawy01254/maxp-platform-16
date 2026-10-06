jest.mock('../../services/sharedDatabase', () => ({ getSharedPrismaClientAsync: jest.fn() }));
jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
}));
jest.mock('../../services/catalog/marketplaceCatalogService', () => ({
  marketplaceCatalogService: { getBundleBySlug: jest.fn() },
}));

const { __test__ } = require('../../routes/lpAdminRoutes');
const { SEED_PAGES, buildSeedUpsertSql, buildSeedUpsertParams, ensureLpPagesTable } = __test__;

describe('lp_pages seed upsert (23502 NOT NULL regression)', () => {
  it('INSERT explicitly sets createdAt and updatedAt (Prisma @updatedAt has no DB default)', () => {
    const sql = buildSeedUpsertSql();
    const cols = sql.match(/INSERT INTO "lp_pages" \(([^)]+)\)/)[1];
    expect(cols).toContain('"updatedAt"');
    expect(cols).toContain('"createdAt"');
    expect(sql).toMatch(/VALUES \(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP\)/);
    expect(sql).toMatch(/"updatedAt" = CURRENT_TIMESTAMP/);
  });

  it.each(SEED_PAGES.map((p) => [p.slug, p]))('params for %s have no null in NOT NULL columns', (_slug, p) => {
    const params = buildSeedUpsertParams(p);
    expect(params).toHaveLength(8);
    // id, slug, title, componentName, sortOrder, isActive, activationType are NOT NULL
    [0, 1, 2, 3, 4, 5, 7].forEach((i) => {
      expect(params[i]).not.toBeNull();
      expect(params[i]).not.toBeUndefined();
    });
  });

  it('falls back to safe defaults when optional seed fields are missing', () => {
    const params = buildSeedUpsertParams({ slug: 'x', title: 'X', componentName: 'XLanding' });
    expect(params[4]).toBe(0);
    expect(params[6]).toBeNull();
    expect(params[7]).toBe('both');
  });

  it('ensureLpPagesTable runs one upsert per seed page with matching placeholder count', async () => {
    const prisma = { $executeRawUnsafe: jest.fn().mockResolvedValue(0) };
    await ensureLpPagesTable(prisma);
    const upserts = prisma.$executeRawUnsafe.mock.calls.filter(([sql]) => sql.includes('INSERT INTO "lp_pages"'));
    expect(upserts).toHaveLength(SEED_PAGES.length);
    upserts.forEach(([, ...args]) => expect(args).toHaveLength(8));
  });
});
