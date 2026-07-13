
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const inactiveUsers = await prisma.user.count({
        where: { companyId, isActive: false }
    });

    const inactiveUserCompanies = await prisma.userCompany.count({
        where: { companyId, isActive: false }
    });

    console.log(`Inactive users (User table): ${inactiveUsers}`);
    console.log(`Inactive users (UserCompany table): ${inactiveUserCompanies}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
