const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const company = await prisma.company.findFirst({
      where: { 
        OR: [
          { name: { contains: 'm22', mode: 'insensitive' } },
          { slug: { contains: 'm22', mode: 'insensitive' } }
        ]
      }
  });
  console.log(JSON.stringify(company));
  process.exit(0);
}
main();
