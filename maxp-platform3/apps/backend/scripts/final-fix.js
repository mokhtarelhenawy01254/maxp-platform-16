/**
 * ðŸ”§ Final Fix for ORDER_PROCESSING Notification
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function finalFix() {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    
    try {
        console.log('ðŸ”§ FINAL FIX: ORDER_PROCESSING Notification\n');
        
        // 1. Check and fix database enum using raw SQL
        console.log('1ï¸âƒ£ Checking database enum...');
        try {
            await prisma.$executeRawUnsafe(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'whatsapp_notification_logs_eventtype'
                        AND e.enumlabel = 'ORDER_PROCESSING'
                    ) THEN
                        ALTER TYPE "whatsapp_notification_logs_eventType" ADD VALUE 'ORDER_PROCESSING';
                    END IF;
                END $$;
            `);
            console.log('   âœ… Logs enum OK\n');
        } catch (e) {
            console.log('   âš ï¸ Logs enum issue (may already exist):', e.message);
        }
        
        try {
            await prisma.$executeRawUnsafe(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'whatsapp_notification_queue_eventtype'
                        AND e.enumlabel = 'ORDER_PROCESSING'
                    ) THEN
                        ALTER TYPE "whatsapp_notification_queue_eventType" ADD VALUE 'ORDER_PROCESSING';
                    END IF;
                END $$;
            `);
            console.log('   âœ… Queue enum OK\n');
        } catch (e) {
            console.log('   âš ï¸ Queue enum issue (may already exist):', e.message);
        }
        
        // 2. Check settings
        console.log('2ï¸âƒ£ Checking notification settings...');
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });
        
        console.log('   isEnabled:', settings?.isEnabled);
        console.log('   orderNotificationsEnabled:', settings?.orderNotificationsEnabled);
        console.log('   orderProcessingEnabled:', settings?.orderProcessingEnabled);
        
        if (!settings?.orderProcessingEnabled) {
            console.log('\n   ðŸ”§ Enabling orderProcessingEnabled...');
            await prisma.whatsAppNotificationSettings.update({
                where: { companyId },
                data: { orderProcessingEnabled: true }
            });
            console.log('   âœ… Enabled!\n');
        }
        
        // 3. Check for connected WhatsApp session
        console.log('3ï¸âƒ£ Checking WhatsApp session...');
        const session = await prisma.whatsAppSession.findFirst({
            where: { companyId, status: 'CONNECTED' }
        });
        console.log('   Connected session:', session ? 'âœ… Yes' : 'âŒ No');
        if (session) {
            console.log('   Session ID:', session.id);
        }
        console.log('');
        
        // 4. Check latest order
        console.log('4ï¸âƒ£ Checking latest order...');
        const order = await prisma.order.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { customer: true }
        });
        
        if (order) {
            console.log('   Order:', order.orderNumber);
            console.log('   Status:', order.status);
            console.log('   Customer phone:', order.customer?.phone || 'N/A');
        }
        console.log('');
        
        // 5. Check for any PROCESSING notifications in logs
        console.log('5ï¸âƒ£ Checking notification logs for PROCESSING...');
        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: { eventType: 'ORDER_PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        
        if (logs.length === 0) {
            console.log('   âŒ No PROCESSING notifications found\n');
        } else {
            logs.forEach((log, i) => {
                console.log(`   ${i+1}. ${log.status} at ${log.createdAt.toLocaleString()}`);
                if (log.failureReason) console.log(`      Error: ${log.failureReason}`);
            });
            console.log('');
        }
        
        console.log('===== âœ… FIX COMPLETE =====');
        console.log('\nâš ï¸  IMPORTANT: Restart the server now!');
        console.log('   Run: pm2 restart all');
        console.log('\nThen test by changing an order status to PROCESSING.');
        
    } catch (error) {
        console.error('âŒ Error:', error.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

finalFix();

