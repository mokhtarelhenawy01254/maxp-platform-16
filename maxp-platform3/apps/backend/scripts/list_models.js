const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function run() {
  const prisma = getSharedPrismaClient();
  console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('$')));
  process.exit(0);
}

run();
