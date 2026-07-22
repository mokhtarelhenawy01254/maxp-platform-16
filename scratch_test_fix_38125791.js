const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const trackingCode = '38125791';
  console.log(`🧪 Testing update for shipment ${trackingCode} with fixed COD amount...\n`);

  const guest = await prisma.guestOrder.findFirst({
    where: {
      OR: [
        { turboTrackingNumber: trackingCode },
        { turboShipmentId: trackingCode }
      ]
    },
    include: { company: true }
  });

  if (!guest) {
    console.error('❌ Order not found');
    return;
  }

  const turboService = new TurboService(guest.company.turboApiKey, guest.companyId);

  const orderData = {
    orderId: guest.id,
    orderNumber: guest.orderNumber,
    customerName: guest.guestName,
    customerPhone: guest.guestPhone,
    shippingAddress: guest.shippingAddress,
    city: 'عرب جسر السويس',
    governorate: 'القاهرة',
    totalValue: guest.finalTotal || guest.total,
    shipping: guest.shippingCost,
    paymentMethod: guest.paymentMethod,
    items: typeof guest.items === 'string' ? JSON.parse(guest.items) : guest.items
  };

  console.log('📋 Payload to updateShipment:', {
    trackingCode,
    orderNumber: orderData.orderNumber,
    paymentMethod: orderData.paymentMethod,
    totalValue: orderData.totalValue,
    shipping: orderData.shipping
  });

  const result = await turboService.updateShipment(trackingCode, orderData);
  console.log('✅ Update Result from Turbo API:');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
