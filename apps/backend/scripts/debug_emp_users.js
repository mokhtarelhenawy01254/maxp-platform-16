
const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function checkEmployees() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        process.exit(1);
    }

    try {
        const employees = await prisma.employee.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        console.log(`Found ${employees.length} employees in hr_employees table`);
        employees.forEach(e => {
            console.log(`Emp ID: ${e.id}`);
            console.log(`  Name: ${e.firstName} ${e.lastName}`);
            console.log(`  UserID: ${e.userId}`);
            console.log(`  UserFound in user table: ${!!e.user}`);
            if (e.user) {
                console.log(`  User's own ID: ${e.user.id}`);
            }
            console.log('---');
        });

        // Also check User table for people who have employeeNumber
        const usersAsEmployees = await prisma.user.findMany({
            where: {
                employeeNumber: { not: null }
            }
        });
        console.log(`\nFound ${usersAsEmployees.length} users with employeeNumber`);
        usersAsEmployees.forEach(u => {
            console.log(`User ID: ${u.id}, Name: ${u.firstName} ${u.lastName}, EmpNum: ${u.employeeNumber}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkEmployees();

