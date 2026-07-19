
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const assignments = await prisma.shiftAssignment.findMany({
        include: {
            user: true,
            employeeRel: true
        }
    });

    console.log(`Found ${assignments.length} assignments in total.`);
    assignments.forEach(a => {
        console.log(`- ID: ${a.id}, Date: ${a.date.toISOString().split('T')[0]}, UserId: ${a.userId}, EmpRelId: ${a.employeeRelId}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
