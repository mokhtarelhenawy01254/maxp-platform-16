require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function cleanup() {
    try {
        const prisma = await getSharedPrismaClient();

        // Delete all "Harvest" related ones
        const deletedHarvest = await prisma.marketplaceApp.deleteMany({
            where: {
                OR: [
                    { name: { contains: 'Harvest' } },
                    { slug: { contains: 'harvest' } }
                ]
            }
        });
        console.log('Deleted Harvest apps:', deletedHarvest.count);

        // Also found an issue where some templates might be duplicated or inactive
        // We'll let the next "seed" fix the legitimate ones.
    } catch (err) {
        console.error(err);
    }
}

cleanup();
