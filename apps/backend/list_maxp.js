process.env.DATABASE_URL = "postgresql://postgres:0165676135@localhost:5432/maxp";
process.env.POSTGRES_URL = "postgresql://postgres:0165676135@localhost:5432/maxp";

const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    try {
        const companies = await prisma.company.findMany({
            select: { id: true, name: true, slug: true }
        });
        console.log('COMPANIES in maxp:', JSON.stringify(companies, null, 2));

        const users = await prisma.user.findMany({
            select: { email: true, company: { select: { name: true } } }
        });
        console.log('USERS in maxp:', JSON.stringify(users, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
