const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { resolveProductMediaState } = require('../utils/productMediaUtils');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');

const parseDecimalOrNull = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseImageList = (value) => {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string' && item.trim());
    }

    if (typeof value !== 'string' || !value.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed.filter((item) => typeof item === 'string' && item.trim())
            : [];
    } catch (error) {
        return [];
    }
};

/**
 * إرسال طلب ربط لشركة أخرى
 * POST /api/v1/company-connections/requests
 */
exports.sendConnectionRequest = async (req, res) => {
    try {
        const requesterId = req.user?.companyId;
        const receiverIdentifier = typeof req.body?.receiverId === 'string' ? req.body.receiverId.trim() : '';
        const message = typeof req.body?.message === 'string' ? req.body.message.trim() : null;

        if (!requesterId) {
            return res.status(401).json({ success: false, message: 'تعذر تحديد الشركة الحالية للمستخدم' });
        }

        if (!receiverIdentifier) {
            return res.status(400).json({ success: false, message: 'معرف الشركة أو الـ slug أو البريد الإلكتروني للشركة المستلمة مطلوب' });
        }

        const prisma = getSharedPrismaClient();

        const normalizedReceiverIdentifier = receiverIdentifier.toLowerCase();

        const receiverCompany = await prisma.company.findFirst({
            where: {
                OR: [
                    { id: receiverIdentifier },
                    { slug: normalizedReceiverIdentifier },
                    { email: normalizedReceiverIdentifier }
                ]
            },
            select: {
                id: true,
                name: true,
                slug: true,
                email: true,
                isActive: true
            }
        });

        if (!receiverCompany) {
            return res.status(400).json({
                success: false,
                message: 'الشركة المطلوبة غير موجودة. تأكد من Company ID أو slug أو البريد الإلكتروني الصحيح'
            });
        }

        if (requesterId === receiverCompany.id) {
            return res.status(400).json({ success: false, message: 'لا يمكن إرسال طلب ربط لنفس الشركة' });
        }

        if (receiverCompany.isActive === false) {
            return res.status(400).json({ success: false, message: 'لا يمكن إرسال طلب ربط إلى شركة غير نشطة' });
        }

        const resolvedReceiverId = receiverCompany.id;

        const [existingRequest, reversePendingRequest, existingConnection] = await Promise.all([
            prisma.companyConnectionRequest.findFirst({
                where: {
                    requesterId,
                    receiverId: resolvedReceiverId,
                    status: 'PENDING'
                }
            }),
            prisma.companyConnectionRequest.findFirst({
                where: {
                    requesterId: resolvedReceiverId,
                    receiverId: requesterId,
                    status: 'PENDING'
                }
            }),
            prisma.companyConnection.findUnique({
                where: {
                    providerId_consumerId: {
                        providerId: resolvedReceiverId,
                        consumerId: requesterId
                    }
                }
            })
        ]);

        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'يوجد طلب ربط معلق بالفعل' });
        }

        if (reversePendingRequest) {
            return res.status(400).json({
                success: false,
                message: 'يوجد طلب ربط وارد من هذه الشركة بالفعل. انتقل إلى "طلبات الربط" للرد عليه'
            });
        }

        if (existingConnection) {
            return res.status(400).json({ success: false, message: 'الشركات متصلة بالفعل' });
        }

        const request = await prisma.companyConnectionRequest.create({
            data: {
                requesterId,
                receiverId: resolvedReceiverId,
                message: message || 'طلب ربط لسحب المنتجات',
                status: 'PENDING'
            }
        });

        res.status(201).json({
            success: true,
            message: `تم إرسال طلب الربط إلى ${receiverCompany.name} بنجاح`,
            data: request
        });
    } catch (error) {
        console.error('Error sending connection request:', error);

        if (error?.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: 'فشل إرسال الطلب لأن الشركة المستلمة غير موجودة أو تم حذفها'
            });
        }

        if (error?.code === 'P2002') {
            return res.status(400).json({
                success: false,
                message: 'يوجد تعارض أو طلب مماثل بالفعل'
            });
        }

        res.status(500).json({ success: false, message: 'خطأ في إرسال طلب الربط' });
    }
};

/**
 * الرد على طلب ربط
 * POST /api/v1/company-connections/requests/:id/respond
 */
exports.respondToRequest = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;
        const { status } = req.body; // 'APPROVED' or 'REJECTED' (matching frontend)

        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'إجراء غير صالح. يجب أن يكون APPROVED أو REJECTED' });
        }

        const prisma = getSharedPrismaClient();

        const request = await prisma.companyConnectionRequest.findUnique({
            where: { id },
            include: { requester: true }
        });

        if (!request || request.receiverId !== companyId) {
            return res.status(404).json({ success: false, message: 'طلب الربط غير موجود' });
        }

        if (request.status !== 'PENDING') {
            if (request.status === status) {
                return res.json({
                    success: true,
                    message: status === 'APPROVED' ? 'تم قبول طلب الربط مسبقاً' : 'تم رفض طلب الربط مسبقاً'
                });
            }
            return res.status(400).json({ success: false, message: 'لقد تم الرد على هذا الطلب بالفعل' });
        }

        if (status === 'REJECTED') {
            await prisma.companyConnectionRequest.update({
                where: { id },
                data: { status: 'REJECTED' }
            });
            return res.json({ success: true, message: 'تم رفض طلب الربط' });
        }

        const existingConnection = await prisma.companyConnection.findUnique({
            where: {
                providerId_consumerId: {
                    providerId: companyId,
                    consumerId: request.requesterId
                }
            }
        });

        if (existingConnection) {
            await prisma.companyConnectionRequest.update({
                where: { id },
                data: { status: 'APPROVED' }
            });

            return res.json({ success: true, message: 'الاتصال موجود بالفعل وتم تحديث حالة الطلب' });
        }

        // قبول الطلب وإنشاء اتصال
        await prisma.$transaction([
            prisma.companyConnectionRequest.update({
                where: { id },
                data: { status: 'APPROVED' }
            }),
            prisma.companyConnection.create({
                data: {
                    providerId: companyId,
                    consumerId: request.requesterId,
                    allowProductPull: true,
                    allowOrderPull: true,
                    status: 'ACTIVE'
                }
            })
        ]);

        res.json({ success: true, message: 'تم قبول طلب الربط وإنشاء الاتصال بنجاح' });
    } catch (error) {
        console.error('Error responding to connection request:', error);

        if (error?.code === 'P2002') {
            return res.json({ success: true, message: 'الاتصال موجود بالفعل' });
        }

        res.status(500).json({ success: false, message: 'خطأ في معالجة طلب الربط' });
    }
};

