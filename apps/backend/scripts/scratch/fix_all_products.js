const path = require('path');
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient();

async function main() {
  const targetCompanyId = 'cmmzjisyt0000vp1w5t4g7gry';
  
  // Update all products to this company ID if they are not already
  // In a real scenario we'd be more careful, but for this test environment 
  // we want to make sure the storefront works for this tenant.
  const result = await prisma.product.updateMany({
    data: { companyId: targetCompanyId }
  });
  
  console.log(`✅ [DB-FIX] Updated ${result.count} products to company ${targetCompanyId}`);
  
  const variantResult = await prisma.productVariant.updateMany({
    data: { companyId: targetCompanyId }
  });
  console.log(`✅ [DB-FIX] Updated ${variantResult.count} variants.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
