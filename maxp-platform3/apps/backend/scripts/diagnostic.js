const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function fullDiagnostic() {
  const prisma = getSharedPrismaClient();
  
  try {
    // 1. Count orders by time
    console.log('\nðŸ“Š Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ø·Ù„Ø¨Ø§Øª:\n');
    
    const guestOrderCount = await prisma.guestOrder.count();
    const orderCount = await prisma.order.count();
    
    console.log(`GuestOrder: ${guestOrderCount}`);
    console.log(`Order: ${orderCount}`);
    
    // 2. Check recent GuestOrders with Order relation
    console.log('\nðŸ“‹ GuestOrders Ù…Ø¹ Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø©:\n');
    const recentGuestOrders = await prisma.guestOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        orderNumber: true,
        guestName: true,
        guestPhone: true,
        createdAt: true
      }
    });
    
    for (const go of recentGuestOrders) {
      // Check if there's a matching Order
      const matchingOrder = await prisma.order.findFirst({
        where: { orderNumber: go.orderNumber },
        select: {
          id: true,
          customerName: true,
          customerPhone: true
        }
      });
      
      console.log(`--- ${go.orderNumber} ---`);
      console.log(`GuestOrder: ${go.guestName} / ${go.guestPhone}`);
      console.log(`Order: ${matchingOrder ? matchingOrder.customerName + ' / ' + matchingOrder.customerPhone : 'NOT FOUND'}`);
      console.log('---\n');
    }
    
    // 3. Check WhatsApp Logs with null OrderId
    console.log('\nðŸ“± WhatsApp Logs Ø¨Ù€ Order ID = null:\n');
    const nullOrderLogs = await prisma.whatsAppNotificationLog.findMany({
      where: { orderId: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        eventType: true,
        recipientName: true,
        recipientPhone: true,
        content: true,
        createdAt: true
      }
    });
    
    nullOrderLogs.forEach((l, i) => {
      console.log(`--- Log ${i + 1} ---`);
      console.log('Event:', l.eventType);
      console.log('Recipient:', l.recipientName);
      console.log('Phone:', l.recipientPhone);
      console.log('Time:', l.createdAt);
      console.log('Content:', l.content?.substring(0, 100) + '...');
      console.log('---\n');
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fullDiagnostic();

