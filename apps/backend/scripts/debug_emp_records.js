
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                employeeNumber: {
                    in: ['EMP00004', 'EMP00002', 'EMP00006', 'EMP00008']
                }
            }
        });

        for (const emp of employees) {
            const att = await prisma.attendance.findMany({
                where: { userId: emp.userId },
                orderBy: { date: 'desc' },
                take: 5
            });
            console.log(`Employee: ${emp.firstName} (${emp.employeeNumber})`);
            att.forEach(a => {
                console.log(`  Date=${a.date.toISOString()}, In=${a.checkIn?.toISOString()}, Status=${a.status}, Late=${a.lateMinutes}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

