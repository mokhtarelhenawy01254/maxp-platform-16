const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function main() {
  const orderNumber = 'ORD-026429-146';
  const order = await prisma.order.findFirst({
    where: { orderNumber },
    include: { customer: true, orderItems: { include: { product: true } }, company: true }
  });

  console.log(`🧪 Testing strict phone validation for Order #${order.orderNumber}...`);
  console.log(`Customer Phone in DB: "${order.customerPhone}" (${order.customerPhone?.length} chars)`);

  const turboService = new TurboService(order.company.turboApiKey, order.companyId);
  const formatted = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

  try {
    await turboService.createShipment(formatted);
    console.log('⚠️ UNEXPECTED SUCCESS');
  } catch (err) {
    console.log(`✅ EXPECTED STRICT ERROR CAUGHT: "${err.message}"`);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
