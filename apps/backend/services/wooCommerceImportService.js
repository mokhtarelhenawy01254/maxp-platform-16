/**
 * 📦 WooCommerce Import Service
 * Centralized logic for importing orders from WooCommerce into the local database.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const {
    ensureWithinPlanLimit,
    createLimitExceededError,
} = require('../utils/planLimitPayloads');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone, safeCreateCustomer, buildPhoneWhere } = require('../utils/customerIdentity');

// Clear require cache to force reload
const statusServicePath = require.resolve('./wooCommerceStatusService');
delete require.cache[statusServicePath];

const { mapWooStatusToLocal, cleanLocationName } = require('./wooCommerceStatusService');

/**
 * Normalizes a SKU for case-insensitive, whitespace-insensitive matching.
 * Products can be stored untrimmed (import paths) or trimmed (productController),
 * and Postgres collation is case-sensitive — so we index both raw and normalized keys.
 */
function normalizeSku(value) {
    return String(value || '').trim().toLowerCase();
}

/** Builds the set of lookup variants for a SKU (raw, lower, upper). */
function skuLookupVariants(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return [];
    return Array.from(new Set([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase()].filter(Boolean)));
}

/**
 * Main function to import a single WooCommerce order.
 * Works with both raw WooCommerce objects and partially mapped objects.
 */
async function importSingleOrder(prisma, companyId, orderData, options = {}) {
    const { duplicateAction = 'skip', statusMapping = null, triggeredBy = 'system' } = options;

    // Normalize fields to handle both 'id' and 'wooCommerceId'
    const wooId = String(orderData.wooCommerceId || orderData.id);

    // 1. Check if the order already exists
    // Broaden search to include orderNumber to prevent unique constraint failures
    const orderNumber = orderData.orderNumber || `WOO-${wooId}`;

    const existingOrder = await prisma.order.findFirst({
        where: {
            companyId,
            OR: [
                { wooCommerceId: wooId },
                { orderNumber: orderNumber }
            ]
        },
        include: {
            orderItems: true
        }
    });

    if (existingOrder) {
        if (duplicateAction === 'update') {
            return await updateExistingOrder(prisma, existingOrder, orderData, companyId, statusMapping, triggeredBy);
        }
        return { status: 'skipped', order: existingOrder };
    }

    // 2. Map and Create New Order
    return await createNewOrder(prisma, companyId, orderData, statusMapping, triggeredBy);
}

/**
 * Optimized batch import function.
 * Pre-fetches all necessary data to minimize database roundtrips.
 */
