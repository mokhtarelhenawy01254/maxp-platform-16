import { PrismaClient } from './generated/postgresql_v2';
const prisma = new PrismaClient();

async function findUser() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

findUser().catch(console.error).finally(() => prisma.$disconnect());
