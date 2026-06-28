const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  const perms = await prisma.permission.findMany({
    select: { domain: true, key: true }
  });
  console.log(JSON.stringify(perms, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
