
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        take: 10,
        select: { id: true, email: true, companyId: true, role: true }
    });
    console.log('Users:', users);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

