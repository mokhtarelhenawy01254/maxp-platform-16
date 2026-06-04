require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugData() {
    const prisma = getSharedPrismaClient();
    try {
        const pendingPermissions = await prisma.hrPermissionRequest.findMany({
            where: { status: 'PENDING' },
            select: { id: true, companyId: true, employeeId: true }
        });
        console.log(`ðŸ•’ Total Pending Permissions in DB: ${pendingPermissions.length}`);
        pendingPermissions.forEach(p => console.log(`  - ID: ${p.id}, Company: ${p.companyId}, Employee: ${p.employeeId}`));

        const pendingAdvances = await prisma.advanceRequest.findMany({
            where: { status: 'PENDING' },
            select: { id: true, companyId: true, userId: true }
        });
        console.log(`ðŸ’° Total Pending Advances in DB: ${pendingAdvances.length}`);
        pendingAdvances.forEach(a => console.log(`  - ID: ${a.id}, Company: ${a.companyId}, User: ${a.userId}`));

        const allPermissionStatuses = await prisma.hrPermissionRequest.groupBy({
            by: ['status'],
            _count: { _all: true }
        });
        console.log('\nðŸ“Š All Permission Statuses:', allPermissionStatuses);

        const allAdvanceStatuses = await prisma.advanceRequest.groupBy({
            by: ['status'],
            _count: { _all: true }
        });
        console.log('\nðŸ“Š All Advance Statuses:', allAdvanceStatuses);

    } catch (error) {
        console.error('âŒ Error in debug script:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugData();