async function importOrdersBatchOptimized(prisma, companyId, orders, options = {}) {
    const { duplicateAction = 'skip', statusMapping = null, triggeredBy = 'system' } = options;
    const stats = { imported: 0, updated: 0, skipped: 0, failed: 0 };

    if (!orders || !Array.isArray(orders) || orders.length === 0) return stats;

    // 1. Collect all unique identifiers to pre-fetch data
    const wooIds = new Set();
    const orderNumbers = new Set();
    const emails = new Set();
    const phones = new Set();
    const skus = new Set();
    const productWooIds = new Set();

    orders.forEach(order => {
        const id = String(order.id || order.wooCommerceId);
        wooIds.add(id);
        const orderNum = order.number || order.orderNumber || `WOO-${id}`;
        orderNumbers.add(orderNum);

        const billing = order.billing || {};
        if (billing.email) emails.add(billing.email.toLowerCase().trim());
        if (billing.phone) phones.add(billing.phone.trim());

        const items = order.line_items || order.items || [];
        items.forEach(item => {
            const sku = (item.sku || item.productSku || '').trim();
            if (sku) skus.add(sku);
            const pId = String(item.product_id || item.wooCommerceProductId || '');
            if (pId) productWooIds.add(pId);
        });
    });

    // 2. Pre-fetch everything in parallel
    const [existingOrders, existingCustomers, existingProducts, existingVariants] = await Promise.all([
        prisma.order.findMany({
            where: {
                companyId, OR: [
                    { wooCommerceId: { in: Array.from(wooIds) } },
                    { orderNumber: { in: Array.from(orderNumbers) } }
                ]
            },
            include: { orderItems: true }
        }),
        prisma.customer.findMany({
            where: {
                companyId, OR: [
                    { email: { in: Array.from(emails) } },
                    { phone: { in: Array.from(phones) } }
                ]
            }
        }),
        prisma.product.findMany({
            where: {
                companyId, OR: [
                    { sku: { in: Array.from(skus) } },
                    { wooCommerceId: { in: Array.from(productWooIds) } }
                ]
            }
        }),
        prisma.productVariant.findMany({
            where: {
                sku: { in: Array.from(skus) },
                product: { companyId }
            },
            include: { product: true }
        })
    ]);

    // 3. Create lookups for O(1) access
    const lookups = {
        orders: new Map(),
        customers: new Map(),
        products: new Map(),
        variants: new Map()
    };

    existingOrders.forEach(o => {
        if (o.wooCommerceId) lookups.orders.set(`ID-${o.wooCommerceId}`, o);
        if (o.orderNumber) lookups.orders.set(`NUM-${o.orderNumber}`, o);
    });

    existingCustomers.forEach(c => {
        if (c.email) lookups.customers.set(`EMAIL-${c.email.toLowerCase().trim()}`, c.id);
        if (c.phone) lookups.customers.set(`PHONE-${c.phone.trim()}`, c.id);
    });

    existingProducts.forEach(p => {
        if (p.sku) {
            lookups.products.set(`SKU-${p.sku}`, p);
            lookups.products.set(`SKU-NORM-${normalizeSku(p.sku)}`, p);
        }
        if (p.wooCommerceId) lookups.products.set(`WOO-${p.wooCommerceId}`, p);
    });

    existingVariants.forEach(v => {
        if (v.sku) {
            lookups.variants.set(`SKU-${v.sku}`, v);
            lookups.variants.set(`SKU-NORM-${normalizeSku(v.sku)}`, v);
        }
    });

    // 4. Process orders
    for (const orderData of orders) {
        try {
            const id = String(orderData.id || orderData.wooCommerceId);
            const orderNum = orderData.number || orderData.orderNumber || `WOO-${id}`;

            const existingOrder = lookups.orders.get(`ID-${id}`) || lookups.orders.get(`NUM-${orderNum}`);

            if (existingOrder) {
                if (duplicateAction === 'update') {
                    const result = await updateExistingOrder(prisma, existingOrder, orderData, companyId, statusMapping, triggeredBy);
                    if (result.status === 'updated') stats.updated++;
                } else {
                    stats.skipped++;
                }
                continue;
            }

            // Create New Order using optimized lookups
            const result = await createNewOrderOptimized(prisma, companyId, orderData, statusMapping, triggeredBy, lookups);
            if (result.status === 'imported' && result.order) {
                stats.imported++;
                // Update lookups for subsequent items in SAME batch to prevent duplicates
                const newOrder = result.order;
                if (newOrder.wooCommerceId) lookups.orders.set(`ID-${newOrder.wooCommerceId}`, newOrder);
                if (newOrder.orderNumber) lookups.orders.set(`NUM-${newOrder.orderNumber}`, newOrder);
            }

        } catch (error) {
            console.error(`❌ [WOO-BATCH] Error processing order ${orderData.id || orderData.wooCommerceId}:`, error.message);
            if (error.code === 'P2002') {
                console.error(`   详细: Unique constraint failure on fields: ${error.meta?.target || 'unknown'}`);
                console.error(`   Data in conflict: orderNumber=${orderData.number || orderData.orderNumber}, id=${orderData.id}`);
            } else {
                console.error(`   Full error detail:`, error);
            }
            stats.failed++;
        }
    }

    return stats;
}

/**
 * Handle creation of a new order using pre-fetched lookups
 */
