const { getSharedPrismaClient } = require('./services/sharedDatabase');
async function run() {
  try {
    await getSharedPrismaClient().$executeRawUnsafe(`
      ALTER TABLE hr_recruitment_forms ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
    `);
    console.log('✅ Added slug column to hr_recruitment_forms');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding slug column:', error);
    process.exit(1);
  }
}
run();
