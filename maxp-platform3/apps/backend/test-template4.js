const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');
const fs = require('fs');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const result = await prisma.homepageTemplate.findUnique({
    where: { id: 'cmn4qr1xp0001vprscph2vqjp' },
    select: { id: true, name: true, content: true, publishedContent: true }
  });
  fs.writeFileSync('template-cmn4qr1xp0001vprscph2vqjp.json', JSON.stringify(result, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
