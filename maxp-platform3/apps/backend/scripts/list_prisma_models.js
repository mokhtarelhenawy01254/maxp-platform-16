
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function listModels() {
    try {
        const prisma = getSharedPrismaClient();
        const models = Object.keys(prisma).filter(k => k[0] !== '_' && typeof prisma[k] === 'object');
        console.log('Available Prisma Models:', models);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listModels();