/**
 * جلب جميع طلبات الربط الواردة المعلقة
 * GET /api/v1/company-connections/requests
 * GET /api/v1/company-connections/requests/received
 */
exports.getReceivedRequests = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();

        const incoming = await prisma.companyConnectionRequest.findMany({
            where: {
                receiverId: companyId,
                status: 'PENDING'
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: incoming
        });
    } catch (error) {
        console.error('Error fetching received requests:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب طلبات الربط الواردة' });
    }
};

/**
 * جلب جميع الاتصالات النشطة (التي أستهلك منها - الموردين)
 * GET /api/v1/company-connections/active
 */
exports.getActiveConnections = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();

        const connections = await prisma.companyConnection.findMany({
            where: { consumerId: companyId, status: 'ACTIVE' },
            include: { provider: { select: { id: true, name: true, logo: true, email: true } } }
        });

        res.json({
            success: true,
            data: connections
        });
    } catch (error) {
        console.error('Error fetching active connections:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الاتصالات النشطة' });
    }
};

/**
 * جلب جميع الشركات المستهلكة (التي تسحب مني)
 * GET /api/v1/company-connections/consumers
 */
exports.getConsumers = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();

        const consumers = await prisma.companyConnection.findMany({
            where: { providerId: companyId, status: 'ACTIVE' },
            include: { consumer: { select: { id: true, name: true, logo: true, email: true } } }
        });

        res.json({
            success: true,
            data: consumers
        });
    } catch (error) {
        console.error('Error fetching consumers:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الشركات المستهلكة' });
    }
};

/**
 * تحديث صلاحيات الاتصال
 * PUT /api/v1/company-connections/:id/permissions
 */
exports.updatePermissions = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;
        const { allowProductPull, allowOrderPull } = req.body;

        const prisma = getSharedPrismaClient();
        const connection = await prisma.companyConnection.findUnique({ where: { id } });

        if (!connection) {
            return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        }

        if (connection.providerId !== companyId) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية تعديل هذا الاتصال' });
        }

        const updated = await prisma.companyConnection.update({
            where: { id },
            data: {
                allowProductPull: allowProductPull !== undefined ? allowProductPull : connection.allowProductPull,
                allowOrderPull: allowOrderPull !== undefined ? allowOrderPull : connection.allowOrderPull
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ success: false, message: 'خطأ في تحديث الصلاحيات' });
    }
};

/**
 * جلب المنتجات المتاحة للاستيراد من شركة متصلة
 * GET /api/v1/company-connections/:providerId/products
 */
exports.fetchProductsFromProvider = async (req, res) => {
    try {
        const consumerId = req.user.companyId;
        const { providerId } = req.params;

        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({
            where: {
                providerId_consumerId: { providerId, consumerId }
            }
        });

        if (!connection || connection.status !== 'ACTIVE' || !connection.allowProductPull) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية سحب المنتجات من هذه الشركة' });
        }

        const products = await prisma.product.findMany({
            where: { companyId: providerId, isActive: true },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                comparePrice: true,
                sku: true,
                stock: true,
                images: true,
                categoryId: true,
                category: { select: { name: true } },
                productVariants: {
                    orderBy: [
                        { type: 'asc' },
                        { sortOrder: 'asc' }
                    ],
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        sku: true,
                        price: true,
                        comparePrice: true,
                        cost: true,
                        images: true,
                        stock: true,
                        trackInventory: true,
                        isActive: true,
                        sortOrder: true,
                        metadata: true
                    }
                }
            }
        });

        const formattedProducts = products.map(p => ({
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            comparePrice: parseDecimalOrNull(p.comparePrice),
            sku: p.sku,
            stock: p.stock,
            images: parseImageList(p.images),
            category: p.category?.name || null,
            internalId: p.id,
            source: 'internal',
            variants: Array.isArray(p.productVariants)
                ? p.productVariants.map((variant) => ({
                    internalId: variant.id,
                    name: variant.name,
                    type: variant.type,
                    sku: variant.sku,
                    price: parseDecimalOrNull(variant.price),
                    comparePrice: parseDecimalOrNull(variant.comparePrice),
                    cost: parseDecimalOrNull(variant.cost),
                    images: parseImageList(variant.images),
                    stock: Number(variant.stock || 0),
                    trackInventory: variant.trackInventory !== false,
                    isActive: variant.isActive !== false,
                    sortOrder: Number(variant.sortOrder || 0),
                    metadata: variant.metadata || null
                }))
                : []
        }));

        res.json({ success: true, data: { products: formattedProducts, count: formattedProducts.length } });
    } catch (error) {
        console.error('Error fetching products from provider:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب منتجات الشركة' });
    }
};

/**
 * استيراد المنتجات المحددة من شركة متصلة
 * POST /api/v1/company-connections/:providerId/import
 */
