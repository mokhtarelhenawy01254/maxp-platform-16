
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                OR: [
                    { firstName: { contains: 'Nesma', mode: 'insensitive' } },
                    { firstName: { contains: 'Ù†Ø³Ù…Ø©', mode: 'insensitive' } },
                    { firstName: { contains: 'Habiba', mode: 'insensitive' } },
                    { firstName: { contains: 'Ø­Ø¨ÙŠØ¨Ø©', mode: 'insensitive' } },
                    { firstName: { contains: 'Ali', mode: 'insensitive' } },
                    { firstName: { contains: 'Ø¹Ù„ÙŠ', mode: 'insensitive' } },
                    { firstName: { contains: 'Yomna', mode: 'insensitive' } },
                    { firstName: { contains: 'ÙŠÙ…Ù†Ù‰', mode: 'insensitive' } },
                    { employeeNumber: { in: ['EMP00004', 'EMP00002', 'EMP00006', 'EMP00008'] } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                userId: true
            }
        });

        console.log('--- Employees Found ---');
        console.log(JSON.stringify(employees, null, 2));

        const userIds = employees.map(e => e.userId).filter(Boolean);

        // Find all attendance for these users today
        const attendances = await prisma.attendance.findMany({
            where: {
                date: new Date('2026-02-18')
            },
            include: {
                user: { select: { firstName: true, employeeNumber: true } }
            }
        });

        console.log('\n--- ALL Attendances for Today (2026-02-18) ---');
        attendances.forEach(a => {
            console.log(`User: ${a.user?.firstName}, ID: ${a.userId}, Date=${a.date.toISOString()}, In=${a.checkIn?.toISOString()}, Late=${a.lateMinutes}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

