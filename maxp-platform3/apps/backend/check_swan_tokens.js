const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findUnique({
    where: { slug: 'swan' }
  });
  if (!company) {
    console.log("Company not found");
    return;
  }
  console.log("Design Tokens for Swan:");
  console.log(JSON.stringify(company.designTokens, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