exports.importInternalProducts = async (req, res) => {
    try {
        const consumerId = req.user.companyId;
        const { providerId } = req.params;
        const { products } = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: 'قائمة المنتجات مطلوبة' });
        }

        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({
            where: { providerId_consumerId: { providerId, consumerId } }
        });

        if (!connection || connection.status !== 'ACTIVE' || !connection.allowProductPull) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية استيراد المنتجات من هذه الشركة' });
        }

        const results = { imported: 0, skipped: 0, failed: 0 };

        for (const item of products) {
            try {
                const existing = await prisma.product.findFirst({
                    where: {
                        companyId: consumerId,
                        source: 'internal',
                        externalId: item.internalId
                    }
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                const resolvedMedia = resolveProductMediaState({
                    currentImages: [],
                    currentMainImage: null,
                    nextImages: item.images
                });

                const productLimitCheck = await ensureWithinPlanLimit(consumerId, 'products', 1);
                if (!productLimitCheck.allowed) {
                    results.failed++;
                    continue;
                }

                const createdProduct = await prisma.product.create({
                    data: {
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        comparePrice: item.comparePrice,
                        sku: item.sku,
                        stock: item.stock,
                        images: resolvedMedia.images.length > 0 ? JSON.stringify(resolvedMedia.images) : null,
                        mainImage: resolvedMedia.mainImage,
                        companyId: consumerId,
                        source: 'internal',
                        externalId: item.internalId,
                        isActive: true
                    }
                });

                if (Array.isArray(item.variants) && item.variants.length > 0) {
                    for (const variant of item.variants) {
                        const variantImages = parseImageList(variant.images);

                        await prisma.productVariant.create({
                            data: {
                                productId: createdProduct.id,
                                name: variant.name || '',
                                type: variant.type || 'color',
                                sku: variant.sku || null,
                                price: parseDecimalOrNull(variant.price),
                                comparePrice: parseDecimalOrNull(variant.comparePrice),
                                cost: parseDecimalOrNull(variant.cost),
                                images: variantImages.length > 0 ? JSON.stringify(variantImages) : null,
                                stock: Number(variant.stock || 0),
                                trackInventory: variant.trackInventory !== false,
                                isActive: variant.isActive !== false,
                                sortOrder: Number(variant.sortOrder || 0),
                                metadata: variant.metadata || null
                            }
                        });
                    }
                }

                results.imported++;
            } catch (err) {
                console.error('Failed to import product:', item.name, err);
                results.failed++;
            }
        }

        res.json({
            success: true,
            message: `تمت عملية الاستيراد: ${results.imported} ناجح، ${results.skipped} تم تخطيه، ${results.failed} فشل`,
            data: results
        });
    } catch (error) {
        console.error('Error importing internal products:', error);
        res.status(500).json({ success: false, message: 'خطأ في عملية الاستيراد' });
    }
};

/**
 * جلب الطلبات المتاحة للاستيراد من شركة متصلة
 * GET /api/v1/company-connections/:providerId/available-orders
 */
exports.fetchOrdersFromProvider = async (req, res) => {
    try {
        const consumerId = req.user.companyId;
        const { providerId } = req.params;
        const { productId, status, limit = 50, offset = 0 } = req.query;

        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({
            where: {
                providerId_consumerId: { providerId, consumerId }
            }
        });

        if (!connection || connection.status !== 'ACTIVE' || !connection.allowOrderPull) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية سحب الطلبات من هذه الشركة' });
        }

        const where = {
            companyId: providerId
        };

        if (status) {
            where.status = status;
        }

        if (productId) {
            where.orderItems = {
                some: {
                    productId: productId
                }
            };
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                        whatsappId: true
                    }
                },
                orderItems: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                images: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching orders from provider:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب طلبات الشركة' });
    }
};

/**
 * استيراد الطلبات المحددة من شركة متصلة
 * POST /api/v1/company-connections/:providerId/import-orders
 */
exports.importInternalOrders = async (req, res) => {
    try {
        const consumerId = req.user.companyId;
        const { providerId } = req.params;
        const { orders } = req.body;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json({ success: false, message: 'قائمة الطلبات مطلوبة' });
        }

        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({
            where: { providerId_consumerId: { providerId, consumerId } }
        });

        if (!connection || connection.status !== 'ACTIVE' || !connection.allowOrderPull) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية استيراد الطلبات من هذه الشركة' });
        }

        const results = { imported: 0, skipped: 0, failed: 0 };

        for (const orderData of orders) {
            try {
                const existing = await prisma.order.findFirst({
                    where: {
                        companyId: consumerId,
                        orderSource: 'INTERNAL_IMPORT',
                        externalId: orderData.id
                    }
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                let localCustomerId = null;
                if (orderData.customer) {
                    const customer = await prisma.customer.upsert({
                        where: {
                            whatsappId_companyId: {
                                whatsappId: orderData.customer.phone || orderData.customer.whatsappId,
                                companyId: consumerId
                            }
                        },
                        update: {
                            firstName: orderData.customer.firstName,
                            lastName: orderData.customer.lastName,
                            email: orderData.customer.email
                        },
                        create: {
                            firstName: orderData.customer.firstName,
                            lastName: orderData.customer.lastName,
                            phone: orderData.customer.phone,
                            whatsappId: orderData.customer.phone || orderData.customer.whatsappId,
                            email: orderData.customer.email,
                            companyId: consumerId,
                            status: 'ACTIVE'
                        }
                    });
                    localCustomerId = customer.id;
                }

                const localOrderItems = [];
                for (const item of orderData.orderItems || []) {
                    const localProduct = await prisma.product.findFirst({
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
                            originalProductId: item.productId
                        })
                    });
                }

                const orderLimitCheck = await ensureWithinPlanLimit(consumerId, 'orders', 1);
                if (!orderLimitCheck.allowed) {
                    results.failed++;
                    continue;
                }

                await prisma.order.create({
                    data: {
                        orderNumber: `${orderData.orderNumber}-IMP`,
                        customerId: localCustomerId,
                        companyId: consumerId,
                        subtotal: orderData.subtotal,
                        shipping: orderData.shipping,
                        total: orderData.total,
                        status: 'PENDING',
                        paymentStatus: orderData.paymentStatus,
                        paymentMethod: orderData.paymentMethod,
                        shippingAddress: orderData.shippingAddress,
                        notes: `طلب مستورد من ${providerId}. رقم الطلب الأصلي: ${orderData.orderNumber}\n${orderData.notes || ''}`,
                        orderSource: 'INTERNAL_IMPORT',
                        externalId: orderData.id,
                        orderItems: {
                            create: localOrderItems
                        }
                    }
                });

                results.imported++;
            } catch (err) {
                console.error('Failed to import order:', orderData.orderNumber, err);
                results.failed++;
            }
        }

        res.json({
            success: true,
            message: `تمت عملية استيراد الطلبات: ${results.imported} ناجح، ${results.skipped} تم تخطيه، ${results.failed} فشل`,
            data: results
        });
    } catch (error) {
        console.error('Error importing internal orders:', error);
        res.status(500).json({ success: false, message: 'خطأ في عملية الاستيراد' });
    }
};

