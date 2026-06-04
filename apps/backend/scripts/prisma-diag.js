const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Replicate server.js env loading
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const localEnvPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: true });
}

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
console.log('--- PRISMA DIAGNOSTICS ---');
console.log('URL:', databaseUrl.replace(/:[^:@]+@/, ':***@'));

const prismaClientPath = './prisma/generated/postgresql';
try {
    const { PrismaClient } = require(prismaClientPath);
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl
            }
        },
        log: ['info', 'query', 'warn', 'error']
    });

    async function run() {
        try {
            console.log('ðŸ”„ Attempting Prisma query...');
            const count = await prisma.company.count();
            console.log('âœ… Success! Company count:', count);
        } catch (e) {
            console.error('âŒ Prisma Error:', e.message);
            if (e.code) console.log('Error Code:', e.code);
            if (e.meta) console.log('Meta:', JSON.stringify(e.meta));
        } finally {
            await prisma.$disconnect();
        }
    }
    run();
} catch (e) {
    console.error('âŒ Failed to load Prisma Client:', e.message);
}

