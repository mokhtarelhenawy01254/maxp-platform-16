
const { PrismaClient } = require('./prisma/generated/postgresql_v2');

async function main() {
  const url = 'postgresql://postgres:0165676135@localhost:5432/maxp';
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });

  try {
    await prisma.$connect();
    const user = await prisma.user.findFirst({
      where: { email: 'admin@admin.com' }
    });

    if (user) {
      console.log(`Found user in maxp: [${user.id}] ${user.email}`);
    } else {
      console.log('User admin@admin.com NOT found in maxp.');
    }
    
    const count = await prisma.product.count();
    console.log(`Product count in maxp: ${count}`);
    
  } catch (err) {
    console.error('Error connecting to maxp:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
