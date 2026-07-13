/**
 * ðŸ”§ Ø¥Ø¶Ø§ÙØ© ORDER_PROCESSING Ù„Ù„enum Ù…Ø¨Ø§Ø´Ø±Ø© ÙÙŠ Ø§Ù„Ø¯Ø§ØªØ§Ø¨ÙŠØ²
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function fixEnum() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('ðŸ”§ Ø¬Ø§Ø±ÙŠ Ø¥Ø¶Ø§ÙØ© ORDER_PROCESSING Ù„Ù„enum...\n');
        
        // Ø§Ø³ØªØ®Ø¯Ø§Ù… raw query Ù„Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù‚ÙŠÙ…Ø© Ù„Ù„enum
        await prisma.$executeRaw`
            DO $$
            BEGIN
                -- Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù‚ÙŠÙ…Ø© Ù„Ùˆ Ù…Ø´ Ù…ÙˆØ¬ÙˆØ¯Ø©
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'ORDER_PROCESSING' 
                    AND enumtypid = (
                        SELECT oid FROM pg_type 
                        WHERE typname = 'whatsapp_notification_logs_eventType'
                    )
                ) THEN
                    ALTER TYPE "whatsapp_notification_logs_eventType" ADD VALUE 'ORDER_PROCESSING';
                    RAISE NOTICE 'Added ORDER_PROCESSING to logs enum';
                ELSE
                    RAISE NOTICE 'ORDER_PROCESSING already exists in logs enum';
                END IF;
                
                -- Ù†ÙØ³ Ø§Ù„Ø´ÙŠØ¡ Ù„Ù„Ù€ queue enum
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'ORDER_PROCESSING' 
                    AND enumtypid = (
                        SELECT oid FROM pg_type 
                        WHERE typname = 'whatsapp_notification_queue_eventType'
                    )
                ) THEN
                    ALTER TYPE "whatsapp_notification_queue_eventType" ADD VALUE 'ORDER_PROCESSING';
                    RAISE NOTICE 'Added ORDER_PROCESSING to queue enum';
                ELSE
                    RAISE NOTICE 'ORDER_PROCESSING already exists in queue enum';
                END IF;
            END $$;
        `;
        
        console.log('âœ… ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† enum values\n');
        
        // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª
        const companyId = 'cmlf8d5ne0000uwoss617a61i';
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });
        
        console.log('ðŸ“± Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø­Ø§Ù„ÙŠØ©:');
        console.log('   isEnabled:', settings?.isEnabled);
        console.log('   orderNotificationsEnabled:', settings?.orderNotificationsEnabled);
        console.log('   orderProcessingEnabled:', settings?.orderProcessingEnabled);
        
        if (!settings?.orderProcessingEnabled) {
            console.log('\nðŸ”§ ØªÙØ¹ÙŠÙ„ orderProcessingEnabled...');
            await prisma.whatsAppNotificationSettings.update({
                where: { companyId },
                data: { orderProcessingEnabled: true }
            });
            console.log('âœ… ØªÙ… Ø§Ù„ØªÙØ¹ÙŠÙ„');
        }
        
        console.log('\n===== Ø¬Ø§Ù‡Ø² Ù„Ù„Ø§Ø®ØªØ¨Ø§Ø± =====');
        console.log('Ø£Ø¹Ø¯ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³ÙŠØ±ÙØ± Ùˆ Ø¬Ø±Ø¨ ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨');
        
    } catch (error) {
        console.error('âŒ Ø®Ø·Ø£:', error.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

fixEnum();

