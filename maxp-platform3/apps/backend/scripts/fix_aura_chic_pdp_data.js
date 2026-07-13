const { t: i18n } = require('./i18n');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const companySlug = 'aura-chic-test';

  console.log('💎 Fixing Aura Chic PDP Content...');

  const company = await prisma.company.findUnique({
    where: { slug: companySlug }
  });

  if (!company) {
    console.error('❌ Company not found');
    process.exit(1);
  }

  // 1. Update Products with real luxury images and Arabic content
  const fashionImages = [
    'https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?w=800&q=80', // Elegant model
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', // Luxury dress
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80', // Accessories
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', // Runway
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80', // Dress detail
  ];

  // Update "Pleated Chiffon Gown"
  await prisma.product.updateMany({
    where: { 
      slug: 'pleated-chiffon-gown',
      companyId: company.id
    },
    data: {
      name: i18n.t('msg.dea90a6c'),
      description: i18n.t('msg.923252ec'),
      images: JSON.stringify([fashionImages[0], fashionImages[4]]),
      price: 4500,
      comparePrice: 5200,
    }
  });

  // Update "Luxury Silk Evening Dress #gown" (Remove Hashtag and Translate)
  await prisma.product.updateMany({
    where: {
      OR: [
        { slug: 'luxury-silk-evening-dress-gown' },
        { name: { contains: '#gown' } }
      ],
      companyId: company.id
    },
    data: {
      name: i18n.t('msg.a31ea729'),
      description: i18n.t('msg.bda941a2'),
      images: JSON.stringify([fashionImages[1], fashionImages[3]]),
      price: 6800,
      comparePrice: 7500,
    }
  });

  // Update "Silk Slip Midi Dress"
  await prisma.product.updateMany({
    where: { 
      slug: 'silk-slip-midi-dress',
      companyId: company.id
    },
    data: {
      name: i18n.t('msg.2cbd0698'),
      description: i18n.t('msg.f93f9833'),
      images: JSON.stringify([fashionImages[2], fashionImages[1]]),
      price: 3200,
    }
  });

  // Ensure more products in the same category for "Related Products"
  const eveningWearCat = await prisma.category.findFirst({
    where: { name: { contains: i18n.t('msg.54b4772d') } }
  });

  if (eveningWearCat) {
    await prisma.product.updateMany({
      where: { companyId: company.id },
      data: { categoryId: eveningWearCat.id }
    });
  }

  // 2. Update Footer Branding in Template
  const template = await prisma.homepageTemplate.findFirst({
    where: { companyId: company.id, isActive: true }
  });

  if (template) {
    const content = template.content;
    if (content.settings) {
      content.settings.footerBranding = {
        name: 'Maison Aura',
        description: i18n.t('msg.bc18c81b')
      };
      
      await prisma.homepageTemplate.update({
        where: { id: template.id },
        data: { content }
      });
      console.log('✅ Footer branding updated.');
    }
  }

  console.log('🚀 Aura Chic Content Fixed Successfully!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
