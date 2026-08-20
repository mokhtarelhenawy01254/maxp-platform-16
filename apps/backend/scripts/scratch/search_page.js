const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Searching for page: Swan EG...');
    const pages = await prisma.facebookPage.findMany({
        where: {
            pageName: {
                contains: 'Swan EG',
                mode: 'insensitive'
            }
        },
        include: {
            company: {
                select: {
                    name: true,
                    id: true
                }
            }
        }
    });

    if (pages.length === 0) {
        console.log('❌ No pages found matching "Swan EG"');
    } else {
        console.log(`✅ Found ${pages.length} pages:`);
        pages.forEach(p => {
            console.log(`- ID: ${p.id} | Page ID: ${p.pageId} | Name: ${p.pageName} | Company: ${p.company?.name || 'N/A'} (${p.companyId})`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
