/**
 * scripts/ensure_education_specialties.cjs
 *
 * Seeds missing domain specialties (bizsp_education_academy, bizsp_dental_lab, bizsp_medical_clinic, bizsp_services_maintenance)
 * into PostgreSQL via businessSpecialtyService.ensureDefaultSpecialties()
 * and securely links existing education companies (such as 'codetreps') to 'bizsp_education_academy'.
 */
const { getSharedPrismaClient } = require('../apps/backend/services/sharedDatabase');
const businessSpecialtyService = require('../apps/backend/services/businessSpecialtyService');

async function main() {
  const prisma = getSharedPrismaClient();
  console.log('🌱 Seeding default business specialties into PostgreSQL...');
  await businessSpecialtyService.ensureDefaultSpecialties(prisma);
  console.log('✅ Default specialties ensured.');

  // Find education specialty
  const eduSpecialty = await prisma.businessSpecialty.findFirst({
    where: { slug: 'education-academy' },
  });

  if (!eduSpecialty) {
    console.error('❌ Could not find education-academy specialty after seeding!');
    process.exit(1);
  }

  console.log(`🎓 Education specialty resolved: id=${eduSpecialty.id}, slug=${eduSpecialty.slug}`);

  // Link any company with slug or name containing 'codetreps' or education that doesn't have a specialty
  const targetCompanies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: { contains: 'codetreps', mode: 'insensitive' } },
        { name: { contains: 'codetreps', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, businessSpecialtyId: true, settings: true },
  });

  console.log(`🔍 Found ${targetCompanies.length} company record(s) matching 'codetreps':`);
  for (const c of targetCompanies) {
    console.log(`   - ${c.name} (id: ${c.id}, slug: ${c.slug}, current specialty: ${c.businessSpecialtyId})`);
    if (c.businessSpecialtyId !== eduSpecialty.id) {
      await prisma.company.update({
        where: { id: c.id },
        data: { businessSpecialtyId: eduSpecialty.id },
      });
      console.log(`     -> Updated to businessSpecialtyId = ${eduSpecialty.id}`);
    } else {
      console.log(`     -> Already linked to education specialty.`);
    }
  }

  console.log('✨ All operations completed successfully.');
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('❌ Error executing ensure_education_specialties:', err);
      process.exit(1);
    })
    .finally(async () => {
      const prisma = getSharedPrismaClient();
      if (prisma && prisma.$disconnect) {
        await prisma.$disconnect().catch(() => {});
      }
    });
}

module.exports = { main };
