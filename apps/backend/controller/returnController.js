const { getSharedPrismaClient } = require('../services/sharedDatabase');
// ✅ FIX: Use lazy-loading pattern - don't call getSharedPrismaClient at module load time
const getPrisma = () => getSharedPrismaClient();
const { calculateCustomerScore } = require('../services/customerRatingService');
const cashbackService = require('../services/cashbackService');
const customerLoyaltyService = require('../services/hr/customerLoyaltyService');

// Return Reason Categories
exports.getCategories = async (req, res) => {
    try {
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const categories = await getPrisma().returnReasonCategory.findMany({
            where: { companyId: effectiveCompanyId, isActive: true },
            include: { returnReasons: true },
            orderBy: { createdAt: 'desc' }
        });

        // Map back to names expected by frontend
        const mappedCategories = categories.map(c => ({
            ...c,
            reasons: c.returnReasons
        }));

        res.json(mappedCategories);
    } catch (error) {
        console.error('❌ [GET_CATEGORIES] ERROR:', error.message);
        console.error(error.stack);
        res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, defaultRole } = req.body;
        const category = await getPrisma().returnReasonCategory.create({
            data: {
                name,
                defaultRole,
                companyId: req.user.effectiveCompanyId || req.user.companyId
            }
        });
        res.json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, defaultRole, isActive } = req.body;
        const category = await getPrisma().returnReasonCategory.update({
            where: { id },
            data: { name, defaultRole, isActive }
        });
        res.json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Security check: category must belong to the company
        const category = await getPrisma().returnReasonCategory.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });

        if (!category) {
            return res.status(404).json({ error: 'Return reason category not found' });
        }

        // Soft-delete the category and all its reasons (reasons may be referenced
        // by historical return requests, so they cannot be hard-deleted)
        await getPrisma().$transaction(async (tx) => {
            await tx.returnReason.updateMany({
                where: { categoryId: id },
                data: { isActive: false }
            });
            await tx.returnReasonCategory.update({
                where: { id },
                data: { isActive: false }
            });
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete return reason category' });
    }
};

// Return Reasons
exports.getReturnReasons = async (req, res) => {
    try {
        const reasons = await getPrisma().returnReason.findMany({
            where: {
                companyId: req.user.effectiveCompanyId || req.user.companyId,
                isActive: true
            },
            include: { returnReasonCategory: true },
            orderBy: { createdAt: 'desc' }
        });

        // Map back to names expected by frontend
        const mappedReasons = reasons.map(r => ({
            ...r,
            category: r.returnReasonCategory
        }));

        res.json(mappedReasons);
    } catch (error) {
        console.error('❌ [GET_REASONS] ERROR:', error.message);
        console.error(error.stack);
        res.status(500).json({ error: 'Failed to fetch return reasons', details: error.message });
    }
};

exports.createReturnReason = async (req, res) => {
    try {
        const { reason, description, categoryId } = req.body;
        const newReason = await getPrisma().returnReason.create({
            data: {
                reason,
                description,
                categoryId,
                companyId: req.user.effectiveCompanyId || req.user.companyId
            }
        });
        res.json(newReason);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create return reason' });
    }
};

exports.updateReturnReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, description, categoryId, isActive } = req.body;
        const updated = await getPrisma().returnReason.update({
            where: { id },
            data: { reason, description, categoryId, isActive }
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update return reason' });
    }
};

exports.deleteReturnReason = async (req, res) => {
    try {
        const { id } = req.params;

        // Security check
        const reason = await getPrisma().returnReason.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });

        if (!reason) {
            return res.status(404).json({ error: 'Return reason not found' });
        }

        await getPrisma().returnReason.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete return reason' });
    }
};

