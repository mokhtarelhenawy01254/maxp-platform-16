
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const today = new Date('2026-02-18T00:00:00.000Z');

        console.log('--- Shift Assignments Today (2026-02-18) ---');
        const shifts = await prisma.shiftAssignment.findMany({
            where: { date: today },
            include: {
                shift: true,
                user: { select: { firstName: true, lastName: true, employeeNumber: true } }
            }
        });

        shifts.forEach(s => {
            console.log(`User: ${s.user?.firstName} ${s.user?.lastName} (${s.user?.employeeNumber}), Shift: ${s.shift?.name}, Start: ${s.shift?.startTime}`);
        });

        console.log('\n--- Attendance Today (2026-02-18) ---');
        const attendance = await prisma.attendance.findMany({
            where: { date: today },
            include: {
                user: { select: { firstName: true, lastName: true, employeeNumber: true } }
            }
        });

        attendance.forEach(a => {
            console.log(`User: ${a.user?.firstName} ${a.user?.lastName} (${a.user?.employeeNumber}), In: ${a.checkIn?.toISOString()}, Late: ${a.lateMinutes}, Status: ${a.status}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

