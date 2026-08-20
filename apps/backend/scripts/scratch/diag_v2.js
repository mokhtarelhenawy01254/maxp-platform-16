require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');
async function main() {
    const prisma = getSharedPrismaClient();
    const all = await prisma.homepageTemplate.findMany({
        select: { id: true, name: true, companyId: true, isSystem: true, slug: true }
    });
    console.log('---COUNT_START---');
    console.log('Total Templates in DB:', all.length);
    console.log(JSON.stringify(all, null, 2));
    console.log('---COUNT_END---');
}
main().finally(() => process.exit());
