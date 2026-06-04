
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        console.log('--- Attendance created in the last 2 hours ---');
        const attendance = await prisma.attendance.findMany({
            where: {
                createdAt: { gte: twoHoursAgo }
            },
            include: {
                user: { select: { firstName: true, lastName: true, employeeNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (attendance.length === 0) {
            console.log('No attendance records found created in the last 2 hours.');
            // Search for all created today (UTC)
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);
            const todayAttendance = await prisma.attendance.findMany({
                where: { createdAt: { gte: startOfToday } },
                include: { user: { select: { firstName: true, lastName: true, employeeNumber: true } } }
            });
            console.log(`Found ${todayAttendance.length} records created since UTC start of day.`);
            todayAttendance.forEach(a => {
                console.log(`User: ${a.user?.firstName} ${a.user?.lastName}, Date: ${a.date.toISOString()}, CreatedAt: ${a.createdAt.toISOString()}, Late: ${a.lateMinutes}`);
            });
        } else {
            attendance.forEach(a => {
                console.log(`User: ${a.user?.firstName} ${a.user?.lastName}, Date: ${a.date.toISOString()}, CreatedAt: ${a.createdAt.toISOString()}, Late: ${a.lateMinutes}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

