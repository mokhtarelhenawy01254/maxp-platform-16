require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    try {
        const companies = await prisma.company.findMany({
            select: { id: true, name: true, slug: true, email: true },
            orderBy: { createdAt: 'asc' }
        });
        console.log('All Companies:');
        companies.forEach(c => {
            console.log(`  ID: ${c.id} | Name: "${c.name}" | Slug: "${c.slug}" | Email: ${c.email}`);
        });
        console.log(`\nTotal: ${companies.length} companies`);
    } catch (e) {
        console.error(e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
