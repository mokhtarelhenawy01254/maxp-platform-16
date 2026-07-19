const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Cleaning up Duplicate WhatsApp Session ===');
  const targetPhoneNumberId = '1227556853769600';
  const correctSessionId = 'cmqpkbk65004rjufod0pqpeiw'; // "العمل"

  // 1. Find all sessions with targetPhoneNumberId
  const sessions = await prisma.whatsAppSession.findMany({
    where: {
      metaPhoneNumberId: targetPhoneNumberId
    }
  });

  console.log(`Found ${sessions.length} session(s) with metaPhoneNumberId = ${targetPhoneNumberId}`);

  for (const session of sessions) {
    console.log(`- Session ID: ${session.id}, Name: "${session.name}", Company ID: ${session.companyId}, Status: ${session.status}`);
    
    if (session.id === correctSessionId) {
      console.log(`  => This is the correct session "العمل". Leaving it untouched and active.`);
      continue;
    }

    console.log(`  => This is a duplicate/obsolete session. We will clear its meta credentials and mark it deleted in metadata.`);
    
    let metadata = {};
    if (session.metadata) {
      try {
        metadata = JSON.parse(session.metadata);
      } catch (e) {
        console.log(`  WARN: Failed to parse metadata JSON. Starting fresh.`);
      }
    }
    metadata.isDeleted = true;

    const updated = await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: {
        metaPhoneNumberId: null,
        metaWabaId: null,
        metaBusinessId: null,
        metaAccessToken: null,
        metaWebhookVerifyToken: null,
        metaWebhookSecret: null,
        metaDisplayPhoneNumber: null,
        status: 'DISCONNECTED',
        metadata: JSON.stringify(metadata)
      }
    });

    console.log(`  => Updated successfully! New status: ${updated.status}, metadata: ${updated.metadata}`);
  }

  console.log('=== Done! ===');
}

main()
  .catch((e) => {
    console.error('❌ Error executing cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
