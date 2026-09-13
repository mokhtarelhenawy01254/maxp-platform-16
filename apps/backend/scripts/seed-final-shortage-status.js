const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  console.log('🚀 Starting seed for "عجز نهائي" (SHORTAGE_FAILED) status...');

  const companies = await prisma.company.findMany({
    select: { id: true, name: true }
  });

  console.log(`🏢 Found ${companies.length} companies.`);

  for (const company of companies) {
    try {
      // 1. Upsert into orderStatusConfig
      await prisma.orderStatusConfig.upsert({
        where: {
          companyId_code: {
            companyId: company.id,
            code: 'SHORTAGE_FAILED'
          }
        },
        update: {
          name: 'عجز نهائي',
          nameEn: 'Final Shortage',
          color: '#7C3AED',
          icon: 'XCircle',
          statusType: 'order',
          isSystemStatus: true,
          isActive: true
        },
        create: {
          companyId: company.id,
          code: 'SHORTAGE_FAILED',
          name: 'عجز نهائي',
          nameEn: 'Final Shortage',
          color: '#7C3AED',
          icon: 'XCircle',
          statusType: 'order',
          source: 'system',
          sortOrder: 19,
          isSystemStatus: true,
          isActive: true
        }
      });

      // 2. Upsert into orderStatusDefinition (Workflow)
      await prisma.orderStatusDefinition.upsert({
        where: {
          companyId_code: {
            companyId: company.id,
            code: 'SHORTAGE_FAILED'
          }
        },
        update: {
          name: 'عجز نهائي',
          color: '#7C3AED',
          sortOrder: 19
        },
        create: {
          companyId: company.id,
          code: 'SHORTAGE_FAILED',
          name: 'عجز نهائي',
          color: '#7C3AED',
          sortOrder: 19,
          isTerminal: true,
          notifyCustomer: false
        }
      });

      console.log(`✅ [${company.name || company.id}] Seeded "عجز نهائي" successfully.`);
    } catch (err) {
      console.error(`❌ [${company.name || company.id}] Error seeding status:`, err.message);
    }
  }

  console.log('🎉 Done seeding "عجز نهائي" across all companies.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during seed:', err);
  process.exit(1);
});
