const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getWooCommerceAutoExportService } = require('./wooCommerceAutoExportService');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');

/**
 * InternalSyncService
 * Handles automated data synchronization between connected companies.
 */
class InternalSyncService {
    constructor() {
        this.prisma = getSharedPrismaClient();
    }

    _safeParseJson(value) {
        if (value == null) return null;
        if (typeof value === 'object') return value;
        try {
            return JSON.parse(value);
        } catch (e) {
            return null;
        }
    }

    _looseEquals(a, b) {
        if (a === b) return true;
        return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
    }

    /**
     * Builds Prisma Customer upsert args preferring phone/whatsapp identity and
     * falling back to facebookId so synced orders never create a customer with
     * a null identity key (which previously lost customer contact data).
     */
    buildSyncedCustomerUpsertArgs(customer, companyId) {
        const firstName = customer?.firstName || '';
        const lastName = customer?.lastName || '';
        const email = customer?.email || null;
        const phone = customer?.phone || null;
        const whatsappId = customer?.whatsappId || customer?.phone || null;
        const facebookId = customer?.facebookId || null;

        const update = { firstName, lastName, email, phone, facebookId };

        if (whatsappId) {
            return {
                where: { whatsappId_companyId: { whatsappId, companyId } },
                update,
                create: { firstName, lastName, email, phone, whatsappId, facebookId, companyId, status: 'ACTIVE' }
            };
        }

        if (facebookId) {
            return {
                where: { facebookId_companyId: { facebookId, companyId } },
                update,
                create: { firstName, lastName, email, phone, whatsappId: null, facebookId, companyId, status: 'ACTIVE' }
            };
        }

        return {
            where: { whatsappId_companyId: { whatsappId: null, companyId } },
            update,
            create: { firstName, lastName, email, phone, whatsappId: null, facebookId: null, companyId, status: 'ACTIVE' }
        };
    }

    /**
     * Extracts normalized variant (color/size/variantId/image) from an order item.
     * Works for both regular OrderItem rows and storefront GuestOrder JSON items.
     */
    _extractItemVariant(item) {
        if (!item) return { productColor: null, productSize: null, variantId: null, productImage: null };

        const metadata = this._safeParseJson(item.metadata) || {};
        const attributes = this._safeParseJson(item.attributes) || {};
        const variant = (item.variant && typeof item.variant === 'object') ? item.variant : (metadata.variant || {});
        const attributeValues = metadata.attributeValues || {};

        const rawColor = item.productColor
            || item.color
            || item.colour
            || item['اللون']
            || metadata.productColor
            || metadata.color
            || metadata.colour
            || metadata['اللون']
            || attributes.color
            || attributes.colour
            || attributes['اللون']
            || attributeValues.color
            || attributeValues.colour
            || attributeValues['اللون']
            || variant.color
            || variant.colour
            || variant['اللون']
            || null;

        const rawSize = item.productSize != null
            ? item.productSize
            : item.size != null
            ? item.size
            : item['المقاس'] != null
            ? item['المقاس']
            : metadata.productSize != null
            ? metadata.productSize
            : metadata.size != null
            ? metadata.size
            : metadata['المقاس'] != null
            ? metadata['المقاس']
            : attributes.size != null
            ? attributes.size
            : attributes['المقاس'] != null
            ? attributes['المقاس']
            : attributeValues.size != null
            ? attributeValues.size
            : attributeValues['المقاس'] != null
            ? attributeValues['المقاس']
            : variant.size != null
            ? variant.size
            : variant['المقاس'] != null
            ? variant['المقاس']
            : null;

        return {
            productColor: rawColor != null && String(rawColor).trim() !== '' ? String(rawColor).trim() : null,
            productSize: rawSize != null && String(rawSize).trim() !== '' ? String(rawSize).trim() : null,
            variantId: item.variantId || variant.id || metadata.variantId || null,
            productImage: item.productImage || item.image || variant.image || metadata.image || null
        };
    }

