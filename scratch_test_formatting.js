const { getSharedPrismaClient } = require('./services/sharedDatabase');
const TurboService = require('./services/turboService');
const prisma = getSharedPrismaClient();

async function testFormat() {
  const order = await prisma.order.findUnique({
    where: { id: 'cmlgcj200005djunzjqxr642l' }, // Order 11372
    include: {
      customer: true,
      orderItems: {
        include: { product: true }
      },
      company: {
        select: {
          id: true,
          turboApiKey: true,
          turboEnabled: true
        }
      }
    }
  });

  if (!order) {
    console.log('Order not found');
    return;
  }

  console.log('Raw order shippingAddress:', order.shippingAddress);
  console.log('Raw order city:', order.city);

  const turboService = new TurboService(order.company.turboApiKey, order.companyId);
  const formatted = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

  console.log('Formatted Order for Turbo:', JSON.stringify(formatted, null, 2));
}

testFormat()
  .catch(console.error)
  .finally(() => process.exit(0));
