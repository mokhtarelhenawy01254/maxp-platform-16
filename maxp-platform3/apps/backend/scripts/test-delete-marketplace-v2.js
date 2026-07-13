require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function testDelete() {
    try {
        const prisma = await getSharedPrismaClient();
        const id = 'harvest-test';
        const slug = `template-${id}`;

        console.log(`Checking for slug: ${slug}...`);
        const bySlug = await prisma.marketplaceApp.findMany({
            where: { slug }
        });
        console.log('By slug:', JSON.stringify(bySlug, null, 2));

        console.log(`Checking for features.templateId: ${id}...`);
        const byFeatures = await prisma.marketplaceApp.findMany({
            where: {
                features: {
                    path: ['templateId'],
                    equals: id
                }
            }
        });
        console.log('By features:', JSON.stringify(byFeatures, null, 2));
    } catch (err) {
        console.error(err);
    }
}

testDelete();
