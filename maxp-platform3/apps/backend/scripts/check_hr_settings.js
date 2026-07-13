const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkSettings() {
    console.log('Starting check...');
    const prisma = getSharedPrismaClient();

    try {
        await prisma.$connect();

        // 1. Check HR Settings
        const settings = await prisma.hRSettings.findMany();
        console.log('--- HR SETTINGS ---');
        settings.forEach(s => {
            console.log(`Company ID: ${s.companyId}`);
            console.log(`Social Insurance Rate: ${s.socialInsuranceRate}`);
            console.log(`Tax Rate: ${s.taxRate}`);
            console.log('-------------------');
        });

        // 2. Check a few recent payrolls to see what was actually saved
        if (settings.length > 0) {
            const companyId = settings[0].companyId;
            const recentPayrolls = await prisma.payroll.findMany({
                where: { companyId },
                take: 3,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    month: true,
                    socialInsurance: true,
                    status: true,
                    createdAt: true
                }
            });
            console.log('--- RECENT PAYROLLS ---');
            console.log(JSON.stringify(recentPayrolls, null, 2));
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkSettings();
