const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const company = await prisma.company.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, slug: true }
  });
  console.log(JSON.stringify(company));
  process.exit(0);
}
main();
