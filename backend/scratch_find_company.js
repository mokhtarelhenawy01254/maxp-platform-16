
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function findCompanyByForm() {
  const prisma = await getSharedPrismaClientAsync();
  const form = await prisma.recruitmentForm.findUnique({
    where: { id: '879ea795-6292-4ae4-8dc8-4820b6b8d8c4' },
    select: { companyId: true }
  });
  
  if (!form) {
    console.log("Form not found");
    return;
  }
  
  const company = await prisma.company.findUnique({
    where: { id: form.companyId },
    select: { id: true, name: true, slug: true }
  });
  
  console.log(JSON.stringify(company, null, 2));
}

findCompanyByForm().catch(console.error);
