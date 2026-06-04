
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const today = new Date('2026-02-18T00:00:00.000Z');

        // Find all users who have attendance today
        const attendance = await prisma.attendance.findMany({
            where: { date: today },
            include: {
                user: {
                    include: {
                        shiftAssignments: {
                            where: { date: today },
                            include: { shift: true }
                        }
                    }
                }
            }
        });

        console.log('--- Attendance and Shift Mapping Today ---');
        attendance.forEach(a => {
            const shift = a.user?.shiftAssignments?.[0]?.shift;
            console.log(`User: ${a.user?.firstName} ${a.user?.lastName} (${a.user?.employeeNumber})`);
            console.log(`  Clock-In: ${a.checkIn?.toISOString()}`);
            console.log(`  Shift: ${shift ? shift.name : 'NONE'}`);
            console.log(`  Shift Start: ${shift ? shift.startTime : 'N/A'}`);
            console.log(`  Late Minutes: ${a.lateMinutes}`);
            console.log('-------------------');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

