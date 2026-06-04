
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function listRecentOrders() {
    try {
        const prisma = getSharedPrismaClient();
        const orders = await prisma.guestOrder.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Recent Guest Orders:', JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listRecentOrders();
