const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function testStatusUpdate() {
  try {
    const order = await prisma.order.findFirst();
    
    if (!order) {
      console.log('No order found to test on');
      return;
    }

    const originalStatus = order.status;
    console.log(`Testing on order ${order.id}. Current status: ${originalStatus}`);

    // Try to update it to READY_TO_SHIP
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'READY_TO_SHIP' }
    });

    console.log('✅ Successfully updated to READY_TO_SHIP!');

    // Revert
    await prisma.order.update({
      where: { id: order.id },
      data: { status: originalStatus }
    });
    console.log('Test order reverted.');

  } catch (error) {
    console.error('❌ FAILED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStatusUpdate();
