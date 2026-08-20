const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  try {
    const prisma = await getSharedPrismaClientAsync();
    const companyId = 'cmmhkxobb0000vpk440j1n6ui';
    
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true }
    });

    if (!company) {
      console.error('Company not found by ID');
      return;
    }

    console.log(`Company ID: ${company.id} | Name: ${company.name} | Slug: ${company.slug}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    process.exit(0);
  }
}

main();
