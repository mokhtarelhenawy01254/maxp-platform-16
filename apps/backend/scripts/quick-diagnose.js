const { t: i18n } = require('./i18n');
const { t: i18n } = require('./i18ni18n.t('msg.3b347265')path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "postgresql://postgres:Mokhtar123@localhost:5432/maxp"
        }
    }
});

async function diagnoseDirect() {
    console.log('🔍 ===== فحص مباشر =====\n');

    const companyId = 'cmlf8d5ne0000uwoss617a61i';
    const orderNumber = 'ORD-351462-104i18n.t('msg.64bbd009i18n.t('msg.f24ccbcd'));
        const settings = await prisma.whatsAppNotificationSettings.findUnique({
            where: { companyId }
        });

        if (!settings) {
            console.log(i18n.t('msg.c3a1c656'));
            return;
        }

        console.log('   isEnabled:', settings.isEnabled);
        console.log('   orderNotificationsEnabled:', settings.orderNotificationsEnabled);
        console.log('   orderProcessingEnabled:', settings.orderProcessingEnabled);
        console.log('   defaultSessionId:i18n.t('msg.bbca523d')\n🔧 2. اختبار ORDER_PROCESSING:');
        try {
            await prisma.$executeRawUnsafe(`
                SELECT 'ORDER_PROCESSING'::whatsapp_notification_logs_eventType
            `${i18n.t('msg.463a2954')}`   ✅ ${s.id} - ${s.phoneNumber}`);
            });
        }

        console.log('\n===== انتهى الفحص =====');

    } catch (error) {
        console.error(i18n.t('msg.f2d1c024'), error.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

diagnoseDirect();
