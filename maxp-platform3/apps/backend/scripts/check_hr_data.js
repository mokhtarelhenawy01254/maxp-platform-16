
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkData() {
    const prisma = getSharedPrismaClient();
    try {
        const usersCount = await prisma.user.count({ where: { employeeNumber: { not: null } } });
        const hrEmployeesCount = await prisma.employee.count();

        console.log(`Users with employeeNumber: ${usersCount}`);
        console.log(`HR Employees (hr_employees table): ${hrEmployeesCount}`);

        const sampleHrEmployee = await prisma.employee.findFirst({
            include: { user: true }
        });

        console.log('Sample HR Employee:', JSON.stringify(sampleHrEmployee, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
