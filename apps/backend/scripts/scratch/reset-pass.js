const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

let prisma;

async function main() {
  await initializeSharedDatabase();
  prisma = getSharedPrismaClient();
  const email = 'admin@mokhtarelhenawy.com';
  const newPassword = '0165676135';

  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'mokhtar',
        mode: 'insensitive'
      }
    }
  });
  console.log("Found users containing mokhtar:");
  users.forEach(u => console.log(u.email));

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    console.log('Password updated successfully for:', user.email, 'to:', newPassword);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
