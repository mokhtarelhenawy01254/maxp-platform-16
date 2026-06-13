const { PrismaClient } = require('../generated/postgresql_v2');
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE marketplace_apps ADD COLUMN IF NOT EXISTS "coverImage" TEXT');
    console.log('Column coverImage added successfully');
  } catch (e) {
    console.log('Note:', e.message);
  }
  await prisma.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
