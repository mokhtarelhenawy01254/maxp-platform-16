const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function patch() {
    console.log('🩹 Patching database schema for theme support...');
    const prisma = await getSharedPrismaClientAsync();

    try {
        // Add columns to store_pages if they don't exist
        await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_pages' AND column_name='draftContent') THEN
          ALTER TABLE "store_pages" ADD COLUMN "draftContent" JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_pages' AND column_name='publishedContent') THEN
          ALTER TABLE "store_pages" ADD COLUMN "publishedContent" JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='storefront_settings' AND column_name='designTokens') THEN
          ALTER TABLE "storefront_settings" ADD COLUMN "designTokens" JSONB;
        END IF;
      END $$;
    `);
        console.log('✅ Columns checked and added successfully.');
    } catch (error) {
        console.error('❌ Failed to patch schema:', error.message);
    } finally {
        process.exit(0);
    }
}

patch();
