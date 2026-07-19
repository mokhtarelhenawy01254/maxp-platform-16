const path = require('path');
const prismaPath = path.join(__dirname, 'prisma', 'generated', 'postgresql');
console.log('🔍 Checking Prisma Client at:', prismaPath);

try {
    const { PrismaClient } = require(prismaPath);
    const prisma = new PrismaClient();
    const models = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
    console.log('✅ Models found:', models.length);
    console.log('📋 Model list:', models.sort().join(', '));
    process.exit(0);
} catch (error) {
    console.error('❌ Error loading Prisma client:', error.message);
    process.exit(1);
}
