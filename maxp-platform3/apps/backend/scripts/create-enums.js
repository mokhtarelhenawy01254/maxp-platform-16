/**
 * Create PostgreSQL enum types directly
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function createEnums() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('ðŸ”§ Creating PostgreSQL enum types...\n');
        
        // Check if enum exists
        const checkResult = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT 1 FROM pg_type 
                WHERE typname = 'whatsapp_notification_logs_eventtype'
            ) as exists
        `;
        
        console.log('Logs enum exists:', checkResult[0].exists);
        
        if (!checkResult[0].exists) {
            console.log('Creating logs enum...');
            await prisma.$executeRawUnsafe(`
                CREATE TYPE "whatsapp_notification_logs_eventtype" AS ENUM (
                    'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 
                    'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 
                    'ORDER_CANCELLED', 'PAYMENT_REMINDER', 'BACK_IN_STOCK', 
                    'PROMOTIONAL', 'OTP'
                );
            `);
            console.log('âœ… Logs enum created');
        } else {
            // Add ORDER_PROCESSING if missing
            const hasProcessing = await prisma.$queryRaw`
                SELECT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'whatsapp_notification_logs_eventtype'
                    AND e.enumlabel = 'ORDER_PROCESSING'
                ) as exists
            `;
            
            if (!hasProcessing[0].exists) {
                console.log('Adding ORDER_PROCESSING to logs enum...');
                await prisma.$executeRawUnsafe(`
                    ALTER TYPE "whatsapp_notification_logs_eventtype" ADD VALUE 'ORDER_PROCESSING';
                `);
                console.log('âœ… ORDER_PROCESSING added to logs enum');
            } else {
                console.log('âœ… ORDER_PROCESSING already in logs enum');
            }
        }
        
        // Same for queue enum
        const checkQueue = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT 1 FROM pg_type 
                WHERE typname = 'whatsapp_notification_queue_eventtype'
            ) as exists
        `;
        
        console.log('\nQueue enum exists:', checkQueue[0].exists);
        
        if (!checkQueue[0].exists) {
            console.log('Creating queue enum...');
            await prisma.$executeRawUnsafe(`
                CREATE TYPE "whatsapp_notification_queue_eventtype" AS ENUM (
                    'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 
                    'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 
                    'ORDER_CANCELLED', 'PAYMENT_REMINDER', 'BACK_IN_STOCK', 
                    'PROMOTIONAL', 'OTP'
                );
            `);
            console.log('âœ… Queue enum created');
        } else {
            const hasProcessing = await prisma.$queryRaw`
                SELECT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'whatsapp_notification_queue_eventtype'
                    AND e.enumlabel = 'ORDER_PROCESSING'
                ) as exists
            `;
            
            if (!hasProcessing[0].exists) {
                console.log('Adding ORDER_PROCESSING to queue enum...');
                await prisma.$executeRawUnsafe(`
                    ALTER TYPE "whatsapp_notification_queue_eventtype" ADD VALUE 'ORDER_PROCESSING';
                `);
                console.log('âœ… ORDER_PROCESSING added to queue enum');
            } else {
                console.log('âœ… ORDER_PROCESSING already in queue enum');
            }
        }
        
        // Verify
        console.log('\nðŸ” Verifying enums...');
        const logsValues = await prisma.$queryRaw`
            SELECT e.enumlabel 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'whatsapp_notification_logs_eventtype'
            ORDER BY e.enumsortorder;
        `;
        console.log('Logs enum values:', logsValues.map(v => v.enumlabel).join(', '));
        
        console.log('\nâœ… DONE! Restart server and test again.');
        
    } catch (err) {
        console.error('âŒ Error:', err.message);
        console.error(err.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

createEnums();

