/**
 * ðŸ§ª ÙØ­Øµ ØªÙØµÙŠÙ„ÙŠ Ù„Ù…Ø´ÙƒÙ„Ø© PROCESSING
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function diagnoseProcessing() {
    console.log('ðŸ” ===== ÙØ­Øµ Ù…Ø´ÙƒÙ„Ø© PROCESSING =====\n');

    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    const orderNumber = 'ORD-351462-104';

    try {
        // 1ï¸âƒ£ Ø¬Ù„Ø¨ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª
        console.log('ðŸ“± Ø¬Ù„Ø¨ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨...');
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });

        console.log('âš™ï¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª:');
        console.log('  - isEnabled:', settings?.isEnabled);
        console.log('  - orderNotificationsEnabled:', settings?.orderNotificationsEnabled);
        console.log('  - orderProcessingEnabled:', settings?.orderProcessingEnabled);

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

        console.log('âœ… Ø§Ù„Ø·Ù„Ø¨:', {
            orderNumber: order.orderNumber,
            status: order.status,
            customerPhone: order.customer?.phone || order.customerPhone,
            customerName: order.customer?.firstName || order.customerName
        });

        // 3ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† enum values
        console.log('\nðŸ” Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ù‚ÙŠÙ… enum...');
        try {
            const testLog = await prisma.whatsAppNotificationLog.create({
                data: {
                    companyId: companyId,
                    sessionId: 'test-session',
                    recipientPhone: '201123087745',
                    recipientName: 'Test',
                    recipientType: 'CUSTOMER',
                    category: 'ORDER',
                    eventType: 'ORDER_PROCESSING', // âœ… Ø¬Ø±Ø¨ Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©
                    content: 'Test content',
                    status: 'PENDING'
                }
            });
            console.log('âœ… ORDER_PROCESSING Ø´ØºØ§Ù„ ÙÙŠ Ø§Ù„Ù€ enum!');
            console.log('ðŸ“ Test log ID:', testLog.id);
            
            // Ø§Ù…Ø³Ø­ Ø§Ù„Ù€ test log
            await prisma.whatsAppNotificationLog.delete({ where: { id: testLog.id } });
            console.log('ðŸ—‘ï¸ ØªÙ… Ù…Ø³Ø­ Ø§Ù„Ù€ test log');
        } catch (enumError) {
            console.error('âŒ ORDER_PROCESSING Ù„Ø³Ù‡ Ù†Ø§Ù‚Øµ Ù…Ù† Ø§Ù„Ù€ enum!');
            console.error('   Ø§Ù„Ø®Ø·Ø£:', enumError.message);
        }

        // 4ï¸âƒ£ Ø¬Ø±Ø¨ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±
        console.log('\nðŸ“¤ Ù…Ø­Ø§ÙˆÙ„Ø© Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± PROCESSING...');
        const result = await WhatsAppNotificationService.sendOrderStatusNotification(
            order,
            'PROCESSING',
            order.status
        );

        console.log('ðŸ“Š Ø§Ù„Ù†ØªÙŠØ¬Ø©:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('âŒ Ø®Ø·Ø£:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

diagnoseProcessing();