/**
 * جلب الشركات المرتبطة كعلاقة أفليت
 * GET /api/v1/company-connections/affiliates
 */
exports.getCompanyAffiliates = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();

        // 1. جلب كل الاتصالات النشطة للشركة (كمستهلك وكمورّد)
        const [asConsumer, asProvider] = await Promise.all([
            prisma.companyConnection.findMany({
                where: { consumerId: companyId, status: 'ACTIVE' },
                include: { provider: { select: { id: true, name: true, logo: true, email: true } } }
            }),
            prisma.companyConnection.findMany({
                where: { providerId: companyId, status: 'ACTIVE' },
                include: { consumer: { select: { id: true, name: true, logo: true, email: true } } }
            })
        ]);

        // 2. جمع كل الـ userIds بتوع الشركة الحالية
        const myUserIds = (await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        // 3. جلب كل الـ affiliates بتوع users الشركة الحالية عند أي provider
        const myAffiliates = myUserIds.length > 0 ? await prisma.affiliate.findMany({
            where: { userId: { in: myUserIds } },
            select: { id: true, companyId: true }
        }) : [];

        // 4. جلب كل الـ affiliates عند الشركة الحالية (من شركات تانية)
        const myProvidersAffiliates = await prisma.affiliate.findMany({
            where: { companyId },
            select: { id: true, userId: true }
        });

        // 5. تجهيز بيانات المستهلك (Flora): providers اللي أنا مرتبط بيهم
        const consumerResult = [];
        for (const conn of asConsumer) {
            const providerId = conn.providerId;

            // affiliates لـ users من شركتي عند الـ provider ده
            const providerAffiliates = myAffiliates.filter(a => a.companyId === providerId);
            const affIds = providerAffiliates.map(a => a.id);

            if (affIds.length === 0) {
                consumerResult.push({
                    connectionId: conn.id,
                    partner: conn.provider,
                    role: 'consumer',
                    totalOrders: 0,
                    totalCommissions: 0,
                    paidCommissions: 0,
                    pendingCommissions: 0,
                    lastOrderAt: null
                });
                continue;
            }

            // الطلبات المدفوعة للـ provider (sourceType: internal_push)
            const [orderAgg, commissionAgg] = await Promise.all([
                prisma.order.aggregate({
                    where: {
                        affiliateId: { in: affIds },
                        companyId: providerId,
                        sourceType: 'internal_push'
                    },
                    _count: true,
                    _max: { createdAt: true }
                }),
                prisma.commission.aggregate({
                    where: {
                        affiliateId: { in: affIds },
                        companyId: providerId
                    },
                    _sum: { amount: true }
                })
            ]);

            // العمولات المدفوعة والمعلقة
            const paidAgg = await prisma.commission.aggregate({
                where: {
                    affiliateId: { in: affIds },
                    companyId: providerId,
                    status: 'PAID'
                },
                _sum: { amount: true }
            });
            const pendingAgg = await prisma.commission.aggregate({
                where: {
                    affiliateId: { in: affIds },
                    companyId: providerId,
                    status: { in: ['CONFIRMED', 'PENDING'] }
                },
                _sum: { amount: true }
            });

            consumerResult.push({
                connectionId: conn.id,
                partner: conn.provider,
                role: 'consumer',
                totalOrders: orderAgg._count || 0,
                totalCommissions: Number(commissionAgg._sum?.amount || 0),
                paidCommissions: Number(paidAgg._sum?.amount || 0),
                pendingCommissions: Number(pendingAgg._sum?.amount || 0),
                lastOrderAt: orderAgg._max?.createdAt || null
            });
        }

        // 6. تجهيز بيانات المورّد (Swan): consumers اللي مرتبطين بيا
        const providerResult = [];
        for (const conn of asProvider) {
            const consumerId = conn.consumerId;

            // affiliates بتوع المستهلك عندي
            const consumerUserIds = (await prisma.user.findMany({
                where: { companyId: consumerId, isActive: true },
                select: { id: true }
            })).map(u => u.id);

            const consumerAffiliatesAtMe = consumerUserIds.length > 0 ? await prisma.affiliate.findMany({
                where: { userId: { in: consumerUserIds }, companyId }
            }) : [];
            const affIds = consumerAffiliatesAtMe.map(a => a.id);

            if (affIds.length === 0) {
                providerResult.push({
                    connectionId: conn.id,
                    partner: conn.consumer,
                    role: 'provider',
                    totalOrders: 0,
                    totalCommissions: 0,
                    paidCommissions: 0,
                    pendingCommissions: 0,
                    lastOrderAt: null
                });
                continue;
            }

            const [orderAgg, commissionAgg, paidAgg, pendingAgg] = await Promise.all([
                prisma.order.aggregate({
                    where: { affiliateId: { in: affIds }, companyId, sourceType: 'internal_push' },
                    _count: true,
                    _max: { createdAt: true }
                }),
                prisma.commission.aggregate({
                    where: { affiliateId: { in: affIds }, companyId },
                    _sum: { amount: true }
                }),
                prisma.commission.aggregate({
                    where: { affiliateId: { in: affIds }, companyId, status: 'PAID' },
                    _sum: { amount: true }
                }),
                prisma.commission.aggregate({
                    where: { affiliateId: { in: affIds }, companyId, status: { in: ['CONFIRMED', 'PENDING'] } },
                    _sum: { amount: true }
                })
            ]);

            providerResult.push({
                connectionId: conn.id,
                partner: conn.consumer,
                role: 'provider',
                totalOrders: orderAgg._count || 0,
                totalCommissions: Number(commissionAgg._sum?.amount || 0),
                paidCommissions: Number(paidAgg._sum?.amount || 0),
                pendingCommissions: Number(pendingAgg._sum?.amount || 0),
                lastOrderAt: orderAgg._max?.createdAt || null
            });
        }

        res.json({
            success: true,
            data: {
                asConsumer: consumerResult,
                asProvider: providerResult
            }
        });
    } catch (error) {
        console.error('Error fetching company affiliates:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الشركات المرتبطة' });
    }
};

