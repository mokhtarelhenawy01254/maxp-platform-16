const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
    const targetName = 'Swan EG';
    console.log(`🚀 Starting removal process for page: "${targetName}"...`);

    // 1. Find the page
    const pages = await prisma.facebookPage.findMany({
        where: {
            pageName: {
                contains: targetName,
                mode: 'insensitive'
            }
        }
    });

    if (pages.length === 0) {
        console.log(`❌ No pages found matching "${targetName}"`);
        return;
    }

    console.log(`✅ Found ${pages.length} potential matches:`);
    for (const page of pages) {
        console.log(`   - ID: ${page.id} | Name: ${page.pageName} | CompanyID: ${page.companyId}`);

        // 2. Perform deletion
        try {
            // Note: blocked_customers_on_page has onDelete: Cascade in prisma schema
            await prisma.facebookPage.delete({
                where: { id: page.id }
            });
            console.log(`      🗑️ Successfully deleted page ID: ${page.id}`);
        } catch (err) {
            console.error(`      ❌ Error deleting page ${page.id}:`, err.message);
        }
    }

    console.log('\n✨ Removal process completed.');
}

main()
    .catch(e => console.error('🔴 Fatal Error:', e))
    .finally(() => prisma.$disconnect());
