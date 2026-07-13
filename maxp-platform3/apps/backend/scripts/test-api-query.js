const { getSharedPrismaClient } = require('../services/sharedDatabase');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '.env.production') });
dotenv.config();

async function testQuery() {
    const prisma = getSharedPrismaClient();
    const companyId = 'cmlc65tfr0000jutofd95qi23'; // Wofod

    console.log(`ðŸ” Simulating API query for company: ${companyId}`);

    const whereClause = { companyId };

    const orders = await prisma.order.findMany({
        where: whereClause,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
            customer: true,
            orderItems: true
        }
    });

    console.log(`ðŸ“¦ Found ${orders.length} orders total for Wofod.`);

    const targetOrder = orders.find(o => o.orderNumber.includes('ORD-407897-951-AFF-j84p'));
    if (targetOrder) {
        console.log(`âœ… FOUND target order in query result!`);
        console.log(`   ID: ${targetOrder.id}`);
        console.log(`   Status: ${targetOrder.status}`);
        console.log(`   OrderSource: ${targetOrder.orderSource}`);
    } else {
        console.log(`âŒ Target order NOT found in top 20 orders.`);
        // Try without limit to be sure
        const allCount = await prisma.order.count({ where: whereClause });
        console.log(`ðŸ“Š Total orders in DB for Wofod: ${allCount}`);
    }

    await prisma.$disconnect();
}

testQuery();

