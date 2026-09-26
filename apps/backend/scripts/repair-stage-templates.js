/**
 * Migration Script: Repair flawed stage templates across all dental lab work types
 * Upgrades legacy/all-GENERAL_TECHNICIAN templates to canonical 5 stages:
 * 1. الاستلام (RECEPTION_LOGISTICS)
 * 2. التصميم (CAD_DESIGNER)
 * 3. التصنيع (CERAMIST)
 * 4. مراجعة الجودة (QC_INSPECTOR)
 * 5. التسليم (RECEPTION_LOGISTICS)
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { repairDefaultWorkTypeStageTemplates } = require('../services/dentalStageTemplateService');

async function main() {
  console.log('=== RUNNING STAGE TEMPLATES REPAIR MIGRATION ===');
  const prisma = getSharedPrismaClient();

  const totalBefore = await prisma.workTypeStageTemplate.count();
  console.log(`Total stage template rows in DB before repair: ${totalBefore}`);

  const repairedCount = await repairDefaultWorkTypeStageTemplates(prisma, null);
  console.log(`Repaired templates for ${repairedCount} work types.`);

  const totalAfter = await prisma.workTypeStageTemplate.count();
  console.log(`Total stage template rows in DB after repair: ${totalAfter}`);

  // Summary of roles in DB now
  const allTemplates = await prisma.workTypeStageTemplate.findMany({
    select: { name: true, requiredRole: true },
  });
  const roleDistribution = {};
  allTemplates.forEach((t) => {
    roleDistribution[t.requiredRole] = (roleDistribution[t.requiredRole] || 0) + 1;
  });
  console.log('Role distribution after repair:', roleDistribution);

  const distinctNames = [...new Set(allTemplates.map((t) => t.name))];
  console.log('Stage names present after repair:', distinctNames);

  console.log('=== REPAIR MIGRATION COMPLETED SUCCESSFULLY ===');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