    /**
     * Matches a provider product variant for a synced order item using its
     * extracted color/size (metadata attributeValues first, then variant name).
     * Returns the provider-side variant so order items get the correct FK.
     */
    findMatchingProviderVariantForOrderItem(item, product) {
        if (!item || !product || !Array.isArray(product.productVariants)) return null;

        const targetColor = (item.productColor || '').toString().trim();
        const targetSize = (item.productSize != null ? String(item.productSize) : '').trim();

        let bestMatch = null;
        let bestScore = 0;

        for (const variant of product.productVariants) {
            const metadata = this._safeParseJson(variant.metadata) || {};
            const attributeValues = metadata.attributeValues || {};

            const vColor = String(
                attributeValues['اللون'] || attributeValues.color || attributeValues.colour || variant.color || ''
            ).trim();
            const vSize = String(
                attributeValues['المقاس'] != null ? attributeValues['المقاس']
                : attributeValues.size != null ? attributeValues.size
                : variant.size != null ? variant.size
                : ''
            ).trim();

            let score = 0;
            if (targetColor && vColor && this._looseEquals(targetColor, vColor)) score += 2;
            if (targetSize && vSize && this._looseEquals(targetSize, vSize)) score += 2;

            if (score === 0 && variant.name) {
                const parts = String(variant.name).split(/\s*[-–|]\s*/).map(p => p.trim()).filter(Boolean);
                for (const part of parts) {
                    if (targetColor && this._looseEquals(targetColor, part)) score += 1;
                    if (targetSize && this._looseEquals(targetSize, part)) score += 1;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = variant;
            }
        }

        return bestScore > 0 ? bestMatch : null;
    }

    _extractPrimaryImage(product) {
        if (!product || !product.images) return null;
        let images = product.images;
        if (typeof images === 'string') {
            try {
                images = images.trim().startsWith('[') ? JSON.parse(images) : images.split(',');
            } catch (e) {
                images = [];
            }
        }
        if (Array.isArray(images) && images.length > 0) {
            const first = String(images[0]).trim();
            return first || null;
        }
        return null;
    }

    /**
     * Synchronize product updates to all consumer companies.
     * Called when a provider updates a product.
     * 
     * @param {string} productId - The original product ID (Provider's side)
     * @param {string} providerId - The provider company ID
     * @param {object} updateData - The data that was updated
     */
    async syncProductUpdate(productId, providerId, updateData) {
        try {
            console.log(`🔄 [INTERNAL-SYNC] Syncing product update for ${productId} from provider ${providerId}`);

            // 1. Find all active connections where this company is the provider
            const connections = await this.prisma.companyConnection.findMany({
                where: {
                    providerId,
                    status: 'ACTIVE',
                    allowProductPull: true
                }
            });

            if (connections.length === 0) return;

            // 2. Extract safe fields for synchronization
            const syncableFields = [
                'name', 'description', 'price', 'comparePrice', 'cost',
                'stock', 'images', 'tags', 'weight', 'dimensions', 'isActive'
            ];

            const filteredData = {};
            syncableFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

            if (Object.keys(filteredData).length === 0) return;

            // 3. Update all instances of this product in consumer companies
            const updatePromises = connections.map(async (conn) => {
                try {
                    // Find product in consumer company that was imported from this original product
                    const importedProduct = await this.prisma.product.findFirst({
                        where: {
                            companyId: conn.consumerId,
                            source: 'internal',
                            externalId: productId
                        }
                    });

                    if (importedProduct) {
                        await this.prisma.product.update({
                            where: { id: importedProduct.id },
                            data: filteredData
                        });
                        console.log(`✅ [INTERNAL-SYNC] Updated product in consumer company ${conn.consumerId}`);
                    }
                } catch (err) {
                    console.error(`❌ [INTERNAL-SYNC] Failed to update product for consumer ${conn.consumerId}:`, err.message);
                }
            });

            await Promise.all(updatePromises);

        } catch (error) {
            console.error('❌ [INTERNAL-SYNC] Error in syncProductUpdate:', error);
        }
    }

    /**
     * Pushes a new order to the consumer company.
     * This handles pushing updates or status changes FROM provider TO consumer.
     */
    async pushOrderToConsumer(orderId, providerId, consumerId) {
        try {
            console.log(`🚀 [INTERNAL-SYNC] Attempting to push order ${orderId} from provider ${providerId} to consumer ${consumerId}`);
            const tenantContext = require('./tenantContext');

            // 1. Fetch order in Provider Context
            const order = await tenantContext.run(providerId, async () => {
                return await this.prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        customer: true,
                        orderItems: {
                            include: {
                                product: true
                            }
                        }
                    }
                });
            });

            if (!order) {
                console.log(`❌ [INTERNAL-SYNC] Order ${orderId} not found in provider context.`);
                return;
            }

