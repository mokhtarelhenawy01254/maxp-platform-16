
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const employees = await prisma.employee.findMany({
        where: { companyId },
        take: 2,
        select: { id: true, firstName: true, lastName: true, userId: true }
    });
    console.log('Employees:', employees);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

