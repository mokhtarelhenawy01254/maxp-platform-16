const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  console.log('🔍 Fixing broadcast metadata for ALL companies...');

  const campaigns = await prisma.broadcastCampaign.findMany({
    where: { channel: 'whatsapp', status: { in: ['sent', 'sending'] }, sentCount: { gt: 0 } },
    select: { id: true, name: true, sentCount: true, createdAt: true, companyId: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Found ${campaigns.length} WhatsApp broadcast campaigns.`);
  let totalUpdated = 0;

  for (const campaign of campaigns) {
    const recipients = await prisma.broadcastRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { conversationId: true, sentAt: true },
      take: 2000
    });

    const brConvIds = recipients.map(r => r.conversationId).filter(Boolean);
    if (brConvIds.length === 0) continue;

    // Get customer IDs from the broadcast recipient conversations
    const brConvs = await prisma.conversation.findMany({
      where: { id: { in: brConvIds } },
      select: { id: true, customerId: true }
    });
    const customerIds = brConvs.map(c => c.customerId).filter(Boolean);

    // Find ALL conversations (both cases) for these customers in this company
    const allConvs = await prisma.conversation.findMany({
      where: {
        companyId: campaign.companyId,
        customerId: { in: customerIds },
        channel: { in: ['WHATSAPP', 'whatsapp'] }
      },
      select: { id: true }
    });
    const allConvIds = allConvs.map(c => c.id);

    // Find template messages in ALL these conversations ±1 hour from campaign time
    const windowStart = new Date(campaign.createdAt.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(campaign.createdAt.getTime() + 60 * 60 * 1000);

    const msgs = await prisma.message.findMany({
      where: {
        conversationId: { in: allConvIds },
        isFromCustomer: false,
        type: 'TEMPLATE',
        createdAt: { gte: windowStart, lte: windowEnd }
      },
      select: { id: true, metadata: true, createdAt: true }
    });

    let updated = 0;
    for (const msg of msgs) {
      let meta = null;
      try { meta = msg.metadata ? JSON.parse(msg.metadata) : {}; } catch(e) { meta = {}; }
      if (!meta || meta.isBroadcast === true) continue;

      meta.isBroadcast = true;
      meta.campaignId = campaign.id;
      meta.campaignName = campaign.name;

      await prisma.message.update({ where: { id: msg.id }, data: { metadata: JSON.stringify(meta) } });
      updated++;
    }

    if (updated > 0) {
      totalUpdated += updated;
      console.log(`  ✅ ${campaign.name} (sent=${campaign.sentCount}): updated ${updated}`);
    } else {
      console.log(`  ⚠️  ${campaign.name}: No TEMPLATE msgs found in any conversation`);
    }
  }

  // Second pass: catch remaining TEMPLATE messages with senderId=null
  // Mark them as broadcast=False, automated=True (to distinguish from broadcast)
  console.log('\n🔍 Second pass: flagging remaining TEMPLATE messages...');
  const remaining = await prisma.message.findMany({
    where: {
      isFromCustomer: false,
      type: 'TEMPLATE',
      senderId: null,
      OR: [
        { metadata: null },
        { NOT: { metadata: { contains: 'isBroadcast' } } }
      ]
    },
    select: { id: true, metadata: true },
    take: 5000
  });

  let flagged = 0;
  for (const msg of remaining) {
    let meta = null;
    try { meta = msg.metadata ? JSON.parse(msg.metadata) : {}; } catch(e) { meta = {}; }
    if (!meta) meta = {};
    if (meta.isBroadcast !== undefined) continue; // already processed

    meta.isBroadcast = false;
    meta.isAutomated = true;

    await prisma.message.update({ where: { id: msg.id }, data: { metadata: JSON.stringify(meta) } });
    flagged++;
  }

  console.log(`  Flagged ${flagged} remaining TEMPLATE msgs as automated (not broadcast)`);
  console.log(`\n📊 Total broadcast messages updated: ${totalUpdated}`);
  console.log('Done!');
  await prisma.$disconnect();
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
