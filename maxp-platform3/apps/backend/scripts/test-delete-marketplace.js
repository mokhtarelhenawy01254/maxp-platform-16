require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testDelete() {
    try {
        const prisma = await getSharedPrismaClient();
        const id = 'harvest-test';

        console.log(`Checking for ${id}...`);
        const before = await prisma.marketplaceApp.findMany({
            where: {
                OR: [
                    { slug: `template-${id}` },
                    { features: { path: ['templateId'], equals: id } }
                ]
            }
        });
        console.log('Before deletion:', JSON.stringify(before, null, 2));

        if (before.length > 0) {
            console.log('Attempting deleteMany...');
            const result = await prisma.marketplaceApp.deleteMany({
                where: {
                    OR: [
                        { slug: `template-${id}` },
                        { features: { path: ['templateId'], equals: id } }
                    ]
                }
            });
            console.log('Delete result:', JSON.stringify(result, null, 2));
        }

        const after = await prisma.marketplaceApp.findMany({
            where: {
                OR: [
                    { slug: `template-${id}` },
                    { features: { path: ['templateId'], equals: id } }
                ]
            }
        });
        console.log('After deletion:', JSON.stringify(after, null, 2));
    } catch (err) {
        console.error(err);
    }
}

testDelete();
