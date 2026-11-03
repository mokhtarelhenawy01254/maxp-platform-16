const fs = require('fs');
const path = require('path');

describe('Permission Domains Validation (PERM-1 Regression Test)', () => {
  const prismaSchemaPath = path.resolve(__dirname, '../../prisma/schema/permissions.prisma');
  const seedPermissionsPath = path.resolve(__dirname, '../../prisma/seeds/seedPermissions.js');

  test('all domains used in seedPermissions.js exist in schema/permissions.prisma PermissionDomain enum', () => {
    // 1. Read files as text without DB connection
    const prismaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
    const seedContent = fs.readFileSync(seedPermissionsPath, 'utf8');

    // 2. Extract allowed domains from enum PermissionDomain in permissions.prisma
    const enumMatch = prismaContent.match(/enum\s+PermissionDomain\s*\{([^}]+)\}/);
    expect(enumMatch).toBeTruthy();

    const allowedDomains = new Set(
      enumMatch[1]
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('@@'))
    );

    // Ensure enum was parsed successfully
    expect(allowedDomains.size).toBeGreaterThan(0);
    expect(allowedDomains.has('COURIER_FLEET')).toBe(true);

    // 3. Extract all domains used in seedPermissions.js
    const domainMatches = [...seedContent.matchAll(/domain:\s*['"]([A-Za-z0-9_]+)['"]/g)];
    const usedDomains = new Set(domainMatches.map(m => m[1]));

    expect(usedDomains.size).toBeGreaterThan(0);
    expect(usedDomains.has('COURIER_FLEET')).toBe(true);

    // 4. Verify each used domain exists in allowedDomains
    const missingDomains = [...usedDomains].filter(d => !allowedDomains.has(d));

    if (missingDomains.length > 0) {
      throw new Error(
        `Missing permission domain(s) in schema/permissions.prisma: ${missingDomains.join(', ')}`
      );
    }

    expect(missingDomains).toEqual([]);
  });
});
