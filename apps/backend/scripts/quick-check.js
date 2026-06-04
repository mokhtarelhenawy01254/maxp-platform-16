const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function quickCheck() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('ðŸ” Quick Check\n');
        
        // Get last 5 PROCESSING logs
        const logs = await prisma.whatsAppNotificationLog.findMany({
            where: { eventType: 'ORDER_PROCESSING' },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        
        console.log('Recent PROCESSING notifications:');
        if (logs.length === 0) {
            console.log('   âŒ None found');
        } else {
            logs.forEach(log => {
                console.log(`   ${log.createdAt.toLocaleString()} - ${log.status}`);
                if (log.failureReason) console.log(`      Error: ${log.failureReason}`);
            });
        }
        
        // Check settings
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId: 'cmlf8d5ne0000uwoss617a61i' }
        });
        
        console.log('\nSettings:');
        console.log('   orderProcessingEnabled:', settings?.orderProcessingEnabled);
        console.log('   orderNotificationsEnabled:', settings?.orderNotificationsEnabled);
        
    } catch (err) {
        console.error('âŒ', err.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

quickCheck();

