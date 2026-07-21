const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ take: 5, select: { email: true, role: true } });
  console.log('USERS:', JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
