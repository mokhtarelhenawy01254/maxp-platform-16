
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diag() {
    console.log('--- Attendance Diagnostics ---');

    // 1. Fetch some recent attendances
    const recentAttendances = await prisma.attendance.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: { email: true, firstName: true, lastName: true }
            }
        }
    });

    console.log('Recent Attendance Records:');
    recentAttendances.forEach(a => {
        console.log(`ID: ${a.id}, User: ${a.user?.email}, Date: ${a.date.toISOString().split('T')[0]}, In: ${a.checkIn}, Out: ${a.checkOut}, Status: ${a.status}`);
    });

    // 2. Fetch User vs Employee IDs for a few users
    const users = await prisma.user.findMany({
        take: 5,
        where: { employeeNumber: { not: null } },
        include: {
            employeeProfile: true
        }
    });

    console.log('\nUser vs Employee Mapping:');
    users.forEach(u => {
        console.log(`User ID: ${u.id}, Email: ${u.email}, Employee ID: ${u.employeeProfile?.id}`);
    });

    await prisma.$disconnect();
}

diag().catch(console.error);
