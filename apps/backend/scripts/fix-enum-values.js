/**
 * ðŸ› ï¸ Ø¥Ø¶Ø§ÙØ© Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù†Ø§Ù‚ØµØ© Ù„Ù„Ù€ enum ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function fixMissingEnumValues() {
    console.log('ðŸ”§ ===== Ø¥Ø¶Ø§ÙØ© Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù†Ø§Ù‚ØµØ© =====\n');

    const prisma = getSharedPrismaClient();

    try {
        // 1ï¸âƒ£ Ø¥Ø¶Ø§ÙØ© ORDER_PROCESSING Ù„Ù„Ù€ enum
        console.log('âž• Ø¥Ø¶Ø§ÙØ© ORDER_PROCESSING...');
        await prisma.$executeRawUnsafe(`
            ALTER TYPE "whatsapp_notification_logs_eventType" 
            ADD VALUE IF NOT EXISTS 'ORDER_PROCESSING'
        `);
        console.log('âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© ORDER_PROCESSING');

        // 2ï¸âƒ£ Ø¥Ø¶Ø§ÙØ© ORDER_OUT_FOR_DELIVERY Ù„Ù„Ù€ enum
        console.log('âž• Ø¥Ø¶Ø§ÙØ© ORDER_OUT_FOR_DELIVERY...');
        await prisma.$executeRawUnsafe(`
            ALTER TYPE "whatsapp_notification_logs_eventType" 
            ADD VALUE IF NOT EXISTS 'ORDER_OUT_FOR_DELIVERY'
        `);
        console.log('âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© ORDER_OUT_FOR_DELIVERY');

        // 3ï¸âƒ£ Ù†ÙØ³ Ø§Ù„ÙƒÙ„Ø§Ù… Ù„Ù„Ù€ queue enum
        console.log('\nâž• Ø¥Ø¶Ø§ÙØ© Ù„Ù„Ù€ queue enum...');
        await prisma.$executeRawUnsafe(`
            ALTER TYPE "whatsapp_notification_queue_eventType" 
            ADD VALUE IF NOT EXISTS 'ORDER_PROCESSING'
        `);
        await prisma.$executeRawUnsafe(`
            ALTER TYPE "whatsapp_notification_queue_eventType" 
            ADD VALUE IF NOT EXISTS 'ORDER_OUT_FOR_DELIVERY'
        `);
        console.log('âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù‚ÙŠÙ… Ù„Ù„Ù€ queue enum');

        console.log('\nðŸŽ‰ ===== ØªÙ… Ø§Ù„Ø¥ØµÙ„Ø§Ø­ Ø¨Ù†Ø¬Ø§Ø­! =====');
        console.log('\nØ¯Ù„ÙˆÙ‚ØªÙŠ Ø¬Ø±Ø¨ ØªØ­Ø¯Ø« Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨ Ù„Ù€ "Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ²" ÙˆÙ‡ØªØ¬ÙŠÙ„Ùƒ Ø±Ø³Ø§Ù„Ø© ÙˆØ§ØªØ³Ø§Ø¨ ðŸš€');

    } catch (error) {
        console.error('âŒ Ø®Ø·Ø£:', error.message);
        // Ù„Ùˆ Ø§Ù„Ù€ enum Ù…Ø´ Ù…ÙˆØ¬ÙˆØ¯ Ø£Ùˆ ÙÙŠÙ‡ Ù…Ø´ÙƒÙ„Ø© ØªØ§Ù†ÙŠØ©
        if (error.message.includes('does not exist')) {
            console.log('\nâš ï¸ Ø§Ù„Ù€ enum Ù…Ø´ Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§ØªØŒ Ù…Ø­ØªØ§Ø¬ migration');
        }
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

fixMissingEnumValues();