            // 2. Map Customer and items and create order in Consumer Context
            const created = await tenantContext.run(consumerId, async () => {
                const orderLimitCheck = await ensureWithinPlanLimit(consumerId, 'orders', 1);
                if (!orderLimitCheck.allowed) {
                    console.warn(
                        `⚠️ [INTERNAL-SYNC] Skipping consumer order push for ${consumerId}: ${orderLimitCheck.payload?.message || 'Plan limit reached'}`
                    );
                    return false;
                }

                // Handle Customer
                let localCustomerId = null;
                if (order.customer) {
                    const customer = await this.prisma.customer.upsert(
                        this.buildSyncedCustomerUpsertArgs(order.customer, consumerId)
                    );
                    localCustomerId = customer.id;
                }

                // Handle Order Items
                const localOrderItems = [];
                for (const item of order.orderItems) {
                    const localProduct = await this.prisma.product.findFirst({
                        where: {
                            companyId: consumerId,
                            externalId: item.productId,
                            source: 'internal'
                        }
                    });

                    const variantData = this._extractItemVariant(item);

                    localOrderItems.push({
                        productId: localProduct ? localProduct.id : null,
                        productName: item.productName || item.product?.name || null,
                        productSku: item.productSku || item.product?.sku || null,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.total,
                        ...variantData,
                        metadata: JSON.stringify({
                            originalProductName: item.product?.name,
                            originalProductId: item.productId,
                            pushedFrom: providerId,
                            variantId: variantData.variantId,
                            productColor: variantData.productColor,
                            productSize: variantData.productSize
                        })
                    });
                }

                // Create Order
                await this.prisma.order.create({
                    data: {
                        orderNumber: `${order.orderNumber}-PUSH`,
                        customerId: localCustomerId,
                        companyId: consumerId,
                        subtotal: order.subtotal,
                        shipping: order.shipping,
                        total: order.total,
                        status: 'PENDING',
                        paymentStatus: order.paymentStatus,
                        paymentMethod: order.paymentMethod,
                        shippingAddress: order.shippingAddress,
                        notes: `طلب تم دفعه تلقائياً من المورد ${providerId}. رقم الطلب الأصلي: ${order.orderNumber}`,
                        orderSource: 'internal_import',
                        externalId: orderId,
                        orderItems: {
                            create: localOrderItems
                        }
                    }
                });

                return true;
            });

            if (!created) {
                return;
            }

