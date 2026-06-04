const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
console.log('DEBUG: DATABASE_URL exists:', !!process.env.DATABASE_URL);

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
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
