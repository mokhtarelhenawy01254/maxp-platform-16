const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '.env.production') });
dotenv.config();

async function findOrder() {
    const prisma = getSharedPrismaClient();
    const orderNumber = 'ORD-407897-951-AFF-j84p';

    console.log(`ðŸ” Searching for order: ${orderNumber}`);

    // We search globally (bypassing RLS by not setting context)
    const orders = await prisma.order.findMany({
        where: {
            orderNumber: {
                contains: orderNumber
            }
        },
        include: {
            company: true,
            affiliate: true,
            orderItems: {
                include: {
                    product: true
                }
            }
        }
    });

    if (orders.length === 0) {
        console.log('âŒ No order found with that number.');
    } else {
        orders.forEach(o => {
            console.log(`âœ… Found Order:`);
            console.log(`   ID: ${o.id}`);
            console.log(`   Number: ${o.orderNumber}`);
            console.log(`   CompanyID: ${o.companyId} (${o.company?.name || 'Unknown'})`);
            console.log(`   Status: ${o.status}`);
            console.log(`   Items: ${o.orderItems.length}`);
            o.orderItems.forEach(item => {
                console.log(`     - ${item.product?.name} (Qty: ${item.quantity}, ProductID: ${item.productId})`);
            });
            console.log(`   Created At: ${o.createdAt}`);
        });
    }

    await prisma.$disconnect();
}

findOrder();

