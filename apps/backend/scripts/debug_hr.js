
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';

    const permissions = await prisma.hrPermissionRequest.findMany({
        where: { companyId }
    });
    console.log('Total Permissions:', permissions.length);
    permissions.forEach(p => console.log(`- ID: ${p.id}, Status: ${p.status}, EmployeeId: ${p.employeeId}`));

    const advances = await prisma.advanceRequest.findMany({
        where: { companyId }
    });
    console.log('Total Advances:', advances.length);
    advances.forEach(a => console.log(`- ID: ${a.id}, Status: ${a.status}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

