
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const attendees = await prisma.attendance.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Recent Attendances:', JSON.stringify(attendees, null, 2));

        const shifts = await prisma.shiftAssignment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Recent Shift Assignments:', JSON.stringify(shifts, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

