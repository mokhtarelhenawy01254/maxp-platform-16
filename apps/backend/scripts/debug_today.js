
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const attendees = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: new Date('2026-02-18T00:00:00Z')
                }
            },
            include: {
                user: {
                    select: { firstName: true, employeeNumber: true }
                }
            }
        });
        console.log(`Found ${attendees.length} records for 2026-02-18 or later.`);
        attendees.forEach(a => {
            console.log(`${a.user?.firstName} (${a.user?.employeeNumber}): Date=${a.date.toISOString()}, In=${a.checkIn?.toISOString()}, Late=${a.lateMinutes}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

