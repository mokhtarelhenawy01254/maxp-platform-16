require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function fixAffiliate() {
    const prisma = getSharedPrismaClient();
    try {
        const user = await prisma.user.findFirst({
            where: {
                email: 'mokhtar@mokhtar.mokhtar'
            },
            include: {
                affiliate: true
            }
        });

        if (!user) {
            console.log('User not found: mokhtar@mokhtar.mokhtar');
            return;
        }

        if (user.affiliate) {
            console.log('Affiliate profile ALREADY exists:', user.affiliate.id);
            return;
        }

        console.log(`Creating Affiliate profile for ${user.email}...`);

        const newAffiliate = await prisma.affiliate.create({
            data: {
                userId: user.id,
                companyId: user.companyId || 'cmlslt9jh0000uf5kta4e6t0l',
                affiliateCode: `AFF-${user.id.substring(0, 8).toUpperCase()}`,
                status: 'ACTIVE',
                commissionType: 'PERCENTAGE',
                commissionRate: 5
            }
        });

        console.log('Created Affiliate:', newAffiliate.id);

        // Now update all orders created by him to have this affiliateId
        const updateOrders = await prisma.order.updateMany({
            where: {
                createdBy: user.id,
                affiliateId: null
            },
            data: {
                affiliateId: newAffiliate.id,
                orderSource: 'AFFILIATE_DIRECT'
            }
        });

        console.log(`Updated ${updateOrders.count} orders with the new affiliateId.`);

    } catch (error) {
        console.error(error);
    } finally {
        if (prisma) await prisma.$disconnect();
    }
}

fixAffiliate();

