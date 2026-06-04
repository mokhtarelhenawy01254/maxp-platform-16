const dotenv = require('dotenv');
// Try to load .env.production first, then fallback to .env
dotenv.config({ path: require('path').resolve(__dirname, '.env.production') });
dotenv.config();

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const internalSyncService = require('../services/internalSyncService');
const tenantContext = require('../services/tenantContext');

async function debugGuestPush() {
    const prisma = getSharedPrismaClient();

    // Find a guest order to test with
    console.log('ðŸ” Searching for a GuestOrder...');
    const guestOrder = await prisma.guestOrder.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!guestOrder) {
        console.log('âŒ No GuestOrder found in database.');
        return;
    }

    console.log(`ðŸ“¦ Found GuestOrder: ${guestOrder.orderNumber}, ID: ${guestOrder.id}, Company: ${guestOrder.companyId}`);

    try {
        // We simulate the push
        console.log('ðŸš€ Triggering pushOrderToProvider...');
        await internalSyncService.pushOrderToProvider(guestOrder.id, guestOrder.companyId);
        console.log('âœ… Push simulation completed. Check logs above for results.');
    } catch (error) {
        console.error('âŒ Error during push simulation:', error);
    } finally {
        // Disconnect
        await prisma.$disconnect();
    }
}

debugGuestPush();

