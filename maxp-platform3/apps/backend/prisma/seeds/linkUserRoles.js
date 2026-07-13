/**
 * Link existing UserCompany.role enum values to new Role table
 * 
 * After seeding permissions and roles (npm run seed:permissions),
 * each UserCompany that has a role (OWNER, COMPANY_ADMIN, etc.) 
 * needs a roleId pointing to the matching built-in Role row.
 * 
 * Run: npm run seed:link-roles
 */

const { PrismaClient } = require('../generated/postgresql_v2');
const prisma = new PrismaClient();

async function linkRoles() {
  console.log('🔗 Linking UserCompany.role → roleId...');

  // Get all built-in roles from the new Role table
  const builtInRoles = await prisma.role.findMany({
    where: { companyId: '__system__', isBuiltIn: true },
  });
  const roleMap = {};
  for (const r of builtInRoles) {
    roleMap[r.key] = r.id;
  }
  console.log(`📦 Found ${builtInRoles.length} built-in roles: ${Object.keys(roleMap).join(', ')}`);

  // Get all UserCompany records that have a role but no roleId
  const userCompanies = await prisma.userCompany.findMany({
    where: {
      roleId: null,
      role: { not: undefined },
    },
    select: {
      id: true,
      userId: true,
      companyId: true,
      role: true,
    },
  });
  console.log(`👥 Found ${userCompanies.length} UserCompany records without roleId`);

  let linked = 0;
  let skipped = 0;

  for (const uc of userCompanies) {
    const roleKey = uc.role;
    const builtInId = roleMap[roleKey];

    if (!builtInId) {
      console.log(`  ⏭️  "${roleKey}" has no matching built-in role, skipping`);
      skipped++;
      continue;
    }

    await prisma.userCompany.update({
      where: { id: uc.id },
      data: { roleId: builtInId },
    });
    linked++;
  }

  // Summary
  const totalWithRoleId = await prisma.userCompany.count({ where: { roleId: { not: null } } });
  const totalRecords = await prisma.userCompany.count();

  console.log(`\n📊 Summary:`);
  console.log(`   Newly linked: ${linked}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total with roleId: ${totalWithRoleId} / ${totalRecords}`);
  console.log('🎉 Done!');
}

linkRoles()
  .catch(e => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
