const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  const trackingCode = '38125791';
  console.log(`🔍 Inspecting Order with Turbo Tracking Code: ${trackingCode}...\n`);

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { turboTrackingNumber: trackingCode },
        { turboShipmentId: trackingCode }
      ]
    },
    include: { customer: true, company: true }
  });

  if (!order) {
    console.log('❌ Order not found in `orders` table.');
    const guest = await prisma.guestOrder.findFirst({
      where: {
        OR: [
          { turboTrackingNumber: trackingCode },
          { turboShipmentId: trackingCode }
        ]
      }
    });
    console.log('Guest Order:', guest);
    return;
  }

  console.log('📌 Order details:');
  console.log(`- Order Number: ${order.orderNumber}`);
  console.log(`- Payment Method: "${order.paymentMethod}"`);
  console.log(`- Total: ${order.total}`);
  console.log(`- Subtotal: ${order.subtotal}`);
  console.log(`- Shipping: ${order.shipping}`);
  console.log(`- Customer Name: ${order.customerName}`);
  console.log(`- Customer Phone: ${order.customerPhone}`);
  console.log(`- Turbo Metadata: ${order.turboMetadata}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
