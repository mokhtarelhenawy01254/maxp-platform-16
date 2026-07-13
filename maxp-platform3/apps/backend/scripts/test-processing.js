const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function test() {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    
    try {
        console.log('ðŸ§ª Testing PROCESSING notification...\n');
        
        const order = await prisma.order.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { customer: true }
        });
        
        if (!order) {
            console.log('âŒ No order found');
            return;
        }
        
        console.log('Order:', order.orderNumber);
        console.log('Phone:', order.customer?.phone);
        
        // Ensure settings are enabled
        await prisma.whatsAppNotificationSettings.update({
            where: { companyId },
            data: { 
                orderNotificationsEnabled: true,
                orderProcessingEnabled: true 
            }
        });
        
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order, 'PROCESSING', order.status
        );
        
        console.log('\nðŸ“Š Result:', JSON.stringify(result, null, 2));
        
    } catch (err) {
        console.error('\nâŒ ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

test();

