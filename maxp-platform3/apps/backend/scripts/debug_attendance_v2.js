
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                employeeNumber: {
                    in: ['EMP00004', 'EMP00002', 'EMP00006', 'EMP00008']
                }
            },
            select: {
                id: true,
                userId: true,
                employeeNumber: true,
                firstName: true,
                lastName: true
            }
        });

        console.log('Employees found:', employees.length);

        const userIds = employees.map(e => e.userId).filter(Boolean);

        const attendances = await prisma.attendance.findMany({
            where: {
                userId: { in: userIds },
                date: new Date('2026-02-18')
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        employeeNumber: true
                    }
                }
            }
        });

        console.log('Attendances for 2026-02-18:');
        attendances.forEach(a => {
            console.log(`${a.user?.firstName} (${a.user?.employeeNumber}): In=${a.checkIn?.toISOString()}, Late=${a.lateMinutes}, Status=${a.status}`);
        });

        const shiftAssignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: { in: userIds },
                date: new Date('2026-02-18')
            },
            include: {
                shift: true,
                user: { select: { firstName: true } }
            }
        });

        console.log('Shift Assignments:');
        shiftAssignments.forEach(sa => {
            console.log(`${sa.user?.firstName}: Shift=${sa.shift?.name}, Start=${sa.shift?.startTime}, End=${sa.shift?.endTime}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

