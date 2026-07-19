
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const users = await prisma.user.findMany({
        where: {
            companyId
        },
        include: {
            userCompanies: true
        }
    });

    console.log(`Found ${users.length} users with companyId = ${companyId}:`);
    users.forEach(u => {
        console.log(`- User: ${u.firstName} ${u.lastName} (ID: ${u.id}), Emp#: ${u.employeeNumber}`);
        console.log(`  UserCompanies: ${u.userCompanies.map(uc => `Co: ${uc.companyId}, Active: ${uc.isActive}`).join(', ')}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
