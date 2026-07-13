// Test sendOrderCreatedNotification directly
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function test() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Create a test order object similar to what the route sends
    const testOrder = {
      id: 'test-order-123',
      orderNumber: 'TEST-ORD-001',
      companyId: 'cmlf8d5ne0000uwoss617a61i', // From settings
      customerPhone: '01123087745',
      customerName: 'Ù…Ø®ØªØ§Ø± Ø§Ù„Ø­Ù†Ø§ÙˆÙŠ',
      customer: {
        firstName: 'Ù…Ø®ØªØ§Ø±',
        phone: '01123087745'
      },
      total: 500,
      currency: 'EGP',
      createdAt: new Date(),
      items: [
        {
          productName: 'ØªÙŠØ´ÙŠØ±Øª Ø±Ø¬Ø§Ù„ÙŠ',
          quantity: 2,
          price: 250,
          productColor: 'Ø£Ø­Ù…Ø±',
          productSize: 'XL'
        }
      ]
    };
    
    console.log('\nðŸ§ª Testing sendOrderCreatedNotification with:');
    console.log(JSON.stringify(testOrder, null, 2));
    
    // Call the function but don't actually send (no connected session needed for test)
    // We'll just check the replaceVariables part
    const result = await WhatsAppNotificationService.sendOrderCreatedNotification(testOrder);
    
    console.log('\nðŸ“Š Result:', result);
    
    // Check the latest log
    const log = await prisma.whatsAppNotificationLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { content: true, status: true }
    });
    
    if (log) {
      console.log('\nðŸ“± Latest log content preview:');
      console.log(log.content?.substring(0, 300));
      console.log('\nStatus:', log.status);
      console.log('Has unreplaced variables:');
      console.log('  {customerPhone}:', log.content?.includes('{customerPhone}'));
      console.log('  {orderItems}:', log.content?.includes('{orderItems}'));
      console.log('  {customerName}:', log.content?.includes('{customerName}'));
    }
    
  } catch (e) {
    console.error('âŒ Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();

