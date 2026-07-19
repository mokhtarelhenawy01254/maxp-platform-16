require('dotenv').config();
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function main() {
    await initializeSharedDatabase();
    const email = 'h2m.office@maxp.com';
    const user = await getSharedPrismaClient().user.findUnique({
        where: { email },
        include: {
            userCompanies: {
                include: {
                    company: true
                }
            },
            company: true
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`User: ${user.email} (ID: ${user.id})`);
    console.log(`Primary Company: ${user.company?.name || 'None'} (ID: ${user.companyId})`);
    console.log('Secondary Companies:');
    user.userCompanies.forEach(uc => {
        console.log(`- ${uc.company.name} (ID: ${uc.companyId}, Role: ${uc.role}, Active: ${uc.isActive})`);
    });
}

main().catch(console.error);

