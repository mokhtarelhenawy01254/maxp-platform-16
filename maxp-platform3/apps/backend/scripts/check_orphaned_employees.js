
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const employeesWithoutUser = await prisma.employee.findMany({
        where: { userId: null }
    });

    const totalEmployees = await prisma.employee.count();

    console.log(`Total records in Employee table: ${totalEmployees}`);
    console.log(`Employees without userId: ${employeesWithoutUser.length}`);
    employeesWithoutUser.forEach(e => {
        console.log(`- ID: ${e.id}, Name: ${e.firstName} ${e.lastName}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
