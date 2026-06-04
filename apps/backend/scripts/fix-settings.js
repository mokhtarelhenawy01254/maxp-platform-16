const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function fixSettings() {
  const prisma = getSharedPrismaClient();
  
  try {
    // Get connected session
    const connectedSession = await prisma.whatsAppSession.findFirst({
      where: { status: 'CONNECTED' },
      orderBy: { lastConnectedAt: 'desc' }
    });
    
    if (!connectedSession) {
      console.log('âŒ No connected session found');
      return;
    }
    
    console.log('ðŸ“± Connected session:', connectedSession.id, connectedSession.phoneNumber);
    
    // Get settings
    const settings = await prisma.whatsAppNotificationSettings.findFirst();
    
    if (settings) {
      console.log('âš™ï¸ Current default session:', settings.defaultSessionId);
      
      // Update to use connected session
      await prisma.whatsAppNotificationSettings.update({
        where: { id: settings.id },
        data: { defaultSessionId: connectedSession.id }
      });
      
      console.log('âœ… Settings updated to use connected session');
    } else {
      console.log('âŒ No settings found');
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSettings();

