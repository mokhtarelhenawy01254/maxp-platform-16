const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');
const fs = require('fs');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const result = await prisma.homepageTemplate.findFirst({
    where: { companyId: 'cmmhkxobb0000vpk440j1n6ui' },
    select: { id: true, name: true, content: true, publishedContent: true }
  });
  fs.writeFileSync('template-output.json', JSON.stringify(result, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
