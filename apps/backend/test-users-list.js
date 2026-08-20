const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      }
    });
    console.log(`FOUND_USERS_START`);
    console.log(JSON.stringify(users, null, 2));
    console.log(`FOUND_USERS_END`);
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
