
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function verifyOrderById() {
    const orderId = 'cmmj4ym0n000nvptcixseyrby';
    console.log(`\n🔍 Verifying order by ID: ${orderId}\n`);
    
    try {
        const prisma = getSharedPrismaClient();
        
        // Check GuestOrder
        const guestOrder = await prisma.guestOrder.findUnique({
            where: { id: orderId }
        });
        
        if (guestOrder) {
            console.log('✅ Found GuestOrder by ID:');
            console.log(JSON.stringify(guestOrder, null, 2));
            return;
        }
        
        // Check Order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: true
            }
        });
        
        if (order) {
            console.log('✅ Found Order by ID:');
            console.log(JSON.stringify(order, null, 2));
            return;
        }
        
        console.log('❌ Order NOT found in GuestOrder or Order tables by ID.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyOrderById();
