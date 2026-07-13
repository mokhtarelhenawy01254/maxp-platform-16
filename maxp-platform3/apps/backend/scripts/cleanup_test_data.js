
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const result = await prisma.user.deleteMany({
        where: { email: 'test_emp@example.com' }
    });
    console.log(`Deleted ${result.count} test employees.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