// Helper to auto-sync returned orders from shipping into returnRequest table
async function ensureShippingReturnRequestsSynced(companyId) {
    try {
        const prisma = getPrisma();
        const returnedOrders = await prisma.order.findMany({
            where: {
                companyId,
                OR: [
                    { status: 'RETURNED' },
                    { turboShipmentStatus: { in: ['returned_to_company', 'status_5', '5', 'status_14', '14', 'returned'] } }
                ]
            },
            select: { id: true, customerId: true, createdAt: true, turboTrackingNumber: true }
        });

        if (!returnedOrders.length) return;

        const existingReqs = await prisma.returnRequest.findMany({
            where: {
                companyId,
                orderId: { in: returnedOrders.map(o => o.id) }
            },
            select: { orderId: true }
        });
        const existingOrderIds = new Set(existingReqs.map(r => r.orderId));
        const missingOrders = returnedOrders.filter(o => !existingOrderIds.has(o.id));

        if (!missingOrders.length) return;

        // Resolve shipping company for returned orders from their shipments
        const shipments = await prisma.shipment.findMany({
            where: {
                orderId: { in: missingOrders.map(o => o.id) },
                shippingCompanyId: { not: null }
            },
            select: { orderId: true, shippingCompanyId: true }
        });
        const orderShippingCompanyMap = new Map(shipments.map(s => [s.orderId, s.shippingCompanyId]));
        let globalFallbackCustomerId = null;
        const records = [];
        for (const o of missingOrders) {
            let customerId = o.customerId;
            if (!customerId) {
                if (!globalFallbackCustomerId) {
                    const anyCustomer = await prisma.customer.findFirst({ where: { companyId } });
                    globalFallbackCustomerId = anyCustomer?.id || null;
                }
                customerId = globalFallbackCustomerId;
            }

            if (customerId) {
                records.push({
                    companyId,
                    orderId: o.id,
                    customerId,
                    reasonId: null,
                    status: 'PENDING',
                    responsibleParty: null,
                    adminNotes: 'مرتجع تلقائي من شركة الشحن',
                    trackingNumber: o.turboTrackingNumber || null,
                    shippingCompanyId: orderShippingCompanyMap.get(o.id) || null,
                    receivedStatus: 'IN_TRANSIT',
                    createdAt: new Date()
                });
            }
        }

        if (records.length) {
            await prisma.returnRequest.createMany({
                data: records,
                skipDuplicates: true
            });
        }
    } catch (e) {
        console.error('⚠️ [RETURN-AUTO-SYNC] Error auto-syncing shipping returns:', e.message);
    }
}

