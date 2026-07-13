const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function test() {
  const prisma = getSharedPrismaClient();
  
  try {
    const order = await prisma.order.findFirst({ orderBy: { createdAt: 'desc' } });
    console.log('ðŸ“¦ Order:', order?.customerName, order?.customerPhone);
    
    if (order) {
      console.log('ðŸ“± Sending WhatsApp notification...');
      const result = await WhatsAppNotificationService.sendOrderCreatedNotification({
        id: order.id,
        orderNumber: order.orderNumber,
        companyId: order.companyId,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        customer: { firstName: order.customerName, phone: order.customerPhone },
        total: order.total,
        currency: 'EGP',
        items: []
      });
      console.log('ðŸ“Š Result:', result);
      
      // Check the log
      const log = await prisma.whatsAppNotificationLog.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      console.log('\nðŸ“± Latest Log:');
      console.log('  Recipient:', log?.recipientName);
      console.log('  Phone:', log?.recipientPhone);
      console.log('  Content:', log?.content?.substring(0, 150) + '...');
      
      if (log?.content?.includes(order.customerName)) {
        console.log('\nâœ… SUCCESS: Real data in notification!');
      } else if (log?.content?.includes('Ø±ÙˆØ§Ù† Ø­Ø³ÙŠÙ†')) {
        console.log('\nâŒ FAILED: Still test data!');
      }
    }
  } catch (e) {
    console.error('âŒ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();

