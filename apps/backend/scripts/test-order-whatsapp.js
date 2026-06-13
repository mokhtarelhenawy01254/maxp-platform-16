/**
 * ðŸ§ª Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ ÙˆØ¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± ÙˆØ§ØªØ³Ø§Ø¨
 * Test Order Creation & WhatsApp Notification
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const EnhancedOrderService = require('../services/enhancedOrderService');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

async function testOrderCreation() {
    console.log('ðŸš€ ===== Ø¨Ø¯Ø¡ Ø§Ø®ØªØ¨Ø§Ø± Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨ =====\n');

    try {
        const prisma = getSharedPrismaClient();

        // 1ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø´Ø±ÙƒØ© Swan (Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ø§Ù„ØªÙŠ ØªÙ…ØªÙ„Ùƒ Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ù…ØªØµÙ„Ø©)
        console.log('ðŸ” Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø´Ø±ÙƒØ© Swan Ø§Ù„Ù…ØªØµÙ„Ø©...');
        const companyId = 'cmlf8d5ne0000uwoss617a61i'; // ID Ø§Ù„Ø´Ø±ÙƒØ© Ø§Ù„ØªÙŠ ØªÙ…ØªÙ„Ùƒ Ø¬Ù„Ø³Ø© "Ø±Ù‚Ù… Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª" Ø§Ù„Ù…ØªØµÙ„Ø©
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                slug: true
            }
        });

        if (!company) {
            console.error('âŒ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø´Ø±ÙƒØ© Swan');
            return;
        }

        console.log('âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø±ÙƒØ©:', {
            id: company.id,
            name: company.name,
            slug: company.slug
        });

        // 2ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨
        console.log('\nðŸ“± Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨...');
        const whatsappSettings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId: company.id }
        });

        console.log('âš™ï¸ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨:', {
            found: !!whatsappSettings,
            isEnabled: whatsappSettings?.isEnabled,
            orderNotificationsEnabled: whatsappSettings?.orderNotificationsEnabled,
            orderCreatedEnabled: whatsappSettings?.orderCreatedEnabled,
            defaultSessionId: whatsappSettings?.defaultSessionId
        });

        // 3ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ù†Ø´Ø·Ø©
        console.log('\nðŸ”Œ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¬Ù„Ø³Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨...');
        const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');

        // Ø¬Ù„Ø¨ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¬Ù„Ø³Ø§Øª Ø£ÙˆÙ„Ø§Ù‹
        const allSessions = await prisma.whatsAppSession.findMany({
            where: {
                companyId: company.id
            },
            orderBy: {
                lastConnectedAt: 'desc'
            }
        });

        console.log(`ðŸ“Š Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¬Ù„Ø³Ø§Øª ÙÙŠ DB: ${allSessions.length}`);

        // Ù…Ø­Ø§ÙˆÙ„Ø© ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ù…ØªØµÙ„Ø© ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø©
        const connectedDBSession = allSessions.find(s => s.status === 'CONNECTED' && s.authState);

        if (connectedDBSession) {
            console.log(`ðŸ”„ Ù…Ø­Ø§ÙˆÙ„Ø© ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø© "${connectedDBSession.name}" ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø©...`);
            try {
                // Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¬Ù„Ø³Ø© ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø© (Ø³ØªØ­Ù…Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† authState ÙÙŠ DB)
                await WhatsAppManager.createSession(connectedDBSession.id, company.id);
                console.log('âœ… ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø© ÙÙŠ Ø§Ù„Ø°Ø§ÙƒØ±Ø©');

                // Ø§Ù†ØªØ¸Ø§Ø± Ø«ÙˆØ§Ù†ÙŠ Ù„Ù„Ø§ØªØµØ§Ù„
                console.log('â³ Ø§Ù†ØªØ¸Ø§Ø± 15 Ø«Ø§Ù†ÙŠØ© Ù„Ø§Ø³ØªÙ‚Ø±Ø§Ø± Ø§Ù„Ø§ØªØµØ§Ù„...');
                await new Promise(resolve => setTimeout(resolve, 15000));
            } catch (err) {
                console.error('âŒ ÙØ´Ù„ ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø©:', err.message);
            }
        }

        const activeSessions = allSessions.filter(s => s.status === 'CONNECTED');
        console.log(`\nâœ… Ø¹Ø¯Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø§Øª Ø§Ù„Ù†Ø´Ø·Ø© (CONNECTED): ${activeSessions.length}`);

        if (activeSessions.length === 0) {
            console.warn('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø§Øª Ù†Ø´Ø·Ø©!');
            console.log('ðŸ’¡ Ù…Ù„Ø§Ø­Ø¸Ø©: Ø³ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨ Ù„ÙƒÙ† Ù‚Ø¯ Ù„Ø§ ÙŠÙØ±Ø³Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±');
        }

        // 4ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ù…Ù†ØªØ¬ Ù„Ù„Ø§Ø®ØªØ¨Ø§Ø±
        console.log('\nðŸ“¦ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ù…Ù†ØªØ¬ Ù„Ù„Ø§Ø®ØªØ¨Ø§Ø±...');
        let product = await prisma.product.findFirst({
            where: {
                companyId: company.id,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                price: true,
                sku: true
            }
        });

        if (!product) {
            console.warn('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù…Ù†ØªØ¬Ø§Øª Ù†Ø´Ø·Ø© ÙÙŠ Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬');
            console.log('ðŸ“ Ø³ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ Ø¨Ù…Ù†ØªØ¬ ÙŠØ¯ÙˆÙŠ (Ø¨Ø¯ÙˆÙ† Ø±Ø¨Ø· Ø¨Ø§Ù„ÙƒØªØ§Ù„ÙˆØ¬)');

            // Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ù†ØªØ¬ ÙˆÙ‡Ù…ÙŠ Ù„Ù„Ø§Ø®ØªØ¨Ø§Ø±
            product = {
                id: null,
                name: 'ÙØ³ØªØ§Ù† ØµÙŠÙÙŠ - Ø§Ø®ØªØ¨Ø§Ø±',
                price: 350,
                sku: 'TEST-001'
            };
        } else {
            console.log('âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù…Ù†ØªØ¬:', {
                id: product.id,
                name: product.name,
                price: product.price,
                sku: product.sku
            });
        }

        // 5ï¸âƒ£ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨
        console.log('\nðŸ›’ ===== Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ Ø§Ø®ØªØ¨Ø§Ø±ÙŠ =====');
        const orderService = new EnhancedOrderService();

        const orderData = {
            companyId: company.id,
            customerName: 'Ù…Ø®ØªØ§Ø± Ø§Ù„Ø®Ù†Ø§ÙˆÙŠ',
            customerPhone: '01123087745',
            customerEmail: 'mokhtar@test.com',
            city: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
            governorate: 'Ø§Ù„Ù‚Ø§Ù‡Ø±Ø©',
            area: 'Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±',
            customerAddress: 'Ø´Ø§Ø±Ø¹ Ø§Ù„Ø·ÙŠØ±Ø§Ù†ØŒ Ù…Ø¯ÙŠÙ†Ø© Ù†ØµØ±',

            // Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ù†ØªØ¬
            products: [
                {
                    productId: product.id, // Ù‚Ø¯ ÙŠÙƒÙˆÙ† null Ù„Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„ÙŠØ¯ÙˆÙŠØ©
                    productName: product.name,
                    productColor: 'Ø£Ø­Ù…Ø±',
                    productSize: 'XL',
                    price: parseFloat(product.price) || 350,
                    quantity: 2,
                    total: (parseFloat(product.price) || 350) * 2
                }
            ],

            // Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ©
            status: 'PENDING',
            paymentMethod: 'CASH',
            notes: 'Ø·Ù„Ø¨ Ø§Ø®ØªØ¨Ø§Ø±ÙŠ Ù„ÙØ­Øµ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨',
            extractionMethod: 'manual_test',
            confidence: 1.0
        };

        console.log('ðŸ“‹ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ù„Ø¨:', JSON.stringify(orderData, null, 2));

        const result = await orderService.createEnhancedOrder(orderData);

        if (!result.success) {
            console.error('âŒ ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨:', result.error);
            return;
        }

        console.log('\nâœ… ===== ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­ =====');
        console.log('ðŸ“¦ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø·Ù„Ø¨:', {
            id: result.order.id,
            orderNumber: result.order.orderNumber,
            customerName: result.order.customerName,
            customerPhone: result.order.customerPhone,
            total: result.order.total,
            subtotal: result.order.subtotal,
            shipping: result.order.shipping,
            currency: result.order.currency,
            itemsCount: result.order.orderItems?.length || 0
        });

        // 6ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¹Ù†Ø§ØµØ± Ø§Ù„Ø·Ù„Ø¨
        console.log('\nðŸ“‹ Ø¹Ù†Ø§ØµØ± Ø§Ù„Ø·Ù„Ø¨:');
        if (result.order.orderItems && result.order.orderItems.length > 0) {
            result.order.orderItems.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.productName}`);
                console.log(`     - Ø§Ù„Ù„ÙˆÙ†: ${item.productColor || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}`);
                console.log(`     - Ø§Ù„Ù…Ù‚Ø§Ø³: ${item.productSize || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}`);
                console.log(`     - Ø§Ù„ÙƒÙ…ÙŠØ©: ${item.quantity}`);
                console.log(`     - Ø§Ù„Ø³Ø¹Ø±: ${item.price} ${result.order.currency}`);
            });
        } else {
            console.warn('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ù†Ø§ØµØ± ÙÙŠ Ø§Ù„Ø·Ù„Ø¨!');
        }

        // 7ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø³Ø¬Ù„ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨
        console.log('\nðŸ“± ===== Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ =====');

        // Ø§Ù†ØªØ¸Ø§Ø± Ù‚Ù„ÙŠÙ„Ø§Ù‹ Ù„Ù„Ø³Ù…Ø§Ø­ Ø¨Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±
        await new Promise(resolve => setTimeout(resolve, 3000));

        const notifications = await prisma.whatsAppNotificationLog.findMany({
            where: {
                orderId: result.order.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });

        console.log(`ðŸ“Š Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù…Ø±Ø³Ù„Ø©: ${notifications.length}`);

        if (notifications.length > 0) {
            notifications.forEach((notif, index) => {
                console.log(`\nðŸ“¨ Ø¥Ø´Ø¹Ø§Ø± ${index + 1}:`);
                console.log(`   - Ø§Ù„Ø­Ø§Ù„Ø©: ${notif.status}`);
                console.log(`   - Ù†ÙˆØ¹ Ø§Ù„Ø­Ø¯Ø«: ${notif.eventType}`);
                console.log(`   - Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ: ${notif.recipientPhone}`);
                console.log(`   - Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªÙ„Ù…: ${notif.recipientName}`);
                console.log(`   - ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø±Ø³Ø§Ù„: ${notif.sentAt || 'Ù„Ù… ÙŠÙØ±Ø³Ù„ Ø¨Ø¹Ø¯'}`);
                console.log(`   - Ø³Ø¨Ø¨ Ø§Ù„ÙØ´Ù„: ${notif.failureReason || 'Ù„Ø§ ÙŠÙˆØ¬Ø¯'}`);
                console.log('\n   ðŸ“ Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø±Ø³Ø§Ù„Ø©:');
                console.log('   ' + '='.repeat(60));
                console.log(notif.content.split('\n').map(line => '   ' + line).join('\n'));
                console.log('   ' + '='.repeat(60));
            });
        } else {
            console.warn('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø£ÙŠ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª!');
            console.log('\nðŸ” Ø§Ù„Ø£Ø³Ø¨Ø§Ø¨ Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø©:');
            console.log('   1. Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù…Ø¹Ø·Ù„Ø© ÙÙŠ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª');
            console.log('   2. Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ù†Ø´Ø·Ø©');
            console.log('   3. Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ ØºÙŠØ± ØµØ­ÙŠØ­');
            console.log('   4. Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„');
        }

        // 8ï¸âƒ£ Ù…Ù„Ø®Øµ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±
        console.log('\n\nâœ… ===== Ù…Ù„Ø®Øµ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± =====');
        console.log(`âœ”ï¸ Ø§Ù„Ø´Ø±ÙƒØ©: ${company.name}`);
        console.log(`âœ”ï¸ Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨: ${result.order.orderNumber}`);
        console.log(`âœ”ï¸ Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„: ${result.order.customerName}`);
        console.log(`âœ”ï¸ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ: ${result.order.customerPhone}`);
        console.log(`âœ”ï¸ Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${result.order.total} ${result.order.currency}`);
        console.log(`âœ”ï¸ Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù†Ø§ØµØ±: ${result.order.orderItems?.length || 0}`);
        console.log(`âœ”ï¸ Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª: ${notifications.length}`);

        if (notifications.length > 0) {
            const successCount = notifications.filter(n => n.status === 'SENT').length;
            const failedCount = notifications.filter(n => n.status === 'FAILED').length;
            console.log(`âœ”ï¸ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù†Ø§Ø¬Ø­Ø©: ${successCount}`);
            console.log(`âœ”ï¸ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ÙØ§Ø´Ù„Ø©: ${failedCount}`);
        }

        console.log('\nðŸŽ‰ Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­!');

    } catch (error) {
        console.error('\nâŒ ===== Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± =====');
        console.error('Ø§Ù„Ø®Ø·Ø£:', error.message);
        console.error('Ø§Ù„ØªÙØ§ØµÙŠÙ„:', error.stack);
    }
}

// ØªØ´ØºÙŠÙ„ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±
testOrderCreation()
    .then(() => {
        console.log('\nâœ… ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡ Ù…Ù† Ø§Ù„Ø³ÙƒØ±ÙŠØ¨Øª');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nâŒ Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹:', error);
        process.exit(1);
    });

