const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

async function run() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to initialize Prisma client');
        process.exit(1);
    }

    try {
        const pages = await prisma.facebookPage.findMany({
            where: { status: 'connected' },
            select: {
                id: true,
                pageId: true,
                pageName: true,
                companyId: true,
                status: true
            }
        });

        console.log('--- CONNECTED FACEBOOK PAGES ---');
        console.log(JSON.stringify(pages, null, 2));
        console.log('--------------------------------');
    } catch (error) {
        console.error('Database query error:', error.message);
    } finally {
        process.exit(0);
    }
}

run();

