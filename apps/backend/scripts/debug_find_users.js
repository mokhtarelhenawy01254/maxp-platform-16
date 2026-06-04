
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { firstName: { contains: 'Nesma', mode: 'insensitive' } },
                    { firstName: { contains: 'Ù†Ø³Ù…Ø©', mode: 'insensitive' } },
                    { firstName: { contains: 'Habiba', mode: 'insensitive' } },
                    { firstName: { contains: 'Ø­Ø¨ÙŠØ¨Ø©', mode: 'insensitive' } },
                    { firstName: { contains: 'Ali', mode: 'insensitive' } },
                    { firstName: { contains: 'Ø¹Ù„ÙŠ', mode: 'insensitive' } },
                    { firstName: { contains: 'Yomna', mode: 'insensitive' } },
                    { firstName: { contains: 'ÙŠÙ…Ù†Ù‰', mode: 'insensitive' } },
                    { employeeNumber: { in: ['EMP00004', 'EMP00002', 'EMP00006', 'EMP00008'] } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                email: true
            }
        });

        console.log('--- Users Found ---');
        console.log(JSON.stringify(users, null, 2));

        const userIds = users.map(u => u.id);

        // Find all attendance for these users in FEB
        const attendances = await prisma.attendance.findMany({
            where: {
                userId: { in: userIds },
                date: {
                    gte: new Date('2026-02-01'),
                    lte: new Date('2026-02-28')
                }
            },
            include: {
                user: { select: { firstName: true, employeeNumber: true } }
            },
            orderBy: { date: 'desc' }
        });

        console.log('\n--- Attendances for these users in FEB ---');
        attendances.forEach(a => {
            console.log(`${a.user?.firstName} (${a.user?.employeeNumber}): Date=${a.date.toISOString()}, In=${a.checkIn?.toISOString()}, Late=${a.lateMinutes}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

