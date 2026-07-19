require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();

    try {
        console.log(`Total Companies: ${await prisma.company.count()}`);
        console.log(`Total Users: ${await prisma.user.count()}`);
        console.log(`Total Customers: ${await prisma.customer.count()}`);
        console.log(`Total Products: ${await prisma.product.count()}`);
        console.log(`Total Orders: ${await prisma.order.count()}`);
    } catch (e) {
        console.error(e);
    }
}

main();
