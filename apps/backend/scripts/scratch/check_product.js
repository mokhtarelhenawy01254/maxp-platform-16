const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function check() {
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    
    if (!prisma) {
        console.error('Failed to get Prisma client');
        return;
    }

    const id = 'cmmucr9cc000dvppkvaslfjew';
    console.log(`Searching for product ID: ${id}`);
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true }
    });
    
    if (product) {
      console.log('✅ Product Found');
      console.log(`Name: ${product.name}`);
      console.log(`Company ID: ${product.companyId}`);
      console.log(`Category: ${product.category?.name || 'None'}`);
      
      const company = await prisma.company.findUnique({ where: { id: product.companyId } });
      console.log('✅ Company Found');
      console.log(`Company Name: ${company?.name}`);
      console.log(`Company Slug: ${company?.slug}`);
    } else {
      console.log('❌ Product Not Found');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

check().then(() => process.exit(0));
