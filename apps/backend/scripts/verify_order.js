
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function verifyOrder() {
    const orderNumber = 'ORD-237947-141';
    console.log(`\n🔍 Verifying order: ${orderNumber}\n`);
    
    try {
        const prisma = getSharedPrismaClient();
        
        // Find correct model names
        const allModels = Object.keys(prisma).filter(k => k[0] !== '_' && typeof prisma[k] === 'object');
        const guestOrderModel = allModels.find(m => m.toLowerCase() === 'guestorder');
        const orderModel = allModels.find(m => m.toLowerCase() === 'order');
        
        console.log(`Model Names found: GuestOrder -> ${guestOrderModel}, Order -> ${orderModel}`);

        if (guestOrderModel) {
            const guestOrder = await prisma[guestOrderModel].findUnique({
                where: { 
                    companyId_orderNumber: {
                        companyId: 'mokhtar-1',
                        orderNumber: orderNumber
                    }
                }
            });
            
            if (guestOrder) {
                console.log('✅ Found GuestOrder:');
                console.log(JSON.stringify(guestOrder, null, 2));
                return;
            }
        }
        
        if (orderModel) {
            const order = await prisma[orderModel].findUnique({
                where: { 
                    companyId_orderNumber: {
                        companyId: 'mokhtar-1',
                        orderNumber: orderNumber
                    }
                },
                include: {
                    orderItems: true
                }
            });
            
            if (order) {
                console.log('✅ Found Order:');
                console.log(JSON.stringify(order, null, 2));
                return;
            }
        }
        
        console.log('❌ Order NOT found in GuestOrder or Order tables (searched with orderNumber and companyId).');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyOrder();
