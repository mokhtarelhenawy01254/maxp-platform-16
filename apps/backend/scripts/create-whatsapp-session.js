/**
 * ðŸ†• Ø¥Ù†Ø´Ø§Ø¡ Ø¬Ù„Ø³Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯Ø© Ù„Ø´Ø±ÙƒØ© Swan
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

async function createWhatsAppSession() {
    console.log('ðŸš€ ===== Ø¥Ù†Ø´Ø§Ø¡ Ø¬Ù„Ø³Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯Ø© =====\n');

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

        console.log('âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø±ÙƒØ©:', company.name);
        console.log('   - ID:', company.id);

        // 2ï¸âƒ£ Ø¥Ù†Ø´Ø§Ø¡ Ø¬Ù„Ø³Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯Ø©
        console.log('\nðŸ“± Ø¥Ù†Ø´Ø§Ø¡ Ø¬Ù„Ø³Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯Ø©...');

        const sessionId = uuidv4();
        const sessionName = `Swan-Session-${Date.now()}`;

        const session = await prisma.whatsAppSession.create({
            data: {
                id: sessionId,
                name: sessionName,
                companyId: company.id,
                status: 'DISCONNECTED', // Ø³ÙŠØªÙ… ØªØ­Ø¯ÙŠØ«Ù‡Ø§ Ø¹Ù†Ø¯ Ø§Ù„Ø§ØªØµØ§Ù„
                phoneNumber: null,
                isDefault: true,
                aiEnabled: false,
                autoReply: false,
                workingHoursEnabled: false
            }
        });

        console.log('âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¬Ù„Ø³Ø© Ø¨Ù†Ø¬Ø§Ø­:');
        console.log('   - Ø§Ù„Ø§Ø³Ù…:', session.name);
        console.log('   - ID:', session.id);
        console.log('   - Ø§Ù„Ø­Ø§Ù„Ø©:', session.status);

        // 3ï¸âƒ£ ØªØ­Ø¯ÙŠØ« Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª
        console.log('\nâš™ï¸ ØªØ­Ø¯ÙŠØ« Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª...');

        const settings = await prisma.whatsAppNotificationSettings.upsert({
            where: { companyId: company.id },
            update: {
                defaultSessionId: session.id,
                isEnabled: true,
                orderNotificationsEnabled: true,
                orderCreatedEnabled: true,
                orderConfirmedEnabled: true,
                orderShippedEnabled: true,
                orderDeliveredEnabled: true,
                orderCancelledEnabled: true,
                updatedAt: new Date()
            },
            create: {
                id: uuidv4(),
                companyId: company.id,
                defaultSessionId: session.id,
                isEnabled: true,
                orderNotificationsEnabled: true,
                orderCreatedEnabled: true,
                orderConfirmedEnabled: true,
                orderShippedEnabled: true,
                orderDeliveredEnabled: true,
                orderCancelledEnabled: true,
                updatedAt: new Date()
            }
        });

        console.log('âœ… ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª:');
        console.log('   - Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©:', session.name);
        console.log('   - Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù…ÙØ¹Ù„Ø©:', settings.isEnabled);
        console.log('   - Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ù…ÙØ¹Ù„Ø©:', settings.orderNotificationsEnabled);

        console.log('\nðŸŽ‰ ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¬Ù„Ø³Ø© Ø¨Ù†Ø¬Ø§Ø­!');
        console.log('\nðŸ“ Ø§Ù„Ø®Ø·ÙˆØ§Øª Ø§Ù„ØªØ§Ù„ÙŠØ©:');
        console.log('   1. Ø§ÙØªØ­ ØµÙØ­Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ ÙÙŠ Ø§Ù„Ù…ÙˆÙ‚Ø¹');
        console.log('   2. Ø³ØªØ¬Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©:', sessionName);
        console.log('   3. Ø§Ø¶ØºØ· "Ø§ØªØµØ§Ù„" ÙˆØ§Ù…Ø³Ø­ QR Code');
        console.log('   4. Ø¨Ø¹Ø¯ Ø§Ù„Ø§ØªØµØ§Ù„ØŒ Ø¬Ø±Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯');

        console.log('\nðŸ”— Ø±Ø§Ø¨Ø· ØµÙØ­Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨:');
        console.log('   http://localhost:3008/dashboard/whatsapp');

    } catch (error) {
        console.error('\nâŒ Ø­Ø¯Ø« Ø®Ø·Ø£:', error.message);
        console.error(error.stack);
    }
}

createWhatsAppSession()
    .then(() => {
        console.log('\nâœ… Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ø³ÙƒØ±ÙŠØ¨Øª');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nâŒ Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹:', error);
        process.exit(1);
    });

