const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { initializeSharedDatabase, getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugDb() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log('\n--- TABLES ---');
        const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log(JSON.stringify(tables, null, 2));

        const checkUsers = tables.find(t => t.table_name === 'users');
        if (checkUsers) {
            console.log('\n--- USERS COUNT ---');
            const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
            console.log('Count:', countResult[0].count.toString());

            if (countResult[0].count > 0) {
                console.log('\n--- FIRST USER ---');
                const firstUser = await prisma.$queryRaw`SELECT email, role FROM users LIMIT 1`;
                console.log(JSON.stringify(firstUser, null, 2));
            }
        }

        const checkCompanies = tables.find(t => t.table_name === 'companies');
        if (checkCompanies) {
            console.log('\n--- COMPANIES COUNT ---');
            const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM companies`;
            console.log('Count:', countResult[0].count.toString());
        }

    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        process.exit(0);
    }
}

debugDb();