async function createNewOrderOptimized(prisma, companyId, orderData, statusMapping, triggeredBy, lookups) {
    const billing = orderData.billing || {};
    const email = (orderData.customerEmail || billing.email || '').trim().toLowerCase();
    const phone = (orderData.customerPhone || billing.phone || '').trim();

    // 1. Find or create customer
    let customerId = (email && email.length > 3) ? lookups.customers.get(`EMAIL-${email}`) : null;
    if (!customerId && phone && phone.length > 5) {
        customerId = lookups.customers.get(`PHONE-${phone}`);
    }

    if (!customerId) {
        customerId = await findOrCreateCustomer(prisma, companyId, orderData);
        // Add to lookup for subsequent orders in the SAME batch
        if (email && email.length > 3) lookups.customers.set(`EMAIL-${email}`, customerId);
        if (phone && phone.length > 5) lookups.customers.set(`PHONE-${phone}`, customerId);
    }

    // 2. Map and Create
    const normalizedData = mapWooOrderToLocalModel(orderData, companyId, statusMapping);

    console.log('🔍 [DEBUG] normalizedData.status:', normalizedData.status, 'from wooStatus:', orderData.wooCommerceStatus || orderData.status);

    const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
    if (!orderLimitCheck.allowed) {
        throw createLimitExceededError(orderLimitCheck.payload);
    }

    const order = await prisma.order.create({
        data: {
            ...normalizedData,
            customerId,
            syncedFromWoo: true,
            lastSyncAt: new Date()
        }
    });

    // 3. Create items using lookups
    const lineItems = orderData.line_items || orderData.items || [];
    for (const item of lineItems) {
        const sku = (item.sku || item.productSku || '').trim();
        const wooPId = String(item.product_id || item.wooCommerceProductId || '');

        let product = lookups.products.get(`SKU-NORM-${normalizeSku(sku)}`)
            || lookups.products.get(`SKU-${sku}`)
            || lookups.products.get(`WOO-${wooPId}`);
        let variant = lookups.variants.get(`SKU-NORM-${normalizeSku(sku)}`)
            || lookups.variants.get(`SKU-${sku}`);

        const metaData = item.meta_data || [];
        let color = null;
        let size = null;
        const colorKeys = ['color', 'اللون', 'pa_color', 'pa_اللون'];
        const sizeKeys = ['size', 'المقاس', 'السعة', 'pa_size', 'pa_المقاس'];

        for (const meta of metaData) {
            const key = String(meta.key || '').toLowerCase();
            const value = meta.display_value || meta.value;
            if (colorKeys.some(k => key.includes(k))) color = value;
            else if (sizeKeys.some(k => key.includes(k))) size = value;
        }

        let cleanName = item.name || item.productName || 'منتج';
        if (cleanName.includes(' - ')) cleanName = cleanName.split(' - ')[0].trim();

        await prisma.orderItem.create({
            data: {
                orderId: order.id,
                productId: product ? product.id : null,
                variantId: variant ? variant.id : null,
                productName: cleanName,
                productColor: color ? String(color) : null,
                productSize: size != null ? String(size) : null,
                productSku: sku || null,
                quantity: parseInt(item.quantity) || 0,
                price: parseFloat(item.price) || 0,
                total: parseFloat(item.total) || 0,
                extractionSource: 'woocommerce'
            }
        });
    }

    await recordStatusHistory(prisma, order.id, order.status, null, triggeredBy, 'Imported from WooCommerce');
    return { status: 'imported', order };
}

/**
 * Handle creation of a new order and its components
 */
async function createNewOrder(prisma, companyId, orderData, statusMapping, triggeredBy) {
    const customerId = await findOrCreateCustomer(prisma, companyId, orderData);
    const normalizedData = mapWooOrderToLocalModel(orderData, companyId, statusMapping);

    const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
    if (!orderLimitCheck.allowed) {
        throw createLimitExceededError(orderLimitCheck.payload);
    }

    const order = await prisma.order.create({
        data: {
            ...normalizedData,
            customerId,
            syncedFromWoo: true,
            lastSyncAt: new Date()
        }
    });

    const lineItems = orderData.line_items || orderData.items || [];
    if (lineItems.length > 0) {
        await createOrderItems(prisma, companyId, order.id, lineItems);
    }

    await recordStatusHistory(prisma, order.id, order.status, null, triggeredBy, 'Imported from WooCommerce');
    return { status: 'imported', order };
}

/**
 * Handle updating an existing order
 */
