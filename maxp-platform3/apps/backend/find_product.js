const { PrismaClient } = require('./prisma/generated/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('$')));
    
    const product = await prisma.product.findFirst({
        include: { company: true }
    });
    
    if (product) {
        const url = `http://localhost:3000/elite-v3/${product.id}?companyId=${product.companyId}`;
        console.log('---PREVIEW_URL---');
        console.log(url);
        console.log('---END---');
        return;
    }



  } catch (error) {
    console.error('Error fetching product:', error.message);
    // Try lowercase if needed
    try {
        const p2 = await prisma.products.findFirst({ include: { company: true } });
        if (p2) console.log(JSON.stringify(p2, null, 2));
    } catch (e2) {}
  } finally {
    await prisma.$disconnect();
  }
}

main();
