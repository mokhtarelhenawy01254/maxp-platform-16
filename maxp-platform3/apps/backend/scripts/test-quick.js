const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function test() {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    
    try {
        console.log('ðŸ§ª TEST: ORDER_PROCESSING notification\n');
        
        // Get order
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
        console.log('Customer phone:', order.customer?.phone);
        
        // Try to send
        console.log('\nðŸ“¤ Sending PROCESSING notification...');
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order, 'PROCESSING', order.status
        );
        
        console.log('\nâœ… Result:', JSON.stringify(result, null, 2));
        
        // Check logs
        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: { orderId: order.id, eventType: 'ORDER_PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 1
        });
        
        console.log('\nðŸ“‹ Latest log:', logs[0]?.status, logs[0]?.failureReason || '');
        
    } catch (err) {
        console.error('âŒ ERROR:', err.message);
        console.error(err.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

test();

