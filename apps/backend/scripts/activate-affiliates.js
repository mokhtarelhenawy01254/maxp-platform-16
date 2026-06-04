const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '.env.production') });
dotenv.config();

async function activateAffiliates() {
    const prisma = getSharedPrismaClient();

    console.log('ðŸ”„ Activating all PENDING affiliates used for internal sync...');

    // Find all affiliates with status PENDING
    const result = await prisma.affiliate.updateMany({
        where: {
            status: 'PENDING'
        },
        data: {
            status: 'ACTIVE'
        }
    });

    console.log(`âœ… Activated ${result.count} affiliates.`);
    await prisma.$disconnect();
}

activateAffiliates();

