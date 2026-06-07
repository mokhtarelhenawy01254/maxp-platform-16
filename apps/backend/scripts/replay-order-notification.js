/**
 * ðŸ› ï¸ ØªØ¬Ø±Ø¨Ø© Ø¥Ø¹Ø§Ø¯Ø© Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ù„Ø·Ù„Ø¨ Ù…Ø­Ø¯Ø¯
 * Ù‡Ø°Ø§ Ø³ÙŠØ®Ø¨Ø±Ù†Ø§ Ø¨Ø§Ù„Ø¶Ø¨Ø· Ù„Ù…Ø§Ø°Ø§ Ù„Ù… ØªØµÙ„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù„Ù„Ø·Ù„Ø¨ ORD-244869-888
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');

async function replayNotification() {
    const orderNumber = 'ORD-244869-888';
    console.log(`ðŸ”„ Ù…Ø­Ø§ÙˆÙ„Ø© Ø¥Ø¹Ø§Ø¯Ø© Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø± Ù„Ù„Ø·Ù„Ø¨: ${orderNumber}`);

    try {
        const prisma = getSharedPrismaClient();

        // 1. Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ø·Ù„Ø¨ ÙÙŠ Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ
        const order = await prisma.order.findFirst({
            where: { orderNumber: orderNumber },
            include: { orderItems: true }
        });

        if (!order) {
            console.error('âŒ Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø¬Ø¯ÙˆÙ„ Order');
            return;
        }

        // 2. ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø© Ù„Ø¶Ù…Ø§Ù† ÙˆØ¬ÙˆØ¯Ù‡Ø§ ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø©
        const sessionId = 'cmli3nlb50092uw68mfh216mh';
        console.log(`ðŸ”Œ ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø© ${sessionId}...`);
        await WhatsAppManager.createSession(sessionId, order.companyId);

        // Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø§ØªØµØ§Ù„
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Ù…Ø­Ø§ÙˆÙ„Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„
        const orderForNotification = {
            ...order,
            items: order.orderItems || []
        };

        console.log('ðŸ“¤ Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ WhatsAppNotificationService.sendOrderCreatedNotification...');
        const result = await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);

        console.log('\nðŸ“Š Ø§Ù„Ù†ØªÙŠØ¬Ø©:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('âŒ Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©:', error);
    } finally {
        process.exit(0);
    }
}

replayNotification();

