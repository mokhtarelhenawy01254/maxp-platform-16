
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function auditEmployees() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    console.log(`ðŸ” Auditing Employees for Company: ${companyId}`);

    const users = await prisma.user.findMany({
        where: {
            userCompanies: {
                some: { companyId }
            }
        },
        include: {
            userCompanies: {
                where: { companyId }
            }
        }
    });

    console.log(`ðŸ“Š Found ${users.length} total users linked to this company.`);

    users.forEach(u => {
        const uc = u.userCompanies[0];
        console.log(`- ${u.firstName} ${u.lastName} (${u.id}):`);
        console.log(`  User.isActive: ${u.isActive}`);
        console.log(`  User.employeeNumber: ${u.employeeNumber}`);
        console.log(`  UserCompany.isActive: ${uc ? uc.isActive : 'N/A'}`);
    });

    await prisma.$disconnect();
}

auditEmployees().catch(console.error);

