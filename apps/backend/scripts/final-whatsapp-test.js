/**
 * ðŸ§ª Ø§Ø®ØªØ¨Ø§Ø± Ù†Ù‡Ø§Ø¦ÙŠ - Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ø·Ù„Ø¨ Ù…ÙˆØ¬ÙˆØ¯
 * Ù‡Ø°Ø§ Ø§Ù„Ø³ÙƒØ±ÙŠØ¨Øª ÙŠØ±ÙƒØ² Ø¹Ù„Ù‰ "ØªÙ†Ø´ÙŠØ·" Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ù…ØªØµÙ„Ø© ÙˆØ¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© ÙÙˆØ±Ø§Ù‹
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function finalWhatsAppTest() {
    console.log('ðŸš€ ===== Ø¨Ø¯Ø¡ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ Ù„Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª =====\n');

    try {
        const prisma = getSharedPrismaClient();

        // 1ï¸âƒ£ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø´Ø±ÙƒØ© ÙˆØ§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ù…ØªØµÙ„Ø©
        // Ø§Ø³ØªØ®Ø¯Ù…Ù†Ø§ ID Ø§Ù„Ø´Ø±ÙƒØ© Ø§Ù„ØªÙŠ ØªØ£ÙƒØ¯Ù†Ø§ Ø£Ù† Ù„Ø¯ÙŠÙ‡Ø§ Ø¬Ù„Ø³Ø© Ù…ØªØµÙ„Ø© (Ø±Ù‚Ù… Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª)
        const companyId = 'cmlf8d5ne0000uwoss617a61i';
        const sessionId = 'cmli3nlb50092uw68mfh216mh';

        console.log(`ðŸ” ÙØ­Øµ Ø§Ù„Ø¬Ù„Ø³Ø© ${sessionId} ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...`);
        const sessionDB = await prisma.whatsAppSession.findUnique({
            where: { id: sessionId }
        });

        if (!sessionDB || !sessionDB.authState) {
            console.error('âŒ Ø§Ù„Ø¬Ù„Ø³Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ Ù„Ø§ ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ù…ØµØ§Ø¯Ù‚Ø© (authState)');
            return;
        }

        console.log(`âœ… Ø§Ù„Ø¬Ù„Ø³Ø© Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙŠ DB (Ø§Ù„Ø­Ø§Ù„Ø©: ${sessionDB.status})`);

        // 2ï¸âƒ£ ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø© ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø©
        console.log('\nðŸ”Œ Ù…Ø­Ø§ÙˆÙ„Ø© Ø±Ø¨Ø· Ø§Ù„Ø¬Ù„Ø³Ø© ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©...');
        await WhatsAppManager.createSession(sessionId, companyId);

        // Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± Ø­ØªÙ‰ ÙŠØªØºÙŠØ± Ø­Ø§Ù„ØªÙ‡Ø§ Ø¥Ù„Ù‰ connected
        let isConnected = false;
        let attempts = 0;
        const maxAttempts = 20;

        console.log('â³ Ø§Ù†ØªØ¸Ø§Ø± Ø§ØªØµØ§Ù„ Ø§Ù„Ø¬Ù„Ø³Ø© (Ù‚Ø¯ ÙŠØ³ØªØºØ±Ù‚ 10-20 Ø«Ø§Ù†ÙŠØ©)...');

        while (!isConnected && attempts < maxAttempts) {
            attempts++;
            const session = WhatsAppManager.getSession(sessionId);
            if (session && session.status === 'connected') {
                isConnected = true;
                console.log(`âœ… Ø§Ù„Ø¬Ù„Ø³Ø© Ù…ØªØµÙ„Ø© Ø§Ù„Ø¢Ù†! (Ø¨Ø¹Ø¯ ${attempts} Ù…Ø­Ø§ÙˆÙ„Ø§Øª)`);
            } else {
                process.stdout.write('.');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!isConnected) {
            console.error('\nâŒ ÙØ´Ù„ Ø§ØªØµØ§Ù„ Ø§Ù„Ø¬Ù„Ø³Ø© ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ù…Ø­Ø¯Ø¯. ØªØ£ÙƒØ¯ Ø£Ù† Ø§Ù„Ù‡Ø§ØªÙ Ù…ØªØµÙ„ Ø¨Ø§Ù„Ø¥Ù†ØªØ±Ù†Øª ÙˆØ£Ù† Ø§Ù„Ø¬Ù„Ø³Ø© Ù„Ù… ØªÙ†ØªÙ‡Ù ØµÙ„Ø§Ø­ÙŠØªÙ‡Ø§.');
            return;
        }

        // 3ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø£Ø­Ø¯Ø« Ø·Ù„Ø¨ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø´Ø±ÙƒØ©
        console.log('\nðŸ“¦ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø·Ù„Ø¨ Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø±Ù‡...');
        const order = await prisma.order.findFirst({
            where: { companyId: companyId },
            include: { orderItems: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!order) {
            console.error('âŒ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø·Ù„Ø¨Ø§Øª Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø´Ø±ÙƒØ©');
            return;
        }

        console.log(`âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø·Ù„Ø¨: ${order.orderNumber}`);

        // 4ï¸âƒ£ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø± ÙŠØ¯ÙˆÙŠØ§Ù‹ Ø¹Ø¨Ø± Ø§Ù„Ø®Ø¯Ù…Ø©
        console.log('\nðŸ“¤ Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨...');

        // ØªØ­Ø¶ÙŠØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø¨ Ù„Ù„Ø®Ø¯Ù…Ø©
        const orderForNotification = {
            ...order,
            items: order.orderItems || []
        };

        const result = await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);

        if (result.success) {
            console.log('\nðŸŽ‰ âœ… Ù†Ø¬Ø­ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„!');
            console.log('ðŸ“„ Ø³Ø¬Ù„ Ø§Ù„Ø¬Ù„Ø³Ø© ÙŠØ¸Ù‡Ø± Ø£Ù† Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø®Ø±Ø¬Øª Ø¨Ù†Ø¬Ø§Ø­.');
        } else {
            console.error('\nâŒ ÙØ´Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„:', result.reason);
            if (result.reason === 'session_not_connected') {
                console.log('ðŸ’¡ Ø§Ù„Ø¬Ù„Ø³Ø© Ù…ØªØµÙ„Ø© ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø© ÙˆÙ„ÙƒÙ† Ø§Ù„Ø®Ø¯Ù…Ø© Ù„Ù… ØªØªØ¹Ø±Ù Ø¹Ù„ÙŠÙ‡Ø§. Ù‚Ø¯ ÙŠÙƒÙˆÙ† Ù‡Ù†Ø§Ùƒ ØªØ¶Ø§Ø±Ø¨ ÙÙŠ Ù†Ø³Ø®Ø© WhatsAppManager.');
            }
        }

        // 5ï¸âƒ£ ÙØ­Øµ Ø³Ø¬Ù„ Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ (Logs)
        console.log('\nðŸ“ ÙØ­Øµ Ø³Ø¬Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const log = await prisma.whatsAppNotificationLog.findFirst({
            where: { orderId: order.id },
            orderBy: { createdAt: 'desc' }
        });

        if (log) {
            console.log(`ðŸ” Ø­Ø§Ù„Ø© Ø§Ù„Ø³Ø¬Ù„: ${log.status}`);
            if (log.status === 'SENT') {
                console.log('âœ… Ø§Ù„Ø³Ø¬Ù„ ÙŠØ¤ÙƒØ¯: Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø£ÙØ±Ø³Ù„Øª (SENT)');
            } else {
                console.log(`âš ï¸ Ø§Ù„Ø³Ø¬Ù„ ÙŠØ¸Ù‡Ø± Ø­Ø§Ù„Ø©: ${log.status} (Ø§Ù„Ø³Ø¨Ø¨: ${log.failureReason || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ'})`);
            }
        } else {
            console.log('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø³Ø¬Ù„ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©.');
        }

    } catch (error) {
        console.error('\nâŒ Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹:', error);
    } finally {
        console.log('\nðŸ”š Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±.');
        process.exit(0);
    }
}

finalWhatsAppTest();

