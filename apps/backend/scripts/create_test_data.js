
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const employeeId = 'cmlcatkuf0007vb7090uwdz6r'; // One of the users

    // Create a pending permission
    const perm = await prisma.hrPermissionRequest.create({
        data: {
            companyId,
            employeeId,
            type: 'DEDUCTIBLE',
            date: new Date(),
            startTime: new Date(),
            endTime: new Date(Date.now() + 3600000),
            duration: 60,
            status: 'PENDING',
            reason: 'Test Pending Permission'
        }
    });
    console.log('Created test permission:', perm.id);

    // Create a pending advance
    const adv = await prisma.advanceRequest.create({
        data: {
            companyId,
            employeeId,
            amount: 1000,
            reason: 'Test Pending Advance',
            status: 'PENDING',
            repaymentMonths: 1
        }
    });
    console.log('Created test advance:', adv.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

