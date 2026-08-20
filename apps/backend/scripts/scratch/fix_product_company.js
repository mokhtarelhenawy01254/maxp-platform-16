const path = require('path');
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient();

async function main() {
  const productId = 'cmmucr9ck000fvppk65vjtrw2';
  const targetCompanyId = 'cmmzjisyt0000vp1w5t4g7gry';
  
  const updated = await prisma.product.update({
    where: { id: productId },
    data: { companyId: targetCompanyId }
  });
  
  console.log(`✅ [DB-FIX] Product ${updated.name} moved to company ${targetCompanyId}`);
  
  // Also check variants
  const variants = await prisma.productVariant.updateMany({
    where: { productId },
    data: { companyId: targetCompanyId }
  });
  console.log(`✅ [DB-FIX] Updated ${variants.count} variants.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
