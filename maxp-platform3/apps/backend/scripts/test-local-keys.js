const { listTenantAIKeys } = require('../controller/aiSandboxController');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  try {
    const keys = await listTenantAIKeys('some-company-id', true);
    console.log('Keys:', keys);
  } catch (e) {
    console.error(e);
  } finally {
    const prisma = getSharedPrismaClient();
    await prisma.$disconnect();
  }
}

main();
