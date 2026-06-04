/**
 * ðŸ§ª Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø´Ø¹Ø§Ø± ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function testStatusUpdateNotification() {
    console.log('ðŸš€ ===== Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø´Ø¹Ø§Ø± ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø© =====\n');

    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    const orderNumber = 'ORD-343148-303';

    try {
        // 1ï¸âƒ£ ØªÙØ¹ÙŠÙ„ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª
        console.log('ðŸ“± ØªÙØ¹ÙŠÙ„ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø­Ø§Ù„Ø©...');
        
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });

        if (settings) {
            await prisma.whatsAppNotificationSettings.update({
                where: { companyId },
                data: {
                    isEnabled: true,
                    orderNotificationsEnabled: true,
                    orderConfirmedEnabled: true,
                    orderProcessingEnabled: true,
                    orderShippedEnabled: true,
                    orderDeliveredEnabled: true,
                    orderCancelledEnabled: true
                }
            });
            console.log('âœ… ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª');
        }

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
            orderNumber: order.orderNumber,
            currentStatus: order.status,
            customerPhone: order.customer?.phone || order.customerPhone
        });

        // 3ï¸âƒ£ Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø© (CONFIRMED)
        console.log('\nðŸ“¤ Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø±: CONFIRMED...');
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order,
            'CONFIRMED',
            order.status
        );

        console.log('ðŸ“Š Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„:', result);

        if (result.success) {
            console.log('âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­!');
        } else {
            console.log('âŒ ÙØ´Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„:', result.reason);
        }

        // 4ï¸âƒ£ Ø§Ù†ØªØ¸Ø§Ø± ÙˆØªØ­Ù‚Ù‚
        console.log('\nâ³ Ø§Ù†ØªØ¸Ø§Ø± 3 Ø«ÙˆØ§Ù†ÙŠ...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const notifications = await prisma.whatsAppNotificationLog.findMany({
            where: { 
                orderId: order.id,
                eventType: 'ORDER_CONFIRMED'
            },
            orderBy: { createdAt: 'desc' },
            take: 3
        });

        console.log(`\nðŸ“Š Ø¹Ø¯Ø¯ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ORDER_CONFIRMED: ${notifications.length}`);
        
        notifications.forEach((n, i) => {
            console.log(`\nðŸ“¨ Ø¥Ø´Ø¹Ø§Ø± ${i + 1}:`);
            console.log(`   - Ø§Ù„Ø­Ø§Ù„Ø©: ${n.status}`);
            console.log(`   - Ù†ÙˆØ¹ Ø§Ù„Ø­Ø¯Ø«: ${n.eventType}`);
            console.log(`   - Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ: ${n.recipientPhone}`);
            if (n.status === 'SENT') {
                console.log('   ðŸ“ Ø§Ù„Ù…Ø­ØªÙˆÙ‰:');
                console.log('   ' + '='.repeat(50));
                console.log(n.content.split('\n').map(line => '   ' + line).join('\n'));
            } else {
                console.log(`   - Ø³Ø¨Ø¨ Ø§Ù„ÙØ´Ù„: ${n.failureReason}`);
            }
        });

        console.log('\nâœ… ===== Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± =====');

    } catch (error) {
        console.error('âŒ Ø®Ø·Ø£:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

testStatusUpdateNotification();

