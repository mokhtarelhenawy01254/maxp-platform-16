
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const targetNames = ['Ali Wazery', 'Ù†Ø³Ù…Ø©', 'Habiba', 'Ali', 'Ù†Ø³Ù…Ù‡'];
        const users = await prisma.user.findMany({
            where: {
                OR: targetNames.map(name => ({
                    firstName: { contains: name, mode: 'insensitive' }
                }))
            },
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        });

        console.log(`Found ${users.length} matching users.`);

        for (const user of users) {
            console.log(`--- User: ${user.firstName} ${user.lastName} (${user.employeeNumber}) ---`);

            // Get shift assignments for today
            const today = new Date('2026-02-18T00:00:00.000Z');
            const assignment = await prisma.shiftAssignment.findFirst({
                where: { userId: user.id, date: today },
                include: { shift: true }
            });

            if (assignment) {
                console.log(`  Assigned Shift: ${assignment.shift.name}, Start: ${assignment.shift.startTime}, End: ${assignment.shift.endTime}`);
            } else {
                console.log('  No shift assignment found for 2026-02-18');
                // Look for any assignment to see what shifts they have
                const anyAssignment = await prisma.shiftAssignment.findFirst({
                    where: { userId: user.id },
                    orderBy: { date: 'desc' },
                    include: { shift: true }
                });
                if (anyAssignment) {
                    console.log(`  Last known shift (on ${anyAssignment.date.toISOString()}): ${anyAssignment.shift.name}, Start: ${anyAssignment.shift.startTime}`);
                }
            }

            // Check current attendance record for today
            const attendance = await prisma.attendance.findUnique({
                where: { userId_date: { userId: user.id, date: today } }
            });

            if (attendance) {
                console.log(`  Attendance Today: In=${attendance.checkIn?.toISOString()}, Late=${attendance.lateMinutes}, Status=${attendance.status}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

