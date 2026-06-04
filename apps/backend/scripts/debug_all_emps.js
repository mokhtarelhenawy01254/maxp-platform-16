
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            select: { firstName: true, lastName: true, employeeNumber: true }
        });
        console.log('--- All Employees ---');
        employees.forEach(e => {
            console.log(`${e.firstName} ${e.lastName} (${e.employeeNumber})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

