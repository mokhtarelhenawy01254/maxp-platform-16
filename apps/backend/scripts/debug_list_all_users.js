
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, firstName: true, lastName: true, employeeNumber: true, email: true }
        });
        console.log(`Total users in system: ${users.length}`);
        users.forEach(u => console.log(`- ${u.firstName} ${u.lastName} (${u.employeeNumber}) | Email: ${u.email}`));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();

