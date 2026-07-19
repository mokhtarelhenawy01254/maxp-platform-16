
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const assignments = await prisma.shiftAssignment.findMany({
        take: 5,
        include: {
            user: true,
            employeeRel: true
        }
    });

    console.log(`Checking last 5 assignments:`);
    assignments.forEach(a => {
        console.log(`- ID: ${a.id}, Date: ${a.date.toISOString().split('T')[0]}`);
        console.log(`  UserId: ${a.userId} (User: ${a.user?.firstName || 'N/A'})`);
        console.log(`  EmployeeRelId: ${a.employeeRelId} (Employee: ${a.employeeRel?.firstName || 'N/A'})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
