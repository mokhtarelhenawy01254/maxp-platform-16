require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const permissionService = require('../services/hr/permissionService');
const advanceService = require('../services/hr/advanceService');

async function debugDashboard() {
    const prisma = getSharedPrismaClient();
    try {
        const companies = await prisma.company.findMany();
        console.log(`ðŸ¢ Total Companies: ${companies.length}`);

        for (const company of companies) {
            const companyId = company.id;
            console.log(`\nðŸ“Š Debugging for company: ${company.name} (${companyId})`);

            const allPermissions = await prisma.hrPermissionRequest.count({ where: { companyId } });
            const pendingPermissions = await prisma.hrPermissionRequest.count({ where: { companyId, status: 'PENDING' } });
            console.log(`ðŸ•’ Permissions: Total=${allPermissions}, Pending=${pendingPermissions}`);

            const allAdvances = await prisma.advanceRequest.count({ where: { companyId } });
            const pendingAdvances = await prisma.advanceRequest.count({ where: { companyId, status: 'PENDING' } });
            console.log(`ðŸ’° Advances: Total=${allAdvances}, Pending=${pendingAdvances}`);

            if (pendingPermissions > 0) {
                const p = await prisma.hrPermissionRequest.findFirst({ where: { companyId, status: 'PENDING' } });
                console.log('Sample Pending Permission:', p);
            }
            if (pendingAdvances > 0) {
                const a = await prisma.advanceRequest.findFirst({ where: { companyId, status: 'PENDING' } });
                console.log('Sample Pending Advance:', a);
            }
        }

    } catch (error) {
        console.error('âŒ Error in debug script:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugDashboard();

