const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function findTestData() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Search for any order with "12345" in orderNumber
    const ordersWith12345 = await prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: '12345' } },
          { customerName: { contains: 'Ø±ÙˆØ§Ù† Ø­Ø³ÙŠÙ†' } },
          { customerPhone: { contains: '01281914482' } }
        ]
      },
      take: 5
    });
    
    console.log('\nðŸ” Orders matching test data:');
    console.log('Count:', ordersWith12345.length);
    ordersWith12345.forEach((o, i) => {
      console.log(`\n--- Order ${i + 1} ---`);
      console.log('ID:', o.id);
      console.log('Order Number:', o.orderNumber);
      console.log('Customer Name:', o.customerName);
      console.log('Customer Phone:', o.customerPhone);
    });
    
    // Check GuestOrder too
    const guestOrders = await prisma.guestOrder.findMany({
      where: {
        OR: [
          { orderNumber: { contains: '12345' } },
          { customerName: { contains: 'Ø±ÙˆØ§Ù† Ø­Ø³ÙŠÙ†' } },
          { customerPhone: { contains: '01281914482' } }
        ]
      },
      take: 5
    });
    
    console.log('\nðŸ” GuestOrders matching test data:');
    console.log('Count:', guestOrders.length);
    guestOrders.forEach((o, i) => {
      console.log(`\n--- GuestOrder ${i + 1} ---`);
      console.log('ID:', o.id);
      console.log('Order Number:', o.orderNumber);
      console.log('Customer Name:', o.customerName);
      console.log('Customer Phone:', o.customerPhone);
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

findTestData();

