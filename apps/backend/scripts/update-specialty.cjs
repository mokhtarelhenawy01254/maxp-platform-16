const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
async function main() {
  const specialty = await prisma.businessSpecialty.findUnique({ where: { slug: 'ecommerce-retail' } });
  if (specialty) {
    console.log('Current slugs:', JSON.stringify(specialty.appSlugs));
    const updated = await prisma.businessSpecialty.update({
      where: { slug: 'ecommerce-retail' },
      data: {
        appSlugs: [
          'ecommerce-basic', 'store-basic', 'quantity-offers-pro',
          'commerce-advanced', 'procurement-pro', 'order-source-tracking',
          'crm-lite', 'analytics-advanced', 'ai-chat-basic',
          'facebook-ads-pro', 'conversion-suite', 'ugc-reviews-pro'
        ]
      }
    });
    console.log('Updated slugs:', JSON.stringify(updated.appSlugs));
  } else {
    console.log('Specialty not found');
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
