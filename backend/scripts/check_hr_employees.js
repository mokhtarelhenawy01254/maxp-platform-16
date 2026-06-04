
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const hrEmployees = await prisma.employee.findMany({
        where: { companyId }
    });

    console.log(`Found ${hrEmployees.length} records in hr_employees table for company ${companyId}`);
    hrEmployees.forEach(e => {
        console.log(`- ID: ${e.id}, UserId: ${e.userId}, Name: ${e.firstName} ${e.lastName}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
