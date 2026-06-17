const { PrismaClient } = require('../generated/postgresql_v2');
const prisma = new PrismaClient();

async function run() {
  try {
    // FK from role_permissions -> roles
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_roleId_fkey') THEN
          ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('1/3 ✅ FK: role_permissions -> roles');

    // FK from role_permissions -> permissions
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permissionId_fkey') THEN
          ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey"
            FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('2/3 ✅ FK: role_permissions -> permissions');

    // FK from user_companies.roleId -> roles.id
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_companies_roleId_fkey') THEN
          ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_roleId_fkey"
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('3/3 ✅ FK: user_companies -> roles');

    console.log('🎉 FK constraints added!');
  } catch (e) {
    console.error('❌', e.message?.substring(0, 300));
  } finally {
    await prisma.$disconnect();
  }
}
run();
