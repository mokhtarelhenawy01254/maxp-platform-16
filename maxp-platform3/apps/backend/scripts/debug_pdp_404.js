const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { slug: 'aura-chic-test' },
          { name: { contains: 'Aura Chic' } }
        ]
      }
    });

    if (!company) {
      console.log('Company NOT FOUND');
      return;
    }

    console.log(`Found Company: ${company.name} (ID: ${company.id}, Slug: ${company.slug})`);

    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      select: { id: true, name: true, slug: true }
    });

    console.log('Products count:', products.length);
    console.log(JSON.stringify(products, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
