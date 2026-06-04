const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function finalTest() {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    
    try {
        console.log('\nðŸ§ª FINAL TEST: PROCESSING Notification\n');
        
        // Get order
        const order = await prisma.order.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { customer: true }
        });
        
        if (!order) {
            console.log('âŒ No order found');
            return;
        }
        
        console.log('ðŸ“¦ Order:', order.orderNumber);
        console.log('ðŸ“± Phone:', order.customer?.phone);
        console.log('ðŸ”„ Current Status:', order.status);
        
        // Enable settings
        await prisma.whatsAppNotificationSettings.update({
            where: { companyId },
            data: { 
                orderNotificationsEnabled: true,
                orderProcessingEnabled: true 
            }
        });
        console.log('âœ… Settings enabled\n');
        
        // Send notification
        console.log('ðŸ“¤ Sending PROCESSING notification...');
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order, 'PROCESSING', order.status
        );
        
        console.log('\nðŸ“Š Result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\nâœ…âœ…âœ… SUCCESS! Notification sent!');
            console.log('ðŸ“± Check your WhatsApp now!');
        } else {
            console.log('\nâŒ Failed:', result.reason);
            if (result.error) console.log('Error:', result.error);
        }
        
        // Check log
        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: { orderId: order.id, eventType: 'ORDER_PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 1
        });
        
        if (logs.length > 0) {
            console.log('\nðŸ“ Log status:', logs[0].status);
        }
        
    } catch (err) {
        console.error('\nâŒ ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

finalTest();

