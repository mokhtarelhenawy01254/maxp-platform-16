
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';

    const permissions = await prisma.hrPermissionRequest.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('Latest Permissions:');
    permissions.forEach(p => console.log(`- ${p.createdAt.toISOString()}: ${p.status} (ID: ${p.id})`));

    const advances = await prisma.advanceRequest.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('\nLatest Advances:');
    advances.forEach(a => console.log(`- ${a.createdAt.toISOString()}: ${a.status} (ID: ${a.id})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

