require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('./prisma/generated/postgresql');
const p = new PrismaClient();

async function main() {
  const product = await p.product.findUnique({
    where: { id: 'cmng572s8007jvbtk5jm649gv' },
    select: { mainImage: true, images: true }
  });
  console.log('mainImage:', product.mainImage);
  console.log('images:', product.images);
}

main().catch(console.error).finally(function() { return p.$disconnect(); });
