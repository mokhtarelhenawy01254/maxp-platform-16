const { getSharedPrismaClient } = require('../services/sharedDatabase');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
    const prisma = getSharedPrismaClient();

    const tables = ['user', 'company', 'facebookPage', 'conversation', 'message', 'customer'];

    for (const table of tables) {
        try {
            const count = await prisma[table].count();
            console.log(`Count for ${table}: ${count}`);
        } catch (e) {
            console.log(`Error counting ${table}: ${e.message}`);
        }
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

