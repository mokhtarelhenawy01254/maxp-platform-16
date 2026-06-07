require('dotenv').config();
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, baseSalary: true }
    });
    console.log(`TOTAL USERS: ${users.length}`);
    users.forEach(u => {
        console.log(`- ${u.firstName} ${u.lastName} (Salary: ${u.baseSalary})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());

