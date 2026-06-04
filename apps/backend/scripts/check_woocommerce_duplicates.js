require('dotenv').config({ path: '.env.production' });
const { getSharedPrismaClientAsync, initializeSharedDatabase, closeSharedDatabase } = require('../services/sharedDatabase');

async function checkDuplicates() {
    console.log('🔍 Checking for duplicate WooCommerce Settings...');
    let prisma;

    try {
        await initializeSharedDatabase();
        prisma = await getSharedPrismaClientAsync();
        // Find companies with more than one WooCommerce setting
        const duplicates = await prisma.woocommerceSettings.groupBy({
            by: ['companyId'],
            _count: {
                id: true
            },
            having: {
                id: {
                    _count: {
                        gt: 1
                    }
                }
            }
        });

        console.log(`📊 Found ${duplicates.length} companies with duplicate settings.`);

        if (duplicates.length > 0) {
            console.log('⚠️ duplicate details:');
            for (const dup of duplicates) {
                console.log(`- Company ID: ${dup.companyId} (Count: ${dup._count.id})`);

                // Fetch detailed records for checking timestamps
                const records = await prisma.woocommerceSettings.findMany({
                    where: { companyId: dup.companyId },
                    orderBy: { updatedAt: 'desc' }
                });

                console.table(records.map(r => ({
                    id: r.id,
                    companyId: r.companyId,
                    storeUrl: r.storeUrl,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt
                })));
            }
        } else {
            console.log('✅ No duplicates found. Schema push should be safe (ignoring false positive warning).');
        }

    } catch (error) {
        console.error('❌ Error checking duplicates:', error);
    } finally {
        await closeSharedDatabase();
    }
}

checkDuplicates();
