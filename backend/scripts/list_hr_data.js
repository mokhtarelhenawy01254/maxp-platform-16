
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const employees = await prisma.user.findMany({
        where: {
            companyId,
            employeeNumber: { not: null }
        },
        include: {
            departmentRelation: true,
            positionRelation: true
        }
    });

    console.log(`Found ${employees.length} employees for company ${companyId}:`);
    employees.forEach(emp => {
        console.log(`- ID: ${emp.id}, Name: ${emp.firstName} ${emp.lastName}, Email: ${emp.email}, Status: ${emp.isActive ? 'ACTIVE' : 'INACTIVE'}, Emp#: ${emp.employeeNumber}`);
    });

    const shifts = await prisma.shift.findMany({
        where: { companyId }
    });
    console.log(`\nFound ${shifts.length} shifts:`);
    shifts.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.name}, Color: ${s.color}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
