const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function test() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('ðŸ§ª Testing PROCESSING notification...\n');
        
        const order = await prisma.order.findFirst({
            where: { companyId: 'cmlf8d5ne0000uwoss617a61i' },
            orderBy: { createdAt: 'desc' },
            include: { customer: true }
        });
        
        if (!order) {
            console.log('âŒ No order found');
            return;
        }
        
        console.log('Order:', order.orderNumber);
        console.log('Customer phone:', order.customer?.phone);
        
        // Enable settings
        await prisma.whatsAppNotificationSettings.update({
            where: { companyId: 'cmlf8d5ne0000uwoss617a61i' },
            data: { 
                orderNotificationsEnabled: true,
                orderProcessingEnabled: true 
            }
        });
        
        console.log('\nðŸ“¤ Sending notification...');
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order, 'PROCESSING', order.status
        );
        
        console.log('\nðŸ“Š Result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\nâœ… SUCCESS! Notification sent!');
        } else {
            console.log('\nâŒ Failed:', result.reason);
        }
        
    } catch (err) {
        console.error('\nâŒ ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();

