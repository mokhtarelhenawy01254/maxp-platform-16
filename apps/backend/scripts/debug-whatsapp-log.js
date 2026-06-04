const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugWhatsApp() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Get latest order notification log
    const logs = await prisma.whatsAppNotificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        eventType: true,
        content: true,
        recipientPhone: true,
        status: true,
        createdAt: true
      }
    });
    
    console.log('\nðŸ“± Recent WhatsApp Notification Logs:');
    logs.forEach((log, i) => {
      console.log(`\n--- Log ${i + 1} ---`);
      console.log('Event:', log.eventType);
      console.log('Status:', log.status);
      console.log('Recipient:', log.recipientPhone);
      console.log('Content Preview:', log.content?.substring(0, 200));
      console.log('Has {customerPhone}?', log.content?.includes('{customerPhone}'));
      console.log('Has {orderItems}?', log.content?.includes('{orderItems}'));
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugWhatsApp();

