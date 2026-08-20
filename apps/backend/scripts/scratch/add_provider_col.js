const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function addMissingColumn() {

  try {
    console.log('Adding provider column to whatsapp_sessions...');
    // Create the ENUM type if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppProvider') THEN
          CREATE TYPE "WhatsAppProvider" AS ENUM ('BAILEYS', 'META_CLOUD');
        END IF;
      END
      $$;
    `);

    // Add the column with default value
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "whatsapp_sessions"
      ADD COLUMN IF NOT EXISTS "provider" "WhatsAppProvider" NOT NULL DEFAULT 'BAILEYS';
    `);

    console.log('Column added successfully.');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumn();
