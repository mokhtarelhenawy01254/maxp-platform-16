const path = require('path');
const prismaClientPath = path.join(__dirname, 'prisma', 'generated', 'postgresql_v2');
const { PrismaClient } = require(prismaClientPath);
const prisma = new PrismaClient();

async function main() {
  const cartId = '8063b27f-c883-404f-b009-d3f11d8d8d5c';
  const cart = await prisma.guestCart.findUnique({
    where: { cartId }
  });
  console.log('CART DATA:');
  console.log(JSON.stringify(cart, null, 2));

  if (cart && cart.items) {
    let items = cart.items;
    if (typeof items === 'string') items = JSON.parse(items);
    
    const itemList = Array.isArray(items) ? items : (items.items || []);
    console.log(`Checking ${itemList.length} items...`);

    for (const item of itemList) {
        const productId = item.productId || item.id;
        const product = await prisma.product.findFirst({
            where: { id: productId }
        });
        console.log(`Product lookup for "${item.name}" (ID: ${productId}):`, product ? 'FOUND' : 'NOT FOUND');
        if (product) {
            console.log(`  Company ID in DB: ${product.companyId}`);
        }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
