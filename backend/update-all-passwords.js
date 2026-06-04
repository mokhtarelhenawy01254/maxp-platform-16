const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const NEW_PASSWORD = '0165676135';

async function main() {
  try {
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);
    
    // Fetch all users to update their passwords
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    
    console.log(`🚀 Starting password update for ${users.length} users...`);
    
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
      console.log(`✅ Updated password for: ${user.email}`);
    }
    
    console.log('\n🔒 All user passwords have been updated successfully.');
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
