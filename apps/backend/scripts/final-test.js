const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function finalTest() {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    
    try {
        console.log('ðŸ§ª FINAL TEST: PROCESSING Notification\n');
        
        // Get latest order
        const order = await prisma.order.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { customer: true, orderItems: true }
        });
        
        if (!order) {
            console.log('âŒ No order found');
            return;
        }
        
        console.log('Order:', order.orderNumber);
        console.log('Current status:', order.status);
        console.log('Customer:', order.customer?.firstName, order.customer?.phone);
        
        // Ensure settings
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });
        
        if (!settings?.orderProcessingEnabled) {
            console.log('\nðŸ”§ Enabling orderProcessingEnabled...');
            await prisma.whatsAppNotificationSettings.update({
                where: { companyId },
                data: { orderProcessingEnabled: true, orderNotificationsEnabled: true }
            });
        }
        
        // Send notification
        console.log('\nðŸ“¤ Sending PROCESSING notification...');
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order, 'PROCESSING', order.status
        );
        
        console.log('\nðŸ“Š Result:', JSON.stringify(result, null, 2));
        
        // Check if created
        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: { orderId: order.id, eventType: 'ORDER_PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 1
        });
        
        if (logs.length > 0) {
            console.log('\nðŸ“‹ Log created:', logs[0].status);
            if (logs[0].status === 'SENT') {
                console.log('âœ… Notification SENT successfully!');
            } else if (logs[0].status === 'FAILED') {
                console.log('âŒ Failed:', logs[0].failureReason);
            }
        }
        
    } catch (err) {
        console.error('\nâŒ ERROR:', err.message);
        console.error(err.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

finalTest();

