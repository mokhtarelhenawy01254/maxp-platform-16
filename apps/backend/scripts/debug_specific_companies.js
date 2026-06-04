const { getSharedPrismaClient } = require('../services/sharedDatabase');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
    const prisma = getSharedPrismaClient();

    console.log('--- Searching for Alpha and H2m ---');
    const companies = await prisma.company.findMany({
        where: {
            OR: [
                { name: { contains: 'Alpha', mode: 'insensitive' } },
                { name: { contains: 'H2m', mode: 'insensitive' } },
                { slug: { contains: 'alpha', mode: 'insensitive' } },
                { slug: { contains: 'h2m', mode: 'insensitive' } }
            ]
        }
    });
    console.log(JSON.stringify(companies, null, 2));

    if (companies.length > 0) {
        const ids = companies.map(c => c.id);
        const pages = await prisma.facebookPage.findMany({
            where: { companyId: { in: ids } }
        });
        console.log('\n--- Facebook Pages for these companies ---');
        console.log(JSON.stringify(pages, null, 2));

        const convs = await prisma.conversation.count({
            where: { companyId: { in: ids } }
        });
        console.log(`\nTotal conversations for these: ${convs}`);
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

