const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for "shrouk"...');

    // Try User table (Prisma model)
    const users = await prisma.user.findMany({
        where: {
            email: { contains: 'shrouk', mode: 'insensitive' }
        }
    });
    console.log('Users found (Prisma):', users.map(u => ({ id: u.id, email: u.email, companyId: u.companyId })));

    // Try Employee table
    const employees = await prisma.employee.findMany({
        where: {
            email: { contains: 'shrouk', mode: 'insensitive' }
        }
    });
    console.log('Employees found (Prisma):', employees.map(e => ({ id: e.id, email: e.email, companyId: e.companyId })));

    // Try to find m22 in Company
    const companies = await prisma.company.findMany({
        where: {
            OR: [
                { name: { contains: 'm22', mode: 'insensitive' } },
                { slug: { contains: 'm22', mode: 'insensitive' } }
            ]
        }
    });
    console.log('Companies found (Prisma):', companies);
}

main().catch(console.error).finally(() => prisma.$disconnect());
