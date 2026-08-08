// Direct test of WhatsApp notification
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const prisma = getSharedPrismaClient();

async function testWhatsApp() {
  try {
    // Select the settings that has a CONNECTED META_CLOUD session as default
    const settings = await prisma.whatsAppNotificationSettings.findFirst({
      where: {
        isEnabled: true,
        defaultSessionId: { not: null }
      },
      orderBy: { updatedAt: 'desc' }
    });
    console.log('Settings:', settings ? 'Found' : 'Not found');

    if (!settings) {
      console.log('❌ No WhatsApp settings found with defaultSessionId');
      return;
    }

    console.log('Company ID:', settings.companyId);
    console.log('Default Session:', settings.defaultSessionId);

    // Check session
    const session = await prisma.whatsAppSession.findUnique({
      where: { id: settings.defaultSessionId }
    });
    console.log('Session:', session ? `Found (${session.name}, ${session.status}, ${session.provider})` : 'Not found');

    if (!session || session.status !== 'CONNECTED') {
      console.log(`❌ Default session not CONNECTED (status=${session?.status})`);
      return;
    }

    // Load service and test
    console.log('\n📱 Loading WhatsAppNotificationService...');
    const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

    const testOrder = {
      id: 'test-order-id',
      orderNumber: 'TEST-' + Date.now(),
      companyId: settings.companyId,
      customerPhone: '01123087745',
      customerName: 'مختار الحناوي',
      customer: {
        firstName: 'مختار',
        phone: '01123087745'
      },
      total: 500,
      currency: 'EGP',
      items: [{
        productName: 'تيشيرت',
        quantity: 2,
        productColor: 'أحمر',
        productSize: 'XL'
      }]
    };

    console.log('\n📋 Test Order:', JSON.stringify(testOrder, null, 2));
    console.log('\n🚀 Calling sendOrderCreatedNotification...\n');

    const result = await WhatsAppNotificationService.sendOrderCreatedNotification(testOrder);
    console.log('\n✅ Result:', result);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testWhatsApp();
