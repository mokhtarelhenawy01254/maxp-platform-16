const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deduplicate() {
    console.log('🚀 Starting deduplication of ignored stats...');

    try {
        // We use raw SQL for performance on 1.7M records
        // This query finds all records for the same recipient on the same day where reason is CUSTOMER_NOT_FOUND
        // and keeps only the earliest one per day.

        console.log('📝 Identifying duplicates (this may take a few minutes)...');

        const result = await prisma.$executeRaw`
      WITH dups AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                     PARTITION BY "recipientFacebookId", date_trunc('day', "sentAt")
                     ORDER BY "sentAt" ASC
                 ) as row_num
          FROM sent_message_stats
          WHERE "ignoredReason" = 'CUSTOMER_NOT_FOUND'
      )
      DELETE FROM sent_message_stats
      WHERE id IN (
          SELECT id FROM dups WHERE row_num > 1
      );
    `;

        console.log(`✅ Deduplication complete! Removed ${result} redundant records.`);

    } catch (error) {
        console.error('❌ Error during deduplication:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deduplicate();
