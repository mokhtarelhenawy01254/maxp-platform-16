const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function inspectConversations() {
  const prisma = getSharedPrismaClient();

  console.log('\n=============================================');
  console.log('🔍 INSPECTING AI CONVERSATIONS & MESSAGES');
  console.log('=============================================\n');

  try {
    const convs = await prisma.$queryRawUnsafe(`
      SELECT id, "companyId", channel, title, status, "createdAt", "updatedAt"
      FROM conversations
      WHERE "companyId" = 'cmleybpf70028juo2wwpmp8rt'
      ORDER BY "updatedAt" DESC
      LIMIT 5;
    `);

    console.log(`Found ${convs.length} conversations for Swan:`);
    for (const c of convs) {
      console.log(`\n--- Conversation: ${c.id} (Channel: ${c.channel}, Updated: ${c.updatedAt}) ---`);
      const msgs = await prisma.$queryRawUnsafe(`
        SELECT id, sender, text, "createdAt"
        FROM messages
        WHERE "conversationId" = $1
        ORDER BY "createdAt" ASC
        LIMIT 30;
      `, c.id);

      for (const m of msgs) {
        console.log(`[${m.sender}] ${m.createdAt.toISOString()}: ${(m.text || '').slice(0, 150)}`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  process.exit(0);
}

inspectConversations().catch(e => { console.error(e); process.exit(1); });