async function updateExistingOrder(prisma, existingOrder, orderData, companyId, statusMapping, triggeredBy) {
    const normalizedData = mapWooOrderToLocalModel(orderData, companyId, statusMapping);

    // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): مزامنة Woo تعدّل بيانات الطلب
    // (المنتجات/الأسعار/العميل...). لو الحالة الحالية غير مسموح تعديل بياناتها،
    // نتخطى تحديث هذا الطلب.
    const { isOrderStatusEditingLocked } = require('../utils/orderStatusLock');
    if (await isOrderStatusEditingLocked(prisma, companyId, existingOrder.customStatusCode || existingOrder.status)) {
        console.warn(`🔒 [WOO-IMPORT] Order ${existingOrder.orderNumber} is in a locked status — skipping content update.`);
        return { status: 'skipped', order: existingOrder };
    }

    const hasStatusChanged = existingOrder.status !== normalizedData.status || existingOrder.wooCommerceStatus !== normalizedData.wooCommerceStatus;

    const updatedOrder = await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
            ...normalizedData,
            // 🛡️ PRODUCTION-FIX (custom-status-persist): لما السينك يغيّر حالة الطلب
            // امسح أي كود مخصص قديم — وإلا الطلب هيعرض الحالة المخصصة الميتة.
            ...(normalizedData.status && normalizedData.status !== existingOrder.status
                ? { customStatusCode: null }
                : {}),
            lastSyncAt: new Date()
        }
    });

    if (hasStatusChanged) {
        await recordStatusHistory(prisma, existingOrder.id, normalizedData.status, existingOrder.status, triggeredBy, 'Synced from WooCommerce');

        // 🚨 PRODUCTION-FIX (turbo-notification-gap): مزامنة Woo بتغيّر حالة الطلب تلقائياً
        // من غير زرار — كان بيكتب history بس من غير إشعار WhatsApp للعميل. نبعث الإشعار
        // بنفس منوال sendOrderStatusNotification + dedup (زي مسار الزرار اليدوي) من غير
        // ما نعتمد على updateOrderStatus (عشان منعملش history مكرر/تحديث مكرر).
        if (normalizedData.status) {
            try {
                const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');
                const isDup = await WhatsAppNotificationService.isDuplicateNotification({
                    companyId,
                    orderId: existingOrder.id,
                    eventType: normalizedData.status,
                });
                if (!isDup) {
                    const notificationOrder = {
                        ...existingOrder,
                        status: normalizedData.status,
                        customerPhone: existingOrder.customerPhone || existingOrder.customer?.phone,
                        customerName: existingOrder.customerName || existingOrder.customer?.firstName,
                    };
                    await WhatsAppNotificationService.sendOrderStatusNotification(notificationOrder, normalizedData.status);
                }
            } catch (notifErr) {
                console.warn(`⚠️ [WOO-IMPORT] WhatsApp status notification failed for ${existingOrder.orderNumber}:`, notifErr.message);
            }
        }
    }

    return { status: 'updated', order: updatedOrder };
}

/**
 * Record order status history
 */
