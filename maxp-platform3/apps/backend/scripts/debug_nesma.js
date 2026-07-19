
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const nesma = await prisma.user.findFirst({
            where: {
                OR: [
                    { firstName: { contains: 'Nesma' } },
                    { firstName: { contains: 'Ù†Ø³Ù…Ø©' } }
                ]
            }
        });

        if (nesma) {
            console.log(`Found Nesma: ID=${nesma.id}, EmpNo=${nesma.employeeNumber}`);

            const shiftAssignment = await prisma.shiftAssignment.findFirst({
                where: { userId: nesma.id, date: new Date('2026-02-18') },
                include: { shift: true }
            });

            if (shiftAssignment) {
                console.log(`Shift for Nesma: ${shiftAssignment.shift.name}, Start: ${shiftAssignment.shift.startTime}`);
            } else {
                console.log('No shift assignment found for Nesma today.');
            }

            const attendance = await prisma.attendance.findUnique({
                where: { userId_date: { userId: nesma.id, date: new Date('2026-02-18') } }
            });

            if (attendance) {
                console.log(`Attendance for Nesma: In=${attendance.checkIn?.toISOString()}, Late=${attendance.lateMinutes}`);
            }
        } else {
            console.log('Nesma not found by name.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

