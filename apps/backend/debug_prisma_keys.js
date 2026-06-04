const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  try {
    const prisma = await getSharedPrismaClientAsync();
    console.log('--- Prisma Model Keys ---');
    const keys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
    console.log(keys.join(', '));
    
    // Check for Order specifically
    if (prisma.order) {
        console.log('✅ prisma.order EXISTS');
    } else {
        console.log('❌ prisma.order DOES NOT EXIST');
    }
  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    process.exit(0);
  }
}

main();
