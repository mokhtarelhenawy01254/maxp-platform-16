const { getSharedPrismaClient } = require('../../services/sharedDatabase');

async function deleteBundlesExceptKept() {
  const prisma = getSharedPrismaClient();
  const keepSlugs = ['ai-inbox-bundle', 'messaging-bundle'];

  const deleted = await prisma.appBundle.deleteMany({
    where: { slug: { notIn: keepSlugs } }
  });

  console.log(`Deleted ${deleted.count} bundles. Kept: ${keepSlugs.join(', ')}`);
  await prisma.$disconnect();
}

deleteBundlesExceptKept().catch(console.error);
