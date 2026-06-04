require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();

    try {
        const companyId = 'cmmhkxobb0000vpk440j1n6ui';

        // Update company to ENTERPRISE plan
        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: { plan: 'ENTERPRISE' }
        });

        console.log('Company updated to ENTERPRISE plan:');
        console.log(JSON.stringify(updatedCompany, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main()
    .catch(e => console.error('Fatal:', e.message))
    .finally(() => { });
