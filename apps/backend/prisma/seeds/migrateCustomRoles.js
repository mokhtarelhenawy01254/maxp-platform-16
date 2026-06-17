/**
 * Custom Role Migration Script
 * 
 * Migrates existing custom roles from Company.settings JSON to the new Role table.
 * Also assigns built-in roles (OWNER, COMPANY_ADMIN, MANAGER, AGENT) to existing users.
 * 
 * Run: npm run seed:migrate-roles
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ARABIC_TO_ENGLISH_PERMISSION_MAP = {
  'إدارة المستخدمين': 'users.manage',
  'إدارة الأدوار': 'roles.manage',
  'إدارة المنتجات': 'products.manage',
  'مشاهدة المنتجات': 'products.view',
  'إدارة العملاء': 'customers.manage',
  'مشاهدة العملاء': 'customers.view',
  'إدارة الطلبات': 'orders.manage',
  'مشاهدة الطلبات': 'orders.view',
  'مشاهدة التقارير': 'reports.view',
  'إدارة التقارير': 'reports.manage',
  'إدارة الإعدادات': 'settings.manage',
  'إدارة التكاملات': 'settings.integrations',
  'إدارة المحادثات': 'inbox.manage',
  'مشاهدة المحادثات': 'inbox.view',
  'إدارة الخطة والاشتراك': 'settings.billing',
};

const mapArabicPermissions = (arabicPerms) => {
  return arabicPerms
    .map(ap => ARABIC_TO_ENGLISH_PERMISSION_MAP[ap])
    .filter(Boolean);
};

async function migrate() {
  console.log('🔄 Starting custom role migration...');

  // 1. Seed built-in roles if not already done
  console.log('📦 Ensuring built-in roles exist...');
  const builtInKeys = ['OWNER', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'AFFILIATE'];
  const existingBuiltIn = await prisma.role.findMany({
    where: { companyId: null, isBuiltIn: true, key: { in: builtInKeys } },
  });
  console.log(`✅ ${existingBuiltIn.length} built-in roles found in DB`);

  // 2. Migrate custom roles from Company.settings
  console.log('\n🔍 Scanning companies for custom roles in settings JSON...');
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, settings: true },
  });

  let migratedCount = 0;
  let skippedCount = 0;

  for (const company of companies) {
    if (!company.settings) continue;

    let settings;
    try {
      settings = JSON.parse(company.settings);
    } catch {
      continue;
    }

    const customRoles = settings.customRoles;
    if (!customRoles || Object.keys(customRoles).length === 0) continue;

    console.log(`\n🏢 ${company.name} (${company.id}): ${Object.keys(customRoles).length} custom role(s)`);

    for (const [key, roleData] of Object.entries(customRoles)) {
      // Skip built-in roles stored in settings
      if (builtInKeys.includes(key)) continue;

      // Check if already migrated
      const existing = await prisma.role.findUnique({
        where: { key_companyId: { key, companyId: company.id } },
      });
      if (existing) {
        console.log(`  ⏭️  "${key}" already migrated, skipping`);
        skippedCount++;
        continue;
      }

      // Map Arabic permissions to English keys
      const arabicPerms = roleData.permissions || [];
      const englishKeys = mapArabicPermissions(arabicPerms);

      // Find matching permission records
      const permissions = englishKeys.length > 0
        ? await prisma.permission.findMany({
            where: { key: { in: englishKeys }, isActive: true },
          })
        : [];

      // Create role
      await prisma.role.create({
        data: {
          key,
          name: roleData.name || key,
          description: roleData.description || '',
          companyId: company.id,
          isBuiltIn: false,
          isSystem: false,
          isActive: roleData.isActive !== false,
          priority: 100,
          permissions: {
            create: permissions.map(p => ({ permissionId: p.id })),
          },
        },
      });

      console.log(`  ✅ "${key}" migrated with ${permissions.length} permissions`);
      migratedCount++;
    }
  }

  console.log(`\n📊 Migration summary:`);
  console.log(`   Migrated: ${migratedCount}`);
  console.log(`   Skipped (already exist): ${skippedCount}`);
  console.log('🎉 Migration complete!');
}

migrate()
  .catch(e => { console.error('❌ Migration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
