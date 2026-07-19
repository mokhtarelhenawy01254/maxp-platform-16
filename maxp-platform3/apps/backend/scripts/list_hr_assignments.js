
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const employees = await prisma.user.findMany({
        where: {
            companyId,
            employeeNumber: { not: null }
        }
    });

    console.log(`Found ${employees.length} employees for company ${companyId}:`);
    const employeeIds = employees.map(e => e.id);

    const assignments = await prisma.shiftAssignment.findMany({
        where: {
            userId: { in: employeeIds },
            companyId
        },
        include: {
            shift: true,
            user: true
        }
    });

    console.log(`\nFound ${assignments.length} assignments:`);
    assignments.forEach(a => {
        console.log(`- Date: ${a.date.toISOString().split('T')[0]}, Employee: ${a.user.firstName} ${a.user.lastName}, Shift: ${a.shift.name}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