// Return Requests
exports.getReturnRequests = async (req, res) => {
    try {
        const { orderId, customerId, search, orderStatus, isReviewed, dateFrom, dateTo, page: pageStr, limit: limitStr } = req.query;
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;

        // Auto-sync any returned shipping orders for company
        await ensureShippingReturnRequestsSynced(effectiveCompanyId);

        const where = { companyId: effectiveCompanyId };

        if (orderId) where.orderId = orderId;
        if (customerId) where.customerId = customerId;
        if (isReviewed !== undefined) where.isReviewed = isReviewed === 'true';
        if (orderStatus) where.order = { status: orderStatus };

        // Apply date filters
        const settings = await getPrisma().returnSettings.findUnique({
            where: { companyId: effectiveCompanyId }
        });
        const ordersStartDate = req.query.startDate || settings?.reviewDisplayConfig?.ordersStartDate;

        if (dateFrom) {
            const from = new Date(dateFrom);
            if (!isNaN(from.getTime())) {
                where.createdAt = { ...(where.createdAt || {}), gte: from };
            }
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (!isNaN(to.getTime())) {
                where.createdAt = { ...(where.createdAt || {}), lte: to };
            }
        }
        const andConditions = [];

        if (ordersStartDate) {
            const startDate = new Date(ordersStartDate);
            if (!isNaN(startDate.getTime())) {
                andConditions.push({
                    OR: [
                        { createdAt: { gte: startDate } },
                        { order: { createdAt: { gte: startDate } } }
                    ]
                });
            }
        }

        if (search) {
            andConditions.push({
                OR: [
                    { order: { orderNumber: { contains: search } } },
                    { order: { turboTrackingNumber: { contains: search } } },
                    { customer: { firstName: { contains: search } } },
                    { customer: { lastName: { contains: search } } },
                    { customer: { phone: { contains: search } } }
                ]
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const page = Math.max(1, parseInt(pageStr) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
        const skip = (page - 1) * limit;

        const [requests, total] = await Promise.all([
            getPrisma().returnRequest.findMany({
                where,
                skip,
                take: limit,
                include: {
                    customer: {
                        select: { firstName: true, lastName: true, email: true, phone: true, customerRating: true, successScore: true }
                    },
                    order: {
                        select: { orderNumber: true, total: true, currency: true, turboTrackingNumber: true, shipping: true, codDepositAmount: true, codDepositPaid: true, codDepositRefunded: true }
                    },
                    returnReason: {
                        include: {
                            returnReasonCategory: true
                        }
                    },
                    returnType: true,
                    shippingCompany: {
                        select: { id: true, name: true, slug: true }
                    },
                    assignedUser: {
                        select: { firstName: true, lastName: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            getPrisma().returnRequest.count({ where })
        ]);

        const mappedRequests = requests.map(r => ({
            ...r,
            order: r.order ? {
                ...r.order,
                shippingCost: r.order.shipping != null ? Number(r.order.shipping) : 0
            } : null,
            reason: r.returnReason ? {
                ...r.returnReason,
                category: r.returnReason.returnReasonCategory
            } : null
        }));

        res.json({
            data: mappedRequests,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('❌ [GET_REQUESTS] ERROR:', error.message);
        console.error(error.stack);
        res.status(500).json({ error: 'Failed to fetch return requests', details: error.message });
    }
};

exports.createReturnRequest = async (req, res) => {
    try {
        const { orderId, orderNumber, orderItemId, customerId, reasonId, customerNotes, adminNotes, assignedTo, responsibleParty, refundAmount } = req.body;

        // Find order by orderNumber or orderId
        let order = null;
        if (orderNumber) {
            order = await getPrisma().order.findFirst({
                where: {
                    OR: [
                        { orderNumber: orderNumber },
                        { id: orderNumber }
                    ],
                    companyId: req.user.effectiveCompanyId || req.user.companyId
                }
            });
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
        }

        const finalOrderId = order?.id || orderId;
        const finalCustomerId = order?.customerId || customerId;

        if (!finalOrderId) {
            return res.status(400).json({ error: 'Order ID or Order Number is required' });
        }

        // If responsibleParty isn't provided, try to get it from reason's category
        let finalResponsibleParty = responsibleParty;
        if (!finalResponsibleParty && reasonId) {
            const reason = await getPrisma().returnReason.findUnique({
                where: { id: reasonId },
                include: { returnReasonCategory: true }
            });
            if (reason?.returnReasonCategory?.defaultRole) {
                finalResponsibleParty = reason.returnReasonCategory.defaultRole;
            }
        }

        // التحقق من عدم وجود طلب إرجاع مسبق لنفس الطلب
        const existing = await getPrisma().returnRequest.findFirst({
            where: {
                companyId: req.user.effectiveCompanyId || req.user.companyId,
                orderId: finalOrderId
            }
        });
        if (existing) {
            return res.status(409).json({ error: 'يوجد طلب إرجاع مسبق لهذا الطلب' });
        }

        const request = await getPrisma().returnRequest.create({
            data: {
                orderId: finalOrderId,
                orderItemId,
                customerId: finalCustomerId,
                reasonId: reasonId || null,
                customerNotes,
                adminNotes,
                assignedTo,
                responsibleParty: finalResponsibleParty || null,
                companyId: req.user.effectiveCompanyId || req.user.companyId,
                status: 'PENDING',
                refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
            }
        });

        // Log creation
        await logReturnActivity(getPrisma(), request.id, req.user?.id, 'CREATED', 'Return request created');

        // Try auto-approval
        const finalRequest = await tryAutoApprove(getPrisma(), request, req.user.effectiveCompanyId || req.user.companyId);

        res.json(finalRequest);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'يوجد طلب إرجاع مسبق لهذا الطلب' });
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to create return request' });
    }
};

exports.updateReturnRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes, customerNotes, reasonId, refundAmount, assignedTo, responsibleParty, isReviewed, shippingReturnCost, settlementAmount, returnTypeId, shippingCompanyId } = req.body;

        // Security & Null Check
        const oldRequest = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });

        if (!oldRequest) {
            return res.status(404).json({ error: 'Return request not found' });
        }

        const data = {
            adminNotes,
            customerNotes,
            reasonId: reasonId !== undefined ? (reasonId || null) : oldRequest.reasonId,
            refundAmount,
            assignedTo,
            responsibleParty: responsibleParty !== undefined ? (responsibleParty || null) : oldRequest.responsibleParty,
            isReviewed,
            ...(returnTypeId !== undefined ? { returnTypeId: returnTypeId || null } : {}),
            ...(shippingCompanyId !== undefined ? { shippingCompanyId: shippingCompanyId || null } : {}),
            ...(shippingReturnCost !== undefined ? { shippingReturnCost: shippingReturnCost === '' || shippingReturnCost === null ? null : parseFloat(shippingReturnCost) } : {}),
            ...(settlementAmount !== undefined ? { settlementAmount: settlementAmount === '' || settlementAmount === null ? null : parseFloat(settlementAmount) } : {})
        };

        if (isReviewed && !oldRequest.isReviewed) {
            data.reviewedAt = new Date();
            data.reviewedBy = req.user.id;
        }

        const updatedRequest = await getPrisma().returnRequest.update({
            where: { id },
            data,
            include: {
                returnReason: true,
                returnType: true,
                shippingCompany: true
            }
        });

        if (isReviewed && !oldRequest.isReviewed) {
            const reviewDetails = {
                responsibleParty: updatedRequest.responsibleParty,
                reason: updatedRequest.returnReason?.reason || null,
                shippingCompany: updatedRequest.shippingCompany?.name || null,
                returnType: updatedRequest.returnType?.name || null,
                shippingReturnCost: updatedRequest.shippingReturnCost,
                settlementAmount: updatedRequest.settlementAmount,
                adminNotes: updatedRequest.adminNotes,
                customerNotes: updatedRequest.customerNotes,
                refundAmount: updatedRequest.refundAmount
            };
            await logReturnActivity(getPrisma(), id, req.user.id, 'REVIEWED', reviewDetails);
        } else if (oldRequest.isReviewed) {
            // Track modifications to an already-reviewed return request
            const changes = {};
            if (responsibleParty !== undefined && responsibleParty !== oldRequest.responsibleParty) {
                changes.responsibleParty = { from: oldRequest.responsibleParty, to: responsibleParty };
            }
            if (reasonId !== undefined && reasonId !== oldRequest.reasonId) {
                changes.reason = { from: oldRequest.reasonId, to: updatedRequest.returnReason?.reason || reasonId };
            }
            if (shippingCompanyId !== undefined && shippingCompanyId !== oldRequest.shippingCompanyId) {
                changes.shippingCompany = { from: oldRequest.shippingCompanyId, to: updatedRequest.shippingCompany?.name || shippingCompanyId };
            }
            if (returnTypeId !== undefined && returnTypeId !== oldRequest.returnTypeId) {
                changes.returnType = { from: oldRequest.returnTypeId, to: updatedRequest.returnType?.name || returnTypeId };
            }
            if (shippingReturnCost !== undefined && Number(shippingReturnCost) !== Number(oldRequest.shippingReturnCost)) {
                changes.shippingReturnCost = { from: oldRequest.shippingReturnCost, to: data.shippingReturnCost };
            }
            if (settlementAmount !== undefined && Number(settlementAmount) !== Number(oldRequest.settlementAmount)) {
                changes.settlementAmount = { from: oldRequest.settlementAmount, to: data.settlementAmount };
            }
            if (customerNotes !== undefined && customerNotes !== oldRequest.customerNotes) {
                changes.customerNotes = { from: oldRequest.customerNotes, to: customerNotes };
            }
            if (adminNotes !== undefined && adminNotes !== oldRequest.adminNotes) {
                changes.adminNotes = { from: oldRequest.adminNotes, to: adminNotes };
            }

            if (Object.keys(changes).length > 0) {
                await logReturnActivity(getPrisma(), id, req.user.id, 'UPDATED', {
                    description: 'تعديل بيانات مراجعة طلب الإرجاع',
                    changes
                });
            }
        }

        if (adminNotes && adminNotes !== oldRequest.adminNotes && !oldRequest.isReviewed && !isReviewed) {
            await logReturnActivity(getPrisma(), id, req.user.id, 'NOTE_ADDED', {
                note: adminNotes,
                previous: oldRequest.adminNotes
            });
        }

        if (isReviewed && !oldRequest.isReviewed) {
            try {
                await calculateCustomerScore(updatedRequest.customerId, req.user.companyId);
            } catch (scoreError) {
                console.error('⚠️ [SCORE] Failed to calculate customer score:', scoreError?.message);
            }
            try {
                await cashbackService.reverseCashbackForReturn({
                    returnRequestId: updatedRequest.id,
                    companyId: req.user.effectiveCompanyId || req.user.companyId,
                    changedBy: req.user.id
                });
            } catch (e) {
                console.error('❌ [CASHBACK] Failed to reverse cashback for return:', {
                    returnRequestId: updatedRequest.id,
                    companyId: req.user.effectiveCompanyId || req.user.companyId,
                    error: e?.message
                });
            }
            try {
                await customerLoyaltyService.reverseLoyaltyPointsForReturn({
                    returnRequestId: updatedRequest.id,
                    companyId: req.user.effectiveCompanyId || req.user.companyId,
                    changedBy: req.user.id
                });
            } catch (e) {
                console.error('❌ [LOYALTY] Failed to reverse loyalty points for return:', {                    returnRequestId: updatedRequest.id,
                    companyId: req.user.effectiveCompanyId || req.user.companyId,
                    error: e?.message
                });
            }
            try {
                const autoDiscountService = require('../services/autoDiscountService');
                await autoDiscountService.restoreRedeemedPointsForOrder({
                    orderId: updatedRequest.orderId,
                    companyId: req.user.effectiveCompanyId || req.user.companyId
                });
            } catch (e) {
                console.error('❌ [AUTO-DISCOUNT] Failed to restore redeemed points for return:', e?.message);
            }
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error('❌ updateReturnRequest ERROR:', error?.message || error);
        console.error(error?.stack?.split('\n').slice(0, 5).join('\n'));
        res.status(500).json({ error: 'Failed to update return request', details: error?.message });
    }
};

exports.getPublicReasons = async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!companyId) {
            return res.status(400).json({ error: 'companyId is required' });
        }

        const reasons = await getPrisma().returnReason.findMany({
            where: {
                companyId,
                isActive: true
            },
            include: {
                returnReasonCategory: {
                    where: { isActive: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const mappedReasons = reasons.map(r => ({
            id: r.id,
            reason: r.reason,
            description: r.description,
            categoryId: r.categoryId,
            category: r.returnReasonCategory ? {
                id: r.returnReasonCategory.id,
                name: r.returnReasonCategory.name,
                defaultRole: r.returnReasonCategory.defaultRole
            } : null
        }));

        const categories = await getPrisma().returnReasonCategory.findMany({
            where: { companyId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ reasons: mappedReasons, categories });
    } catch (error) {
        console.error('❌ [GET_PUBLIC_REASONS] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to fetch return reasons' });
    }
};

exports.createPublicReturnRequest = async (req, res) => {
    try {
        const { orderNumber, emailOrPhone, reasonId, customerNotes } = req.body;

        const order = await getPrisma().order.findUnique({
            where: { orderNumber },
            include: { customer: true }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const customer = order.customer;
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found for this order' });
        }

        // Verify email or phone matches
        const matches = (customer.email && customer.email === emailOrPhone) ||
            (customer.phone && customer.phone === emailOrPhone);

        if (!matches) {
            return res.status(403).json({ error: 'Verification failed' });
        }

        // التحقق من عدم وجود طلب إرجاع مسبق
        const existing = await getPrisma().returnRequest.findFirst({
            where: { companyId: order.companyId, orderId: order.id }
        });
        if (existing) {
            return res.status(409).json({ error: 'يوجد طلب إرجاع مسبق لهذا الطلب' });
        }

        const request = await getPrisma().returnRequest.create({
            data: {
                orderId: order.id,
                customerId: customer.id,
                companyId: order.companyId,
                reasonId,
                customerNotes,
                status: 'PENDING'
            }
        });

        // Log creation
        await logReturnActivity(getPrisma(), request.id, null, 'CREATED', 'Public return request created');

        // Try auto-approval
        const finalRequest = await tryAutoApprove(getPrisma(), request, order.companyId);

        res.json({ success: true, request: finalRequest });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'يوجد طلب إرجاع مسبق لهذا الطلب' });
        }
        console.error('Public return error:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
};

/* --- New Features Implementation --- */

// Helper to auto-approve return request based on customer score
async function tryAutoApprove(prismaClient, returnRequest, companyId) {
    try {
        const settings = await prismaClient.returnSettings.findUnique({
            where: { companyId }
        });

        if (!settings?.enableAutoApproval) return returnRequest;

        const customer = await prismaClient.customer.findUnique({
            where: { id: returnRequest.customerId },
            select: { successScore: true }
        });

        if (!customer || customer.successScore == null) return returnRequest;

        const score = customer.successScore;
        const threshold = settings.autoApproveScore ?? 95;

        if (score >= threshold) {
            const autoNote = 'تمت الموافقة التلقائية بناءً على تقييم العميل';
            const existingNotes = returnRequest.adminNotes ? returnRequest.adminNotes + '\n' + autoNote : autoNote;

            const updated = await prismaClient.returnRequest.update({
                where: { id: returnRequest.id },
                data: {
                    status: 'APPROVED',
                    isReviewed: true,
                    reviewedAt: new Date(),
                    adminNotes: existingNotes
                }
            });

            await logReturnActivity(prismaClient, returnRequest.id, null, 'STATUS_CHANGE', {
                from: 'PENDING',
                to: 'APPROVED',
                reason: `Auto-approved: customer score ${score}% >= threshold ${threshold}%`
            });

            await logReturnActivity(prismaClient, returnRequest.id, null, 'REVIEWED', {
                status: 'APPROVED',
                reason: 'Auto-review: customer score meets threshold'
            });

            // Recalculate customer score
            await calculateCustomerScore(returnRequest.customerId, companyId);

            // Reverse cashback for auto-approved return
            try {
                await cashbackService.reverseCashbackForReturn({
                    returnRequestId: updated.id,
                    companyId,
                    changedBy: null
                });
            } catch (e) {
                console.error('❌ [CASHBACK] Failed to reverse cashback for auto-approved return:', e.message);
            }

            // Reverse loyalty points for auto-approved return
            try {
                await customerLoyaltyService.reverseLoyaltyPointsForReturn({
                    returnRequestId: updated.id,
                    companyId,
                    changedBy: null
                });
            } catch (e) {
                console.error('❌ [LOYALTY] Failed to reverse loyalty points for auto-approved return:', e.message);
            }

            // Restore points used as payment for auto-approved return
            try {
                const autoDiscountService = require('../services/autoDiscountService');
                await autoDiscountService.restoreRedeemedPointsForOrder({
                    orderId: updated.orderId,
                    companyId
                });
            } catch (e) {
                console.error('❌ [AUTO-DISCOUNT] Failed to restore redeemed points for auto-approved return:', e.message);
            }

            return updated;
        }

        return returnRequest;
    } catch (e) {
        console.error('⚠️ [AUTO-APPROVE] Error:', e.message);
        return returnRequest;
    }
}

// Helper to log activity
async function logReturnActivity(prismaClient, returnRequestId, userId, action, details) {
    try {
        await prismaClient.returnActivityLog.create({
            data: {
                returnRequestId,
                userId,
                action, // e.g., 'STATUS_CHANGE', 'NOTE_ADDED', 'CALL_LOGGED'
                details: typeof details === 'object' ? JSON.stringify(details) : details
            }
        });
    } catch (e) {
        console.error('Failed to log return activity:', e);
    }
}

// 1. Return Settings
exports.getReturnSettings = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        let settings = await getPrisma().returnSettings.findUnique({
            where: { companyId }
        });

        if (!settings) {
            settings = await getPrisma().returnSettings.create({
                data: { companyId }
            });
        }

        const reviewConfig = typeof settings.reviewDisplayConfig === 'string'
            ? JSON.parse(settings.reviewDisplayConfig || '{}')
            : (settings.reviewDisplayConfig || {});

        res.json({
            ...settings,
            averageThreshold: reviewConfig.averageThreshold ?? 50
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch return settings' });
    }
};

const ALLOWED_SETTINGS_FIELDS = [
    'excellentThreshold', 'goodThreshold', 'minOrdersForRating',
    'autoApproveScore', 'enableAutoApproval', 'reviewDisplayConfig'
];

exports.updateReturnSettings = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        const data = {};
        for (const field of ALLOWED_SETTINGS_FIELDS) {
            if (req.body[field] !== undefined) {
                if (['excellentThreshold', 'goodThreshold', 'minOrdersForRating', 'autoApproveScore'].includes(field)) {
                    data[field] = parseInt(req.body[field], 10);
                } else {
                    data[field] = req.body[field];
                }
            }
        }

        if (req.body.averageThreshold !== undefined) {
            let currentReviewDisplayConfig = data.reviewDisplayConfig;
            if (!currentReviewDisplayConfig) {
                const existing = await getPrisma().returnSettings.findUnique({
                    where: { companyId },
                    select: { reviewDisplayConfig: true }
                });
                currentReviewDisplayConfig = existing?.reviewDisplayConfig || {};
            }
            if (typeof currentReviewDisplayConfig === 'string') {
                try { currentReviewDisplayConfig = JSON.parse(currentReviewDisplayConfig); } catch (e) { currentReviewDisplayConfig = {}; }
            }
            data.reviewDisplayConfig = {
                ...(currentReviewDisplayConfig || {}),
                averageThreshold: parseInt(req.body.averageThreshold, 10) || 50
            };
        }

        const settings = await getPrisma().returnSettings.upsert({
            where: { companyId },
            update: data,
            create: { ...data, companyId }
        });

        // Trigger background recalculation for company customers using the updated thresholds
        try {
            const { batchRecalculateCompanyCustomers } = require('../services/customerRatingService');
            batchRecalculateCompanyCustomers(companyId).catch(err => {
                console.warn(`[RETURN-SETTINGS] Background customer recalculation failed:`, err.message);
            });
        } catch (e) {
            console.warn(`[RETURN-SETTINGS] Could not trigger customer recalculation:`, e.message);
        }

        const reviewConfig = typeof settings.reviewDisplayConfig === 'string'
            ? JSON.parse(settings.reviewDisplayConfig || '{}')
            : (settings.reviewDisplayConfig || {});

        res.json({
            ...settings,
            averageThreshold: reviewConfig.averageThreshold ?? 50
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// 2. Contact History
exports.addContactAttempt = async (req, res) => {
    try {
        const { id } = req.params; // returnRequestId
        const { method, result, notes } = req.body;
        const userId = req.user.id;

        // Verify request exists and belongs to company
        const request = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });
        if (!request) return res.status(404).json({ error: 'Return request not found' });

        const attempt = await getPrisma().returnContactAttempt.create({
            data: {
                returnRequestId: id,
                userId,
                method,
                result,
                notes
            }
        });

        // Log this action in the general Audit Log as well
        await logReturnActivity(getPrisma(), id, userId, 'CONTACT_ATTEMPT', { method, result });

        res.json(attempt);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to log contact attempt' });
    }
};

exports.getContactHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // Security check
        const request = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });
        if (!request) return res.status(404).json({ error: 'Return request not found' });

        const history = await getPrisma().returnContactAttempt.findMany({
            where: { returnRequestId: id },
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch contact history' });
    }
};

// 3. Activity Log
exports.getActivityLog = async (req, res) => {
    try {
        const { id } = req.params;

        // Security check
        const request = await getPrisma().returnRequest.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId },
            include: {
                returnReason: {
                    include: { returnReasonCategory: true }
                },
                returnType: true,
                shippingCompany: { select: { id: true, name: true, slug: true } },
                order: { select: { orderNumber: true, turboTrackingNumber: true } },
                assignedUser: { select: { firstName: true, lastName: true } }
            }
        });
        if (!request) return res.status(404).json({ error: 'Return request not found' });

        const logs = await getPrisma().returnActivityLog.findMany({
            where: { returnRequestId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enrich logs for maximum clarity (especially existing historical logs where details = '{}')
        const enrichedLogs = logs.map(log => {
            let parsedDetails = log.details;
            if (typeof parsedDetails === 'string') {
                try {
                    parsedDetails = JSON.parse(parsedDetails);
                } catch {
                    // Keep as string
                }
            }

            const isEmptyObject = parsedDetails && typeof parsedDetails === 'object' && Object.keys(parsedDetails).length === 0;
            const isEmptyString = !parsedDetails || parsedDetails === '{}' || parsedDetails === '';

            if (log.action === 'REVIEWED' && (isEmptyObject || isEmptyString)) {
                parsedDetails = {
                    responsibleParty: request.responsibleParty,
                    reason: request.returnReason?.reason || null,
                    category: request.returnReason?.returnReasonCategory?.name || null,
                    shippingCompany: request.shippingCompany?.name || null,
                    returnType: request.returnType?.name || null,
                    shippingReturnCost: request.shippingReturnCost,
                    settlementAmount: request.settlementAmount,
                    adminNotes: request.adminNotes,
                    customerNotes: request.customerNotes,
                    refundAmount: request.refundAmount,
                    isHistoricalEnriched: true
                };
            }

            return {
                ...log,
                details: parsedDetails,
                returnRequestSummary: {
                    orderNumber: request.order?.orderNumber,
                    turboTrackingNumber: request.order?.turboTrackingNumber,
                    status: request.status,
                    isReviewed: request.isReviewed
                }
            };
        });

        res.json(enrichedLogs);
    } catch (error) {
        console.error('❌ [GET_ACTIVITY_LOG] ERROR:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
};

// 4. Batch Operations

// 5. Return Types (أنواع المرتجع حسب شركة الشحن)
exports.getReturnTypes = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        const { shippingCompanyId, activeOnly } = req.query;
        const where = { companyId };

        if (shippingCompanyId) where.shippingCompanyId = shippingCompanyId;
        if (activeOnly === 'true') where.isActive = true;

        const types = await getPrisma().returnType.findMany({
            where,
            include: {
                shippingCompany: { select: { id: true, name: true, slug: true } }
            },
            orderBy: [{ shippingCompanyId: 'asc' }, { createdAt: 'asc' }]
        });

        res.json({ success: true, data: types });
    } catch (error) {
        console.error('❌ [GET_RETURN_TYPES] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to fetch return types', details: error.message });
    }
};

// Shipping companies with their return types (for the settings page)
exports.getReturnShippingCompanies = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        const prisma = getPrisma();
        const { activeOnly } = req.query;
        const isFilterActive = activeOnly === 'true' || activeOnly === true;

        const where = { companyId };
        if (isFilterActive) {
            where.isActive = true;
        }

        const companies = await prisma.shippingCompany.findMany({
            where,
            include: {
                returnTypes: {
                    where: isFilterActive ? { isActive: true } : undefined,
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const company = await prisma.company
            .findUnique({
                where: { id: companyId },
                select: { turboEnabled: true, turboApiKey: true },
            })
            .catch(() => null);

        const turboOrders = company
            ? await prisma.order.count({
                  where: {
                      companyId,
                      OR: [{ turboShipmentId: { not: null } }, { turboTrackingNumber: { not: null } }],
                  },
              })
            : 0;

        const usesTurbo = Boolean(company?.turboEnabled || company?.turboApiKey) || turboOrders > 0;

        if (usesTurbo) {
            const turbo = await prisma.shippingCompany.upsert({
                where: { companyId_slug: { companyId, slug: 'turbo' } },
                update: {
                    name: 'Turbo',
                    providerKey: 'TURBO',
                    integrationMode: 'API',
                    website: 'https://turbo-eg.com',
                    isActive: true,
                },
                create: {
                    companyId,
                    name: 'Turbo',
                    slug: 'turbo',
                    providerKey: 'TURBO',
                    integrationMode: 'API',
                    website: 'https://turbo-eg.com',
                    isActive: true,
                    settings: JSON.stringify({}),
                },
                include: {
                    returnTypes: {
                        where: isFilterActive ? { isActive: true } : undefined,
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });

            const idx = companies.findIndex((c) => c.id === turbo.id);
            if (idx >= 0) companies[idx] = turbo;
            else if (!isFilterActive || turbo.isActive) companies.unshift(turbo);
        }

        res.json({ success: true, data: companies });
    } catch (error) {
        console.error('❌ [GET_RETURN_SHIPPING_COMPANIES] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to fetch shipping companies', details: error.message });
    }
};

const parseNullableDecimal = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
};

const assertReturnTypeShippingCompany = async (prisma, companyId, shippingCompanyId) => {
    if (!shippingCompanyId) return;
    const sc = await prisma.shippingCompany.findFirst({ where: { id: shippingCompanyId, companyId } });
    if (!sc) {
        const err = new Error('Shipping company not found');
        err.statusCode = 404;
        throw err;
    }
};

exports.createReturnType = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        const { name, code, costModel, fixedAmount, shippingCompanyId } = req.body;

        if (!name || !code || !costModel) {
            return res.status(400).json({ error: 'name, code and costModel are required' });
        }

        await assertReturnTypeShippingCompany(getPrisma(), companyId, shippingCompanyId);

        const type = await getPrisma().returnType.create({
            data: {
                companyId,
                name,
                code,
                costModel,
                shippingCompanyId: shippingCompanyId || null,
                fixedAmount: parseNullableDecimal(fixedAmount)
            },
            include: {
                shippingCompany: { select: { id: true, name: true, slug: true } }
            }
        });

        res.json({ success: true, data: type });
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'هذا النوع مسجل مسبقاً لهذه الشركة' });
        }
        console.error('❌ [CREATE_RETURN_TYPE] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to create return type', details: error.message });
    }
};

