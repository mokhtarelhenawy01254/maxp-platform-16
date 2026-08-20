require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();

    try {
        // First get the user
        const user = await prisma.user.findUnique({
            where: { email: 'mokhtar@mokhtar.mokhtar' }
        });

        console.log('User:', JSON.stringify(user, null, 2));

        if (user && user.companyId) {
            const company = await prisma.company.findUnique({
                where: { id: user.companyId }
            });

            console.log('Company:', JSON.stringify(company, null, 2));
        }

        // Also check UserCompany table
        const userCompanies = await prisma.userCompany.findMany({
            where: { userId: user.id },
            include: { company: true }
        });

        console.log('UserCompanies:', JSON.stringify(userCompanies, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main()
    .catch(e => console.error('Fatal:', e.message))
    .finally(() => { });
