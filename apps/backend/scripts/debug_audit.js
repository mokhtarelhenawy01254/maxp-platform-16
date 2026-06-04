
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';

    const logs = await prisma.hRAuditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    console.log('Recent HR Audit Logs:');
    logs.forEach(l => console.log(`- ${l.createdAt.toISOString()}: ${l.action} ${l.entityType} (ID: ${l.entityId}) by ${l.actorName}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

