// Direct test of WhatsApp notification
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const prisma = getSharedPrismaClient();

async function testWhatsApp() {
  try {
    // Get company and settings
    const settings = await prisma.whatsAppNotificationSettings.findFirst();
    console.log('Settings:', settings ? 'Found' : 'Not found');
    
    if (!settings) {
      console.log('âŒ No WhatsApp settings found');
      return;
    }
    
    console.log('Company ID:', settings.companyId);
    console.log('Default Session:', settings.defaultSessionId);
    
    // Check session
    const session = await prisma.whatsAppSession.findFirst({
      where: { status: 'CONNECTED' }
    });
    console.log('Session:', session ? `Found (${session.phoneNumber})` : 'Not found');
    
    // Load service and test
    console.log('\nðŸ“± Loading WhatsAppNotificationService...');
    const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
    
    const testOrder = {
      id: 'test-order-id',
      orderNumber: 'TEST-' + Date.now(),
      companyId: settings.companyId,
      customerPhone: '01123087745',
      customerName: 'Ù…Ø®ØªØ§Ø± Ø§Ù„Ø­Ù†Ø§ÙˆÙŠ',
      customer: {
        firstName: 'Ù…Ø®ØªØ§Ø±',
        phone: '01123087745'
      },
      total: 500,
      currency: 'EGP',
      items: [{
        productName: 'ØªÙŠØ´ÙŠØ±Øª',
        quantity: 2,
        productColor: 'Ø£Ø­Ù…Ø±',
        productSize: 'XL'
      }]
    };
    
    console.log('\nðŸ“‹ Test Order:', JSON.stringify(testOrder, null, 2));
    console.log('\nðŸš€ Calling sendOrderCreatedNotification...\n');
    
    const result = await WhatsAppNotificationService.sendOrderCreatedNotification(testOrder);
    console.log('\nâœ… Result:', result);
    
  } catch (error) {
    console.error('\nâŒ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testWhatsApp();

