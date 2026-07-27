const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const companyId = 'cmleybpf70028juo2wwpmp8rt'; // Swan
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, turboApiKey: true }
  });

  console.log(`🔍 Checking guest_orders table for Company: ${company.name}`);

  const guestOrders = await prisma.guestOrder.findMany({
    where: { companyId: companyId },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📌 Total Guest Orders for Swan: ${guestOrders.length}`);

  const withoutTurbo = guestOrders.filter(g => !g.turboTrackingNumber && !g.turboShipmentId);
  const withTurbo = guestOrders.filter(g => g.turboTrackingNumber || g.turboShipmentId);

  console.log(`✅ Guest Orders WITH Turbo Code: ${withTurbo.length}`);
  console.log(`⚠️ Guest Orders WITHOUT Turbo Code: ${withoutTurbo.length}`);

  withoutTurbo.forEach((g, i) => {
    console.log(`${i + 1}. Guest Order #${g.orderNumber} (ID: ${g.id}) | Status: ${g.status} | Customer: ${g.customerName} (${g.customerPhone})`);
  });

  if (withoutTurbo.length > 0) {
    console.log(`\n🚀 Creating Turbo Shipments for ${withoutTurbo.length} Guest Orders...`);
    const turboService = new TurboService(company.turboApiKey, company.id);

    for (const g of withoutTurbo) {
      console.log(`\n----------------------------------------`);
      console.log(`📦 Processing Guest Order #${g.orderNumber} (ID: ${g.id})`);

      const orderData = {
        orderId: g.id,
        orderNumber: g.orderNumber,
        customerName: g.customerName || `عميل طلب #${g.orderNumber}`,
        customerPhone: g.customerPhone || '01000000000',
        customerEmail: g.customerEmail || null,
        shippingAddress: g.shippingAddress || g.address || '',
        customerAddress: g.address || null,
        city: g.city || '',
        governorate: g.governorate || '',
        items: Array.isArray(g.items) ? g.items : [],
        totalWeight: 1,
        subtotal: parseFloat(g.subtotal || 0),
        shipping: parseFloat(g.shipping || 0),
        totalValue: parseFloat(g.total || 0),
        paymentMethod: g.paymentMethod || 'CASH',
        notes: g.notes || null,
        createdAt: g.createdAt || new Date().toISOString()
      };

      try {
        const result = await turboService.createShipment(orderData);
        console.log(`✅ SUCCESS! Created Turbo Code: ${result.trackingNumber}`);

        await prisma.guestOrder.update({
          where: { id: g.id },
          data: {
            turboShipmentId: String(result.shipmentId || ''),
            turboTrackingNumber: String(result.trackingNumber || ''),
            turboShipmentStatus: result.status,
            turboLabelUrl: result.labelUrl,
            turboMetadata: JSON.stringify(result.data)
          }
        });
        console.log(`💾 Updated Guest Order #${g.orderNumber} in DB.`);
      } catch (err) {
        console.error(`❌ FAILED for Guest Order #${g.orderNumber}:`, err.message);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
