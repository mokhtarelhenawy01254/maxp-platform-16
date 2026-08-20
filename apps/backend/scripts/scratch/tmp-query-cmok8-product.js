const { PrismaClient } = require('./prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

(async () => {
  const products = await prisma.product.findMany({
    where: {
      companyId: 'cmlc65tfr0000jutofd95qi23',
      name: {
        contains: '91/494',
      },
    },
    select: {
      id: true,
      name: true,
      price: true,
      companyId: true,
      sku: true,
      metadata: true,
    },
    take: 10,
  });

  console.log(JSON.stringify(products, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
