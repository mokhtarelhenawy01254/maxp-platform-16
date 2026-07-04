const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function inspectSwan() {
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    const company = await prisma.company.findFirst({
      where: {
        slug: 'swan'
      }
    });

    if (!company) {
      console.log('❌ Company "swan" not found in database.');
      const allCompanies = await prisma.company.findMany();
      console.log('Available companies:');
      allCompanies.forEach(c => console.log(`- Name: ${c.name}, Slug: ${c.slug}, ID: ${c.id}`));
      process.exit(1);
    }

    console.log(`🏢 Found company: ${company.name} (ID: ${company.id})`);

    const products = await prisma.product.findMany({
      where: {
        companyId: company.id
      },
      include: {
        category: true
      }
    });

    console.log(`📦 Total products for Swan: ${products.length}`);
    for (const p of products) {
      console.log(`- Name: "${p.name}"`);
      console.log(`  SKU: ${p.sku}`);
      console.log(`  Active: ${p.isActive}`);
      console.log(`  Category: ${p.category ? p.category.name : 'None'}`);
      console.log(`  Embedding (text): ${p.embedding ? `Length ${p.embedding.length} characters` : 'NULL'}`);
      console.log(`  Embedding Image: ${p.embeddingImage ? 'Present' : 'NULL'}`);
      console.log(`  Tags: ${p.tags}`);
      console.log(`  DeletedAt: ${p.deletedAt}`);
      console.log('--------------------------------------');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inspecting Swan products:', error);
    process.exit(1);
  }
}

inspectSwan();
