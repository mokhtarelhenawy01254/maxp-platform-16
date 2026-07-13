/**
 * Create missing enum in database
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function createEnum() {
    const prisma = getSharedPrismaClient();
    
    try {
        console.log('ðŸ”§ Creating missing enum types...\n');
        
        // Create the enum type for logs
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                -- Create logs enum if not exists
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'whatsapp_notification_logs_eventtype'
                ) THEN
                    CREATE TYPE "whatsapp_notification_logs_eventtype" AS ENUM (
                        'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 
                        'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 
                        'ORDER_CANCELLED', 'PAYMENT_REMINDER', 'BACK_IN_STOCK', 
                        'PROMOTIONAL', 'OTP'
                    );
                    RAISE NOTICE 'Created logs enum';
                ELSE
                    RAISE NOTICE 'Logs enum already exists';
                END IF;
                
                -- Create queue enum if not exists
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'whatsapp_notification_queue_eventtype'
                ) THEN
                    CREATE TYPE "whatsapp_notification_queue_eventtype" AS ENUM (
                        'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_PROCESSING', 
                        'ORDER_SHIPPED', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 
                        'ORDER_CANCELLED', 'PAYMENT_REMINDER', 'BACK_IN_STOCK', 
                        'PROMOTIONAL', 'OTP'
                    );
                    RAISE NOTICE 'Created queue enum';
                ELSE
                    RAISE NOTICE 'Queue enum already exists';
                END IF;
            END $$;
        `);
        
        console.log('âœ… Enum types created/verified\n');
        
        // Check what's in the enum
        const enumValues = await prisma.$queryRaw`
            SELECT e.enumlabel 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'whatsapp_notification_logs_eventtype'
            ORDER BY e.enumsortorder;
        `;
        
        console.log('ðŸ“‹ Logs enum values:');
        enumValues.forEach(v => console.log('   -', v.enumlabel));
        
        console.log('\n===== âœ… DONE =====');
        console.log('Restart the server and test again!');
        
    } catch (err) {
        console.error('âŒ Error:', err.message);
        console.error(err.stack);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

createEnum();

