const path = require('path');

const {
  getPrismaClientPathsForDatabaseUrl
} = require('../../services/sharedDatabase');

describe('sharedDatabase Prisma client path resolution', () => {
  test('uses the generated PostgreSQL client before fallback clients', () => {
    const paths = getPrismaClientPathsForDatabaseUrl('postgresql://user:pass@localhost:5432/maxp');

    expect(paths[0]).toContain(path.join('prisma', 'generated', 'postgresql_v2'));
    expect(paths).toContain('@prisma/client');
    expect(paths.some((clientPath) => clientPath.includes(path.join('generated', 'verify_client')))).toBe(false);
  });

  test('keeps MySQL routing on the default Prisma client', () => {
    expect(getPrismaClientPathsForDatabaseUrl('mysql://user:pass@localhost:3306/maxp')).toEqual([
      '@prisma/client'
    ]);
  });
});

