const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');

async function debugProvisioning() {
    const prisma = await getSharedPrismaClientAsync();
    const companyId = `debug_${Date.now()}`;

    try {
        // Create test company
        const company = await prisma.company.create({
            data: {
                id: companyId,
                name: `Debug Store ${Date.now()}`,
                slug: `debug-store-${Date.now()}`,
                email: `debug_${Date.now()}@test.com`,
                plan: 'BASIC',
                isActive: true
            }
        });
        console.log('✅ Company created:', company.id);

        await tenantContext.run(company.id, async () => {
            // Test 1: StorefrontSettings
            try {
                await prisma.storefrontSettings.upsert({
                    where: { companyId: company.id },
                    update: { designTokens: { test: true } },
                    create: { companyId: company.id, designTokens: { test: true } }
                });
                console.log('✅ StorefrontSettings: OK');
            } catch (e) {
                console.error('❌ StorefrontSettings error:', e.message.substring(0, 200));
            }

            // Test 2: StorePage - shipping
            try {
                await prisma.storePage.upsert({
                    where: { companyId_slug: { companyId: company.id, slug: 'shipping-policy' } },
                    update: { content: '<p>test</p>', title: 'Shipping', isActive: true, showInFooter: true },
                    create: { companyId: company.id, slug: 'shipping-policy', content: '<p>test</p>', title: 'Shipping', pageType: 'SHIPPING_POLICY', order: 1, showInFooter: true, isActive: true }
                });
                console.log('✅ StorePage shipping-policy: OK');
            } catch (e) {
                console.error('❌ StorePage shipping error:', e.message.substring(0, 300));
            }

            // Test 3: MarketplaceApp query
            try {
                const apps = await prisma.marketplaceApp.findMany({
                    where: { isAutoInstall: true, isActive: true }
                });
                console.log(`✅ MarketplaceApp query: OK (found ${apps.length} apps)`);
            } catch (e) {
                console.error('❌ MarketplaceApp error:', e.message.substring(0, 300));
            }
        });

        // Cleanup
        await prisma.company.delete({ where: { id: company.id } });
        console.log('🧹 Cleanup done');
        process.exit(0);
    } catch (e) {
        console.error('❌ Fatal error:', e.message.substring(0, 300));
        process.exit(1);
    }
}

debugProvisioning();
