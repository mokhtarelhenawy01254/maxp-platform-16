/**
 * ðŸ§ª Ø§Ø®ØªØ¨Ø§Ø± ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨ ÙˆØ¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± ÙˆØ§ØªØ³Ø§Ø¨
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');

async function testStatusUpdate() {
    console.log('ðŸš€ ===== Ø§Ø®ØªØ¨Ø§Ø± ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨ =====\n');

    try {
        const prisma = getSharedPrismaClient();
        const companyId = 'cmlf8d5ne0000uwoss617a61i';
        const orderNumber = 'ORD-343148-303'; // Ø§Ù„Ø·Ù„Ø¨ Ø§Ù„Ù„ÙŠ Ø¹Ù…Ù„Ù†Ø§Ù‡

        // 1ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨
        console.log('ðŸ“± Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨...');
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });

        console.log('âš™ï¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª:', {
            isEnabled: settings?.isEnabled,
            orderNotificationsEnabled: settings?.orderNotificationsEnabled,
            orderConfirmedEnabled: settings?.orderConfirmedEnabled,
            orderShippedEnabled: settings?.orderShippedEnabled,
            orderDeliveredEnabled: settings?.orderDeliveredEnabled,
            orderCancelledEnabled: settings?.orderCancelledEnabled,
            defaultSessionId: settings?.defaultSessionId
        });

        // 2ï¸âƒ£ Ø¬Ù„Ø¨ Ø§Ù„Ø·Ù„Ø¨
        console.log('\nðŸ“¦ Ø¬Ù„Ø¨ Ø§Ù„Ø·Ù„Ø¨...');
        const order = await prisma.order.findFirst({
            where: { orderNumber, companyId },
            include: { customer: true, orderItems: true }
        });

        if (!order) {
            console.error('âŒ Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
            return;
        }

        console.log('âœ… Ø§Ù„Ø·Ù„Ø¨ Ù…ÙˆØ¬ÙˆØ¯:', {
            id: order.id,
            orderNumber: order.orderNumber,
            currentStatus: order.status,
            customerPhone: order.customer?.phone || order.customerPhone,
            customerName: order.customer?.firstName || order.customerName
        });

        // 3ï¸âƒ£ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø© Ù„Ù€ CONFIRMED
        console.log('\nðŸ”„ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø© Ù„Ù€ CONFIRMED...');
        const updatedOrder = await orderService.updateOrderStatus(
            orderNumber,
            companyId,
            'CONFIRMED',
            'ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø·Ù„Ø¨ Ù…Ù† Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±',
            'test-user-id',
            'Test User'
        );

        console.log('âœ… ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©:', updatedOrder.status);

        // 4ï¸âƒ£ Ø§Ù†ØªØ¸Ø§Ø± ÙˆØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±
        console.log('\nâ³ Ø§Ù†ØªØ¸Ø§Ø± 3 Ø«ÙˆØ§Ù†ÙŠ...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const notifications = await prisma.whatsAppNotificationLog.findMany({
            where: { orderId: order.id },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`ðŸ“Š Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª: ${notifications.length}`);

        notifications.forEach((n, i) => {
            console.log(`\nðŸ“¨ Ø¥Ø´Ø¹Ø§Ø± ${i + 1}:`);
            console.log(`   - Ø§Ù„Ø­Ø§Ù„Ø©: ${n.status}`);
            console.log(`   - Ù†ÙˆØ¹ Ø§Ù„Ø­Ø¯Ø«: ${n.eventType}`);
            console.log(`   - Ø³Ø¨Ø¨ Ø§Ù„ÙØ´Ù„: ${n.failureReason || 'Ù„Ø§ ÙŠÙˆØ¬Ø¯'}`);
        });

    } catch (error) {
        console.error('âŒ Ø®Ø·Ø£:', error.message);
    } finally {
        await getSharedPrismaClient().$disconnect();
        process.exit(0);
    }
}

testStatusUpdate();

