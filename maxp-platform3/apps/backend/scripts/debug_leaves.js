const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
    const latestLeaves = await prisma.leaveRequest.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' }
    });
    console.log('--- Latest Leaves ---');
    console.log(JSON.stringify(latestLeaves, null, 2));

    const cancelledLeaves = await prisma.leaveRequest.findMany({
        where: { status: 'CANCELLED' },
        take: 5,
        orderBy: { updatedAt: 'desc' }
    });
    console.log('--- Cancelled Leaves ---');
    console.log(JSON.stringify(cancelledLeaves, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

