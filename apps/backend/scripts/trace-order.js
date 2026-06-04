const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function traceOrderCreation() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Get the most recent GuestOrder
    const guestOrder = await prisma.guestOrder.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        guestName: true,
        guestPhone: true,
        companyId: true,
        createdAt: true
      }
    });
    
    if (!guestOrder) {
      console.log('No GuestOrder found');
      return;
    }
    
    console.log('\nðŸ“‹ Ø¢Ø®Ø± GuestOrder:');
    console.log('Order Number:', guestOrder.orderNumber);
    console.log('Name:', guestOrder.guestName);
    console.log('Phone:', guestOrder.guestPhone);
    console.log('Company:', guestOrder.companyId);
    console.log('Created:', guestOrder.createdAt);
    
    // Check for Order with same orderNumber
    const order = await prisma.order.findFirst({
      where: { orderNumber: guestOrder.orderNumber },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        createdAt: true
      }
    });
    
    console.log('\nðŸ“¦ Order Ø§Ù„Ù…Ø±ØªØ¨Ø·:');
    if (order) {
      console.log('Found:', order.customerName, '/', order.customerPhone);
    } else {
      console.log('NOT FOUND - Order creation failed or skipped');
    }
    
    // Check console logs for errors
    console.log('\nðŸ” Possible issues:');
    console.log('1. Order creation code not reached');
    console.log('2. Order creation throwing error (caught silently)');
    console.log('3. WhatsApp notification using test endpoint instead');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

traceOrderCreation();

