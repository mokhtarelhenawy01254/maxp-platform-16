
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const companies = await prisma.company.findMany({
            select: { id: true, name: true }
        });
        console.log('Companies:', JSON.stringify(companies, null, 2));

        const totalAttendance = await prisma.attendance.count({
            where: {
                date: new Date('2026-02-18')
            }
        });
        console.log('Total Attendance on 2026-02-18:', totalAttendance);

        const recentAttendance = await prisma.attendance.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                user: { select: { firstName: true, lastName: true, employeeNumber: true } }
            }
        });
        console.log('20 Most Recent Attendances:');
        recentAttendance.forEach(a => {
            console.log(`User: ${a.user?.firstName} ${a.user?.lastName} (${a.user?.employeeNumber}), Date: ${a.date.toISOString()}, CreatedAt: ${a.createdAt.toISOString()}, Late: ${a.lateMinutes}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

