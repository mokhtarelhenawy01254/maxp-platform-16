
require('dotenv').config();
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

        // Check for records on 2026-02-18
        // We need to be careful with date format. 
        // Prisma usually handles Date objects as UTC.
        const dateToSearch = new Date('2026-02-18');

        const attendances = await prisma.attendance.findMany({
            where: {
                userId: { in: userIds },
                date: dateToSearch
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
            console.log(`${a.user?.firstName} (${a.user?.employeeNumber}): 
        CheckIn (UTC): ${a.checkIn?.toISOString()}
        CheckIn (Local Cairo): ${a.checkIn?.toLocaleString('en-US', { timeZone: 'Africa/Cairo' })}
        Late Minutes: ${a.lateMinutes}
        Status: ${a.status}`);
        });

        const shiftAssignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: { in: userIds },
                date: dateToSearch
            },
            include: {
                shift: true,
                user: { select: { firstName: true } }
            }
        });

        console.log('\nShift Assignments:');
        shiftAssignments.forEach(sa => {
            console.log(`${sa.user?.firstName}: Shift=${sa.shift?.name}, Start=${sa.shift?.startTime}, End=${sa.shift?.endTime}`);
        });

        const settings = await prisma.hRSettings.findFirst({
            where: { companyId: attendances[0]?.companyId }
        });
        console.log('\nHR Settings (Grace Periods):');
        if (settings) {
            console.log(`Grace Period: ${settings.gracePeriodMinutes}`);
            console.log(`Late Grace Period (Check-in): ${settings.lateGracePeriod}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

