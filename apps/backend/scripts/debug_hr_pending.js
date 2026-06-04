
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';

    const pendingPermissions = await prisma.hrPermissionRequest.findMany({
        where: { companyId, status: 'PENDING' }
    });
    console.log('Pending Permissions:', pendingPermissions.length);

    const pendingAdvances = await prisma.advanceRequest.findMany({
        where: { companyId, status: 'PENDING' }
    });
    console.log('Pending Advances:', pendingAdvances.length);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

