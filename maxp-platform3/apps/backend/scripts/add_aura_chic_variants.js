const { t: i18n } = require('./i18n');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const companySlug = 'aura-chic-test';

  console.log('👗 Adding Variants to Aura Chic Products...');

  const company = await prisma.company.findUnique({
    where: { slug: companySlug }
  });

  if (!company) {
    console.error('❌ Company not found');
    process.exit(1);
  }

  const products = await prisma.product.findMany({
    where: { companyId: company.id, slug: { in: ['pleated-chiffon-gown', 'luxury-silk-evening-dress-gown', 'silk-slip-midi-dress'] } }
  });

  for (const product of products) {
    console.log(`Processing ${product.name}...`);
    
    // Clear existing variants if any
    await prisma.productVariant.deleteMany({
      where: { productId: product.id }
    });

    const colors = [
      { name: i18n.t('msg.6f357595'), code: 'Black' },
      { name: i18n.t('msg.69654f66'), code: 'Navy' },
      { name: i18n.t('msg.8403da41'), code: 'Gold' }
    ];
    const sizes = ['S', 'M', 'L', 'XLi18n.t('msg.76bd3bef')🚀 Variants Added Successfully!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
