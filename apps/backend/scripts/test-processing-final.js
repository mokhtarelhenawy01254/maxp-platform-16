const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testProcessingNotification() {
  console.log('ðŸ§ª Testing WhatsApp PROCESSING Notification\n');
  
  const prisma = getSharedPrismaClient();
  
  try {
    // 1. Check database enums
    console.log('1ï¸âƒ£ Checking database enums...');
    const enumResult = await prisma.$queryRaw`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'whatsapp_notification_logs_eventtype'
      AND e.enumlabel = 'ORDER_PROCESSING'
    `;
    console.log('   ORDER_PROCESSING in enum:', enumResult.length > 0 ? 'âœ… Yes' : 'âŒ No');
    
    // 2. Check notification settings
    console.log('\n2ï¸âƒ£ Checking notification settings...');
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    const settings = await prisma.whatsAppNotificationSettings.findUnique({
      where: { companyId }
    });
    
    if (settings) {
      console.log('   âœ… Settings found');
      console.log('   - orderProcessingEnabled:', settings.orderProcessingEnabled);
      console.log('   - orderNotificationsEnabled:', settings.orderNotificationsEnabled);
    } else {
      console.log('   âŒ No settings found');
    }
    
    // 3. Check WhatsApp session
    console.log('\n3ï¸âƒ£ Checking WhatsApp session...');
    const session = await prisma.whatsAppSession.findUnique({
      where: { companyId }
    });
    
    if (session) {
      console.log('   âœ… Session found');
      console.log('   - Status:', session.status);
    } else {
      console.log('   âŒ No session found');
    }
    
    // 4. Check recent ORDER_PROCESSING logs
    console.log('\n4ï¸âƒ£ Checking recent ORDER_PROCESSING logs...');
    const logs = await prisma.whatsAppNotificationLog.findMany({
      where: { eventType: 'ORDER_PROCESSING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { order: true }
    });
    
    console.log(`   Found ${logs.length} ORDER_PROCESSING logs`);
    logs.forEach((log, i) => {
      console.log(`   ${i+1}. ${log.order?.orderNumber || 'N/A'} - ${log.status} - ${log.recipientPhone} - ${log.createdAt.toLocaleString()}`);
    });
    
    // 5. Test sending a PROCESSING notification
    console.log('\n5ï¸âƒ£ Testing PROCESSING notification...');
    const latestOrder = await prisma.order.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { customer: true }
    });
    
    if (!latestOrder) {
      console.log('   âŒ No orders found');
      return;
    }
    
    console.log(`   Latest order: ${latestOrder.orderNumber}`);
    console.log(`   Customer phone: ${latestOrder.customer?.phone || 'N/A'}`);
    
    // Check if customer has phone
    if (!latestOrder.customer?.phone) {
      console.log('   âŒ Customer has no phone number');
      return;
    }
    
    // Enable settings if needed
    if (settings && !settings.orderProcessingEnabled) {
      await prisma.whatsAppNotificationSettings.update({
        where: { companyId },
        data: { orderProcessingEnabled: true }
      });
      console.log('   âœ… Enabled orderProcessingEnabled');
    }
    
    console.log('\nðŸ“Š Summary:');
    console.log('   - Enum: ORDER_PROCESSING', enumResult.length > 0 ? 'âœ…' : 'âŒ');
    console.log('   - Settings:', settings ? 'âœ…' : 'âŒ');
    console.log('   - Session:', session ? 'âœ…' : 'âŒ');
    console.log('   - Order:', latestOrder ? 'âœ…' : 'âŒ');
    console.log('\nðŸ’¡ To test from UI:');
    console.log('   1. Go to any order');
    console.log('   2. Change status to "Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ²" (PROCESSING)');
    console.log('   3. Check if WhatsApp message is sent');
    
  } catch (error) {
    console.error('âŒ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testProcessingNotification();