            console.log(`✅ [INTERNAL-SYNC] Order ${orderId} successfully pushed to consumer ${consumerId}`);

        } catch (error) {
            console.error('❌ [INTERNAL-SYNC] Error in pushOrderToConsumer:', error);
        }
    }

    /**
     * Pushes a new order from a consumer company to its provider(s)
     * This handles both regular Orders and GuestOrders
     */
    async pushOrderToProvider(orderId, consumerId) {
        try {
            console.log(`🚀 [INTERNAL-SYNC] Initiating push for order ${orderId} (Consumer: ${consumerId})`);
            const tenantContext = require('./tenantContext');

            // 1. Fetch details in Consumer Context
            const result = await tenantContext.run(consumerId, async () => {
                // Try regular Order first
                let order = await this.prisma.order.findUnique({
                    where: { id: orderId },
                    include: {
                        customer: true,
                        orderItems: {
                            include: {
                                product: true
                            }
                        }
                    }
                });

                let isGuestOrder = false;

                // If not found, try GuestOrder
                if (!order) {
                    const guestOrder = await this.prisma.guestOrder.findUnique({
                        where: { id: orderId }
                    });

                    if (guestOrder) {
                        isGuestOrder = true;
                        // Normalize GuestOrder
                        let items = [];
                        try {
                            items = typeof guestOrder.items === 'string' ? JSON.parse(guestOrder.items) : (guestOrder.items || []);
                        } catch (e) { items = []; }

                        const normalizedItems = [];
                        for (const item of items) {
                            const searchProductId = item.productId || item.id;
                            // Search for local product in consumer context
                            const localProduct = await this.prisma.product.findUnique({
                                where: { id: searchProductId }
                            });

                            normalizedItems.push({
                                productId: localProduct ? localProduct.id : searchProductId,
                                product: localProduct,
                                productName: item.name || item.productName,
                                quantity: item.quantity,
                                price: item.price,
                                total: (item.price * item.quantity),
                                ...this._extractItemVariant(item)
                            });
                        }

                        order = {
                            id: guestOrder.id,
                            orderNumber: guestOrder.orderNumber,
                            customer: {
                                firstName: guestOrder.guestName,
                                lastName: '',
                                phone: guestOrder.guestPhone,
                                whatsappId: guestOrder.guestPhone,
                                email: guestOrder.guestEmail
                            },
                            orderItems: normalizedItems,
                            paymentMethod: guestOrder.paymentMethod,
                            shippingAddress: guestOrder.shippingAddress
                        };
                    }
                }

                if (!order) {
                    console.log(`❌ [INTERNAL-SYNC] Order/GuestOrder ${orderId} not found in consumer context.`);
                    return null;
                }

                // Find all active connections for this consumer
                const connections = await this.prisma.companyConnection.findMany({
                    where: { consumerId, status: 'ACTIVE' }
                });

                return { order, connections, isGuestOrder };
            });

            if (!result || result.connections.length === 0) {
                if (result && result.connections.length === 0) {
                    console.log(`ℹ️ [INTERNAL-SYNC] No active connections for consumer ${consumerId}. Skipping push.`);
                }
                return;
            }

            const { order, connections, isGuestOrder } = result;
            console.log(`🔍 [INTERNAL-SYNC] Found ${isGuestOrder ? 'GuestOrder' : 'Order'} ${order.orderNumber} with ${order.orderItems.length} items`);

            // 2. Identify which items belong to which provider
            const providerItemsMap = new Map();

            for (const item of order.orderItems) {
                if (item.product && item.product.source === 'internal' && item.product.externalId) {
                    // Find which provider this belongs to by switching context to each connected provider
                    for (const conn of connections) {
                        const originalProduct = await tenantContext.run(conn.providerId, async () => {
                            return await this.prisma.product.findUnique({
                                where: { id: item.product.externalId }
                            });
                        });

                        if (originalProduct) {
                            console.log(`     ✅ Original product found in provider company ${conn.providerId}`);
                            if (!providerItemsMap.has(conn.providerId)) {
                                providerItemsMap.set(conn.providerId, []);
                            }
                            providerItemsMap.get(conn.providerId).push({
                                originalProduct,
                                quantity: item.quantity,
                                price: item.price,
                                total: item.total,
                                ...this._extractItemVariant(item)
                            });
                            break; // Found the provider for this item
                        }
                    }
                }
            }

            if (providerItemsMap.size === 0) {
                console.log(`ℹ️ [INTERNAL-SYNC] No imported items found in order ${orderId}. Skipping push.`);
                return;
            }

            // 3. For each provider, create a corresponding order
            for (const [providerId, items] of providerItemsMap) {
                await tenantContext.run(providerId, async () => {
                    try {
                        console.log(`📦 [INTERNAL-SYNC] Pushing subset of order ${orderId} to provider ${providerId}`);

                        // Check if order was already pushed (dedup)
                        const alreadyPushed = await this.prisma.order.findFirst({
                            where: { externalId: orderId, sourceType: 'internal_push', companyId: providerId }
                        });
                        if (alreadyPushed) {
                            console.log(`ℹ️ [INTERNAL-SYNC] Order ${orderId} already pushed as ${alreadyPushed.orderNumber}, skipping`);
                            return;
                        }

                        const affiliateService = require('./affiliateService');
                        const affiliate = await affiliateService.getOrCreateAffiliateForCompany(providerId, consumerId);

                        const orderLimitCheck = await ensureWithinPlanLimit(providerId, 'orders', 1);
                        if (!orderLimitCheck.allowed) {
                            console.warn(
                                `⚠️ [INTERNAL-SYNC] Skipping provider order push for ${providerId}: ${orderLimitCheck.payload?.message || 'Plan limit reached'}`
                            );
                            return;
                        }

                        let providerCustomerId = null;
                        let providerCustomerPhone = order.customer?.phone || null;
                        let providerCustomerName = null;
                        if (order.customer) {
                            const customer = await this.prisma.customer.upsert(
                                this.buildSyncedCustomerUpsertArgs(order.customer, providerId)
                            );
                            providerCustomerId = customer.id;
                            providerCustomerPhone = order.customer.phone || providerCustomerPhone;
                            providerCustomerName = [order.customer.firstName, order.customer.lastName]
                                .filter(Boolean).join(' ') || null;
                        }

                        const subtotal = items.reduce((acc, curr) => acc + Number(curr.total), 0);
                        const shipping = 0;

                        // Parse shipping address from original order
                        let parsedAddress = {};
                        try {
                            if (typeof order.shippingAddress === 'string') {
                                parsedAddress = JSON.parse(order.shippingAddress);
                            } else if (typeof order.shippingAddress === 'object' && order.shippingAddress !== null) {
                                parsedAddress = order.shippingAddress;
                            }
                        } catch (e) {
                            parsedAddress = {};
                        }

                        const orderService = require('./orderService');
                        const orderNumber = await orderService.generateOrderNumber(providerId);

                        const providerOrder = await this.prisma.order.create({
                            data: {
                                orderNumber: `${orderNumber}-AFF-${consumerId.slice(-4)}`,
                                customerId: providerCustomerId,
                                customerPhone: providerCustomerPhone,
                                customerName: providerCustomerName,
                                companyId: providerId,
                                affiliateId: affiliate.id,
                                orderSource: 'AFFILIATE_DIRECT',
                                subtotal,
                                shipping,
                                total: subtotal + shipping,
                                status: 'PENDING',
                                paymentStatus: 'PENDING',
                                paymentMethod: order.paymentMethod,
                                shippingAddress: order.shippingAddress,
                                governorate: parsedAddress.governorate || order.governorate || null,
                                city: parsedAddress.city || parsedAddress.area || order.city || null,
                                customerAddress: parsedAddress.address || order.customerAddress || null,
                                notes: `طلب آلي من متجر أفليت (شركة: ${consumerId}). كود المسوق: ${affiliate.affiliateCode}. رقم الطلب الأصلي: ${order.orderNumber}`,
                                sourceType: 'internal_push',
                                externalId: orderId,
                                orderItems: {
                                    create: items.map(it => {
                                        const matchedVariant = this.findMatchingProviderVariantForOrderItem(
                                            { productColor: it.productColor, productSize: it.productSize },
                                            it.originalProduct
                                        );
                                        return {
                                            productId: it.originalProduct.id,
                                            productName: it.originalProduct.name || null,
                                            productSku: it.originalProduct.sku || null,
                                            quantity: it.quantity,
                                            price: it.price,
                                            total: it.total,
                                            basePrice: it.originalProduct.price,
                                            merchantPrice: it.originalProduct.cost,
                                            productColor: it.productColor || null,
                                            productSize: it.productSize || null,
                                            variantId: matchedVariant ? matchedVariant.id : null,
                                            productImage: it.productImage || this._extractPrimaryImage(it.originalProduct) || null
                                        };
                                    })
                                }
                            }
                        });

                        const commissionService = require('./commissionService');
                        await commissionService.calculateCommissions(providerOrder.id);

                        console.log(`✅ [INTERNAL-SYNC] Successfully pushed order segment to provider ${providerId}. Provider Order: ${providerOrder.orderNumber}`);

                        // 📱 إرسال إشعار WhatsApp تلقائي للطلب الجديد (طلبات الأفليت)
                        // 🚨 كان مفقوداً بالكامل — طلبات internal_push وصلت بدون أي إشعار للعميل
                        try {
                            const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');

                            const orderForNotification = {
                                id: providerOrder.id,
                                orderNumber: providerOrder.orderNumber,
                                companyId: providerId,
                                customerPhone: providerCustomerPhone,
                                customerName: providerCustomerName,
                                customer: {
                                    firstName: providerCustomerName?.split(' ')[0] || providerCustomerName,
                                    phone: providerCustomerPhone
                                },
                                customerId: providerCustomerId,
                                total: parseFloat(providerOrder.total),
                                shipping: parseFloat(providerOrder.shipping || 0),
                                currency: 'EGP',
                                items: (items || []).map(it => ({
                                    productName: it.originalProduct?.name || it.name,
                                    quantity: it.quantity || 1,
                                    price: it.price,
                                    total: it.total,
                                    productSku: it.originalProduct?.sku || it.sku,
                                    productColor: it.productColor || null,
                                    productSize: it.productSize || null
                                })),
                                createdAt: providerOrder.createdAt
                            };

                            await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);
                            console.log(`✅ [WHATSAPP] Order notification sent for affiliate order: ${providerOrder.orderNumber}`);
                        } catch (whatsappError) {
                            // لا نوقف العملية إذا فشل WhatsApp
                            console.log(`⚠️ [WHATSAPP] Failed to send affiliate order notification: ${whatsappError.message}`);
                        }

                        // 🛒 Auto-export to WooCommerce for the provider company
                        try {
                            const wooExportService = getWooCommerceAutoExportService();
                            wooExportService.exportOrderAsync(providerOrder.id);
                            console.log(`✅ [INTERNAL-SYNC] WooCommerce auto-export queued for provider order: ${providerOrder.orderNumber}`);
                        } catch (wooError) {
                            console.error(`❌ [INTERNAL-SYNC] WooCommerce auto-export error:`, wooError.message);
                        }

                        try {
                            const socketService = require('./socketService');
                            socketService.sendToCompany(providerId, 'order_new', {
                                id: providerOrder.id,
                                orderNumber: providerOrder.orderNumber,
                                message: 'لقد استلمت طلباً جديداً من مسوق'
                            });
                        } catch (sErr) { }

                    } catch (pushError) {
                        console.error(`❌ [INTERNAL-SYNC] Failed to push order segment to provider ${providerId}:`, pushError.message);
                    }
                });
            }

        } catch (error) {
            console.error('❌ [INTERNAL-SYNC] Error in pushOrderToProvider:', error);
        }
    }
}

module.exports = new InternalSyncService();
