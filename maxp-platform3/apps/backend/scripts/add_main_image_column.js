const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function addColumns() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;`);
        console.log("✅ added isHidden column to products table.");

        await prisma.$executeRawUnsafe(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "showFakeStock" BOOLEAN DEFAULT false;`);
        console.log("✅ added showFakeStock column to products table.");

    } catch (e) {
        console.error("Error adding columns:", e);
    } finally {
        await prisma.$disconnect();
    }
}

addColumns();
