
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';

    // Build the same filter as employeeService.getEmployees
    const userWhere = {
        userCompanies: {
            some: {
                companyId,
                isActive: true
            }
        }
    };

    const users = await prisma.user.findMany({
        where: userWhere,
        include: {
            departmentRelation: true,
            positionRelation: true,
            userCompanies: {
                where: { companyId: companyId },
                take: 1
            }
        }
    });

    console.log(`Found ${users.length} users in company ${companyId}`);
    users.forEach(u => {
        console.log(`- ${u.firstName} ${u.lastName} (ID: ${u.id}), Emp#: ${u.employeeNumber}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
