/**
 * 🚀 Easy Order Import Service
 * Handles fetching and mapping orders from Easy Order API.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const axios = require('axios');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');

/**
 * Fetch orders from Easy Order API
 */
async function fetchOrdersFromEasyOrder(apiKey, options = {}) {
    const { page = 1, limit = 100 } = options;
    const apiUrl = 'https://api.easy-orders.net/api/v1/external-apps/orders';

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            params: {
                page,
                limit
            },
            timeout: 30000
        });

        return response.data; // Expected to be an array or { data, pagination }
    } catch (error) {
        console.error('❌ [EASY-ORDER-API] Error fetching orders:', error.message);
        throw error;
    }
}

/**
 * Map Easy Order data to local Order model
 */
function mapEasyOrderToLocal(orderData, companyId) {
    // Basic mapping based on usual Easy Order structure
    // Original date: created_at
    const createdAt = orderData.created_at ? new Date(orderData.created_at) : new Date();

    // Status handling: we'll use the status name/slug
    const sourceStatus = orderData.status?.name || orderData.status || 'pending';

    return {
        companyId,
        orderNumber: orderData.number || `EO-${orderData.id}`,
        customerName: orderData.customer?.name || orderData.shipping_name || 'عميل Easy Order',
        customerEmail: orderData.customer?.email || null,
        customerPhone: orderData.customer?.phone || orderData.shipping_phone || null,
        customerAddress: orderData.shipping_address || null,
        status: sourceStatus.toUpperCase(), // Will be normalized/mapped later
        paymentStatus: orderData.payment_status === 'paid' ? 'COMPLETED' : 'PENDING',
        paymentMethod: orderData.payment_method?.toUpperCase() || 'CASH',
        total: parseFloat(orderData.total_price || orderData.total || 0),
        subtotal: parseFloat(orderData.subtotal_price || orderData.subtotal || 0),
        shipping: parseFloat(orderData.shipping_price || orderData.shipping_total || 0),
        discount: parseFloat(orderData.discount_price || orderData.discount_total || 0),
        currency: orderData.currency || 'EGP',
        notes: orderData.notes || orderData.customer_notes || null,
        sourceType: 'easy-orders',
        extractionMethod: 'import',
        createdAt: createdAt, // Use original date as requested
        easyOrdersId: String(orderData.id),
        metadata: JSON.stringify(orderData)
    };
}

/**
 * Find or Create Order Status Config dynamically
 */
async function ensureStatusConfig(prisma, companyId, sourceStatus) {
    if (!sourceStatus) return 'PENDING';

    const statusCode = sourceStatus.toUpperCase().replace(/\s+/g, '_');

    // Check if exists
    const existing = await prisma.orderStatusConfig.findUnique({
        where: {
            companyId_code: {
                companyId,
                code: statusCode
            }
        }
    });

    if (existing) return existing.code;

    // Create new status config
    try {
        await prisma.orderStatusConfig.create({
            data: {
                companyId,
                code: statusCode,
                name: sourceStatus,
                statusType: 'order',
                source: 'easy-orders',
                color: '#3B82F6', // Default blue
                isActive: true
            }
        });
        console.log(`✅ [EASY-ORDER] Created new status config: ${statusCode}`);
        return statusCode;
    } catch (error) {
        console.error(`❌ [EASY-ORDER] Failed to create status config: ${statusCode}`, error.message);
        return 'PENDING';
    }
}

/**
 * Import a batch of orders
 */
async function importEasyOrdersBatch(prisma, companyId, orders, options = {}) {
    const stats = { imported: 0, updated: 0, skipped: 0, failed: 0 };

    for (const orderData of orders) {
        try {
            const eoId = String(orderData.id);

            // 1. Check if exists
            const existingOrder = await prisma.order.findFirst({
                where: {
                    companyId,
                    easyOrdersId: eoId
                }
            });

            if (existingOrder && options.duplicateAction !== 'update') {
                stats.skipped++;
                continue;
            }

            // 2. Map and Ensure Status
            const sourceStatus = orderData.status?.name || orderData.status;
            const localStatus = await ensureStatusConfig(prisma, companyId, sourceStatus);

            const mappedData = mapEasyOrderToLocal(orderData, companyId);
            mappedData.status = localStatus;

            // 3. Create or Update
            if (existingOrder) {
                // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): الاستيراد يعدّل بيانات الطلب
                // (المنتجات/الأسعار/العميل...). لو الحالة الحالية غير مسموح تعديل
                // بياناتها، نتخطى تحديث هذا الطلب.
                const { isOrderStatusEditingLocked } = require('../utils/orderStatusLock');
                if (await isOrderStatusEditingLocked(prisma, companyId, existingOrder.customStatusCode || existingOrder.status)) {
                    stats.failed++;
                    console.warn(`🔒 [EASY-ORDER] Order ${existingOrder.orderNumber} is in a locked status — skipping content update.`);
                    continue;
                }

                await prisma.order.update({
                    where: { id: existingOrder.id },
                    data: {
                        ...mappedData,
                        updatedAt: new Date()
                    }
                });
                stats.updated++;
            } else {
                const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
                if (!orderLimitCheck.allowed) {
                    stats.failed++;
                    continue;
                }

                const newOrder = await prisma.order.create({
                    data: mappedData
                });

                // 4. Create Items
                const items = orderData.items || orderData.line_items || [];
                for (const item of items) {
                    await prisma.orderItem.create({
                        data: {
                            orderId: newOrder.id,
                            productName: item.name || item.product_name,
                            productSku: item.sku || item.productSku || null,
                            productId: item.productId || null,
                            productColor: item.productColor ? String(item.productColor) : (item.color ? String(item.color) : null),
                            productSize: item.productSize != null ? String(item.productSize) : (item.size != null ? String(item.size) : null),
                            quantity: parseInt(item.quantity) || 0,
                            price: parseFloat(item.price) || 0,
                            total: parseFloat(item.total || (item.quantity * item.price) || 0),
                            extractionSource: 'easy-orders'
                        }
                    });
                }
                stats.imported++;
            }
        } catch (error) {
            console.error(`❌ [EASY-ORDER] Failed to import order ${orderData.id}:`, error.message);
            stats.failed++;
        }
    }

    return stats;
}

module.exports = {
    fetchOrdersFromEasyOrder,
    importEasyOrdersBatch,
    mapEasyOrderToLocal,
    ensureStatusConfig
};
