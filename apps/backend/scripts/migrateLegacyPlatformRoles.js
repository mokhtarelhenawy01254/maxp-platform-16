/**
 * migrateLegacyPlatformRoles.js
 *
 * One-time migration: find company memberships/users whose role was stored with
 * a legacy platform-team name ("Team Lead", "Project Manager", "Developer",
 * "Tester", "Agent") and re-point them at the proper built-in company roles.
 * These names collide with the platform's internal admin roles — after the
 * auth access overhaul they must NOT be treated as platform admins.
 *
 * Legacy names cannot live in the UserCompany.role enum (Prisma validates it),
 * so they appear in:
 *   - User.role (String column)          -> fixed to the mapped built-in key
 *   - Role.key for custom roles          -> membership re-linked to the built-in role
 *
 * Mapping:
 *   "Team Lead"        -> MANAGER
 *   "Project Manager"  -> MANAGER
 *   "Developer"        -> AGENT
 *   "Tester"           -> AGENT
 *   "Agent" / "AGENT"  -> AGENT
 *
 * Run (dry-run, reports only):
 *   node scripts/migrateLegacyPlatformRoles.js
 * Run (apply):
 *   node scripts/migrateLegacyPlatformRoles.js --apply
 */

const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const LEGACY_ROLE_MAP = {
  'Team Lead': 'MANAGER',
  'Project Manager': 'MANAGER',
  'Developer': 'AGENT',
  'Tester': 'AGENT',
  'Agent': 'AGENT',
  'AGENT': 'AGENT',
};
const LEGACY_KEYS = Object.keys(LEGACY_ROLE_MAP);

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaClient();

  console.log(apply ? '⚠️  APPLY MODE — data will be modified' : '🔍 DRY-RUN — no changes, report only');
  console.log('Targets:', JSON.stringify(LEGACY_KEYS));

  const builtInRoles = await prisma.role.findMany({
    where: { companyId: '__system__', isBuiltIn: true },
    select: { id: true, key: true },
  });
  const roleIdByKey = new Map(builtInRoles.map((r) => [r.key, r.id]));
  console.log(`📦 Built-in roles: ${builtInRoles.map((r) => r.key).join(', ')}`);

  // 1) Memberships pointing at a custom Role whose key is a legacy name.
  const customRoleMemberships = await prisma.userCompany.findMany({
    where: { roleRef: { is: { key: { in: LEGACY_KEYS } } } },
    select: {
      id: true,
      userId: true,
      companyId: true,
      role: true,
      roleRef: { select: { key: true } },
    },
  });

  console.log(`\n👥 ${customRoleMemberships.length} membership(s) reference a legacy custom role`);
  let updatedMemberships = 0;
  for (const uc of customRoleMemberships) {
    const sourceKey = uc.roleRef?.key;
    const targetKey = LEGACY_ROLE_MAP[sourceKey];
    const targetRoleId = roleIdByKey.get(targetKey);
    if (!targetRoleId) {
      console.log(`  ⏭️  target built-in role "${targetKey}" missing — skipping userCompany ${uc.id}`);
      continue;
    }
    console.log(
      `  • userCompany=${uc.id} user=${uc.userId} company=${uc.companyId} roleRef="${sourceKey}" -> "${targetKey}"`,
    );
    if (apply) {
      await prisma.userCompany.update({
        where: { id: uc.id },
        data: { role: targetKey, roleId: targetRoleId },
      });
      updatedMemberships += 1;
    }
  }

  // 2) Users whose top-level User.role still uses a legacy name.
  const legacyUsers = await prisma.user.findMany({
    where: { role: { in: LEGACY_KEYS } },
    select: { id: true, email: true, role: true },
  });

  console.log(`\n👤 ${legacyUsers.length} user(s) carry a legacy name in User.role`);
  for (const u of legacyUsers) {
    const targetKey = LEGACY_ROLE_MAP[u.role];
    console.log(`  • user=${u.id} ${u.email} role="${u.role}" -> "${targetKey}"`);
    if (apply) {
      await prisma.user.update({
        where: { id: u.id },
        data: { role: targetKey },
      });
    }
  }

  console.log(
    apply
      ? `\n✅ Done — ${updatedMemberships} membership(s) + ${legacyUsers.length} user(s) updated`
      : `\n✅ Dry-run complete — ${customRoleMemberships.length} membership(s) + ${legacyUsers.length} user(s) would change. Re-run with --apply to commit.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
