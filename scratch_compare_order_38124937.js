const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const targetOrderNumber = 'ORD-026429-146';
  const targetTrackingCode = '38124937';

  console.log(`🔍 Comparing Order Details for #${targetOrderNumber} / Tracking Code: ${targetTrackingCode}\n`);

  // 1. Query Regular Orders table
  const regularOrder = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: targetOrderNumber },
        { turboTrackingNumber: targetTrackingCode },
        { turboShipmentId: targetTrackingCode }
      ]
    },
    include: {
      customer: true,
      orderItems: { include: { product: true } },
      company: { select: { id: true, name: true, turboApiKey: true } }
    }
  });

  // 2. Query Guest Orders table
  const guestOrder = await prisma.guestOrder.findFirst({
    where: {
      OR: [
        { orderNumber: targetOrderNumber },
        { turboTrackingNumber: targetTrackingCode },
        { turboShipmentId: targetTrackingCode }
      ]
    },
    include: {
      company: { select: { id: true, name: true, turboApiKey: true } }
    }
  });

  console.log('==================================================');
  console.log('📦 OUR DATABASE RECORD:');
  console.log('==================================================');

  if (regularOrder) {
    console.log('📌 Type: Regular Order (orders table)');
    console.log(`- Order Number: ${regularOrder.orderNumber}`);
    console.log(`- Database ID: ${regularOrder.id}`);
    console.log(`- Company: ${regularOrder.company?.name} (ID: ${regularOrder.companyId})`);
    console.log(`- Status in DB: ${regularOrder.status}`);
    console.log(`- Customer Name: ${regularOrder.customerName || (regularOrder.customer ? `${regularOrder.customer.firstName || ''} ${regularOrder.customer.lastName || ''}`.trim() : 'N/A')}`);
    console.log(`- Customer Phone: ${regularOrder.customerPhone || regularOrder.customer?.phone || 'N/A'}`);
    console.log(`- Customer Email: ${regularOrder.customerEmail || regularOrder.customer?.email || 'N/A'}`);
    console.log(`- Shipping Address Raw: ${regularOrder.shippingAddress}`);
    console.log(`- Customer Address Raw: ${regularOrder.customerAddress}`);
    console.log(`- City / Governorate: ${regularOrder.city || 'N/A'} / ${regularOrder.governorate || 'N/A'}`);
    console.log(`- Notes: ${regularOrder.notes || 'N/A'}`);
    console.log(`- Total Value: ${regularOrder.total} EGP (Subtotal: ${regularOrder.subtotal}, Shipping: ${regularOrder.shipping})`);
    console.log(`- Turbo Tracking Number in DB: ${regularOrder.turboTrackingNumber || 'N/A'}`);
    console.log(`- Turbo Shipment Status in DB: ${regularOrder.turboShipmentStatus || 'N/A'}`);
    console.log(`- Turbo Metadata in DB: ${regularOrder.turboMetadata || 'N/A'}`);
    console.log(`- Items:`, regularOrder.orderItems?.map(i => `${i.quantity}x ${i.productName || i.product?.name} (${i.productColor || ''} ${i.productSize || ''})`));
    console.log(`- Created At: ${regularOrder.createdAt}`);
  } else {
    console.log('⚠️ Not found in regular `orders` table.');
  }

  if (guestOrder) {
    console.log('\n📌 Type: Guest Order (guest_orders table)');
    console.log(`- Order Number: ${guestOrder.orderNumber}`);
    console.log(`- Database ID: ${guestOrder.id}`);
    console.log(`- Company: ${guestOrder.company?.name} (ID: ${guestOrder.companyId})`);
    console.log(`- Status in DB: ${guestOrder.status}`);
    console.log(`- Guest Name: ${guestOrder.guestName || 'N/A'}`);
    console.log(`- Guest Phone: ${guestOrder.guestPhone || 'N/A'}`);
    console.log(`- Shipping Address: ${guestOrder.shippingAddress || 'N/A'}`);
    console.log(`- Total: ${guestOrder.finalTotal || guestOrder.total} EGP`);
    console.log(`- Turbo Tracking Number in DB: ${guestOrder.turboTrackingNumber || 'N/A'}`);
    console.log(`- Turbo Metadata: ${guestOrder.turboMetadata || 'N/A'}`);
    console.log(`- Items: ${guestOrder.items}`);
    console.log(`- Created At: ${guestOrder.createdAt}`);
  } else {
    console.log('⚠️ Not found in `guest_orders` table.');
  }

  // 3. Query Turbo API
  const company = (regularOrder?.company || guestOrder?.company);
  if (company && company.turboApiKey) {
    console.log('\n==================================================');
    console.log(`🌐 TURBO API LIVE RECORD (Company: ${company.name}):`);
    console.log('==================================================');

    const turboService = new TurboService(company.turboApiKey, company.id);
    try {
      // Get shipment details from Turbo API
      const liveData = await turboService.trackShipment(targetTrackingCode);
      console.log('✅ Turbo Live API Result:');
      console.log(JSON.stringify(liveData, null, 2));
    } catch (err) {
      console.log(`❌ Failed to fetch from Turbo API: ${err.message}`);
    }
  } else {
    console.log('\n⚠️ Cannot query Turbo API: No company or Turbo API key found.');
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