/**
 * حذف اتصال
 * DELETE /api/v1/company-connections/:id
 */
exports.deleteConnection = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { id } = req.params;

        const prisma = getSharedPrismaClient();
        const connection = await prisma.companyConnection.findUnique({ where: { id } });

        if (!connection) {
            return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        }

        if (connection.providerId !== companyId && connection.consumerId !== companyId) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية حذف هذا الاتصال' });
        }

        await prisma.companyConnection.delete({ where: { id } });

        res.json({ success: true, message: 'تم حذف الاتصال بنجاح' });
    } catch (error) {
        console.error('Error deleting connection:', error);
        res.status(500).json({ success: false, message: 'خطأ في حذف الاتصال' });
    }
};

/**
 * الحصول على بيانات الأفليت للشركة المسوقة (Consumer) عند مورد معين
 * GET /api/v1/company-connections/:connectionId/consumer/affiliate
 */
exports.getConsumerAffiliateData = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({
            where: { id: connectionId },
            include: { provider: { select: { id: true, name: true, logo: true, email: true } } }
        });

        if (!connection) {
            return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        }
        if (connection.consumerId !== companyId) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول' });
        }

        const myUserIds = (await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliate = myUserIds.length > 0 ? await prisma.affiliate.findFirst({
            where: { userId: { in: myUserIds }, companyId: connection.providerId }
        }) : null;

        if (!affiliate) {
            return res.json({
                success: true,
                data: {
                    affiliate: null,
                    provider: connection.provider,
                    connection
                }
            });
        }

        const [payoutsCount, recentPayouts] = await Promise.all([
            prisma.affiliatePayout.count({ where: { affiliateId: affiliate.id } }),
            prisma.affiliatePayout.findMany({
                where: { affiliateId: affiliate.id },
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);

        res.json({
            success: true,
            data: {
                affiliate: {
                    id: affiliate.id,
                    totalEarnings: Number(affiliate.totalEarnings),
                    paidEarnings: Number(affiliate.paidEarnings),
                    pendingEarnings: Number(affiliate.pendingEarnings),
                    minPayout: Number(affiliate.minPayout),
                    status: affiliate.status,
                    commissionRate: affiliate.commissionRate,
                    commissionType: affiliate.commissionType
                },
                provider: connection.provider,
                payoutsCount,
                recentPayouts: recentPayouts.map(p => ({
                    id: p.id,
                    amount: Number(p.amount),
                    status: p.status,
                    paymentMethod: p.paymentMethod,
                    createdAt: p.createdAt,
                    proofFileUrl: p.proofFileUrl,
                    notes: p.notes
                }))
            }
        });
    } catch (error) {
        console.error('Error in getConsumerAffiliateData:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب بيانات المسوق' });
    }
};

/**
 * أوردرات الشركة المسوقة (Consumer) عند مورد معين
 * GET /api/v1/company-connections/:connectionId/consumer/orders
 */
exports.getConsumerConnectionOrders = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.consumerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول' });

        const myUserIds = (await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliateIds = myUserIds.length > 0 ? (await prisma.affiliate.findMany({
            where: { userId: { in: myUserIds }, companyId: connection.providerId },
            select: { id: true }
        })).map(a => a.id) : [];

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: {
                    affiliateId: { in: affiliateIds },
                    companyId: connection.providerId,
                    sourceType: 'internal_push'
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    orderNumber: true,
                    total: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    sourceType: true,
                    affiliateId: true
                }
            }),
            prisma.order.count({
                where: {
                    affiliateId: { in: affiliateIds },
                    companyId: connection.providerId,
                    sourceType: 'internal_push'
                }
            })
        ]);

        res.json({
            success: true,
            data: { orders, total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error in getConsumerConnectionOrders:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' });
    }
};

/**
 * عمولات الشركة المسوقة (Consumer) عند مورد معين
 * GET /api/v1/company-connections/:connectionId/consumer/commissions
 */
exports.getConsumerConnectionCommissions = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.consumerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول' });

        const myUserIds = (await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliates = myUserIds.length > 0 ? await prisma.affiliate.findMany({
            where: { userId: { in: myUserIds }, companyId: connection.providerId },
            select: { id: true }
        }) : [];
        const affiliateIds = affiliates.map(a => a.id);

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [commissions, total] = await Promise.all([
            prisma.commission.findMany({
                where: {
                    affiliateId: { in: affiliateIds },
                    companyId: connection.providerId
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    type: true,
                    calculationType: true,
                    rate: true,
                    orderTotal: true,
                    createdAt: true,
                    order: { select: { orderNumber: true, status: true } }
                }
            }),
            prisma.commission.count({
                where: {
                    affiliateId: { in: affiliateIds },
                    companyId: connection.providerId
                }
            })
        ]);

        const summary = affiliateIds.length > 0 ? await Promise.all([
            prisma.commission.aggregate({
                where: { affiliateId: { in: affiliateIds }, companyId: connection.providerId },
                _sum: { amount: true }
            }),
            prisma.commission.aggregate({
                where: { affiliateId: { in: affiliateIds }, companyId: connection.providerId, status: 'PAID' },
                _sum: { amount: true }
            }),
            prisma.commission.aggregate({
                where: { affiliateId: { in: affiliateIds }, companyId: connection.providerId, status: { in: ['CONFIRMED', 'PENDING'] } },
                _sum: { amount: true }
            })
        ]) : [{ _sum: { amount: 0 } }, { _sum: { amount: 0 } }, { _sum: { amount: 0 } }];

        res.json({
            success: true,
            data: {
                commissions: commissions.map(c => ({
                    id: c.id,
                    amount: Number(c.amount),
                    status: c.status,
                    type: c.type,
                    calculationType: c.calculationType,
                    rate: c.rate,
                    orderTotal: Number(c.orderTotal || 0),
                    createdAt: c.createdAt,
                    orderNumber: c.order?.orderNumber,
                    orderStatus: c.order?.status
                })),
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                summary: {
                    totalCommissions: Number(summary[0]._sum?.amount || 0),
                    paidCommissions: Number(summary[1]._sum?.amount || 0),
                    pendingCommissions: Number(summary[2]._sum?.amount || 0)
                }
            }
        });
    } catch (error) {
        console.error('Error in getConsumerConnectionCommissions:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب العمولات' });
    }
};

