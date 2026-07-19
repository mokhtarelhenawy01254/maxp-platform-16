require('dotenv').config();
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkPages() {
    try {
        const prisma = await initializeSharedDatabase();
        if (!prisma) {
            console.error('❌ Prisma not initialized');
            return;
        }

        // Check if storePage model exists on prisma object
        if (!prisma.storePage) {
            console.error('❌ storePage model not found on Prisma client');
            console.log('📦 Available models:', Object.keys(prisma).filter(k => k[0] !== '$'));
            return;
        }

        const pagesCount = await prisma.storePage.count();
        const companiesCount = await prisma.company.count();
        const samplePages = await prisma.storePage.findMany({
            take: 5,
            include: { company: { select: { name: true, slug: true } } }
        });

        console.log('📊 Statistics:');
        console.log(`- Total StorePages: ${pagesCount}`);
        console.log(`- Total Companies: ${companiesCount}`);
        console.log('\n📄 Sample Pages:');
        console.log(JSON.stringify(samplePages, null, 2));
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        const { closeSharedDatabase } = require('./services/sharedDatabase');
        await closeSharedDatabase();
    }
}

checkPages();
