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
                    const customer = await this.prisma.customer.upsert({
                        where: {
                            whatsappId_companyId: {
                                whatsappId: order.customer.phone || order.customer.whatsappId,
                                companyId: consumerId
                            }
                        },
                        update: {
                            firstName: order.customer.firstName,
                            lastName: order.customer.lastName,
                            email: order.customer.email
                        },
                        create: {
                            firstName: order.customer.firstName,
                            lastName: order.customer.lastName,
                            phone: order.customer.phone,
                            whatsappId: order.customer.phone || order.customer.whatsappId,
                            email: order.customer.email,
                            companyId: consumerId,
                            status: 'ACTIVE'
                        }
                    });
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

                    localOrderItems.push({
                        productId: localProduct ? localProduct.id : null,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.total,
                        metadata: JSON.stringify({
                            originalProductName: item.product?.name,
                            originalProductId: item.productId,
                            pushedFrom: providerId
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
                                total: (item.price * item.quantity)
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
                                total: item.total
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
                        if (order.customer) {
                            const customer = await this.prisma.customer.upsert({
                                where: {
                                    whatsappId_companyId: {
                                        whatsappId: order.customer.phone || order.customer.whatsappId,
                                        companyId: providerId
                                    }
                                },
                                update: {
                                    firstName: order.customer.firstName,
                                    lastName: order.customer.lastName,
                                    email: order.customer.email
                                },
                                create: {
                                    firstName: order.customer.firstName,
                                    lastName: order.customer.lastName,
                                    phone: order.customer.phone,
                                    whatsappId: order.customer.phone || order.customer.whatsappId,
                                    email: order.customer.email,
                                    companyId: providerId,
                                    status: 'ACTIVE'
                                }
                            });
                            providerCustomerId = customer.id;
                        }

                        const subtotal = items.reduce((acc, curr) => acc + Number(curr.total), 0);
                        const shipping = 0;

                        const orderService = require('./orderService');
                        const orderNumber = await orderService.generateOrderNumber(providerId);

                        const providerOrder = await this.prisma.order.create({
                            data: {
                                orderNumber: `${orderNumber}-AFF-${consumerId.slice(-4)}`,
                                customerId: providerCustomerId,
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
                                notes: `طلب آلي من متجر أفليت (شركة: ${consumerId}). كود المسوق: ${affiliate.affiliateCode}. رقم الطلب الأصلي: ${order.orderNumber}`,
                                sourceType: 'internal_push',
                                externalId: orderId,
                                orderItems: {
                                    create: items.map(it => ({
                                        productId: it.originalProduct.id,
                                        quantity: it.quantity,
                                        price: it.price,
                                        total: it.total,
                                        basePrice: it.originalProduct.price,
                                        merchantPrice: it.originalProduct.cost
                                    }))
                                }
                            }
                        });

                        const commissionService = require('./commissionService');
                        await commissionService.calculateCommissions(providerOrder.id);

                        console.log(`✅ [INTERNAL-SYNC] Successfully pushed order segment to provider ${providerId}. Provider Order: ${providerOrder.orderNumber}`);

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
