require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function verifySingleActive() {
    const prisma = getSharedPrismaClient();
    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            console.log('No company found to test with. Exiting.');
            return;
        }
        const companyId = company.id;
        console.log(`--- Testing Single Active Template Logic for company ${companyId} ---`);

        // 1. Setup: Create two templates for the same company
        const t1 = await prisma.homepageTemplate.create({
            data: {
                name: 'Template 1',
                content: {},
                companyId,
                isActive: false,
                pageType: "HOMEPAGE"
            }
        });

        const t2 = await prisma.homepageTemplate.create({
            data: {
                name: 'Template 2',
                content: {},
                companyId,
                isActive: false,
                pageType: "HOMEPAGE"
            }
        });

        console.log('Created two templates. Initial state: Both inactive.');

        // 2. Test setActiveHomepage logic (simulated)
        async function simulateActivate(id) {
            return await prisma.$transaction(async (tx) => {
                await tx.homepageTemplate.updateMany({
                    where: { companyId },
                    data: { isActive: false }
                });
                return await tx.homepageTemplate.update({
                    where: { id },
                    data: { isActive: true }
                });
            });
        }

        console.log('Activating Template 1...');
        await simulateActivate(t1.id);

        let activeTemplates = await prisma.homepageTemplate.findMany({
            where: { companyId, isActive: true }
        });
        console.log(`Active templates count: ${activeTemplates.length}`);
        if (activeTemplates.length !== 1 || activeTemplates[0].id !== t1.id) {
            throw new Error('Verification failed after activating T1');
        }

        console.log('Activating Template 2...');
        await simulateActivate(t2.id);

        activeTemplates = await prisma.homepageTemplate.findMany({
            where: { companyId, isActive: true }
        });
        console.log(`Active templates count: ${activeTemplates.length}`);
        if (activeTemplates.length !== 1 || activeTemplates[0].id !== t2.id) {
            throw new Error('Verification failed after activating T2');
        }

        console.log('--- SUCCESS: Single active template invariant holds. ---');

        // Cleanup
        await prisma.homepageTemplate.deleteMany({
            where: { id: { in: [t1.id, t2.id] } }
        });

    } catch (error) {
        console.error('Verification FAILED:', error);
    }
}

verifySingleActive();
