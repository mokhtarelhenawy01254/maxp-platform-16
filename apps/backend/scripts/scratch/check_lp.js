require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        return;
    }
    const slug = 'product-details-luxury';
    const page = await prisma.landingPage.findFirst({
        where: { slug: 'product-details-luxury' }
    });
    console.log('--- LANDING PAGE DATA ---');
    console.log(JSON.stringify(page, null, 2));
    console.log('--- END DATA ---');
}

main().catch(console.error).finally(() => {
    process.exit(0);
});
