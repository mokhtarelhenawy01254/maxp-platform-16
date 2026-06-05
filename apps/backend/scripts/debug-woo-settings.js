const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugSettings() {
    try {
        const companyId = 'cmlcv81e80000ufe8hxlx9eg0';
        const prisma = getSharedPrismaClient();
        const settings = await prisma.woocommerceSettings.findFirst({
            where: { companyId }
        });

        if (!settings) {
            console.log('No settings found for company:', companyId);
            return;
        }

        console.log('Settings for company:', companyId);
        console.log('Store URL:', settings.storeUrl);
        console.log('Consumer Key Length:', settings.consumerKey?.length);
        console.log('Consumer Secret Length:', settings.consumerSecret?.length);
        console.log('Sync Enabled:', settings.syncEnabled);

        // Check for common issues
        if (settings.consumerKey && settings.consumerKey !== settings.consumerKey.trim()) {
            console.log('âš ï¸ Consumer Key has leading/trailing spaces!');
        }
        if (settings.consumerSecret && settings.consumerSecret !== settings.consumerSecret.trim()) {
            console.log('âš ï¸ Consumer Secret has leading/trailing spaces!');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugSettings();