exports.updateReturnType = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        const { name, code, costModel, fixedAmount, shippingCompanyId, isActive } = req.body;

        const existing = await getPrisma().returnType.findFirst({ where: { id, companyId } });
        if (!existing) {
            return res.status(404).json({ error: 'Return type not found' });
        }

        await assertReturnTypeShippingCompany(getPrisma(), companyId, shippingCompanyId);

        const data = {};
        if (name !== undefined) data.name = name;
        if (code !== undefined) data.code = code;
        if (costModel !== undefined) data.costModel = costModel;
        if (shippingCompanyId !== undefined) data.shippingCompanyId = shippingCompanyId || null;
        if (fixedAmount !== undefined) data.fixedAmount = parseNullableDecimal(fixedAmount);
        if (isActive !== undefined) data.isActive = isActive;

        const updated = await getPrisma().returnType.update({
            where: { id },
            data,
            include: {
                shippingCompany: { select: { id: true, name: true, slug: true } }
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({ error: error.message });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'هذا النوع مسجل مسبقاً لهذه الشركة' });
        }
        console.error('❌ [UPDATE_RETURN_TYPE] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to update return type', details: error.message });
    }
};

exports.deleteReturnType = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.effectiveCompanyId || req.user.companyId;

        const existing = await getPrisma().returnType.findFirst({ where: { id, companyId } });
        if (!existing) {
            return res.status(404).json({ error: 'Return type not found' });
        }

        // Soft delete to preserve historical return request references
        await getPrisma().returnType.update({ where: { id }, data: { isActive: false } });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ [DELETE_RETURN_TYPE] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to delete return type', details: error.message });
    }
};

