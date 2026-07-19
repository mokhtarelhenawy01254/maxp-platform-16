
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { employeeNumber: 'EMP00004' }
        });

        if (user) {
            console.log(`User EMP00004: ${user.firstName} ${user.lastName}`);

            const attendance = await prisma.attendance.findMany({
                where: { userId: user.id },
                orderBy: { date: 'desc' },
                take: 5
            });
            console.log('Recent Attendance:');
            attendance.forEach(a => {
                console.log(`  Date: ${a.date.toISOString()}, In: ${a.checkIn?.toISOString()}, Late: ${a.lateMinutes}`);
            });
        } else {
            console.log('User EMP00004 not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

