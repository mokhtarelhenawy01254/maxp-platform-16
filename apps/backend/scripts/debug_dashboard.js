
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companies = await prisma.company.findMany({
        select: { id: true, name: true }
    });

    for (const company of companies) {
        console.log(`\nChecking Company: ${company.name} (${company.id})`);

        const manualDeductions = await prisma.manualDeduction.findMany({
            where: { companyId: company.id }
        });
        console.log(`Total Manual Deductions: ${manualDeductions.length}`);
        manualDeductions.forEach(d => console.log(`- ID: ${d.id}, Status: ${d.status}, Reason: ${d.reason}`));

        // Also check rewards
        const rewards = await prisma.rewardApplication.findMany({
            where: { companyId: company.id }
        });
        console.log(`Total Reward Applications: ${rewards.length}`);
        rewards.forEach(r => console.log(`- ID: ${r.id}, Status: ${r.status}, reason: ${r.reason}`));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

