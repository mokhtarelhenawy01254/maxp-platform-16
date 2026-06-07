/**
 * ðŸ§ª Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø´Ø¹Ø§Ø± Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ²
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function testProcessingNotification() {
    console.log('ðŸš€ ===== Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø´Ø¹Ø§Ø± Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ² =====\n');

    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    const orderNumber = 'ORD-351462-104'; // Ø§Ù„Ø·Ù„Ø¨ Ù…Ù† Ø§Ù„Ø±Ø§Ø¨Ø·

    try {
        // 1ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª
        console.log('ðŸ“± Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ²...');
        
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });

        console.log('âš™ï¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª:');
        console.log('  - isEnabled:', settings?.isEnabled);
        console.log('  - orderNotificationsEnabled:', settings?.orderNotificationsEnabled);
        console.log('  - orderProcessingEnabled:', settings?.orderProcessingEnabled);
        console.log('  - orderConfirmedEnabled:', settings?.orderConfirmedEnabled);

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
            customerPhone: order.customer?.phone || order.customerPhone,
            customerName: order.customer?.firstName || order.customerName
        });

        // 3ï¸âƒ£ Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± PROCESSING
        console.log('\nðŸ“¤ Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø±: PROCESSING...');
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order,
            'PROCESSING',  // Ø­Ø§Ù„Ø© Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ²
            order.status
        );

        console.log('ðŸ“Š Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­!');
        } else {
            console.log('âŒ ÙØ´Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„:', result.reason);
        }

        // 4ï¸âƒ£ Ø§Ù†ØªØ¸Ø§Ø± ÙˆØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø³Ø¬Ù„Ø§Øª
        console.log('\nâ³ Ø§Ù†ØªØ¸Ø§Ø± 2 Ø«Ø§Ù†ÙŠØ©...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const notifications = await prisma.whatsAppNotificationLog.findMany({
            where: { 
                orderId: order.id
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`\nðŸ“Š Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„ÙƒÙ„ÙŠØ© Ù„Ù„Ø·Ù„Ø¨: ${notifications.length}`);
        
        notifications.forEach((n, i) => {
            console.log(`\nðŸ“¨ Ø¥Ø´Ø¹Ø§Ø± ${i + 1}:`);
            console.log(`   - Ø§Ù„Ø­Ø§Ù„Ø©: ${n.status}`);
            console.log(`   - Ù†ÙˆØ¹ Ø§Ù„Ø­Ø¯Ø«: ${n.eventType}`);
            console.log(`   - ÙˆÙ‚Øª Ø§Ù„Ø¥Ø±Ø³Ø§Ù„: ${n.createdAt}`);
            if (n.status === 'FAILED') {
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

testProcessingNotification();

