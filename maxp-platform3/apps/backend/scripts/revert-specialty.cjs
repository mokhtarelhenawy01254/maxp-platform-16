const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
async function main() {
  await prisma.businessSpecialty.update({
    where: { slug: 'ecommerce-retail' },
    data: { appSlugs: [
      'ecommerce-basic', 'store-basic', 'quantity-offers-pro',
      'commerce-advanced', 'procurement-pro', 'order-source-tracking',
      'crm-lite', 'analytics-basic', 'ai-chat-basic',
      'facebook-ads-pro', 'conversion-suite', 'ugc-reviews-pro'
    ]}
  });
  console.log('Reverted ecommerce-retail slugs to analytics-basic');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); });
