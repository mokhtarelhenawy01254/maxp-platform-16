const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const orderNumber = 'ORD-026429-146';
  const trackingCode = '38124937';

  console.log(`🔍 Testing Turbo API /edit-order for Order #${orderNumber} (Tracking Code: ${trackingCode})...\n`);

  const order = await prisma.order.findFirst({
    where: { orderNumber },
    include: { customer: true, orderItems: { include: { product: true } }, company: true }
  });

  if (!order) {
    console.error('❌ Order not found in DB');
    return;
  }

  const turboService = new TurboService(order.company.turboApiKey, order.companyId);

  // Prepare updated data with a valid 11-digit phone number
  const updatedCustomerPhone = '01140476391'; // Fixed 11-digit phone number

  const formattedData = turboService.formatOrderForTurbo({
    ...order,
    customerPhone: updatedCustomerPhone
  }, {
    ...order.customer,
    phone: updatedCustomerPhone
  }, order.orderItems);

  console.log('📋 Formatted Update Payload for Turbo API:', {
    code: trackingCode,
    orderNumber: formattedData.orderNumber,
    receiver: formattedData.customerName,
    phone: formattedData.customerPhone,
    governorate: formattedData.governorate,
    city: formattedData.city,
    address: formattedData.shippingAddress
  });

  try {
    const result = await turboService.updateShipment(trackingCode, formattedData);
    console.log('✅ SUCCESS! Turbo API edit-order response:');
    console.log(JSON.stringify(result, null, 2));

    // Update database
    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerPhone: updatedCustomerPhone,
        turboMetadata: JSON.stringify(result.data)
      }
    });
    console.log('💾 Updated database order record with fixed phone number!');
  } catch (err) {
    console.error('❌ Turbo API edit-order failed:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
