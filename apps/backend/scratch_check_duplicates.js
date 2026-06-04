const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const duplicates = await prisma.order.groupBy({
    by: ['orderNumber'],
    having: {
      orderNumber: {
        _count: {
          gt: 1
        }
      }
    },
    _count: {
      orderNumber: true
    }
  });

  console.log(`Found ${duplicates.length} duplicate order numbers.`);
  if (duplicates.length > 0) {
    console.log(duplicates.slice(0, 5));
    
    // Look up one of them
    const sample = await prisma.order.findMany({
      where: { orderNumber: duplicates[0].orderNumber },
      select: { id: true, orderNumber: true, status: true, companyId: true, createdAt: true }
    });
    console.log(`Sample orders for ${duplicates[0].orderNumber}:`, sample);
  }
}

main().catch(console.error).finally(() => process.exit(0));
