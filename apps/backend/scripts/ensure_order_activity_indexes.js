/**
 * 🚀 Ensure Performance Indexes for Order Activity Log
 * Requirement 11: Index on createdAt for OrderStatusHistory and ReturnActivityLog
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function ensureOrderActivityIndexes() {
  const prisma = getSharedPrismaClient();
  try {
    console.log('🔄 Checking & creating performance indexes for order activity logs...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OrderStatusHistory_createdAt_idx" ON "OrderStatusHistory"("createdAt");
    `);
    console.log('✅ Created/verified index: OrderStatusHistory_createdAt_idx');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "return_activity_logs_createdAt_idx" ON "return_activity_logs"("createdAt");
    `);
    console.log('✅ Created/verified index: return_activity_logs_createdAt_idx');
  } catch (error) {
    console.error('⚠️ Index creation notice:', error.message);
  }
}

if (require.main === module) {
  ensureOrderActivityIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { ensureOrderActivityIndexes };
