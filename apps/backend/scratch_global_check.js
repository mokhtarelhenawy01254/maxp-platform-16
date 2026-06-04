
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function main() {
  await initializeSharedDatabase();
  const prisma = getSharedPrismaClient();

  const specificId = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  console.log(`Checking for product [${specificId}] globally...`);
  
  // Use findFirst without any where clause other than ID to bypass potential RLS if it's not working as expected
  // but RLS is in the client extension. To truly bypass it, we might need a raw query or set company context.
  
  const product = await prisma.product.findFirst({
    where: { id: specificId }
  });
  
  if (product) {
    console.log('Found product:', product.name);
    console.log('Company:', product.companyId);
    console.log('Active:', product.isActive);
    console.log('Hidden:', product.isHidden);
    console.log('Deleted At:', product.deletedAt);
  } else {
    console.log('Product NOT found globally.');
    
    // Search by slug just in case
    const productBySlug = await prisma.product.findFirst({
        where: { slug: specificId }
    });
    if (productBySlug) {
        console.log('Found product BY SLUG:', productBySlug.name);
    } else {
        console.log('Product NOT found by slug either.');
    }
  }
}

main().catch(console.error);
