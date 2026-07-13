const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getSharedPrismaClientAsync } = require('../../services/sharedDatabase');

async function verify() {
    const prisma = await getSharedPrismaClientAsync();
    if (!prisma) {
        console.error('❌ Could not initialize Prisma client.');
        process.exit(1);
    }

    try {
        const template = await prisma.homepageTemplate.findFirst({
            where: { slug: 'nile-walk-elite' }
        });
        console.log('--- HomepageTemplate ---');
        console.log('Found:', !!template);
        console.log('ID:', template?.id);
        console.log('Slug:', template?.slug);
        console.log('isSystem:', template?.isSystem);
        console.log('Thumbnail:', template?.thumbnail);

        const app = await prisma.marketplaceApp.findUnique({
            where: { slug: 'template-nile-walk-elite' }
        });
        console.log('\n--- MarketplaceApp ---');
        console.log('Found:', !!app);
        console.log('Name:', app?.name);
        console.log('Category:', app?.category);
        console.log('isActive:', app?.isActive);

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
