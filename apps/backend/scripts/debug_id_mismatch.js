
const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function checkIdMismatch() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        process.exit(1);
    }

    try {
        const employees = await prisma.employee.findMany({
            select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true
            }
        });

        console.log(`Checking ${employees.length} employees...`);
        let mismatches = 0;
        employees.forEach(emp => {
            if (emp.id !== emp.userId) {
                mismatches++;
                console.log(`MISMATCH: ${emp.firstName} ${emp.lastName}`);
                console.log(`  Employee Table ID: ${emp.id}`);
                console.log(`  User Table ID:     ${emp.userId}`);
                console.log('---');
            }
        });

        console.log(`Total Mismatches found: ${mismatches}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkIdMismatch();

