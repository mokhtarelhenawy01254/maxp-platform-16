require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    try {
        const companyId = "cmlcatkmn0000vb70t1k03jpd";
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });
        console.log('Company by ID cmlcatkmn0000vb70t1k03jpd:', company);

        const allCompanies = await prisma.company.findMany();
        console.log('ALL Companies IDs and Names:', allCompanies.map(c => ({ id: c.id, name: c.name })));

        // Check for users by the same ID or similar emails
        const allUsers = await prisma.user.findMany({
            select: { id: true, email: true, firstName: true, lastName: true }
        });
        console.log('ALL Users IDs and Emails:', allUsers);

    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
