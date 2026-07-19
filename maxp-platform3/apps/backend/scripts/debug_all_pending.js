
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const pendingPermissions = await prisma.hrPermissionRequest.findMany({
        where: { status: 'PENDING' }
    });
    console.log('Total Pending Permissions (All Companies):', pendingPermissions.length);

    const pendingAdvances = await prisma.advanceRequest.findMany({
        where: { status: 'PENDING' }
    });
    console.log('Total Pending Advances (All Companies):', pendingAdvances.length);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

