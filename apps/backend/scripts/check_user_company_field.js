
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const users = await prisma.user.findMany({
        where: {
            userCompanies: { some: { companyId } }
        }
    });

    console.log(`Checking users in company ${companyId}:`);
    users.forEach(u => {
        console.log(`- ${u.firstName} ${u.lastName} (ID: ${u.id}), companyId Field: ${u.companyId}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
