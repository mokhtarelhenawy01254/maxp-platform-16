const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const employees = await prisma.employee.findMany({
        include: {
            user: true
        }
    });

    console.log(`TOTAL EMPLOYEES: ${employees.length}`);
    employees.forEach(e => {
        console.log(`- ${e.user?.firstName} ${e.user?.lastName} (ID: ${e.id}, UserSalary: ${e.user?.baseSalary}, Status: ${e.status})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

