const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
    try {
        const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
        console.log('Prisma Models:', models);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
