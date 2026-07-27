const { getSharedPrismaClient } = require('../services/sharedDatabase');
// ✅ FIX: Use lazy-loading pattern - don't call getSharedPrismaClient at module load time
const getPrisma = () => getSharedPrismaClient();
const { calculateCustomerScore } = require('../services/customerRatingService');
const cashbackService = require('../services/cashbackService');

// Return Reason Categories
exports.getCategories = async (req, res) => {
    try {
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const categories = await getPrisma().returnReasonCategory.findMany({
            where: { companyId: effectiveCompanyId },
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

        let defaultReason = await prisma.returnReason.findFirst({
            where: { companyId, isActive: true }
        });

        if (!defaultReason) {
            let cat = await prisma.returnReasonCategory.findFirst({
                where: { companyId }
            });
            if (!cat) {
                cat = await prisma.returnReasonCategory.create({
                    data: { companyId, name: 'مرتجعات الشحن', defaultRole: 'SHIPPING' }
                });
            }
            defaultReason = await prisma.returnReason.create({
                data: {
                    companyId,
                    categoryId: cat.id,
                    reason: 'مرتجع شحن (شركة الشحن)',
                    description: 'مرتجع تلقائي تم استلامه من شركة الشحن'
                }
            });
        }

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

            if (customerId && defaultReason) {
                records.push({
                    companyId,
                    orderId: o.id,
                    customerId,
                    reasonId: defaultReason.id,
                    status: 'PENDING',
                    responsibleParty: 'SHIPPING',
                    adminNotes: 'مرتجع تلقائي من شركة الشحن',
                    trackingNumber: o.turboTrackingNumber || null,
                    receivedStatus: 'IN_TRANSIT',
                    createdAt: o.createdAt
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
        const { orderId, customerId, search, orderStatus, dateFrom, dateTo, page: pageStr, limit: limitStr } = req.query;
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
        if (ordersStartDate) {
            const startDate = new Date(ordersStartDate);
            if (!isNaN(startDate.getTime())) {
                const ordersFromDate = await getPrisma().order.findMany({
                    where: { companyId: effectiveCompanyId, createdAt: { gte: startDate } },
                    select: { id: true }
                });
                const orderIdsFromDate = ordersFromDate.map(o => o.id);
                if (!where.OR) where.OR = [];
                where.OR.push(
                    { createdAt: { gte: startDate } },
                    ...(orderIdsFromDate.length ? [{ orderId: { in: orderIdsFromDate } }] : [])
                );
            }
        }

        if (search) {
            const orderIds = (await getPrisma().order.findMany({
                where: {
                    companyId: effectiveCompanyId,
                    OR: [
                        { orderNumber: { contains: search } },
                        { turboTrackingNumber: { contains: search } },
                    ]
                },
                select: { id: true }
            })).map(o => o.id);

            const customerIds = (await getPrisma().customer.findMany({
                where: {
                    companyId: effectiveCompanyId,
                    OR: [
                        { firstName: { contains: search } },
                        { lastName: { contains: search } },
                        { phone: { contains: search } },
                    ]
                },
                select: { id: true }
            })).map(c => c.id);

            if (!orderIds.length && !customerIds.length) {
                return res.json({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
            }

            const searchFilters = [];
            if (orderIds.length) searchFilters.push({ orderId: { in: orderIds } });
            if (customerIds.length) searchFilters.push({ customerId: { in: customerIds } });
            if (searchFilters.length === 1) {
                Object.assign(where, searchFilters[0]);
            } else if (searchFilters.length > 1) {
                where.OR = [...(where.OR || []), ...searchFilters];
            }
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
                        select: { orderNumber: true, total: true, currency: true, turboTrackingNumber: true, codDepositAmount: true, codDepositPaid: true, codDepositRefunded: true }
                    },
                    returnReason: {
                        include: {
                            returnReasonCategory: true
                        }
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
                reasonId,
                customerNotes,
                adminNotes,
                assignedTo,
                responsibleParty: finalResponsibleParty || 'OTHER',
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
        const { adminNotes, customerNotes, reasonId, refundAmount, assignedTo, responsibleParty, isReviewed } = req.body;

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
            reasonId,
            refundAmount,
            assignedTo,
            responsibleParty,
            isReviewed
        };

        if (isReviewed && !oldRequest.isReviewed) {
            data.reviewedAt = new Date();
            data.reviewedBy = req.user.id;
        }

        const updatedRequest = await getPrisma().returnRequest.update({
            where: { id },
            data
        });

        if (adminNotes && adminNotes !== oldRequest.adminNotes) {
            await logReturnActivity(getPrisma(), id, req.user.id, 'NOTE_ADDED', 'Admin note updated');
        }

        if (isReviewed && !oldRequest.isReviewed) {
            await logReturnActivity(getPrisma(), id, req.user.id, 'REVIEWED', {});
            await calculateCustomerScore(updatedRequest.customerId, req.user.companyId);
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
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update return request' });
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
        res.json(settings);
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
                data[field] = req.body[field];
            }
        }

        const settings = await getPrisma().returnSettings.upsert({
            where: { companyId },
            update: data,
            create: { ...data, companyId }
        });
        res.json(settings);
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
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });
        if (!request) return res.status(404).json({ error: 'Return request not found' });

        const logs = await getPrisma().returnActivityLog.findMany({
            where: { returnRequestId: id },
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
};

// 4. Batch Operations
exports.batchReceive = async (req, res) => {
    try {
        const { ids, productCondition } = req.body;
        const companyId = req.user.effectiveCompanyId || req.user.companyId;

        if (!Array.isArray(ids) || !ids.length) {
            return res.status(400).json({ error: 'ids must be a non-empty array' });
        }

        // Verify all requests belong to company
        const requests = await getPrisma().returnRequest.findMany({
            where: { id: { in: ids }, companyId }
        });

        if (requests.length !== ids.length) {
            return res.status(403).json({ error: 'Some requests not found or access denied' });
        }

        const [updated] = await Promise.all([
            getPrisma().returnRequest.updateMany({
                where: { id: { in: ids }, companyId },
                data: {
                    receivedStatus: 'RECEIVED',
                    receivedAt: new Date(),
                    productCondition: productCondition || null
                }
            }),
            ...requests.map(r =>
                logReturnActivity(getPrisma(), r.id, req.user.id, 'BATCH_RECEIVED', { count: ids.length })
            )
        ]);

        res.json({ success: true, count: updated.count });
    } catch (error) {
        console.error('❌ [BATCH_RECEIVE] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to batch receive' });
    }
};


