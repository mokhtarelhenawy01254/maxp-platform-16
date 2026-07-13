const { getSharedPrismaClient } = require('../services/sharedDatabase');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function run() {
  console.log('🚀 Applying booking branch-services migration...');
  const prisma = getSharedPrismaClient();

  try {
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_booking_branch_services/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      console.log(`📝 Executing: ${stmt.substring(0, 80)}...`);
      await prisma.$executeRawUnsafe(stmt + ';');
    }

    console.log('✅ Booking branch-services migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
