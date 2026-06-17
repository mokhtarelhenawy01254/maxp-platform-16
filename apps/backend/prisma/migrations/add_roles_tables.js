const { PrismaClient } = require('../generated/postgresql_v2');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "permission_domains" AS ENUM (
          'DASHBOARD','ORDERS','PRODUCTS','CUSTOMERS','CONVERSATIONS',
          'SETTINGS','USERS','ROLES','REPORTS','WHATSAPP','FACEBOOK',
          'MARKETING','STOREFRONT','HR','FINANCE','AI','INVENTORY'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('1/5 ✅ Enum created');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "domain" "permission_domains" NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "permissions_key_key" UNIQUE ("key")
      );
    `);
    console.log('2/5 ✅ Permissions table');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "companyId" TEXT,
        "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "priority" INTEGER NOT NULL DEFAULT 0,
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "roles_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "roles_key_companyId_key" UNIQUE ("key", "companyId")
      );
    `);
    console.log('3/5 ✅ Roles table');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "roleId" TEXT NOT NULL,
        "permissionId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
      );
    `);
    console.log('4/5 ✅ Role_permissions table');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_companies" ADD COLUMN IF NOT EXISTS "roleId" TEXT;
    `);
    console.log('5/5 ✅ roleId column added');

    console.log('🎉 Migration complete!');
  } catch (e) {
    console.error('❌', e.message?.substring(0, 300));
  } finally {
    await prisma.$disconnect();
  }
}
run();
