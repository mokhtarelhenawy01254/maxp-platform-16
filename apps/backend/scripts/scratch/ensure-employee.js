const { PrismaClient } = require('./prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

async function main() {
    const userEmail = 'shrouk9@gmail.com';
    const user = await prisma.user.findUnique({
        where: { email: userEmail }
    });

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log('--- Ensuring Employee Record (Take 3) ---');

    const employee = await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
            status: 'ACTIVE',
            companyId: user.companyId
        },
        create: {
            userId: user.id,
            companyId: user.companyId,
            employeeNumber: 'EMP-SHROUK',
            firstName: user.firstName || 'Shrouk',
            lastName: user.lastName || 'User',
            email: user.email,
            hireDate: new Date(),
            status: 'ACTIVE'
        }
    });

    console.log('✅ Employee record ensured:', employee.id);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
