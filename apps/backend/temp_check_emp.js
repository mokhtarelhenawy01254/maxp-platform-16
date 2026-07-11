const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findFirst({
        where: { email: 'shrouk9@gmail.com' }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User ID:', user.id);
    const emp = await prisma.employee.findFirst({
        where: { userId: user.id }
    });

    console.log('Employee Record Found:', !!emp);
    if (emp) {
        console.log('Employee data:', {
            gender: emp.gender,
            dateOfBirth: emp.dateOfBirth,
            nationalId: emp.nationalId
        });
    }
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
