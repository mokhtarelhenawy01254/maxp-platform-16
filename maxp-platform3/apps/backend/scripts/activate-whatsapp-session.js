/**
 * ðŸ”Œ ØªÙØ¹ÙŠÙ„ Ø¬Ù„Ø³Ø© ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ø´Ø±ÙƒØ© Swan
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function activateWhatsAppSession() {
    console.log('ðŸš€ ===== ØªÙØ¹ÙŠÙ„ Ø¬Ù„Ø³Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ =====\n');

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

        // 2ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¬Ù„Ø³Ø§Øª
        console.log('\nðŸ“± Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø¬Ù„Ø³Ø§Øª Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨...');
        const sessions = await prisma.whatsAppSession.findMany({
            where: {
                companyId: company.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`ðŸ“Š Ø¹Ø¯Ø¯ Ø§Ù„Ø¬Ù„Ø³Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø©: ${sessions.length}\n`);

        if (sessions.length === 0) {
            console.log('âŒ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø´Ø±ÙƒØ©');
            console.log('\nðŸ’¡ Ø§Ù„Ø­Ù„:');
            console.log('   1. Ø§ÙØªØ­ ØµÙØ­Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ ÙÙŠ Ø§Ù„Ù…ÙˆÙ‚Ø¹');
            console.log('   2. Ø§Ø¶ØºØ· "Ø¥Ù†Ø´Ø§Ø¡ Ø¬Ù„Ø³Ø© Ø¬Ø¯ÙŠØ¯Ø©"');
            console.log('   3. Ø§Ù…Ø³Ø­ QR Code Ø¨Ù‡Ø§ØªÙÙƒ');
            return;
        }

        // Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¬Ù„Ø³Ø§Øª
        sessions.forEach((session, index) => {
            console.log(`ðŸ“± Ø¬Ù„Ø³Ø© ${index + 1}:`);
            console.log(`   - Ø§Ù„Ø§Ø³Ù…: ${session.name || 'Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…'}`);
            console.log(`   - Ø§Ù„Ø­Ø§Ù„Ø©: ${session.status}`);
            console.log(`   - Ø§Ù„Ø±Ù‚Ù…: ${session.phoneNumber || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}`);
            console.log(`   - Ø¢Ø®Ø± Ø§ØªØµØ§Ù„: ${session.lastConnectedAt || 'Ù„Ù… ÙŠØªØµÙ„'}`);
            console.log('');
        });

        // 3ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø¬Ù„Ø³Ø© Ù†Ø´Ø·Ø©
        const activeSession = sessions.find(s => s.status === 'CONNECTED');

        if (!activeSession) {
            console.log('âš ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø© Ù†Ø´Ø·Ø© (CONNECTED)');
            console.log('\nðŸ”§ Ù…Ø­Ø§ÙˆÙ„Ø© ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø£Ø­Ø¯Ø« Ø¬Ù„Ø³Ø©...');

            const latestSession = sessions[0];
            console.log(`ðŸ“ ØªØ­Ø¯ÙŠØ« Ø¬Ù„Ø³Ø©: ${latestSession.name}`);

            // ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø¬Ù„Ø³Ø© (ÙÙŠ Ø­Ø§Ù„Ø© ÙƒØ§Ù†Øª Ù…ØªØµÙ„Ø© ÙØ¹Ù„ÙŠØ§Ù‹ Ù„ÙƒÙ† Ø§Ù„Ø­Ø§Ù„Ø© ØºÙŠØ± Ù…Ø­Ø¯Ø«Ø©)
            await prisma.whatsAppSession.update({
                where: { id: latestSession.id },
                data: {
                    status: 'CONNECTED',
                    lastConnectedAt: new Date()
                }
            });

            console.log('âœ… ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø¬Ù„Ø³Ø© Ø¥Ù„Ù‰ CONNECTED');
            console.log('\nâš ï¸ Ù…Ù„Ø§Ø­Ø¸Ø©: Ø¥Ø°Ø§ Ù„Ù… ØªÙƒÙ† Ø§Ù„Ø¬Ù„Ø³Ø© Ù…ØªØµÙ„Ø© ÙØ¹Ù„ÙŠØ§Ù‹ØŒ ÙŠØ¬Ø¨ Ø¹Ù„ÙŠÙƒ:');
            console.log('   1. ÙØªØ­ ØµÙØ­Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨');
            console.log('   2. Ù…Ø³Ø­ QR Code Ù…Ø±Ø© Ø£Ø®Ø±Ù‰');
        } else {
            console.log('âœ… ÙŠÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø© Ù†Ø´Ø·Ø©:', activeSession.name);
        }

        // 4ï¸âƒ£ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ù„ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©
        console.log('\nâš™ï¸ ØªØ­Ø¯ÙŠØ« Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª...');

        const sessionToUse = activeSession || sessions[0];

        const settings = await prisma.whatsAppNotificationSettings.upsert({
            where: { companyId: company.id },
            update: {
                defaultSessionId: sessionToUse.id,
                isEnabled: true,
                orderNotificationsEnabled: true,
                orderCreatedEnabled: true,
                updatedAt: new Date()
            },
            create: {
                id: require('uuid').v4(),
                companyId: company.id,
                defaultSessionId: sessionToUse.id,
                isEnabled: true,
                orderNotificationsEnabled: true,
                orderCreatedEnabled: true,
                updatedAt: new Date()
            }
        });

        console.log('âœ… ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª:');
        console.log(`   - Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ©: ${sessionToUse.name}`);
        console.log(`   - Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù…ÙØ¹Ù„Ø©: ${settings.isEnabled}`);
        console.log(`   - Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ù…ÙØ¹Ù„Ø©: ${settings.orderNotificationsEnabled}`);

        console.log('\nðŸŽ‰ ØªÙ… ØªÙØ¹ÙŠÙ„ Ø¬Ù„Ø³Ø© Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨ Ø¨Ù†Ø¬Ø§Ø­!');
        console.log('\nðŸ“ Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ©:');
        console.log('   - Ø¬Ø±Ø¨ Ø¥Ù†Ø´Ø§Ø¡ Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯ Ø§Ù„Ø¢Ù†');
        console.log('   - Ø£Ùˆ Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø³ÙƒØ±ÙŠØ¨Øª: node test-order-whatsapp.js');

    } catch (error) {
        console.error('\nâŒ Ø­Ø¯Ø« Ø®Ø·Ø£:', error.message);
        console.error(error.stack);
    }
}

activateWhatsAppSession()
    .then(() => {
        console.log('\nâœ… Ø§Ù†ØªÙ‡Ù‰ Ø§Ù„Ø³ÙƒØ±ÙŠØ¨Øª');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nâŒ Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹:', error);
        process.exit(1);
    });

