const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '.env.production') });
dotenv.config();

async function findWofod() {
    const prisma = getSharedPrismaClient();
    const companies = await prisma.company.findMany({
        where: { name: { contains: 'Wofod' } }
    });
    console.log(`ðŸ” Found ${companies.length} companies with 'Wofod' in name:`);
    companies.forEach(c => console.log(`   - ${c.name} (ID: ${c.id})`));
    await prisma.$disconnect();
}

findWofod();