/**
 * سجل طلبات السحب للشركة المسوقة (Consumer) عند مورد معين
 * GET /api/v1/company-connections/:connectionId/consumer/payouts
 */
exports.getConsumerConnectionPayouts = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.consumerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول' });

        const myUserIds = (await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliate = myUserIds.length > 0 ? await prisma.affiliate.findFirst({
            where: { userId: { in: myUserIds }, companyId: connection.providerId }
        }) : null;

        if (!affiliate) {
            return res.json({ success: true, data: { payouts: [], total: 0 } });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [payouts, total] = await Promise.all([
            prisma.affiliatePayout.findMany({
                where: { affiliateId: affiliate.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.affiliatePayout.count({ where: { affiliateId: affiliate.id } })
        ]);

        res.json({
            success: true,
            data: {
                payouts: payouts.map(p => ({
                    id: p.id,
                    amount: Number(p.amount),
                    status: p.status,
                    paymentMethod: p.paymentMethod,
                    notes: p.notes,
                    transactionId: p.transactionId,
                    proofFileUrl: p.proofFileUrl,
                    processedAt: p.processedAt,
                    createdAt: p.createdAt
                })),
                total, page, limit, totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error in getConsumerConnectionPayouts:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب طلبات السحب' });
    }
};

/**
 * إنشاء طلب سحب عمولة للشركة المسوقة (Consumer) من مورد معين
 * POST /api/v1/company-connections/:connectionId/consumer/payout-request
 */
exports.createConsumerConnectionPayoutRequest = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const { paymentMethod, paymentDetails } = req.body;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.consumerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });

        const myUserIds = (await prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliate = myUserIds.length > 0 ? await prisma.affiliate.findFirst({
            where: { userId: { in: myUserIds }, companyId: connection.providerId }
        }) : null;

        if (!affiliate) {
            return res.status(404).json({ success: false, message: 'حساب المسوق غير موجود عند هذا المورد' });
        }

        if (affiliate.status !== 'ACTIVE') {
            return res.status(403).json({ success: false, message: 'حساب المسوق غير نشط' });
        }

        const rawMethod = (paymentMethod || affiliate.paymentMethod || '').toUpperCase();
        const payoutMethod = ['TRANSFERS', 'BANK_TRANSFER'].includes(rawMethod) ? 'TRANSFERS'
            : ['WALLET', 'VODAFONE_CASH', 'ORANGE_CASH', 'INSTAPAY'].includes(rawMethod) ? 'WALLET'
            : rawMethod === 'CASH' ? 'CASH' : null;
        if (!payoutMethod) {
            return res.status(400).json({ success: false, message: 'طريقة الدفع غير صالحة' });
        }

        const pendingAmount = Number(affiliate.pendingEarnings);
        if (pendingAmount < Number(affiliate.minPayout || 100)) {
            return res.status(400).json({
                success: false,
                message: `الحد الأدنى للسحب هو ${affiliate.minPayout || 100} جنيه، رصيدك الحالي ${pendingAmount} جنيه`
            });
        }

        const pendingCommissions = await prisma.commission.findMany({
            where: {
                affiliateId: affiliate.id,
                status: 'CONFIRMED',
                payoutId: null
            },
            orderBy: { createdAt: 'asc' }
        });

        const availableAmount = Number(pendingCommissions.reduce((sum, c) => sum + Number(c.amount || 0), 0).toFixed(2));
        if (availableAmount <= 0) {
            return res.status(400).json({ success: false, message: 'لا توجد عمولات مؤكدة متاحة للسحب' });
        }

        const commissionIds = pendingCommissions.map(c => c.id);
        const payout = await prisma.$transaction(async (tx) => {
            const newPayout = await tx.affiliatePayout.create({
                data: {
                    affiliateId: affiliate.id,
                    amount: availableAmount,
                    paymentMethod: payoutMethod,
                    paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
                    status: 'PENDING'
                }
            });

            await tx.commission.updateMany({
                where: { id: { in: commissionIds }, affiliateId: affiliate.id, status: 'CONFIRMED', payoutId: null },
                data: { payoutId: newPayout.id }
            });

            return newPayout;
        });

        res.json({
            success: true,
            message: 'تم إنشاء طلب السحب بنجاح',
            data: { payoutId: payout.id, amount: Number(payout.amount), status: payout.status }
        });
    } catch (error) {
        console.error('Error in createConsumerConnectionPayoutRequest:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ في إنشاء طلب السحب' });
    }
};

// ───────────── PROVIDER SIDE ─────────────

/**
 * الأوردرات الواردة من شركة مسوقة معينة (Provider view)
 * GET /api/v1/company-connections/:connectionId/provider/orders
 */
exports.getProviderConnectionOrders = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.providerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول' });

        const consumerUserIds = (await prisma.user.findMany({
            where: { companyId: connection.consumerId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliateIds = consumerUserIds.length > 0 ? (await prisma.affiliate.findMany({
            where: { userId: { in: consumerUserIds }, companyId },
            select: { id: true }
        })).map(a => a.id) : [];

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: {
                    affiliateId: { in: affiliateIds },
                    companyId,
                    sourceType: 'internal_push'
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    orderNumber: true,
                    total: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    sourceType: true
                }
            }),
            prisma.order.count({
                where: {
                    affiliateId: { in: affiliateIds },
                    companyId,
                    sourceType: 'internal_push'
                }
            })
        ]);

        res.json({
            success: true,
            data: { orders, total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error in getProviderConnectionOrders:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' });
    }
};

/**
 * عمولات شركة مسوقة معينة (Provider view)
 * GET /api/v1/company-connections/:connectionId/provider/commissions
 */
exports.getProviderConnectionCommissions = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.providerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول' });

        const consumerUserIds = (await prisma.user.findMany({
            where: { companyId: connection.consumerId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliates = consumerUserIds.length > 0 ? await prisma.affiliate.findMany({
            where: { userId: { in: consumerUserIds }, companyId },
            select: { id: true }
        }) : [];
        const affiliateIds = affiliates.map(a => a.id);

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [commissions, total] = await Promise.all([
            prisma.commission.findMany({
                where: { affiliateId: { in: affiliateIds }, companyId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    type: true,
                    rate: true,
                    orderTotal: true,
                    createdAt: true,
                    order: { select: { orderNumber: true, status: true } }
                }
            }),
            prisma.commission.count({
                where: { affiliateId: { in: affiliateIds }, companyId }
            })
        ]);

        const summary = affiliateIds.length > 0 ? await Promise.all([
            prisma.commission.aggregate({ where: { affiliateId: { in: affiliateIds }, companyId }, _sum: { amount: true } }),
            prisma.commission.aggregate({ where: { affiliateId: { in: affiliateIds }, companyId, status: 'PAID' }, _sum: { amount: true } }),
            prisma.commission.aggregate({ where: { affiliateId: { in: affiliateIds }, companyId, status: { in: ['CONFIRMED', 'PENDING'] } }, _sum: { amount: true } })
        ]) : [{ _sum: { amount: 0 } }, { _sum: { amount: 0 } }, { _sum: { amount: 0 } }];

        res.json({
            success: true,
            data: {
                commissions: commissions.map(c => ({
                    id: c.id,
                    amount: Number(c.amount),
                    status: c.status,
                    type: c.type,
                    rate: c.rate,
                    orderTotal: Number(c.orderTotal || 0),
                    createdAt: c.createdAt,
                    orderNumber: c.order?.orderNumber,
                    orderStatus: c.order?.status
                })),
                total, page, limit, totalPages: Math.ceil(total / limit),
                summary: {
                    totalCommissions: Number(summary[0]._sum?.amount || 0),
                    paidCommissions: Number(summary[1]._sum?.amount || 0),
                    pendingCommissions: Number(summary[2]._sum?.amount || 0)
                }
            }
        });
    } catch (error) {
        console.error('Error in getProviderConnectionCommissions:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب العمولات' });
    }
};

/**
 * طلبات السحب من شركة مسوقة معينة (Provider view)
 * GET /api/v1/company-connections/:connectionId/provider/payouts
 */
exports.getProviderConnectionPayouts = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.providerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية الوصول' });

        const consumerUserIds = (await prisma.user.findMany({
            where: { companyId: connection.consumerId, isActive: true },
            select: { id: true }
        })).map(u => u.id);

        const affiliate = consumerUserIds.length > 0 ? await prisma.affiliate.findFirst({
            where: { userId: { in: consumerUserIds }, companyId }
        }) : null;

        if (!affiliate) {
            return res.json({ success: true, data: { payouts: [], total: 0, consumer: connection.consumer } });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [payouts, total] = await Promise.all([
            prisma.affiliatePayout.findMany({
                where: { affiliateId: affiliate.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.affiliatePayout.count({ where: { affiliateId: affiliate.id } })
        ]);

        res.json({
            success: true,
            data: {
                payouts: payouts.map(p => ({
                    id: p.id,
                    amount: Number(p.amount),
                    status: p.status,
                    paymentMethod: p.paymentMethod,
                    notes: p.notes,
                    transactionId: p.transactionId,
                    proofFileUrl: p.proofFileUrl,
                    processedAt: p.processedAt,
                    createdAt: p.createdAt
                })),
                total, page, limit, totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error in getProviderConnectionPayouts:', error);
        res.status(500).json({ success: false, message: 'خطأ في جلب طلبات السحب' });
    }
};

/**
 * تسجيل دفع عمولة لشركة مسوقة (Provider)
 * POST /api/v1/company-connections/:connectionId/provider/payouts/:payoutId/record
 */
exports.recordProviderPayout = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId, payoutId } = req.params;
        const { transactionId, notes } = req.body;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.providerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });

        const payout = await prisma.affiliatePayout.findUnique({
            where: { id: payoutId },
            include: { affiliate: true }
        });

        if (!payout) return res.status(404).json({ success: false, message: 'طلب السحب غير موجود' });
        if (payout.status !== 'PENDING') return res.status(400).json({ success: false, message: 'طلب السحب ليس في حالة معلقة' });

        await prisma.$transaction(async (tx) => {
            await tx.affiliatePayout.update({
                where: { id: payoutId },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date(),
                    processedBy: req.user.id,
                    transactionId: transactionId || null,
                    notes: notes || payout.notes,
                    isExternalPayment: true,
                    externalPaymentDate: new Date()
                }
            });

            await tx.commission.updateMany({
                where: { payoutId, affiliateId: payout.affiliateId, status: 'CONFIRMED' },
                data: { status: 'PAID', paidAt: new Date() }
            });

            const paidSum = await tx.commission.aggregate({
                where: { payoutId, affiliateId: payout.affiliateId },
                _sum: { amount: true }
            });

            const paidAmount = Number(paidSum._sum?.amount || 0);
            await tx.affiliate.update({
                where: { id: payout.affiliateId },
                data: {
                    paidEarnings: { increment: paidAmount },
                    pendingEarnings: { decrement: paidAmount }
                }
            });
        });

        res.json({ success: true, message: 'تم تسجيل الدفع بنجاح' });
    } catch (error) {
        console.error('Error in recordProviderPayout:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ في تسجيل الدفع' });
    }
};

/**
 * إلغاء طلب سحب (Provider)
 * POST /api/v1/company-connections/:connectionId/provider/payouts/:payoutId/cancel
 */
/**
 * إعادة مزامنة رصيد الأفليت من العمولات الفعلية (لإصلاح عدم الاتساق)
 * POST /api/v1/company-connections/:connectionId/consumer/resync-balance
 */
exports.resyncConsumerAffiliateBalance = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.consumerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });

        const myUserIds = (await prisma.user.findMany({ where: { companyId, isActive: true }, select: { id: true } })).map(u => u.id);
        const affiliate = myUserIds.length > 0 ? await prisma.affiliate.findFirst({ where: { userId: { in: myUserIds }, companyId: connection.providerId } }) : null;
        if (!affiliate) return res.status(404).json({ success: false, message: 'لا يوجد حساب مسوق' });

        const [totalAgg, paidAgg, pendingAgg] = await Promise.all([
            prisma.commission.aggregate({ where: { affiliateId: affiliate.id, companyId: connection.providerId }, _sum: { amount: true } }),
            prisma.commission.aggregate({ where: { affiliateId: affiliate.id, companyId: connection.providerId, status: 'PAID' }, _sum: { amount: true } }),
            prisma.commission.aggregate({ where: { affiliateId: affiliate.id, companyId: connection.providerId, status: { in: ['CONFIRMED', 'PENDING'] } }, _sum: { amount: true } })
        ]);

        const total = Number(totalAgg._sum?.amount || 0);
        const paid = Number(paidAgg._sum?.amount || 0);
        const pending = Number(pendingAgg._sum?.amount || 0);

        await prisma.affiliate.update({
            where: { id: affiliate.id },
            data: { totalEarnings: total, paidEarnings: paid, pendingEarnings: pending }
        });

        res.json({ success: true, message: 'تمت المزامنة', data: { total, paid, pending } });
    } catch (error) {
        console.error('Error in resyncConsumerAffiliateBalance:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ' });
    }
};

