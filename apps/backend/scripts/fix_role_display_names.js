/**
 * Fix Role records that were auto-created with wrong Arabic display names
 * by the updateUser auto-create logic (getRoleDisplayName had mismatched names).
 *
 * Fixes:
 *   OWNER:     'مالك' → 'مالك الشركة'
 *   AGENT:     'وكيل'  → 'موظف'
 *   AFFILIATE: 'مسوق بالعمولة' → 'مسوق'
 *
 * Run: node scripts/fix_role_display_names.js
 */
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

const FIXES = {
  OWNER:     { wrong: 'مالك',           correct: 'مالك الشركة' },
  AGENT:     { wrong: 'وكيل',            correct: 'موظف' },
  AFFILIATE: { wrong: 'مسوق بالعمولة',   correct: 'مسوق' },
};

async function fixRoleNames() {
  console.log('🔍 Scanning for Role records with wrong display names...\n');
  let totalFixed = 0;

  for (const [key, { wrong, correct }] of Object.entries(FIXES)) {
    const roles = await prisma.role.findMany({
      where: { key, name: wrong },
    });

    for (const role of roles) {
      await prisma.role.update({
        where: { id: role.id },
        data: { name: correct },
      });
      console.log(`  ✅ ${key} (${role.id}): "${wrong}" → "${correct}"`);
      totalFixed++;
    }

    if (roles.length === 0) {
      console.log(`  ✓ ${key}: no wrong records found`);
    }
  }

  console.log(`\n📊 Total fixed: ${totalFixed} Role record(s)`);
  await prisma.$disconnect();
}

fixRoleNames().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
