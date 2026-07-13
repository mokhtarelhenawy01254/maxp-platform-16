/**
 * ðŸ” ÙØ­Øµ Ø´Ø§Ù…Ù„ Ù„Ù…Ø´ÙƒÙ„Ø© PROCESSING
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function deepDiagnose() {
    console.log('ðŸ” ===== ÙØ­Øµ Ø´Ø§Ù…Ù„ =====\n');

    const prisma = getSharedPrismaClient();

    try {
        // 1ï¸âƒ£ Ø¬Ù„Ø¨ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª
        console.log('ðŸ“± 1. Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨:');
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId: 'cmlf8d5ne0000uwoss617a61i' }
        });

        if (!settings) {
            console.log('âŒ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª!');
            return;
        }

        console.log('   isEnabled:', settings.isEnabled);
        console.log('   orderNotificationsEnabled:', settings.orderNotificationsEnabled);
        console.log('   orderProcessingEnabled:', settings.orderProcessingEnabled);
        console.log('   defaultSessionId:', settings.defaultSessionId);

        // 2ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† enum Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ø³Ø¬Ù„ test
        console.log('\nðŸ”§ 2. Ø§Ø®ØªØ¨Ø§Ø± ORDER_PROCESSING ÙÙŠ Ø§Ù„Ù€ enum:');
        try {
            const test = await prisma.whatsAppNotificationLog.create({
                data: {
                    companyId: 'cmlf8d5ne0000uwoss617a61i',
                    sessionId: 'test',
                    recipientPhone: '201123087745',
                    recipientName: 'Test',
                    recipientType: 'CUSTOMER',
                    category: 'ORDER',
                    eventType: 'ORDER_PROCESSING',
                    content: 'Test',
                    status: 'PENDING'
                }
            });
            console.log('   âœ… ORDER_PROCESSING ÙŠØ¹Ù…Ù„! ID:', test.id);
            await prisma.whatsAppNotificationLog.delete({ where: { id: test.id } });
        } catch (e) {
            console.log('   âŒ ORDER_PROCESSING Ù„Ø§ ÙŠØ¹Ù…Ù„!');
            console.log('   Ø§Ù„Ø®Ø·Ø£:', e.message);
        }

        // 3ï¸âƒ£ Ø¬Ù„Ø¨ Ø¢Ø®Ø± Ø¥Ø´Ø¹Ø§Ø±Ø§Øª PROCESSING
        console.log('\nðŸ“‹ 3. Ø¢Ø®Ø± Ø¥Ø´Ø¹Ø§Ø±Ø§Øª PROCESSING:');
        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: { eventType: 'ORDER_PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 3
        });

        if (logs.length === 0) {
            console.log('   âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª PROCESSING ÙÙŠ Ø§Ù„Ø³Ø¬Ù„');
        } else {
            logs.forEach((log, i) => {
                console.log(`   ${i + 1}. ${log.orderNumber || log.orderId} - ${log.status} - ${log.createdAt}`);
                if (log.status === 'FAILED') {
                    console.log(`      Ø³Ø¨Ø¨ Ø§Ù„ÙØ´Ù„: ${log.failureReason}`);
                }
            });
        }

        // 4ï¸âƒ£ Ø¬Ù„Ø¨ Ø¢Ø®Ø± Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù„Ù„Ø·Ù„Ø¨ ORD-351462-104
        console.log('\nðŸ“¦ 4. Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø·Ù„Ø¨ ORD-351462-104:');
        const order = await prisma.order.findFirst({
            where: { orderNumber: 'ORD-351462-104' },
            select: { id: true }
        });

        if (order) {
            const orderLogs = await prisma.whatsAppNotificationLog.findMany({
                where: { orderId: order.id },
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            if (orderLogs.length === 0) {
                console.log('   âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù„Ù‡Ø°Ø§ Ø§Ù„Ø·Ù„Ø¨');
            } else {
                orderLogs.forEach((log, i) => {
                    console.log(`   ${i + 1}. ${log.eventType} - ${log.status} - ${log.createdAt.toLocaleString()}`);
                });
            }
        } else {
            console.log('   âŒ Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
        }

        // 5ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø¬Ù„Ø³Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ù…ØªØµÙ„Ø©
        console.log('\nðŸ“± 5. Ø¬Ù„Ø³Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨:');
        const sessions = await prisma.whatsAppSession.findMany({
            where: { status: 'CONNECTED' },
            select: { id: true, phoneNumber: true, status: true }
        });

        if (sessions.length === 0) {
            console.log('   âŒ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø§Øª Ù…ØªØµÙ„Ø©!');
        } else {
            sessions.forEach(s => {
                console.log(`   âœ… ${s.id} - ${s.phoneNumber} - ${s.status}`);
            });
        }

        console.log('\n===== Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„ÙØ­Øµ =====');

    } catch (error) {
        console.error('âŒ Ø®Ø·Ø£:', error.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

deepDiagnose();

