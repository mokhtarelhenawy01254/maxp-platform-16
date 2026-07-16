/**
 * Sync missing granular permissions for all built-in __system__ roles.
 *
 * Delegate to seedPermissions.js so we never drift from the source-of-truth.
 * Run: node scripts/sync_missing_permissions.js
 */
const path = require('path');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function sync() {
  console.log('🔍 Syncing built-in roles from seed definition...\n');

  // Load seed data — reuse its PERMISSIONS + BUILT_IN_ROLES exactly
  const { PERMISSIONS, BUILT_IN_ROLES } = require(path.resolve(__dirname, '../prisma/seeds/seedPermissions.js'));

  // 1. Upsert all permissions
  const permMap = {};
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: { name: perm.name, domain: perm.domain },
    });
    permMap[perm.key] = created.id;
  }
  console.log(`✅ ${PERMISSIONS.length} permissions synced`);

  // 2. Sync each built-in role (find by key + __system__ or null companyId)
  for (const [key, def] of Object.entries(BUILT_IN_ROLES)) {
    let role = await prisma.role.findFirst({
      where: { key, OR: [{ companyId: '__system__' }, { companyId: null }] },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          key,
          name: def.name,
          description: def.description,
          priority: def.priority,
          isBuiltIn: true,
          isSystem: def.isSystem,
          companyId: '__system__',
        },
      });
      console.log(`  ➕ Created new role: ${key}`);
    } else if (role.companyId === null) {
      await prisma.role.update({
        where: { id: role.id },
        data: { companyId: '__system__' },
      });
      console.log(`  🔧 Fixed companyId null → __system__ for role: ${key}`);
    }

    // 3. Replace all RolePermission records to match seed exactly
    const permIds = def.permissions.map(pk => permMap[pk]).filter(Boolean);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permIds.map(permId => ({ roleId: role.id, permissionId: permId })),
    });

    console.log(`  ✅ ${key}: ${permIds.length} permissions set`);
  }

  console.log('\n🎉 Sync complete!');
  await prisma.$disconnect();
}

sync().catch(e => { console.error('❌', e); process.exit(1); });