// Employee Performance Report for Returns
exports.getEmployeePerformance = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const companyId = req.user.effectiveCompanyId || req.user.companyId;

        // Build date filter
        const dateFilter = {};
        if (dateFrom) {
            const from = new Date(dateFrom);
            if (!isNaN(from.getTime())) {
                dateFilter.gte = from;
            }
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (!isNaN(to.getTime())) {
                dateFilter.lte = to;
            }
        }

        // Get all return requests with reviewedBy and assignedTo
        const returnRequests = await getPrisma().returnRequest.findMany({
            where: {
                companyId,
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
            },
            include: {
                assignedUser: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        // Get activity logs for returns
        const activityLogs = await getPrisma().returnActivityLog.findMany({
            where: {
                returnRequest: { companyId },
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        // Calculate stats per employee
        const employeeStats = {};

        // Stats from return requests (assignedTo)
        returnRequests.forEach(req => {
            if (req.assignedTo && req.assignedUser) {
                const empId = req.assignedTo;
                if (!employeeStats[empId]) {
                    employeeStats[empId] = {
                        id: empId,
                        name: `${req.assignedUser.firstName || ''} ${req.assignedUser.lastName || ''}`.trim(),
                        totalAssigned: 0,
                        totalReviewed: 0,
                        totalActions: 0,
                        actions: {}
                    };
                }
                employeeStats[empId].totalAssigned++;

                if (req.isReviewed && req.reviewedBy === empId) {
                    employeeStats[empId].totalReviewed++;
                }
            }
        });

        // Stats from activity logs
        activityLogs.forEach(log => {
            if (log.userId && log.user) {
                const empId = log.userId;
                if (!employeeStats[empId]) {
                    employeeStats[empId] = {
                        id: empId,
                        name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim(),
                        totalAssigned: 0,
                        totalReviewed: 0,
                        totalActions: 0,
                        actions: {}
                    };
                }
                employeeStats[empId].totalActions++;

                const action = log.action || 'UNKNOWN';
                if (!employeeStats[empId].actions[action]) {
                    employeeStats[empId].actions[action] = 0;
                }
                employeeStats[empId].actions[action]++;
            }
        });

        // Convert to array and sort by total actions
        const employees = Object.values(employeeStats).sort((a, b) => b.totalActions - a.totalActions);

        // Summary stats
        const summary = {
            totalReturns: returnRequests.length,
            totalReviewed: returnRequests.filter(r => r.isReviewed).length,
            totalUnreviewed: returnRequests.filter(r => !r.isReviewed).length,
            reviewRate: returnRequests.length > 0
                ? ((returnRequests.filter(r => r.isReviewed).length / returnRequests.length) * 100).toFixed(1)
                : 0
        };

        res.json({
            success: true,
            data: {
                summary,
                employees
            }
        });
    } catch (error) {
        console.error('❌ [GET_EMPLOYEE_PERFORMANCE] ERROR:', error.message);
        console.error(error.stack);
        res.status(500).json({ error: 'Failed to fetch employee performance', details: error.message });
    }
};
