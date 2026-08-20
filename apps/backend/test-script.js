const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany({
    take: 5,
    select: {
      id: true,
      title: true,
      companyId: true
    }
  });
  console.log(JSON.stringify(products, null, 2));
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
