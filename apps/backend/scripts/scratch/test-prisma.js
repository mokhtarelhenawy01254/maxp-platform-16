const { getSharedPrismaClient } = require('./services/sharedDatabase');
async function test() {
  const prisma = getSharedPrismaClient();
  try {
    const posts = await prisma.facebookComment.groupBy({
      by: ['postId'],
      where: { companyId: 'dummy', pageId: 'dummy' },
      _max: { createdTime: true },
      orderBy: { _max: { createdTime: 'desc' } }
    });
    console.log("Success:", posts);
  } catch (err) {
    console.error("Prisma Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
