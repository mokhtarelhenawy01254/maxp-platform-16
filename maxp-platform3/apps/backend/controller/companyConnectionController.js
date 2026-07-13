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
