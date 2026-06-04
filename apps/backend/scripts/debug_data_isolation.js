const { getSharedPrismaClient } = require('../services/sharedDatabase');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        return;
    }

    console.log('--- Companies ---');
    const companies = await prisma.company.findMany({
        select: { id: true, name: true, slug: true }
    });
    console.log(JSON.stringify(companies, null, 2));

    console.log('\n--- Facebook Pages ---');
    const pages = await prisma.facebookPage.findMany({
        select: { id: true, pageId: true, pageName: true, companyId: true, status: true }
    });
    console.log(JSON.stringify(pages, null, 2));

    console.log('\n--- Conversations Counts per Company ---');
    // Try to find if multiple companies share the same pageId (not possible due to @unique, but check companyId distribution)
    const convCounts = await prisma.conversation.groupBy({
        by: ['companyId'],
        _count: true
    });
    console.log(JSON.stringify(convCounts, null, 2));

    console.log('\n--- Sample Conversations ---');
    const sampleConvs = await prisma.conversation.findMany({
        take: 10,
        select: { id: true, companyId: true, channel: true, lastMessagePreview: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' }
    });
    console.log(JSON.stringify(sampleConvs, null, 2));

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

