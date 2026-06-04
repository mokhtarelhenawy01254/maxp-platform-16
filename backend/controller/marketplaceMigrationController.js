const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * Export all marketplace configuration
 */
const exportMarketplace = async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();

        const [apps, bundles, pricingRules] = await Promise.all([
            prisma.marketplaceApp.findMany(),
            prisma.appBundle.findMany(),
            prisma.appPricingRule.findMany()
        ]);

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            apps,
            bundles,
            pricingRules
        };

        res.json({
            success: true,
            data: exportData
        });
    } catch (error) {
        console.error('❌ [EXPORT] Failed to export marketplace:', error);
        res.status(500).json({
            success: false,
            message: 'فشل تصدير بيانات المتجر',
            error: error.message
        });
    }
};

/**
 * Import marketplace configuration from JSON
 */
const importMarketplace = async (req, res) => {
    try {
        const { apps, bundles, pricingRules } = req.body;
        const prisma = getSharedPrismaClient();

        let importedApps = 0;
        let importedBundles = 0;
        let importedRules = 0;

        // 1. Import Apps
        if (apps && Array.isArray(apps)) {
            for (const app of apps) {
                const { id, createdAt, updatedAt, ...appData } = app;
                await executeWithRetry(async () => {
                    await prisma.marketplaceApp.upsert({
                        where: { slug: appData.slug },
                        update: { ...appData, updatedAt: new Date() },
                        create: { ...appData, id: id || undefined }
                    });
                    importedApps++;
                });
            }
        }

        // 2. Import Pricing Rules
        if (pricingRules && Array.isArray(pricingRules)) {
            for (const rule of pricingRules) {
                const { id, createdAt, updatedAt, ...ruleData } = rule;
                // Rules are linked to apps by appId. We assume app exists if we just imported it.
                await executeWithRetry(async () => {
                    // If we have an ID, we can try to upsert by ID.
                    if (id) {
                        await prisma.appPricingRule.upsert({
                            where: { id },
                            update: { ...ruleData, updatedAt: new Date() },
                            create: { ...ruleData, id }
                        });
                    } else {
                        // If no ID, we might create duplicates if we don't have a unique constraint.
                        // Usually it's better to use ID in export/import.
                        await prisma.appPricingRule.create({ data: ruleData });
                    }
                    importedRules++;
                });
            }
        }

        // 3. Import Bundles
        if (bundles && Array.isArray(bundles)) {
            for (const bundle of bundles) {
                const { id, createdAt, updatedAt, ...bundleData } = bundle;
                await executeWithRetry(async () => {
                    await prisma.appBundle.upsert({
                        where: { slug: bundleData.slug },
                        update: { ...bundleData, updatedAt: new Date() },
                        create: { ...bundleData, id: id || undefined }
                    });
                    importedBundles++;
                });
            }
        }

        res.json({
            success: true,
            message: `تم الاستيراد بنجاح: ${importedApps} تطبيق، ${importedBundles} باقة، ${importedRules} قاعدة تسعير`,
            data: {
                apps: importedApps,
                bundles: importedBundles,
                rules: importedRules
            }
        });
    } catch (error) {
        console.error('❌ [IMPORT] Failed to import marketplace:', error);
        res.status(500).json({
            success: false,
            message: 'فشل استيراد بيانات المتجر',
            error: error.message
        });
    }
};

module.exports = {
    exportMarketplace,
    importMarketplace
};