async function recordStatusHistory(prisma, orderId, status, oldStatus, triggeredBy, reason) {
    try {
        await prisma.orderStatusHistory.create({
            data: {
                orderId,
                status,
                oldStatus,
                changedBy: triggeredBy === 'user' ? 'user' : 'system',
                userName: triggeredBy === 'user' ? 'User' : 'Woo Sync',
                reason,
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.warn(`⚠️ [WOO-IMPORT] Failed to record status history for order ${orderId}:`, error.message);
    }
}

/**
 * Find or create a customer
 */
async function findOrCreateCustomer(prisma, companyId, orderData) {
    const billing = orderData.billing || {};
    const email = (orderData.customerEmail || billing.email || '').trim().toLowerCase() || null;
    const phone = (orderData.customerPhone || billing.phone || '').trim() || null;
    const fullName = orderData.customerName || `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
    const nameParts = (fullName || 'عميل WooCommerce').split(' ');

    let customer = null;
    if (email) customer = await prisma.customer.findFirst({ where: { companyId, email } });
    if (!customer && phone) customer = await findCustomerByPhone(prisma, phone, companyId);
    if (customer) return customer.id;

    const newCustomer = await safeCreateCustomer(
      prisma,
      {
        data: {
          companyId,
          firstName: nameParts[0] || 'عميل',
          lastName: nameParts.slice(1).join(' ') || 'WooCommerce',
          email,
          phone,
          phoneNormalized: toCanonicalE164(phone),
          notes: 'مستورد من WooCommerce',
          status: 'ACTIVE'
        }
      },
      phone ? buildPhoneWhere(phone, companyId) : (email ? { companyId, email } : null)
    );
    return newCustomer.id;
}

/**
 * Create order items and link products/variants
 */
async function createOrderItems(prisma, companyId, orderId, lineItems) {
    for (const item of lineItems) {
        let product = null;
        let variant = null;
        const sku = (item.sku || item.productSku || '').trim();
        const wooProductId = String(item.product_id || item.wooCommerceProductId || '');

        if (sku) {
            variant = await prisma.productVariant.findFirst({
                where: { sku: { in: skuLookupVariants(sku) }, product: { companyId } },
                include: { product: true }
            });
            if (variant) product = variant.product;
            else product = await prisma.product.findFirst({
                where: { companyId, sku: { in: skuLookupVariants(sku) } }
            });
        }

        if (!product && wooProductId) {
            product = await prisma.product.findFirst({ where: { companyId, wooCommerceId: wooProductId } });
        }

        const metaData = item.meta_data || [];
        let color = null;
        let size = null;
        const colorKeys = ['color', 'اللون', 'pa_color', 'pa_اللون'];
        const sizeKeys = ['size', 'المقاس', 'السعة', 'pa_size', 'pa_المقاس'];

        for (const meta of metaData) {
            const key = String(meta.key || '').toLowerCase();
            const value = meta.display_value || meta.value;
            if (colorKeys.some(k => key.includes(k))) color = value;
            else if (sizeKeys.some(k => key.includes(k))) size = value;
        }

        let cleanName = item.name || item.productName || 'منتج';
        if (cleanName.includes(' - ')) cleanName = cleanName.split(' - ')[0].trim();

        await prisma.orderItem.create({
            data: {
                orderId,
                productId: product ? product.id : null,
                variantId: variant ? variant.id : null,
                productName: cleanName,
                productColor: color ? String(color) : null,
                productSize: size != null ? String(size) : null,
                productSku: sku || null,
                quantity: parseInt(item.quantity) || 0,
                price: parseFloat(item.price) || 0,
                total: parseFloat(item.total) || 0,
                extractionSource: 'woocommerce'
            }
        });
    }
}


function mapWooOrderToLocalModel(orderData, companyId, statusMapping) {
    const billing = orderData.billing || {};
    const shipping = orderData.shipping || {};

    let fullAddress = orderData.customerAddress;
    if (!fullAddress && (billing.address_1 || billing.city)) {
        fullAddress = [billing.address_1, billing.address_2, billing.city, billing.state, billing.country].filter(Boolean).join(', ');
    }

    let shippingAddressStr = orderData.shippingAddress;
    if (shipping && typeof shipping === 'object' && !shippingAddressStr) shippingAddressStr = JSON.stringify(shipping);

    const wooStatus = orderData.wooCommerceStatus || orderData.status;

    return {
        companyId,
        orderNumber: orderData.orderNumber || orderData.number || `WOO-${orderData.id || orderData.wooCommerceId}`,
        customerName: orderData.customerName || `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'عميل WooCommerce',
        customerEmail: orderData.customerEmail || billing.email || null,
        customerPhone: orderData.customerPhone || billing.phone || null,
        customerAddress: fullAddress || null,
        city: cleanLocationName(orderData.city || billing.city),
        governorate: cleanLocationName(orderData.governorate || billing.state),
        shippingAddress: shippingAddressStr || null,
        status: mapWooStatusToLocal(wooStatus, statusMapping),
        paymentStatus: (orderData.paymentStatus || (orderData.date_paid ? 'COMPLETED' : 'PENDING')),
        paymentMethod: mapPaymentMethod(orderData.paymentMethod || orderData.payment_method),
        subtotal: parseFloat(orderData.subtotal || (parseFloat(orderData.total || 0) - parseFloat(orderData.shipping_total || 0))) || 0,
        shipping: parseFloat(orderData.shipping_total || orderData.shipping || 0) || 0,
        discount: parseFloat(orderData.discount_total || orderData.discount || 0) || 0,
        total: parseFloat(orderData.total) || 0,
        currency: orderData.currency || 'EGP',
        notes: orderData.notes || orderData.customer_note || null,
        sourceType: 'woocommerce',
        extractionMethod: 'import',
        orderSource: 'REGULAR',
        wooCommerceId: String(orderData.wooCommerceId || orderData.id),
        wooCommerceOrderKey: orderData.wooCommerceOrderKey || orderData.order_key,
        wooCommerceStatus: wooStatus,
        wooCommerceDateCreated: orderData.wooCommerceDateCreated ? new Date(orderData.wooCommerceDateCreated) : (orderData.date_created ? new Date(orderData.date_created) : null),
        createdAt: orderData.wooCommerceDateCreated ? new Date(orderData.wooCommerceDateCreated) : (orderData.date_created ? new Date(orderData.date_created) : new Date()),
    };
}

function mapPaymentMethod(wooMethod) {
    const source = String(wooMethod || '').toLowerCase();
    if (source.includes('cod') || source.includes('cash')) return 'CASH';
    if (source.includes('bank') || source.includes('bacs')) return 'BANK_TRANSFER';
    if (source.includes('paypal')) return 'PAYPAL';
    if (source.includes('stripe') || source.includes('card')) return 'CREDIT_CARD';
    return 'CASH';
}

module.exports = {
    importSingleOrder,
    importOrdersBatchOptimized,
    mapWooOrderToLocalModel
};
