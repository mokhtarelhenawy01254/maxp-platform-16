/**
 * Comprehensive diagnostic for PROCESSING notification
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function diagnose() {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    
    console.log('ðŸ” COMPREHENSIVE DIAGNOSTIC\n');
    
    try {
        // 1. Check database enum
        console.log('1ï¸âƒ£ Database ENUM check:');
        const enumResult = await prisma.$queryRaw`
            SELECT e.enumlabel 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'whatsapp_notification_logs_eventtype'
            ORDER BY e.enumsortorder;
        `;
        console.log('   Enum values:', enumResult.map(r => r.enumlabel).join(', '));
        const hasProcessing = enumResult.some(r => r.enumlabel === 'ORDER_PROCESSING');
        console.log('   Has ORDER_PROCESSING:', hasProcessing ? 'âœ…' : 'âŒ');
        
        // 2. Check settings
        console.log('\n2ï¸âƒ£ Settings check:');
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });
        console.log('   isEnabled:', settings?.isEnabled);
        console.log('   orderNotificationsEnabled:', settings?.orderNotificationsEnabled);
        console.log('   orderProcessingEnabled:', settings?.orderProcessingEnabled);
        console.log('   defaultSessionId:', settings?.defaultSessionId ? 'âœ… Set' : 'âŒ Not set');
        
        // 3. Check session
        console.log('\n3ï¸âƒ£ Session check:');
        const session = await prisma.whatsAppSession.findFirst({
            where: { companyId, status: 'CONNECTED' }
        });
        console.log('   Connected session:', session ? `âœ… ${session.id}` : 'âŒ None');
        
        // 4. Get latest order
        console.log('\n4ï¸âƒ£ Latest order:');
        const order = await prisma.order.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: { customer: true }
        });
        if (order) {
            console.log('   Order:', order.orderNumber);
            console.log('   Status:', order.status);
            console.log('   Customer phone:', order.customer?.phone || order.customerPhone || 'âŒ None');
        }
        
        // 5. Recent PROCESSING logs
        console.log('\n5ï¸âƒ£ Recent PROCESSING notifications:');
        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: { eventType: 'ORDER_PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        
        if (logs.length === 0) {
            console.log('   âŒ No PROCESSING logs found');
        } else {
            logs.forEach((log, i) => {
                console.log(`   ${i+1}. ${log.status} - ${log.createdAt.toLocaleString()}`);
                if (log.failureReason) console.log(`      Error: ${log.failureReason}`);
            });
        }
        
        // Fix settings if needed
        if (!settings?.orderProcessingEnabled) {
            console.log('\nðŸ”§ Fixing orderProcessingEnabled...');
            await prisma.whatsAppNotificationSettings.update({
                where: { companyId },
                data: { orderProcessingEnabled: true }
            });
            console.log('   âœ… Fixed!');
        }
        
        console.log('\n===== DIAGNOSTIC COMPLETE =====');
        
    } catch (err) {
        console.error('\nâŒ Error:', err.message);
        console.error(err.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

diagnose();

