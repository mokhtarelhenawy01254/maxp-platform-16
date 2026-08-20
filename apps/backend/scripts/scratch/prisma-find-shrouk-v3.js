const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const databaseUrlLine = envContent.match(/DATABASE_URL="(.+)"/);
const databaseUrl = databaseUrlLine ? databaseUrlLine[1] : null;

console.log('Using DATABASE_URL:', databaseUrl ? 'YES' : 'NO');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl
        }
    }
});

async function main() {
    console.log('Searching for "shrouk"...');

    const users = await prisma.user.findMany({
        where: {
            email: { contains: 'shrouk', mode: 'insensitive' }
        }
    });
    console.log('Users found (Prisma):', users.map(u => ({ id: u.id, email: u.email, companyId: u.companyId })));

    const employees = await prisma.employee.findMany({
        where: {
            email: { contains: 'shrouk', mode: 'insensitive' }
        }
    });
    console.log('Employees found (Prisma):', employees.map(e => ({ id: e.id, email: e.email, companyId: e.companyId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
