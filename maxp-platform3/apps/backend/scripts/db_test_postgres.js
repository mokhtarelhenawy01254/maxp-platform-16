const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URL
        }
    }
});

async function main() {
    try {
        console.log('Connecting to:', process.env.POSTGRES_URL);
        await prisma.$connect();
        console.log('âœ… Connected to PostgreSQL successfully!');
        const count = await prisma.company.count();
        console.log(`ðŸ“Š Found ${count} companies.`);
    } catch (e) {
        console.error('âŒ DB Connection Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