/**
 * إنشاء طلب + عمولة اختبارية للشركة المسوقة (لأغراض الاختبار)
 * POST /api/v1/company-connections/:connectionId/consumer/create-test-commissions
 */
exports.createTestCommissions = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId } = req.params;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.consumerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });

        const myUserIds = (await prisma.user.findMany({ where: { companyId, isActive: true }, select: { id: true } })).map(u => u.id);
        let affiliate = myUserIds.length > 0 ? await prisma.affiliate.findFirst({ where: { userId: { in: myUserIds }, companyId: connection.providerId } }) : null;
        if (!affiliate) return res.status(404).json({ success: false, message: 'لا يوجد حساب مسوق' });

        // استخدام طلب موجود عند المورد أو إنشاء طلب بسيط
        const providerUser = await prisma.user.findFirst({ where: { companyId: connection.providerId, isActive: true } });
        if (!providerUser) return res.status(400).json({ success: false, message: 'لا يوجد مستخدم نشط عند المورد' });

        let order = await prisma.order.findFirst({
            where: { companyId: connection.providerId },
            orderBy: { createdAt: 'desc' }
        });

        if (!order) {
            order = await prisma.order.create({
                data: {
                    companyId: connection.providerId,
                    userId: providerUser.id,
                    affiliateId: affiliate.id,
                    status: 'CONFIRMED',
                    sourceType: 'internal_push',
                    total: 10000,
                    subtotal: 10000,
                    orderNumber: 'TEST-' + Date.now().toString(36).toUpperCase(),
                    shippingAddress: 'test',
                    shippingCity: 'test',
                    shippingGovernorate: 'test',
                }
            });
        }

        const testAmount = 500;

        const commission = await prisma.commission.create({
            data: {
                affiliateId: affiliate.id,
                companyId: connection.providerId,
                orderId: order.id,
                type: 'AFFILIATE',
                calculationType: 'PERCENTAGE',
                amount: testAmount,
                rate: 5,
                status: 'CONFIRMED',
                orderTotal: Number(order.total),
            }
        });

        affiliate = await prisma.affiliate.update({
            where: { id: affiliate.id },
            data: {
                totalEarnings: { increment: testAmount },
                pendingEarnings: { increment: testAmount }
            }
        });

        res.json({
            success: true,
            message: `تم إنشاء عمولة اختبارية ${testAmount} ج.م`,
            data: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                commissionId: commission.id,
                amount: testAmount,
                pendingEarnings: Number(affiliate.pendingEarnings)
            }
        });
    } catch (error) {
        console.error('Error in createTestCommissions:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ' });
    }
};

