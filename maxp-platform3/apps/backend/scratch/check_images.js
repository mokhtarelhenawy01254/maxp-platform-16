
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function check() {
  const prisma = getSharedPrismaClient();
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { mainImage: { not: null } },
          { images: { not: null } }
        ]
      },
      take: 20,
      select: { name: true, mainImage: true, images: true }
    });
    
    console.log(JSON.stringify(products, null, 2));
  } catch (e) {
    console.error(e);
  }
}

check();
