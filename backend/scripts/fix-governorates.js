const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { EGYPT_GOVERNORATES } = require('../services/wooCommerceStatusService');

async function fixExisting() {
    try {
        const prisma = getSharedPrismaClient();
        console.log('🔄 Starting governorate names fix...');

        let totalUpdated = 0;
        for (const [id, name] of Object.entries(EGYPT_GOVERNORATES)) {
            const result = await prisma.order.updateMany({
                where: {
                    OR: [
                        { governorate: id },
                        { governorate: id + ':' } // handle cases with trailing colons
                    ]
                },
                data: { governorate: name }
            });
            if (result.count > 0) {
                console.log(`✅ Updated ${result.count} orders for governorate: ${name}`);
                totalUpdated += result.count;
            }
        }

        console.log(`✨ Done! Total orders updated: ${totalUpdated}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing governorates:', error);
        process.exit(1);
    }
}

fixExisting();
