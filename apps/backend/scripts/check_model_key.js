const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function run() {
  const prisma = getSharedPrismaClient();
  const models = Object.keys(prisma).filter(k => !k.startsWith('$'));
  console.log('Is homepageTemplate in models?', models.includes('homepageTemplate'));
  console.log('Regex match for homepage:', models.filter(k => k.toLowerCase().includes('homepage')));
  process.exit(0);
}

run();
