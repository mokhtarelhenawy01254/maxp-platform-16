const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const payrolls = await prisma.payroll.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    const userIds = [...new Set(payrolls.map(p => p.userId))];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } }
    });
    const usersMap = new Map(users.map(u => [u.id, u]));

    console.log(`TOTAL RECENT PAYROLL RECORDS: ${payrolls.length}`);
    payrolls.forEach(p => {
        const user = usersMap.get(p.userId);
        console.log(`- ${user?.firstName} ${user?.lastName} (PayrollID: ${p.id}, PayrollBase: ${p.baseSalary}, UserBase: ${user?.baseSalary})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

