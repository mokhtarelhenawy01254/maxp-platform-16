
const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function checkUserCompanies() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        process.exit(1);
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                companyId: true,
                userCompanies: {
                    select: {
                        companyId: true
                    }
                }
            }
        });

        console.log(`Found ${users.length} users`);
        users.forEach(u => {
            console.log(`User: ${u.email}`);
            console.log(`  Default companyId in User table: ${u.companyId}`);
            console.log(`  Memberships in UserCompany table: ${u.userCompanies.map(uc => uc.companyId).join(', ') || 'NONE'}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkUserCompanies();

