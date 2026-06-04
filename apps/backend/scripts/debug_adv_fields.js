
const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function checkAdvancesFields() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        process.exit(1);
    }

    try {
        const advances = await prisma.advanceRequest.findMany({
            select: {
                id: true,
                userId: true,
                employeeRelId: true,
                companyId: true,
                amount: true,
                status: true
            }
        });

        console.log(`Checking ${advances.length} advances...`);
        advances.forEach(adv => {
            console.log(`ID: ${adv.id}`);
            console.log(`  userId: ${adv.userId}`);
            console.log(`  employeeRelId: ${adv.employeeRelId}`);
            console.log(`  companyId: ${adv.companyId}`);
            console.log(`  Amount: ${adv.amount}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkAdvancesFields();

