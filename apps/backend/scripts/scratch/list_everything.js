require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    try {
        const companies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
                slug: true
            }
        });
        console.log('ALL COMPANIES:', JSON.stringify(companies, null, 2));

        const users = await prisma.user.findMany({
            select: {
                email: true,
                company: {
                    select: {
                        name: true
                    }
                }
            }
        });
        console.log('ALL USERS:', JSON.stringify(users, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);

