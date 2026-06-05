const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testOrderCreation() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Get latest GuestOrder
    const guestOrder = await prisma.guestOrder.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!guestOrder) {
      console.log('No GuestOrder found');
      return;
    }
    
    console.log('GuestOrder:', guestOrder.orderNumber);
    console.log('Name:', guestOrder.guestName);
    console.log('Phone:', guestOrder.guestPhone);
    console.log('Company:', guestOrder.companyId);
    
    // Check if customer exists
    let customer = await prisma.customer.findFirst({
      where: {
        phone: guestOrder.guestPhone,
        companyId: guestOrder.companyId
      }
    });
    
    if (!customer) {
      console.log('\nCreating customer...');
      try {
        // Split name into first and last
        const nameParts = guestOrder.guestName?.split(' ') || ['Ø¹Ù…ÙŠÙ„', 'Ø¬Ø¯ÙŠØ¯'];
        const firstName = nameParts[0] || 'Ø¹Ù…ÙŠÙ„';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        customer = await prisma.customer.create({
          data: {
            firstName: firstName,
            lastName: lastName || null,
            phone: guestOrder.guestPhone,
            email: guestOrder.guestEmail || null,
            companyId: guestOrder.companyId,
            status: 'ACTIVE',
            metadata: JSON.stringify({ source: 'test', guestOrderId: guestOrder.id })
          }
        });
        console.log('âœ… Customer created:', customer.id);
      } catch (e) {
        console.error('âŒ Customer creation failed:', e.message);
        return;
      }
    } else {
      console.log('Found customer:', customer.id);
    }
    
    // Try to create Order
    console.log('\nCreating Order...');
    try {
      const parsedItems = typeof guestOrder.items === 'string' 
        ? JSON.parse(guestOrder.items) 
        : guestOrder.items;
      
      console.log('Items:', parsedItems.length);
      
      const orderItems = parsedItems.map(item => ({
        productName: item.name || item.productName || 'Ù…Ù†ØªØ¬',
        quantity: item.quantity || 1,
        price: parseFloat(item.price || 0),
        total: parseFloat((item.price || 0) * (item.quantity || 1)),
        productId: item.productId || null,
        variantId: item.variantId || null,
      }));
      
      const shippingAddress = typeof guestOrder.shippingAddress === 'string'
        ? JSON.parse(guestOrder.shippingAddress)
        : guestOrder.shippingAddress;
      
      const createdOrder = await prisma.order.create({
        data: {
          orderNumber: guestOrder.orderNumber,
          customerId: customer.id,
          companyId: guestOrder.companyId,
          customerName: guestOrder.guestName,
          customerPhone: guestOrder.guestPhone,
          customerEmail: guestOrder.guestEmail || null,
          shippingAddress: JSON.stringify(shippingAddress),
          city: shippingAddress?.city || '',
          subtotal: parseFloat(guestOrder.total) - parseFloat(guestOrder.shippingCost || 0),
          shipping: parseFloat(guestOrder.shippingCost || 0),
          discount: parseFloat(guestOrder.discountAmount || 0),
          total: parseFloat(guestOrder.finalTotal || guestOrder.total),
          status: 'PENDING',
          paymentStatus: 'PENDING',
          orderItems: {
            create: orderItems
          }
        }
      });
      
      console.log('âœ… Order created:', createdOrder.id);
      
    } catch (e) {
      console.error('âŒ Order creation failed:', e.message);
      console.error('Full error:', e);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderCreation();

