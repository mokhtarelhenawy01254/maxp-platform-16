require('dotenv').config();
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function main() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        if (!prisma) {
            console.error('âŒ Error: Could not initialize shared Prisma client.');
            process.exit(1);
        }

        const companies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                customDomain: true,
                isActive: true
            }
        });

        console.log('ðŸ“‹ Companies and Domains:');
        companies.forEach(c => {
            console.log(`- ${c.name} (${c.id}):`);
            console.log(`  Slug: ${c.slug}`);
            console.log(`  Custom Domain: ${c.customDomain || 'NONE'}`);
            console.log(`  Active: ${c.isActive}`);
        });
    } catch (err) {
        console.error('âŒ Error:', err);
    } finally {
        const { closeSharedDatabase } = require('../services/sharedDatabase');
        await closeSharedDatabase();
    }
}

main();

