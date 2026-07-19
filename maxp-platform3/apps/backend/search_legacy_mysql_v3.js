const { PrismaClient } = require('./legacy_mysql/generated/mysql_fixed');

// Hardcoded for testing
const DATABASE_URL = 'mysql://u339372869_test2:0165676135Aa%40A@92.113.22.70:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci&connect_timeout=120';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL
        }
    }
});

async function main() {
    try {
        console.log('🔍 Searching in Legacy MySQL (Hardcoded URL)...');

        // Search for company m22
        const companies = await prisma.company.findMany({
            where: {
                OR: [
                    { name: { contains: 'm22' } },
                    { slug: { contains: 'm22' } }
                ]
            }
        });
        console.log('Found companies:', companies);

        // Search for user shrouk9
        const users = await prisma.user.findMany({
            where: {
                email: 'shrouk9@gmail.com'
            }
        });
        console.log('Found users:', users);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
