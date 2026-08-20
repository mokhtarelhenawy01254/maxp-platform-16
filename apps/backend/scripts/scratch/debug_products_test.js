const { getSharedPrismaClient, safeQuery } = require('./services/sharedDatabase');
const tenantContext = require('./services/tenantContext');

async function test() {
  const companyId = 'cmmhkxobb0000vpk440j1n6ui'; // Replace with a valid companyId
  console.log(`🧪 Testing products for companyId: ${companyId}`);

  try {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('❌ Prisma client not initialized');
        return;
    }

    await tenantContext.run(companyId, async () => {
      console.log('📡 Running query with RLS context...');
      const products = await prisma.product.findMany({
        where: {
          companyId: companyId,
          isActive: true
        },
        take: 5,
        include: {
          variants: true,
          category: true
        }
      });
      console.log(`✅ Found ${products.length} products`);
      if (products.length > 0) {
        console.log('📄 First product:', JSON.stringify(products[0], null, 2));
      }
    });

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    process.exit();
  }
}

test();
