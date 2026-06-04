const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * 🗑️ إعادة ضبط بيانات WooCommerce (حذف الطلبات والمنتجات المستوردة)
 * POST /api/v1/woocommerce/reset
 */
const resetWooCommerceData = async (req, res) => {
    const companyId = req.user?.companyId;
    const { id, resetOrders, resetProducts, resetLogs, resetSettings } = req.body;

    if (!companyId) {
        return res.status(400).json({ success: false, message: 'Company ID is required' });
    }

    try {
        const prisma = getSharedPrismaClient();
        const results = {};
        let selectedSettings = null;

        if (id) {
            selectedSettings = await prisma.woocommerceSettings.findFirst({
                where: { id, companyId }
            });

            if (!selectedSettings) {
                return res.status(404).json({
                    success: false,
                    message: 'إعدادات WooCommerce المحددة غير موجودة'
                });
            }
        }

        // 1. حذف الطلبات المستوردة
        if (resetOrders) {
            const deletedOrders = await prisma.order.deleteMany({
                where: {
                    companyId,
                    wooCommerceId: { not: null }
                }
            });
            results.orders = deletedOrders.count;
        }

        // 2. حذف المنتجات المستوردة
        if (resetProducts) {
            const deletedProducts = await prisma.product.deleteMany({
                where: {
                    companyId,
                    wooCommerceId: { not: null }
                }
            });
            results.products = deletedProducts.count;
        }

        // 3. حذف سجلات المزامنة
        if (resetLogs) {
            const deletedLogs = await prisma.woocommerceSyncLog.deleteMany({
                where: { companyId }
            });
            results.logs = deletedLogs.count;
        }

        // 4. إعادة ضبط الإعدادات
        if (resetSettings) {
            const resetData = {
                lastSyncAt: null,
                lastSyncStatus: 'never',
                lastSyncMessage: 'Data reset performed',
                syncEnabled: false
            };

            if (selectedSettings) {
                await prisma.woocommerceSettings.update({
                    where: { id: selectedSettings.id },
                    data: resetData
                });
                results.settingsReset = 1;
                results.settingsResetTarget = selectedSettings.id;
            } else {
                const updatedSettings = await prisma.woocommerceSettings.updateMany({
                    where: { companyId },
                    data: resetData
                });
                results.settingsReset = updatedSettings.count;
            }
        }

        console.log(`🧹 [WOO-RESET] Company ${companyId} reset complete:`, results);

        return res.json({
            success: true,
            message: 'تمت عملية إعادة الضبط بنجاح',
            data: results
        });

    } catch (error) {
        console.error('❌ [WOO-RESET] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'فشل في عملية إعادة الضبط',
            error: error.message
        });
    }
};

module.exports = {
    resetWooCommerceData
};
