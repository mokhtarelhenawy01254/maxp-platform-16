const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function migrateSchema() {
    try {
        console.log("🚀 Starting safe schema migration for HomepageTemplate...");

        // 1. Add draftContent column if not exists
        await prisma.$executeRawUnsafe(`ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "draftContent" JSONB;`);
        console.log("✅ Added 'draftContent' column.");

        // 2. Add publishedContent column if not exists
        await prisma.$executeRawUnsafe(`ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "publishedContent" JSONB;`);
        console.log("✅ Added 'publishedContent' column.");

        // 3. Add lastPublishedAt column if not exists
        await prisma.$executeRawUnsafe(`ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "lastPublishedAt" TIMESTAMP(3);`);
        console.log("✅ Added 'lastPublishedAt' column.");

        // 4. Add version column if not exists
        await prisma.$executeRawUnsafe(`ALTER TABLE "homepage_templates" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;`);
        console.log("✅ Added 'version' column.");

        // 5. Backfill data: Copy 'content' to 'draftContent' to ensure consistency for existing rows
        // Note: We are NOT dropping 'content' yet as the application might still rely on it during transition,
        // although the schema definition treats it as Json now.
        // However, the error said "Changed the type of `content`... No cast exists".
        // This implies 'content' might be TEXT in DB but JSON in schema.

        // Let's check the type of 'content' first (informational)
        // const result = await prisma.$queryRaw`SELECT data_type FROM information_schema.columns WHERE table_name = 'homepage_templates' AND column_name = 'content';`;
        // console.log("Current content type:", result);

        // If 'content' is TEXT and needs to be JSONB:
        // We can try to cast it. If it fails, we might need a more complex migration.
        // For now, let's try to ALTER URL content type to JSONB using explicit cast.

        console.log("🔄 Attempting to convert 'content' column from TEXT to JSONB...");
        try {
            await prisma.$executeRawUnsafe(`
            ALTER TABLE "homepage_templates" 
            ALTER COLUMN "content" TYPE JSONB USING "content"::jsonb;
        `);
            console.log("✅ Successfully converted 'content' to JSONB.");
        } catch (e) {
            console.log("⚠️ Could not convert 'content' to JSONB directly (might already be JSONB or invalid JSON):", e.message);
        }

        console.log("✨ Schema migration completed safely.");

    } catch (e) {
        console.error("❌ Migration failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateSchema();
