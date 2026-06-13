/**
 * ðŸ”Œ Ù…Ø­Ø§ÙƒØ§Ø© Ø§ØªØµØ§Ù„ Ø¬Ù„Ø³Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ ÙˆØ¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø§Ø®ØªØ¨Ø§Ø±ÙŠ
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function simulateSessionAndSendNotification() {
    console.log('ðŸš€ ===== Ù…Ø­Ø§ÙƒØ§Ø© Ø§ØªØµØ§Ù„ Ø§Ù„Ø¬Ù„Ø³Ø© ÙˆØ¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± =====\n');

    try {
        const prisma = getSharedPrismaClient();

        // 1ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø´Ø±ÙƒØ© Swan
        console.log('ðŸ” Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø´Ø±ÙƒØ© Swan...');
        const company = await prisma.company.findFirst({
            where: {
                OR: [
                    { name: { contains: 'swan', mode: 'insensitive' } },
                    { slug: { contains: 'swan', mode: 'insensitive' } }
                ]
            }
        });

        if (!company) {
            console.error('âŒ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø´Ø±ÙƒØ© Swan');
            return;
        }

        console.log('âœ… Ø§Ù„Ø´Ø±ÙƒØ©:', company.name);

        // 2ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ø¬Ù„Ø³Ø©
        console.log('\nðŸ“± Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø¬Ù„Ø³Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨...');
        const session = await prisma.whatsAppSession.findFirst({
            where: {
                companyId: company.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!session) {
            console.error('âŒ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø¬Ù„Ø³Ø©');
            console.log('ðŸ’¡ Ù‚Ù… Ø¨ØªØ´ØºÙŠÙ„: node create-whatsapp-session.js');
            return;
        }

        console.log('âœ… Ø§Ù„Ø¬Ù„Ø³Ø©:', session.name);
        console.log('   - Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©:', session.status);

        // 3ï¸âƒ£ Ù…Ø­Ø§ÙƒØ§Ø© Ø§Ù„Ø§ØªØµØ§Ù„ (ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø© Ø¥Ù„Ù‰ CONNECTED)
        console.log('\nðŸ”Œ Ù…Ø­Ø§ÙƒØ§Ø© Ø§ØªØµØ§Ù„ Ø§Ù„Ø¬Ù„Ø³Ø©...');

        await prisma.whatsAppSession.update({
            where: { id: session.id },
            data: {
                status: 'CONNECTED',
                phoneNumber: '201123087745', // Ø±Ù‚Ù… ÙˆÙ‡Ù…ÙŠ Ù„Ù„Ø§Ø®ØªØ¨Ø§Ø±
                lastConnectedAt: new Date()
            }
        });

        console.log('âœ… ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø¬Ù„Ø³Ø© Ø¥Ù„Ù‰ CONNECTED');

        // 4ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø¢Ø®Ø± Ø·Ù„Ø¨
        console.log('\nðŸ“¦ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø¢Ø®Ø± Ø·Ù„Ø¨...');
        const order = await prisma.order.findFirst({
            where: {
                companyId: company.id,
                customerPhone: '01123087745'
            },
            include: {
                orderItems: true,
                customer: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!order) {
            console.error('âŒ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø·Ù„Ø¨');
            console.log('ðŸ’¡ Ù‚Ù… Ø¨ØªØ´ØºÙŠÙ„: node test-order-whatsapp.js');
            return;
        }

        console.log('âœ… Ø§Ù„Ø·Ù„Ø¨:', order.orderNumber);
        console.log('   - Ø§Ù„Ø¹Ù…ÙŠÙ„:', order.customerName);
        console.log('   - Ø§Ù„Ù‡Ø§ØªÙ:', order.customerPhone);
        console.log('   - Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ:', order.total);

        // 5ï¸âƒ£ Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„Ø·Ù„Ø¨
        console.log('\nðŸ“± ===== Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ =====');

        const orderForNotification = {
            id: order.id,
            orderNumber: order.orderNumber,
            companyId: order.companyId,
            customerPhone: order.customerPhone,
            customerName: order.customerName,
            customer: order.customer,
            total: parseFloat(order.total),
            subtotal: parseFloat(order.subtotal),
            shipping: parseFloat(order.shipping),
            currency: order.currency || 'EGP',
            createdAt: order.createdAt,
            items: order.orderItems || []
        };

        console.log('ðŸ“‹ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±:');
        console.log('   - Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨:', orderForNotification.orderNumber);
        console.log('   - Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„:', orderForNotification.customerName);
        console.log('   - Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ:', orderForNotification.customerPhone);
        console.log('   - Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù†Ø§ØµØ±:', orderForNotification.items.length);

        const result = await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);

        console.log('\nðŸ“Š Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„:', result);

        // 6ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø³Ø¬Ù„
        console.log('\nðŸ“ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø³Ø¬Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª...');

        await new Promise(resolve => setTimeout(resolve, 2000));

        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: {
                orderId: order.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 1
        });

        if (logs.length > 0) {
            const log = logs[0];
            console.log('\nâœ… ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±:');
            console.log('   - Ø§Ù„Ø­Ø§Ù„Ø©:', log.status);
            console.log('   - Ù†ÙˆØ¹ Ø§Ù„Ø­Ø¯Ø«:', log.eventType);
            console.log('   - Ø§Ù„Ù…Ø³ØªÙ„Ù…:', log.recipientName);
            console.log('   - Ø§Ù„Ù‡Ø§ØªÙ:', log.recipientPhone);

            console.log('\nðŸ“ Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø±Ø³Ø§Ù„Ø©:');
            console.log('   ' + '='.repeat(60));
            console.log(log.content.split('\n').map(line => '   ' + line).join('\n'));
            console.log('   ' + '='.repeat(60));

            if (log.failureReason) {
                console.log('\nâš ï¸ Ø³Ø¨Ø¨ Ø§Ù„ÙØ´Ù„:', log.failureReason);
            }
        } else {
            console.log('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø³Ø¬Ù„ Ù„Ù„Ø¥Ø´Ø¹Ø§Ø±');
        }

        console.log('\n\nâœ… ===== Ù…Ù„Ø®Øµ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± =====');
        console.log(`âœ”ï¸ Ø§Ù„Ø´Ø±ÙƒØ©: ${company.name}`);
        console.log(`âœ”ï¸ Ø§Ù„Ø¬Ù„Ø³Ø©: ${session.name} (${session.status})`);
        console.log(`âœ”ï¸ Ø§Ù„Ø·Ù„Ø¨: ${order.orderNumber}`);
        console.log(`âœ”ï¸ Ø§Ù„Ø¹Ù…ÙŠÙ„: ${order.customerName} (${order.customerPhone})`);
        console.log(`âœ”ï¸ Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„: ${result.success ? 'âœ… Ù†Ø¬Ø­' : 'âŒ ÙØ´Ù„'}`);
        if (!result.success) {
            console.log(`   Ø§Ù„Ø³Ø¨Ø¨: ${result.reason}`);
        }

        console.log('\nðŸŽ‰ Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±!');

    } catch (error) {
        console.error('\nâŒ Ø­Ø¯Ø« Ø®Ø·Ø£:', error.message);
        console.error(error.stack);
    }
}

simulateSessionAndSendNotification()
    .then(() => {
        console.log('\nâœ… Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ø³ÙƒØ±ÙŠØ¨Øª');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nâŒ Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹:', error);
        process.exit(1);
    });

