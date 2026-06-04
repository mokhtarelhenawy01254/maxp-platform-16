
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function checkCompanyApps() {
  const prisma = await getSharedPrismaClientAsync();
  
  // Find company swan
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { slug: 'swan' },
        { name: { contains: 'swan', mode: 'insensitive' } }
      ]
    }
  });
  
  if (!company) {
    console.log("Company 'swan' not found");
    return;
  }
  
  console.log(`Checking apps for company: ${company.name} (${company.id})`);
  
  const companyApps = await prisma.companyApp.findMany({
    where: { companyId: company.id },
    include: {
      app: {
        select: {
          slug: true,
          name: true,
          category: true
        }
      }
    }
  });
  
  console.log(JSON.stringify(companyApps, null, 2));
}

checkCompanyApps().catch(console.error);
