const { getSharedPrismaClient } = require('./services/sharedDatabase');

const prisma = getSharedPrismaClient();
const conversationId = 'cmok9069z00w7ju2j58dyokxe';

async function main() {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          type: true,
          isFromCustomer: true,
          createdAt: true,
          metadata: true
        }
      }
    }
  });

  if (!conversation) {
    console.log(JSON.stringify({ found: false, conversationId }, null, 2));
    return;
  }

  console.log(JSON.stringify({
    found: true,
    conversation: {
      id: conversation.id,
      companyId: conversation.companyId,
      customerName: conversation.customer?.name || null,
      status: conversation.status,
      aiEnabled: conversation.aiEnabled,
      lastMessageAt: conversation.lastMessageAt,
      lastMessagePreview: conversation.lastMessagePreview,
      metadata: conversation.metadata
    },
    messages: conversation.messages.map(message => ({
      id: message.id,
      at: message.createdAt,
      fromCustomer: message.isFromCustomer,
      type: message.type,
      content: message.content,
      metadata: message.metadata
    }))
  }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  });
