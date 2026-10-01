const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE hr_manual_deductions_status ADD VALUE IF NOT EXISTS 'CANCELLED'`);
    console.log('✅ Successfully added CANCELLED to hr_manual_deductions_status');
  } catch (err) {
    console.log('Note on adding CANCELLED:', err.message);
  }

  const res = await prisma.$queryRawUnsafe(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE typname = 'hr_manual_deductions_status'
  `);
  console.log('Current enum labels:', res);
}

main().catch(console.error).finally(() => process.exit(0));
