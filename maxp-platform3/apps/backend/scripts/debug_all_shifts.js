
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        console.log('--- All Registered Shifts ---');
        const shifts = await prisma.shift.findMany({
            orderBy: { startTime: 'asc' }
        });

        shifts.forEach(s => {
            console.log(`ID: ${s.id}, Name: ${s.name}, Start: ${s.startTime}, End: ${s.endTime}, Active: ${s.isActive}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

