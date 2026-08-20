const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'HALF BOOT SWAN' } },
    select: { id: true, name: true, description: true }
  });
  console.log(JSON.stringify(product, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