exports.cancelProviderPayout = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { connectionId, payoutId } = req.params;
        const { reason } = req.body;
        const prisma = getSharedPrismaClient();

        const connection = await prisma.companyConnection.findUnique({ where: { id: connectionId } });
        if (!connection) return res.status(404).json({ success: false, message: 'الاتصال غير موجود' });
        if (connection.providerId !== companyId) return res.status(403).json({ success: false, message: 'لا تملك صلاحية' });

        const payout = await prisma.affiliatePayout.findUnique({ where: { id: payoutId } });
        if (!payout) return res.status(404).json({ success: false, message: 'طلب السحب غير موجود' });
        if (payout.status !== 'PENDING') return res.status(400).json({ success: false, message: 'لا يمكن إلغاء طلب تمت معالجته' });

        await prisma.$transaction(async (tx) => {
            await tx.commission.updateMany({
                where: { payoutId, affiliateId: payout.affiliateId },
                data: { payoutId: null }
            });

            await tx.affiliatePayout.update({
                where: { id: payoutId },
                data: { status: 'CANCELLED', notes: reason || 'تم الإلغاء من قبل المورد' }
            });
        });

        res.json({ success: true, message: 'تم إلغاء طلب السحب' });
    } catch (error) {
        console.error('Error in cancelProviderPayout:', error);
        res.status(500).json({ success: false, message: error.message || 'خطأ في إلغاء طلب السحب' });
    }
};
