const { PrismaClient } = require('./generated/postgresql_v2');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://appuser:0165676135@localhost:5432/maxp?schema=public' } }
});

async function main() {
  // Reset password to a known value for testing
  const newPassword = '0165676135';
  const hashed = await bcrypt.hash(newPassword, 10);
  
  const result = await prisma.$executeRaw`
    UPDATE public.users SET password = ${hashed} 
    WHERE email = 'mokhtar@mokhtar.mokhtar'
  `;
  
  console.log('Updated rows:', result);
  console.log('Password reset to:', newPassword);
  
  // Verify
  const user = await prisma.$queryRaw`
    SELECT id, email, password FROM public.users WHERE email = 'mokhtar@mokhtar.mokhtar'
  `;
  const match = await bcrypt.compare(newPassword, user[0].password);
  console.log('Password verify:', match);
  
  await prisma.$disconnect();
}

main().catch(console.error);
