const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { createWooClient } = require('../services/wooCommerceClientService');
const { importSingleOrder } = require('../services/wooCommerceImportService');
const { mapWooStatusToLocal } = require('../services/wooCommerceStatusService');

/**
 * جلب عدد الطلبات الكلي من WooCommerce
 * POST /api/v1/woocommerce/orders/count
 */
const getOrdersCount = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.body;
        if (!companyId) return res.status(403).json({ success: false, message: 'غير مصرح' });

        const settings = await getSharedPrismaClient().woocommerceSettings.findFirst({
            where: id ? { id, companyId } : { companyId }
        });

        if (!settings) return res.status(400).json({ success: false, message: 'الإعدادات غير موجودة' });

        const wooClient = await createWooClient(settings);

        // Use the optimized header-based counting
        const response = await wooClient.get('/orders', { params: { per_page: 1 } });
        const totalOrders = parseInt(response.headers['x-wp-total'] || 0);

        res.json({
            success: true,
            data: { count: totalOrders }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب العدد', error: error.message });
    }
};

/**
 * جلب الطلبات من WooCommerce (للمعاينة)
 * POST /api/v1/woocommerce/orders/fetch
 */
const fetchOrdersFromWooCommerce = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { id, page = 1, per_page = 20, limit, status, search } = req.body;

        // Use limit if provided (from frontend) or fallback to per_page
        const finalPerPage = parseInt(limit || per_page);

        const settings = await getSharedPrismaClient().woocommerceSettings.findFirst({
            where: id ? { id, companyId } : { companyId }
        });

        if (!settings) return res.status(400).json({ success: false, message: 'الإعدادات غير موجودة' });

        const wooClient = await createWooClient(settings);

        const params = {
            page,
            per_page: finalPerPage,
            orderby: 'date',
            order: 'desc'
        };

        if (status && status !== 'any') params.status = status;
        if (search) params.search = search;

        const response = await wooClient.get('/orders', { params });

        // Check which orders are already imported
        const wooIds = response.data.map(o => String(o.id));
        const existingOrders = await getSharedPrismaClient().order.findMany({
            where: {
                companyId,
                wooCommerceId: { in: wooIds }
            },
            select: { wooCommerceId: true }
        });

        const existingIds = new Set(existingOrders.map(o => o.wooCommerceId));


        // Get status mapping for this company
        const statusMapping = settings.statusMapping ? JSON.parse(settings.statusMapping) : null;

        const orders = response.data.map(order => ({
            ...order,
            wooCommerceId: String(order.id),
            orderNumber: order.number || `#${order.id}`,
            customerName: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'عميل',
            total: parseFloat(order.total || 0),
            currency: order.currency || 'EGP',
            customerEmail: order.billing?.email || '',
            customerPhone: order.billing?.phone || '',
            wooCommerceDateCreated: order.date_created,
            wooCommerceStatus: order.status,
            localStatus: mapWooStatusToLocal(order.status, statusMapping), // 🆕 Calculate local status
            isImported: existingIds.has(String(order.id))
        }));

        res.json({
            success: true,
            data: { orders },
            total: parseInt(response.headers['x-wp-total'] || 0),
            totalPages: parseInt(response.headers['x-wp-totalpages'] || 0)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات', error: error.message });
    }
};

/**
 * استيراد الطلبات المحددة من WooCommerce
 * POST /api/v1/woocommerce/orders/import
 */
const importOrdersFromWooCommerce = async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { id, orders: wooOrders, duplicateAction = 'skip' } = req.body;

        if (!wooOrders || !Array.isArray(wooOrders)) {
            return res.status(400).json({ success: false, message: 'قائمة الطلبات مطلوبة' });
        }

        const settings = await getSharedPrismaClient().woocommerceSettings.findFirst({
            where: id ? { id, companyId } : { companyId }
        });

        const prisma = getSharedPrismaClient();
        const results = { imported: 0, updated: 0, skipped: 0, failed: 0 };

        for (const orderData of wooOrders) {
            try {
                const importResult = await importSingleOrder(prisma, companyId, orderData, {
                    duplicateAction,
                    statusMapping: settings?.statusMapping,
                    triggeredBy: 'user'
                });

                if (importResult.status === 'imported') results.imported++;
                else if (importResult.status === 'updated') results.updated++;
                else if (importResult.status === 'skipped') results.skipped++;
            } catch (error) {
                console.error(`Error importing order ${orderData.id}:`, error.message);
                results.failed++;
            }
        }

        res.json({
            success: true,
            message: `تمت المعالجة: ${results.imported} استيراد، ${results.updated} تحديث، ${results.failed} فشل`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في عملية الاستيراد', error: error.message });
    }
};

module.exports = {
    getOrdersCount,
    fetchOrdersFromWooCommerce,
    importOrdersFromWooCommerce
};
