const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initializeSharedDatabase, getSharedPrismaClient } = require('../services/sharedDatabase');

async function countUsers() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();
        const count = await prisma.user.count();
        console.log(`TOTAL_USERS_COUNT:${count}`);
    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        process.exit(0);
    }
}

countUsers();

