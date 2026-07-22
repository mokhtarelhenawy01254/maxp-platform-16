const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function inspectStatusConfigs() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'swan', mode: 'insensitive' } }
  });

  if (!company) { console.error('Swan not found'); process.exit(1); }

  console.log(`🏢 Company: ${company.name} (${company.id})`);

  const configs = await prisma.orderStatusConfig.findMany({
    where: { companyId: company.id },
    orderBy: { sortOrder: 'asc' }
  });

  console.log('\n📋 Order Status Configs in DB for Swan:');
  configs.forEach(c => {
    console.log(`• [${c.source}] ${c.code} -> Name: "${c.name}", NameEn: "${c.nameEn}", Type: ${c.statusType}, Color: ${c.color}`);
  });

  process.exit(0);
}

inspectStatusConfigs().catch(e => { console.error(e); process.exit(1); });
