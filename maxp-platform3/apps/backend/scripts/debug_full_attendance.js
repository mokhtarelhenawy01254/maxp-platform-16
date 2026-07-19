
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const today = new Date('2026-02-18');

        console.log('--- Shift Assignments for 2026-02-18 ---');
        const shifts = await prisma.shiftAssignment.findMany({
            where: { date: today },
            include: {
                shift: true,
                user: { select: { firstName: true, lastName: true, employeeNumber: true } }
            }
        });

        if (shifts.length === 0) {
            console.log('No shift assignments found for today.');
        } else {
            shifts.forEach(s => {
                console.log(`User: ${s.user?.firstName} ${s.user?.lastName} (${s.user?.employeeNumber}), Shift: ${s.shift?.name}, Start: ${s.shift?.startTime}`);
            });
        }

        console.log('\n--- Attendance Records for 2026-02-18 ---');
        const attendances = await prisma.attendance.findMany({
            where: { date: today },
            include: {
                user: { select: { firstName: true, lastName: true, employeeNumber: true } }
            }
        });

        if (attendances.length === 0) {
            console.log('No attendance records found for today.');
        } else {
            attendances.forEach(a => {
                console.log(`User: ${a.user?.firstName} ${a.user?.lastName} (${a.user?.employeeNumber}), In: ${a.checkIn?.toISOString()}, Late: ${a.lateMinutes}, Status: ${a.status}`);
            });
        }

        const hrSettings = await prisma.hRSettings.findFirst();
        console.log('\n--- HR Settings ---');
        console.log(`lateGracePeriod: ${hrSettings?.lateGracePeriod}`);
        console.log(`lateThresholdMinutes: ${hrSettings?.lateThresholdMinutes}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

