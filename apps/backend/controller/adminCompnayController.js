const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const socketService = require('../services/socketService');
const { sendBrowserPushToUser } = require('../services/browserPushService');
const { generateUniqueCompanySlug, ensureCompanySlug } = require('../utils/companySlug');
const {
    FOLLOW_UP_STATUSES,
    getCompanyFollowUp,
    getCompanyFollowUpFromDb,
    saveFollowUpToDb,
    mergeCompanyFollowUpSettings,
} = require('../utils/companyFollowUp');
const {
    findCouponByCode,
    getUsagePercentage,
    serializeCoupon,
} = require('../services/platformSignupCouponService');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const REVIEW_RECENT_LIMIT = 5;
const DEFAULT_PLATFORM_FEES = Object.freeze({});
const ACTIVE_COMPANY_APP_STATUSES = ['TRIAL', 'ACTIVE'];
const FOLLOW_UP_OWNER_ROLES = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester'];
const FOLLOW_UP_NOTIFICATION_TYPES = Object.freeze({
    REMINDER: 'follow_up_reminder',
    ESCALATION: 'follow_up_escalation',
});
const FOLLOW_UP_OWNER_SELECT = Object.freeze({
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
    companyId: true,
    lastLoginAt: true,
});

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanString = (value) =>
    typeof value === 'string' ? value.trim() : '';

const serializeFollowUpOwner = (user = {}) => ({
    id: user.id,
    firstName: cleanString(user.firstName),
    lastName: cleanString(user.lastName),
    email: cleanString(user.email),
    role: cleanString(user.role),
    lastLoginAt: user.lastLoginAt || null,
});

const buildActorLabel = (user = {}) => {
    const fullName = [cleanString(user.firstName), cleanString(user.lastName)]
        .filter(Boolean)
        .join(' ')
        .trim();

    return fullName || cleanString(user.email) || cleanString(user.role) || 'عضو الفريق';
};

const createInAppNotification = async ({
    prisma,
    companyId,
    userId,
    title,
    message,
    type,
    data = {},
}) => {
    const notification = await prisma.notification.create({
        data: {
            companyId: String(companyId),
            userId: String(userId),
            title,
            message,
            type,
            data,
        },
    });

    socketService.sendToUser(String(userId), 'notification:new', notification);
    return notification;
};

const buildFollowUpAutomationNotification = ({
    action,
    company,
    actor,
    followUp,
}) => {
    const companyName = cleanString(company?.name) || 'هذه الشركة';
    const actorLabel = buildActorLabel(actor);
    const detailUrl = `/super-admin/companies/${company.id}`;

    if (action === 'escalated') {
        return {
            typeId: FOLLOW_UP_NOTIFICATION_TYPES.ESCALATION,
            title: `تم تصعيد متابعة ${companyName}`,
            message: `${actorLabel} صعّد متابعة شركة ${companyName}. افتح التفاصيل واتخذ الإجراء التالي الآن.`,
            compactBody: `تم تصعيد متابعة ${companyName}`,
            url: detailUrl,
            data: {
                source: 'company_follow_up_automation',
                action,
                companyId: company.id,
                companyName,
                followUpStatus: followUp?.status || null,
                assignedOwnerId: followUp?.assignedOwner?.id || null,
                nextActionAt: followUp?.nextActionAt || null,
            },
        };
    }

    return {
        typeId: FOLLOW_UP_NOTIFICATION_TYPES.REMINDER,
        title: `تذكير متابعة لشركة ${companyName}`,
        message: `${actorLabel} سجّل تذكير متابعة جديد لشركة ${companyName}. راجع الحالة وحدد الخطوة التالية.`,
        compactBody: `تذكير متابعة جديد لشركة ${companyName}`,
        url: detailUrl,
        data: {
            source: 'company_follow_up_automation',
            action: 'reminder_sent',
            companyId: company.id,
            companyName,
            followUpStatus: followUp?.status || null,
            assignedOwnerId: followUp?.assignedOwner?.id || null,
            nextActionAt: followUp?.nextActionAt || null,
        },
    };
};

const notifyFollowUpOwner = async ({
    prisma,
    company,
    owner,
    followUp,
    actor,
    action,
}) => {
    const ownerCompanyId = cleanString(owner?.companyId);
    const ownerId = cleanString(owner?.id);
    const notificationCompanyId = ownerCompanyId || cleanString(company?.id);

    if (!notificationCompanyId || !ownerId) {
        return {
            notification: null,
            browserPush: null,
            skipped: true,
            reason: 'missing_notification_context',
        };
    }

    const payload = buildFollowUpAutomationNotification({
        action,
        company,
        actor,
        followUp,
    });

    let notification = null;
    let browserPush = null;

    try {
        notification = await createInAppNotification({
            prisma,
            companyId: notificationCompanyId,
            userId: ownerId,
            title: payload.title,
            message: payload.message,
            type: payload.typeId,
            data: {
                ...payload.data,
                url: payload.url,
            },
        });
    } catch (error) {
        console.error('❌ [FOLLOW_UP_AUTOMATION] Failed to create in-app notification:', error);
    }

    if (ownerCompanyId) {
        try {
            browserPush = await sendBrowserPushToUser({
                companyId: ownerCompanyId,
                userId: ownerId,
                typeId: payload.typeId,
                title: payload.title,
                body: payload.message,
                compactBody: payload.compactBody,
                requireInteraction: action === 'escalated',
                url: payload.url,
                data: payload.data,
            });
        } catch (error) {
            console.error('❌ [FOLLOW_UP_AUTOMATION] Failed to send browser push:', error);
        }
    }

    return {
        notification,
        browserPush,
        skipped: false,
        reason: null,
    };
};

const getCurrentMonthWindow = () => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);

    return { start, end };
};

const isMissingTableError = (error, tableName) =>
    String(error?.message || '').includes(`The table \`public.${tableName}\` does not exist`);

const buildSyntheticPlatformSubscription = (company, monthlyFee) => {
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    return {
        id: `fallback-${company.id}`,
        companyId: company.id,
        monthlyFee,
        status: 'ACTIVE',
        billingDay: 1,
        nextBillingDate,
        lastBillingDate: null,
        failedAttempts: 0,
        isFallback: true,
    };
};

const buildLimitEntry = ({ key, label, current, limit, bonus = 0 }) => {
    const normalizedCurrent = toNumber(current);
    const normalizedLimit =
        limit === undefined || limit === null ? -1 : Number(limit);
    const isUnlimited = !Number.isFinite(normalizedLimit) || normalizedLimit === -1;
    const safeLimit = isUnlimited ? -1 : normalizedLimit;

    return {
        key,
        label,
        current: normalizedCurrent,
        limit: safeLimit,
        remaining: isUnlimited ? null : Math.max(safeLimit - normalizedCurrent, 0),
        percentage: isUnlimited ? 0 : getUsagePercentage(normalizedCurrent, safeLimit),
        isUnlimited,
        bonus: toNumber(bonus),
    };
};

const serializeWalletTransaction = (transaction) => ({
    id: transaction.id,
    amount: toNumber(transaction.amount),
    type: transaction.type,
    status: transaction.status,
    description: transaction.description || '',
    referenceId: transaction.referenceId || null,
    createdAt: transaction.createdAt,
});

const serializeInvoiceSummary = (invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    notes: invoice.notes || '',
    status: invoice.status,
    type: invoice.type,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    paidDate: invoice.paidDate,
    totalAmount: toNumber(invoice.totalAmount),
    currency: invoice.currency || 'EGP',
    receiptStatus: invoice.paymentReceipts?.[0]?.status || null,
    payments: Array.isArray(invoice.payments)
        ? invoice.payments.map((payment) => ({
            id: payment.id,
            amount: toNumber(payment.amount),
            status: payment.status,
            method: payment.method,
            paidAt: payment.paidAt,
        }))
        : [],
});

const serializePaymentSummary = (payment) => ({
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    amount: toNumber(payment.amount),
    currency: payment.currency || 'EGP',
    status: payment.status,
    method: payment.method,
    gateway: payment.gateway || null,
    transactionId: payment.transactionId || null,
    failureReason: payment.failureReason || '',
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNumber: payment.invoice.invoiceNumber,
            notes: payment.invoice.notes || '',
            status: payment.invoice.status,
            totalAmount: toNumber(payment.invoice.totalAmount),
            dueDate: payment.invoice.dueDate,
        }
        : null,
});

const serializeReceiptSummary = (receipt) => ({
    id: receipt.id,
    status: receipt.status,
    submittedAt: receipt.submittedAt,
    reviewedAt: receipt.reviewedAt,
    notes: receipt.notes || '',
    walletNumber: receipt.walletNumber
        ? {
            id: receipt.walletNumber.id,
            name: receipt.walletNumber.name,
            number: receipt.walletNumber.number,
        }
        : null,
    invoice: receipt.invoice
        ? {
            id: receipt.invoice.id,
            invoiceNumber: receipt.invoice.invoiceNumber,
            notes: receipt.invoice.notes || '',
            totalAmount: toNumber(receipt.invoice.totalAmount),
            currency: receipt.invoice.currency || 'EGP',
            status: receipt.invoice.status,
        }
        : null,
});

const serializeBillingHistoryEntry = (entry) => ({
    id: entry.id,
    type: entry.type,
    amount: toNumber(entry.amount),
    status: entry.status,
    description: entry.description || '',
    referenceId: entry.referenceId || null,
    createdAt: entry.createdAt,
});

const buildCompanyDetailsInclude = ({ includeCouponRedemptions = true } = {}) => ({
    wallet: {
        include: {
            transactions: {
                orderBy: { createdAt: 'desc' },
                take: REVIEW_RECENT_LIMIT,
            },
        },
    },
    businessSpecialty: {
        select: {
            id: true,
            nameAr: true,
            nameEn: true,
            slug: true,
            icon: true,
            descriptionAr: true,
        },
    },
    platformSubscription: true,
    ...(includeCouponRedemptions
        ? {
            platformSignupCouponRedemptions: {
                take: 1,
                orderBy: { redeemedAt: 'desc' },
                include: {
                    coupon: {
                        include: {
                            _count: {
                                select: {
                                    redemptions: true,
                                },
                            },
                        },
                    },
                },
            },
        }
        : {}),
    users: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
        },
    },
    _count: {
        select: {
            users: true,
            customers: true,
            products: true,
            conversations: true,
            facebookPages: true,
        },
    },
});

const getAllCompanies = async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const search = (req.query.search || '').trim();
        const status = req.query.status || 'ALL';
        const savedView = req.query.savedView || 'ALL';

        const now = new Date();
        const ACTIONABLE = ['pending', 'contacted', 'waiting'];

        const buildSavedViewWhere = (view) => {
            if (view === 'FOLLOW_UP_NOW') return { followUp: { status: { in: ACTIONABLE }, OR: [{ next_action_at: { lte: now } }, { next_action_at: null }] } };
            if (view === 'MY_TODAY') return { followUp: { status: { in: ACTIONABLE }, assigned_owner_id: req.user.id, OR: [{ next_action_at: { lte: now } }, { next_action_at: null }] } };
            if (view === 'ESCALATION_DUE') return { followUp: { status: { in: ACTIONABLE }, next_action_at: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } };
            if (view === 'STALE_72H') return { followUp: null, createdAt: { lte: new Date(now.getTime() - 72 * 60 * 60 * 1000) } };
            if (view === 'TRIAL') return { OR: [{ trialModeEnabled: true }, { platformSubscription: { status: 'TRIAL' } }] };
            if (view === 'ONBOARDING_STUCK') return { products: { none: {} } };
            if (view === 'ACTIVE_STORES') return { orders: { some: {} } };
            return {};
        };

        const conditions = [];
        if (search) conditions.push({ OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { website: { contains: search, mode: 'insensitive' } },
        ]});
        if (status === 'ACTIVE' || status === 'INACTIVE') conditions.push({ isActive: status === 'ACTIVE' });
        if (savedView !== 'ALL') conditions.push(buildSavedViewWhere(savedView));
        const where = conditions.length === 1 ? conditions[0] : { AND: conditions };

        if (req.query.startDate) conditions.push({ createdAt: { gte: new Date(req.query.startDate) } });
        if (req.query.endDate) conditions.push({ createdAt: { lte: new Date(req.query.endDate) } });

        const rawPageSize = parseInt(req.query.pageSize);
        let prismaSkip, prismaTake;
        if (rawPageSize === 0) {
            prismaSkip = undefined;
            prismaTake = undefined;
        } else {
            const limit = Math.min(100, Math.max(1, rawPageSize || 20));
            prismaSkip = (page - 1) * limit;
            prismaTake = limit;
        }

        const sortParam = (req.query.sort || '').trim();
        let orderBy = { createdAt: 'desc' };
        if (sortParam) {
            const parts = sortParam.split(':');
            const field = parts[0];
            const dir = parts[1] === 'asc' ? 'asc' : 'desc';
            const allowedSortFields = ['createdAt', 'name'];
            if (allowedSortFields.includes(field)) {
                orderBy = { [field]: dir };
            }
        }

        const [rawCompanies, total] = await Promise.all([
            prisma.company.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            users: true,
                            customers: true,
                            facebookPages: true,
                            installedApps: true,
                            products: true,
                            orders: true,
                        }
                    },
                    businessSpecialty: {
                        select: {
                            id: true,
                            nameAr: true,
                            nameEn: true,
                            slug: true,
                            icon: true,
                        }
                    },
                    wallet: {
                        select: {
                            balance: true,
                            currency: true,
                        }
                    },
                    platformSubscription: {
                        select: {
                            id: true,
                            status: true,
                            monthlyFee: true,
                            billingDay: true,
                            nextBillingDate: true,
                            trialEndDate: true,
                            lastBillingDate: true,
                            failedAttempts: true,
                        }
                    }
                },
                ...(prismaSkip !== undefined ? { skip: prismaSkip } : {}),
                ...(prismaTake !== undefined ? { take: prismaTake } : {}),
                orderBy
            }),
            prisma.company.count({ where })
        ]);

        const companies = [];
        for (const company of rawCompanies) {
            if (!company.slug) await ensureCompanySlug(company, { prisma });
            const followUp = await getCompanyFollowUpFromDb(prisma, company);
            const installedApps = await prisma.companyApp.findMany({
                where: { companyId: company.id },
                include: { app: { select: { name: true, slug: true, category: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });
            companies.push({
                ...company,
                followUp,
                installedApps: installedApps.map((ca) => ({
                    id: ca.id,
                    appName: ca.app.name,
                    appSlug: ca.app.slug,
                    category: ca.app.category,
                    status: ca.status,
                })),
                installedAppsCount: company._count?.installedApps || 0,
            });
        }

        const [
            totalCompanies,
            activeCompanies,
            connectedFacebookPages,
            followUpNow,
            myDueToday,
            escalationDue,
            stale72h,
            trialCompanies,
            onboardingStuck,
            activeStores,
        ] = await Promise.all([
            prisma.company.count(),
            prisma.company.count({ where: { isActive: true } }),
            prisma.facebookPage.count(),
            prisma.company.count({ where: buildSavedViewWhere('FOLLOW_UP_NOW') }),
            prisma.company.count({ where: buildSavedViewWhere('MY_TODAY') }),
            prisma.company.count({ where: buildSavedViewWhere('ESCALATION_DUE') }),
            prisma.company.count({ where: buildSavedViewWhere('STALE_72H') }),
            prisma.company.count({ where: buildSavedViewWhere('TRIAL') }),
            prisma.company.count({ where: buildSavedViewWhere('ONBOARDING_STUCK') }),
            prisma.company.count({ where: buildSavedViewWhere('ACTIVE_STORES') }),
        ]);

        const finalPageSize = prismaTake ?? total;
        const totalPages = prismaTake ? Math.ceil(total / prismaTake) : 1;

        res.json({
            success: true,
            message: 'تم جلب الشركات بنجاح',
            data: { companies, total, page, pageSize: finalPageSize, totalPages },
            meta: {
                stats: {
                    totalCompanies,
                    activeCompanies,
                    connectedFacebookPages,
                    followUpNow,
                    myDueToday,
                    escalationDue,
                    urgentEscalationDue: 0,
                    stale72h,
                    trialCompanies,
                    onboardingStuck,
                    activeStores,
                },
            },
        });

    } catch (error) {
        console.error('❌ Error fetching companies:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الشركات',
            error: error.message
        });
    }
};

const getCompanyDetails = async (req, res) => {
    try {
        const { companyId } = req.params;
        const prisma = getSharedPrismaClient();
        let company;

        try {
            company = await executeWithRetry(async () => {
                return await prisma.company.findUnique({
                    where: { id: companyId },
                    include: buildCompanyDetailsInclude(),
                });
            });
        } catch (error) {
            if (!isMissingTableError(error, 'platform_signup_coupon_redemptions')) {
                throw error;
            }

            console.warn(
                '⚠️ [ADMIN_COMPANY_DETAILS] Missing coupon redemption table, retrying without coupon joins',
                { companyId },
            );

            company = await executeWithRetry(async () => {
                return await prisma.company.findUnique({
                    where: { id: companyId },
                    include: buildCompanyDetailsInclude({
                        includeCouponRedemptions: false,
                    }),
                });
            });
        }

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const { start: periodStart, end: periodEnd } = getCurrentMonthWindow();
        const adjustedLimits = {};
        const bonusSnapshot = {};

        const [
            employeeCount,
            ordersThisMonth,
            installedApps,
            allInstalledApps,
            usageAggregate,
            usageBreakdown,
            usageByApp,
            recentInvoices,
            recentPayments,
            recentReceipts,
            pendingReceipts,
            recentBillingHistory,
            invoiceStats,
            paymentStats,
        ] = await executeWithRetry(async () => {
            return await Promise.all([
                prisma.employee.count({
                    where: { companyId },
                }),
                prisma.order.count({
                    where: {
                        companyId,
                        createdAt: {
                            gte: periodStart,
                            lte: periodEnd,
                        },
                    },
                }),
                prisma.companyApp.findMany({
                    where: {
                        companyId,
                        app: {
                            category: {
                                notIn: ['THEME', 'TEMPLATE'],
                            },
                        },
                    },
                    include: {
                        app: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                }),
                prisma.companyApp.findMany({
                    where: { companyId },
                    include: { app: true },
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.appUsageLog.aggregate({
                    where: {
                        companyApp: { companyId },
                        createdAt: {
                            gte: periodStart,
                            lte: periodEnd,
                        },
                    },
                    _sum: {
                        totalCost: true,
                        quantity: true,
                    },
                    _count: {
                        id: true,
                    },
                }),
                prisma.appUsageLog.groupBy({
                    by: ['feature'],
                    where: {
                        companyApp: { companyId },
                        createdAt: {
                            gte: periodStart,
                            lte: periodEnd,
                        },
                    },
                    _sum: {
                        totalCost: true,
                        quantity: true,
                    },
                    _count: {
                        _all: true,
                    },
                }),
                prisma.appUsageLog.groupBy({
                    by: ['companyAppId'],
                    where: {
                        companyApp: { companyId },
                        createdAt: {
                            gte: periodStart,
                            lte: periodEnd,
                        },
                    },
                    _sum: {
                        totalCost: true,
                        quantity: true,
                    },
                    _count: {
                        _all: true,
                    },
                }),
                prisma.invoice.findMany({
                    where: { companyId },
                    orderBy: { createdAt: 'desc' },
                    take: REVIEW_RECENT_LIMIT,
                    include: {
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                status: true,
                                paidAt: true,
                                method: true,
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 2,
                        },
                        paymentReceipts: {
                            select: {
                                id: true,
                                status: true,
                                submittedAt: true,
                                reviewedAt: true,
                            },
                            orderBy: { submittedAt: 'desc' },
                            take: 1,
                        },
                    },
                }),
                prisma.payment.findMany({
                    where: { companyId },
                    orderBy: { createdAt: 'desc' },
                    take: REVIEW_RECENT_LIMIT,
                    include: {
                        invoice: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                notes: true,
                                status: true,
                                totalAmount: true,
                                dueDate: true,
                            },
                        },
                    },
                }),
                prisma.paymentReceipt.findMany({
                    where: {
                        invoice: {
                            is: {
                                companyId,
                            },
                        },
                    },
                    orderBy: { submittedAt: 'desc' },
                    take: REVIEW_RECENT_LIMIT,
                    include: {
                        invoice: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                notes: true,
                                totalAmount: true,
                                currency: true,
                                status: true,
                            },
                        },
                        walletNumber: {
                            select: {
                                id: true,
                                name: true,
                                number: true,
                            },
                        },
                    },
                }),
                prisma.paymentReceipt.count({
                    where: {
                        status: 'PENDING',
                        invoice: {
                            is: {
                                companyId,
                            },
                        },
                    },
                }),
                prisma.billingHistory.findMany({
                    where: { companyId },
                    orderBy: { createdAt: 'desc' },
                    take: REVIEW_RECENT_LIMIT,
                }),
                prisma.invoice.groupBy({
                    by: ['status'],
                    where: { companyId },
                    _count: {
                        _all: true,
                    },
                }),
                prisma.payment.groupBy({
                    by: ['status'],
                    where: { companyId },
                    _count: {
                        _all: true,
                    },
                }),
                prisma.companyApp.findMany({
                    where: { companyId },
                    include: {
                        app: {
                            select: {
                                id: true, slug: true, name: true, category: true,
                                pricingModel: true, monthlyPrice: true, yearlyPrice: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
        });

        const couponRedemption = company.platformSignupCouponRedemptions?.[0] || null;
        const coupon =
            couponRedemption?.coupon ||
            (company.signupCouponCode
                ? await findCouponByCode(company.signupCouponCode, prisma)
                : null);


        const usageLookup = new Map(
            usageByApp.map((entry) => [
                entry.companyAppId,
                {
                    totalCost: toNumber(entry._sum?.totalCost),
                    totalQuantity: entry._sum?.quantity || 0,
                    totalActions: entry._count?._all || 0,
                },
            ]),
        );

        const activeApps = installedApps.filter((item) =>
            ACTIVE_COMPANY_APP_STATUSES.includes(item.status),
        );

        const subscriptionCost = activeApps.reduce((sum, item) => {
            if (!['SUBSCRIPTION', 'HYBRID'].includes(item.app?.pricingModel)) {
                return sum;
            }

            return sum + toNumber(item.app?.monthlyPrice);
        }, 0);

        const resolvedSubscription =
            company.platformSubscription ||
            buildSyntheticPlatformSubscription(company, 0);
        const currentSeats = Math.max(toNumber(company._count?.users), toNumber(employeeCount));

        const invoiceStatsMap = invoiceStats.reduce((acc, entry) => {
            acc[entry.status] = entry._count?._all || 0;
            return acc;
        }, {});

        const paymentStatsMap = paymentStats.reduce((acc, entry) => {
            acc[entry.status] = entry._count?._all || 0;
            return acc;
        }, {});

        const review = {
            wallet: {
                balance: toNumber(company.wallet?.balance),
                currency: company.wallet?.currency || company.currency || 'EGP',
                totalSpent: toNumber(company.wallet?.totalSpent),
                totalDeposited: toNumber(company.wallet?.totalDeposited),
                updatedAt: company.wallet?.updatedAt || null,
                recentTransactions: Array.isArray(company.wallet?.transactions)
                    ? company.wallet.transactions.map(serializeWalletTransaction)
                    : [],
            },
            subscription: {
                id: resolvedSubscription.id,
                monthlyFee: toNumber(resolvedSubscription.monthlyFee),
                status: resolvedSubscription.status || 'ACTIVE',
                billingDay: resolvedSubscription.billingDay || 1,
                nextBillingDate: resolvedSubscription.nextBillingDate || null,
                lastBillingDate: resolvedSubscription.lastBillingDate || null,
                failedAttempts: resolvedSubscription.failedAttempts || 0,
                isFallback: Boolean(resolvedSubscription.isFallback),
            },
            usage: {
                period: {
                    start: periodStart,
                    end: periodEnd,
                },
                costs: {
                    subscriptions: subscriptionCost,
                    usage: toNumber(usageAggregate._sum?.totalCost),
                    total:
                        subscriptionCost +
                        toNumber(usageAggregate._sum?.totalCost),
                },
                totalQuantity: usageAggregate._sum?.quantity || 0,
                totalActions: usageAggregate._count?.id || 0,
                activeApps: activeApps.length,
                usageBreakdown: usageBreakdown.map((entry) => ({
                    feature: entry.feature || 'غير مصنف',
                    totalCost: toNumber(entry._sum?.totalCost),
                    totalQuantity: entry._sum?.quantity || 0,
                    totalActions: entry._count?._all || 0,
                })),
                installedApps: installedApps.map((companyApp) => {
                    const monthlyUsage = usageLookup.get(companyApp.id) || {
                        totalCost: 0,
                        totalQuantity: 0,
                        totalActions: 0,
                    };

                    return {
                        id: companyApp.id,
                        status: companyApp.status,
                        trialEndsAt: companyApp.trialEndsAt,
                        validUntil: companyApp.validUntil,
                        nextBillingAt: companyApp.nextBillingAt,
                        totalSpent: toNumber(companyApp.totalSpent),
                        createdAt: companyApp.createdAt,
                        updatedAt: companyApp.updatedAt,
                        monthlyUsage,
                        app: companyApp.app
                            ? {
                                id: companyApp.app.id,
                                slug: companyApp.app.slug,
                                name: companyApp.app.name,
                                category: companyApp.app.category,
                                pricingModel: companyApp.app.pricingModel,
                                monthlyPrice: toNumber(companyApp.app.monthlyPrice),
                                yearlyPrice: toNumber(companyApp.app.yearlyPrice),
                            }
                            : null,
                    };
                }),
                allInstalledApps: allInstalledApps.map((companyApp) => ({
                    id: companyApp.id,
                    status: companyApp.status,
                    appSlug: companyApp.app?.slug,
                    appName: companyApp.app?.name,
                    category: companyApp.app?.category,
                    pricingModel: companyApp.app?.pricingModel,
                })),
            },
            limits: {
                features: {
                    advancedReports: Boolean(adjustedLimits?.hasAdvancedReports),
                    apiAccess: Boolean(adjustedLimits?.hasAPIAccess),
                },
                bonuses: {
                    couponCode: company.signupCouponCode || null,
                    ...bonusSnapshot,
                },
                coupon: coupon
                    ? {
                        ...serializeCoupon(coupon),
                        appliedCode:
                            couponRedemption?.appliedCode ||
                            company.signupCouponCode ||
                            coupon.code,
                        redeemedAt: couponRedemption?.redeemedAt || null,
                    }
                    : null,
                entries: [
                    buildLimitEntry({
                        key: 'users',
                        label: 'الأعضاء',
                        current: currentSeats,
                        limit: adjustedLimits?.maxEmployees,
                        bonus: bonusSnapshot.bonusUsers,
                    }),
                    buildLimitEntry({
                        key: 'products',
                        label: 'المنتجات',
                        current: toNumber(company._count?.products),
                        limit: adjustedLimits?.maxProducts,
                        bonus: bonusSnapshot.bonusProducts,
                    }),
                    buildLimitEntry({
                        key: 'orders',
                        label: 'طلبات الشهر',
                        current: ordersThisMonth,
                        limit: adjustedLimits?.maxOrdersPerMonth,
                        bonus: bonusSnapshot.bonusOrdersPerMonth,
                    }),
                    buildLimitEntry({
                        key: 'customers',
                        label: 'العملاء',
                        current: toNumber(company._count?.customers),
                        limit: adjustedLimits?.maxCustomers,
                        bonus: bonusSnapshot.bonusCustomers,
                    }),
                ],
            },
            billing: {
                stats: {
                    totalInvoices: Object.values(invoiceStatsMap).reduce((sum, value) => sum + value, 0),
                    unpaidInvoices:
                        (invoiceStatsMap.DRAFT || 0) +
                        (invoiceStatsMap.SENT || 0) +
                        (invoiceStatsMap.OVERDUE || 0),
                    overdueInvoices: invoiceStatsMap.OVERDUE || 0,
                    paidInvoices: invoiceStatsMap.PAID || 0,
                    totalPayments: Object.values(paymentStatsMap).reduce((sum, value) => sum + value, 0),
                    failedPayments: paymentStatsMap.FAILED || 0,
                    pendingPayments: paymentStatsMap.PENDING || 0,
                    pendingReceipts,
                },
                recentInvoices: recentInvoices.map(serializeInvoiceSummary),
                recentPayments: recentPayments.map(serializePaymentSummary),
                recentReceipts: recentReceipts.map(serializeReceiptSummary),
                recentHistory: recentBillingHistory.map(serializeBillingHistoryEntry),
            },
        };

        res.json({
            success: true,
            message: 'تم جلب بيانات الشركة بنجاح',
            data: {
                company: {
                    ...company,
                    followUp: await getCompanyFollowUpFromDb(prisma, company),
                },
                review,
            }
        });

    } catch (error) {
        console.error('❌ Error fetching company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب بيانات الشركة',
            error: error.message
        });
    }
};

const getFollowUpOwners = async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();
        const owners = await prisma.user.findMany({
            where: {
                isActive: true,
                role: {
                    in: FOLLOW_UP_OWNER_ROLES,
                },
            },
            select: FOLLOW_UP_OWNER_SELECT,
            orderBy: [
                { role: 'asc' },
                { firstName: 'asc' },
                { lastName: 'asc' },
            ],
        });

        res.json({
            success: true,
            message: 'تم جلب مسؤولي المتابعة بنجاح',
            data: {
                owners: owners.map(serializeFollowUpOwner),
                statuses: FOLLOW_UP_STATUSES,
            },
        });
    } catch (error) {
        console.error('❌ Error fetching follow-up owners:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب مسؤولي المتابعة',
            error: error.message,
        });
    }
};

const updateCompanyFollowUp = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            assignedOwnerId,
            status,
            note,
            clearOwner,
            nextActionAt,
            clearNextAction,
            markReminderSent,
            markEscalated,
            clearReminderLog,
            clearEscalationLog,
            callStatus,
            callDuration,
        } = req.body || {};
        const prisma = getSharedPrismaClient();

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                settings: true,
            },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة',
            });
        }

        let assignedOwnerPatch = {};
        let selectedOwner = null;

        const normalizedAssignedOwnerId = cleanString(assignedOwnerId);
        const shouldClearOwner =
            clearOwner === true ||
            assignedOwnerId === '' ||
            assignedOwnerId === null;

        if (normalizedAssignedOwnerId) {
            selectedOwner = await prisma.user.findFirst({
                where: {
                    id: normalizedAssignedOwnerId,
                    isActive: true,
                    role: {
                        in: FOLLOW_UP_OWNER_ROLES,
                    },
                },
                select: FOLLOW_UP_OWNER_SELECT,
            });

            if (!selectedOwner) {
                return res.status(400).json({
                    success: false,
                    message: 'مسؤول المتابعة غير صالح أو غير نشط',
                });
            }

            assignedOwnerPatch = {
                assignedOwnerId: selectedOwner.id,
                assignedOwnerName: [selectedOwner.firstName, selectedOwner.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim(),
                assignedOwnerEmail: selectedOwner.email,
                assignedOwnerRole: selectedOwner.role,
            };
        }

        const merged = mergeCompanyFollowUpSettings(
            company.settings,
            {
                ...assignedOwnerPatch,
                status,
                note,
                callStatus,
                callDuration,
                clearOwner: shouldClearOwner,
                nextActionAt,
                clearNextAction,
                markReminderSent,
                markEscalated,
                clearReminderLog,
                clearEscalationLog,
            },
            req.user,
        );

        if (!selectedOwner && merged.followUp.assignedOwner.id) {
            selectedOwner = await prisma.user.findFirst({
                where: {
                    id: merged.followUp.assignedOwner.id,
                    isActive: true,
                    role: {
                        in: FOLLOW_UP_OWNER_ROLES,
                    },
                },
                select: FOLLOW_UP_OWNER_SELECT,
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.company.update({
                where: { id: companyId },
                data: {
                    settings: merged.serializedSettings,
                },
            });

            await saveFollowUpToDb(tx, companyId, merged.followUp);
        });

        const automationActions = [];
        if (markReminderSent === true) {
            automationActions.push('reminder_sent');
        }
        if (markEscalated === true) {
            automationActions.push('escalated');
        }

        const notificationDeliveries = [];
        if (selectedOwner && automationActions.length > 0) {
            for (const action of automationActions) {
                const delivery = await notifyFollowUpOwner({
                    prisma,
                    company,
                    owner: selectedOwner,
                    followUp: merged.followUp,
                    actor: req.user,
                    action,
                });

                notificationDeliveries.push({
                    action,
                    notificationId: delivery.notification?.id || null,
                    browserPush: delivery.browserPush || null,
                    skipped: delivery.skipped,
                    reason: delivery.reason,
                });
            }
        }

        res.json({
            success: true,
            message: 'تم تحديث متابعة الشركة بنجاح',
            data: {
                followUp: merged.followUp,
                notificationDeliveries,
            },
        });
    } catch (error) {
        console.error('❌ Error updating company follow-up:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث متابعة الشركة',
            error: error.message,
        });
    }
};

const createNewCompany = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            website,
            currency = 'EGP',
            businessSpecialtyId,
            adminFirstName,
            adminLastName,
            adminEmail,
            adminPassword
        } = req.body;

        // Validation
        if (!name || !email || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
            return res.status(400).json({
                success: false,
                message: 'جميع الحقول المطلوبة يجب ملؤها'
            });
        }

        // Check if company email already exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { email }
        });

        if (existingCompany) {
            return res.status(400).json({
                success: false,
                message: 'شركة بهذا البريد الإلكتروني موجودة بالفعل'
            });
        }

        // Check if admin email already exists
        const existingUser = await getSharedPrismaClient().user.findUnique({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'مستخدم بهذا البريد الإلكتروني موجود بالفعل'
            });
        }

        let selectedSpecialty = null;
        if (businessSpecialtyId) {
            try {
                const businessSpecialtyService = require('../services/businessSpecialtyService');
                selectedSpecialty = await businessSpecialtyService.resolveSpecialtyForRegistration(businessSpecialtyId);
            } catch (specErr) {
                console.warn('⚠️ [SUPER_ADMIN_CREATE_COMPANY] Could not resolve specialty:', specErr.message);
            }
        }

        const uniqueSlug = await generateUniqueCompanySlug(name, {
            prisma: getSharedPrismaClient(),
            email
        });

        const registrationIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
        const registrationUserAgent = req.headers['user-agent'] || null;

        // Fetch platform default sidebar layout
        let defaultSidebarLayout = 'three-tier';
        try {
            const platformDefaultSidebar = await getSharedPrismaClient().systemSettings.findUnique({
                where: { systemName: 'platform_default_sidebar' },
            });
            if (platformDefaultSidebar?.config) {
                const config = JSON.parse(platformDefaultSidebar.config);
                if (config.layout) defaultSidebarLayout = config.layout;
            }
        } catch (e) {
            console.warn('Failed to fetch platform default sidebar:', e.message);
        }

        // Create company
        const company = await getSharedPrismaClient().company.create({
            data: {
                name,
                slug: uniqueSlug,
                email,
                phone,
                website,
                currency,
                isActive: true,
                // useCentralKeys field removed — key routing is now schema-agnostic
                sidebarLayout: defaultSidebarLayout,
                registration_ip: registrationIp,
                registration_user_agent: registrationUserAgent,
                businessSpecialty: selectedSpecialty?.id
                    ? { connect: { id: selectedSpecialty.id } }
                    : undefined,
            }
        });

        // Hash admin password
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Create admin user
        const adminUser = await getSharedPrismaClient().user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                firstName: adminFirstName,
                lastName: adminLastName,
                role: 'COMPANY_ADMIN',
                companyId: company.id,
                isActive: true,
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            }
        });

        // Link UserCompany membership
        try {
            await getSharedPrismaClient().userCompany.create({
                data: {
                    userId: adminUser.id,
                    companyId: company.id,
                    role: 'COMPANY_ADMIN',
                    isActive: true,
                    isDefault: true,
                }
            });
        } catch (ucErr) {
            console.warn('⚠️ [SUPER_ADMIN_CREATE_COMPANY] UserCompany link error:', ucErr.message);
        }

        // Auto-install specialty apps
        if (selectedSpecialty && Array.isArray(selectedSpecialty.appSlugs) && selectedSpecialty.appSlugs.length > 0) {
            try {
                const { initializeDefaultApps, initializeSaasTheme } = require('../utils/initializeCompanyDefaults');
                await initializeDefaultApps(company.id, {
                    specialtyAppSlugs: selectedSpecialty.appSlugs,
                    specialtySlug: selectedSpecialty.slug,
                    source: 'super-admin-specialty'
                });
                await initializeSaasTheme(company.id, {
                    themeId: selectedSpecialty.themeId || null
                });
            } catch (initAppsErr) {
                console.error('❌ [SUPER_ADMIN_CREATE_COMPANY] Failed to install specialty apps:', initAppsErr);
            }
        }

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الشركة بنجاح',
            data: {
                company,
                adminUser: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName
                }
            }
        });

    } catch (error) {
        console.error('❌ Error creating company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إنشاء الشركة',
            error: error.message
        });
    }
};

const updateCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            name,
            email,
            phone,
            website,
            currency,
            isActive,
            notes,
            businessSpecialtyId
        } = req.body;

        console.log(req.body);
        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if email is being changed and already exists
        if (email && email !== existingCompany.email) {
            const emailExists = await getSharedPrismaClient().company.findUnique({
                where: { email }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'شركة بهذا البريد الإلكتروني موجودة بالفعل'
                });
            }
        }

        // Update company
        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                ...(name !== undefined && { name }),
                ...(name !== undefined && !existingCompany.slug && {
                    slug: name.toLowerCase()
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '')
                }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(currency !== undefined && { currency }),
                ...(isActive !== undefined && { isActive }),
                ...(notes !== undefined && { notes }),
                ...(businessSpecialtyId !== undefined && {
                    businessSpecialtyId: businessSpecialtyId === "none" || !businessSpecialtyId ? null : businessSpecialtyId
                })
            },
            include: {
                businessSpecialty: {
                    select: {
                        id: true,
                        nameAr: true,
                        nameEn: true,
                        slug: true,
                        icon: true,
                    }
                }
            }
        });

        if (name && typeof name === "string" && name.trim()) {
            try {
                const sf = await getSharedPrismaClient().storefrontSettings.findUnique({
                    where: { companyId },
                });
                if (sf) {
                    let tokens = sf.designTokens;
                    if (typeof tokens === "string") {
                        try { tokens = JSON.parse(tokens); } catch (e) { tokens = {}; }
                    }
                    if (!tokens || typeof tokens !== "object") {
                        tokens = {};
                    }
                    tokens.storeName = name.trim();
                    await getSharedPrismaClient().storefrontSettings.update({
                        where: { companyId },
                        data: { designTokens: tokens },
                    });
                }
            } catch (sfErr) {
                console.warn("⚠️ Could not auto-sync storefrontSettings storeName on admin company update:", sfErr);
            }
        }

        res.json({
            success: true,
            message: 'تم تحديث الشركة بنجاح',
            data: { company: updatedCompany }
        });

    } catch (error) {
        console.error('❌ Error updating company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الشركة',
            error: error.message
        });
    }
};

const deleteCompany = async (req, res) => {
    try {
        const { companyId } = req.params;

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Check if company has any related data that might prevent deletion
        const companyData = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            include: {
                _count: {
                    select: {
                        users: true,
                        customers: true,
                        facebookPages: true,
                        products: true,
                        conversations: true
                    }
                }
            }
        });

        console.log(`Company data for deletion:`, companyData);

        // Delete related notifications first (missing onDelete: Cascade in schema)
        await getSharedPrismaClient().notification.deleteMany({
            where: { companyId }
        });

        // Delete hotel data first to avoid FK constraint issues
        await getSharedPrismaClient().hotelReservationRoom.deleteMany({
            where: { reservation: { companyId } }
        });
        await getSharedPrismaClient().hotelReservation.deleteMany({
            where: { companyId }
        });
        await getSharedPrismaClient().hotelFolioItem.deleteMany({
            where: { companyId }
        });
        await getSharedPrismaClient().hotelRoom.deleteMany({
            where: { companyId }
        });
        await getSharedPrismaClient().hotelRoomType.deleteMany({
            where: { companyId }
        });
        await getSharedPrismaClient().hotelProperty.deleteMany({
            where: { companyId }
        });

        await getSharedPrismaClient().company.delete({
            where: { id: companyId }
        });

        res.json({
            success: true,
            message: 'تم حذف الشركة بنجاح'
        });

    } catch (error) {
        console.error('❌ Error deleting company:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الشركة',
            error: error.message
        });
    }
};

const searchFacebookPages = async (req, res) => {
    try {
        const rawQuery = req.query.query || req.query.search || req.query.value || '';
        const query = String(rawQuery || '').trim();

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال اسم الصفحة أو معرفها للبحث'
            });
        }

        const normalizedQuery = query
            .replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')
            .replace(/^https?:\/\/(m\.)?facebook\.com\//i, '')
            .replace(/^https?:\/\/(web\.)?facebook\.com\//i, '')
            .replace(/^fb\.com\//i, '')
            .replace(/^@/, '')
            .split(/[/?#]/)[0]
            .trim();

        const searchTerms = Array.from(
            new Set([query, normalizedQuery].filter(Boolean))
        );

        const orConditions = [];
        searchTerms.forEach((term) => {
            orConditions.push({ pageId: term });
            orConditions.push({
                pageName: { contains: term, mode: 'insensitive' }
            });
        });

        const pages = await getSharedPrismaClient().facebookPage.findMany({
            where: { OR: orConditions },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        email: true,

                        isActive: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 25
        });

        const results = pages.map((page) => ({
            id: page.id,
            pageId: page.pageId,
            pageName: page.pageName,
            status: page.status,
            connectedAt: page.connectedAt,
            updatedAt: page.updatedAt,
            companyId: page.companyId,
            company: page.company || null,
            isRegistered: Boolean(page.companyId)
        }));

        res.json({
            success: true,
            message: 'تم البحث عن الصفحات بنجاح',
            data: {
                query,
                normalizedQuery,
                total: results.length,
                results
            }
        });

    } catch (error) {
        console.error('❌ Error searching Facebook pages:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في البحث عن صفحات فيسبوك',
            error: error.message
        });
    }
};

const getCompanyFacebookPages = async (req, res) => {
    try {
        const { companyId } = req.params;
        console.log(`Fetching Facebook pages for company ID: ${companyId}`);

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            console.log(`Company not found for ID: ${companyId}`);
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        console.log(`Company found: ${existingCompany.name}`);

        // Get Facebook pages for this company
        const facebookPages = await getSharedPrismaClient().facebookPage.findMany({
            where: { companyId: companyId },
            select: {
                id: true,
                pageId: true,
                pageName: true,
                status: true,
                connectedAt: true,
                disconnectedAt: true, // Added this field which exists in the model
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                connectedAt: 'desc'
            }
        });

        console.log(`Found ${facebookPages.length} Facebook pages for company ${companyId}`);
        res.json({
            success: true,
            message: 'تم جلب صفحات الفيسبوك بنجاح',
            data: facebookPages
        });

    } catch (error) {
        console.error('❌ Error fetching Facebook pages:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب صفحات الفيسبوك',
            error: error.message
        });
    }
};

const loginAsCompanyAdmin = async (req, res) => {
    try {
        const { companyId } = req.params;

        console.log('🚀 [LOGIN_AS_ADMIN] Start for companyId:', companyId);
        console.log('👤 [LOGIN_AS_ADMIN] Requesting User:', req.user);

        // Check if company exists
        const existingCompany = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!existingCompany) {
            console.log('❌ [LOGIN_AS_ADMIN] Company not found');
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }
        console.log('✅ [LOGIN_AS_ADMIN] Company found:', existingCompany.name);

        // Find the company admin user or owner
        const adminUser = await getSharedPrismaClient().user.findFirst({
            where: {
                companyId: companyId,
                role: { in: ['COMPANY_ADMIN', 'OWNER'] },
                isActive: true
            },
            orderBy: {
                role: 'asc' // Prioritize COMPANY_ADMIN if both exist (C comes before O)
            }
        });

        if (!adminUser) {
            console.log('❌ [LOGIN_AS_ADMIN] No active admin/owner found for company:', companyId);
            return res.status(404).json({
                success: false,
                message: 'لم يتم العثور على مدير أو مالك نشط للشركة'
            });
        }
        console.log('✅ [LOGIN_AS_ADMIN] User found:', adminUser.email, 'Role:', adminUser.role);

        // Generate JWT token for the admin user
        const token = jwt.sign(
            {
                userId: adminUser.id,
                email: adminUser.email,
                role: adminUser.role,
                companyId: adminUser.companyId
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('✅ [LOGIN_AS_ADMIN] Token generated');

        // ✅ Log the impersonation event
        console.log('📝 [LOGIN_AS_ADMIN] Creating ActivityLog...');
        try {
            await getSharedPrismaClient().activityLog.create({
                data: {
                    userId: req.user.id, // Super Admin ID
                    companyId: existingCompany.id,
                    action: 'IMPERSONATE',
                    category: 'AUTH',
                    description: `Super Admin (${req.user.email}) logged in as Company Admin (${adminUser.email}) for company: ${existingCompany.name}`,
                    isSuccess: true,
                    severity: 'HIGH',
                    metadata: JSON.stringify({
                        targetAdminId: adminUser.id,
                        targetCompanyId: existingCompany.id,
                        superAdminEmail: req.user.email,
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.headers['user-agent']
                    })
                }
            });
            console.log('✅ [LOGIN_AS_ADMIN] ActivityLog created');
        } catch (logError) {
            console.error('⚠️ [LOGIN_AS_ADMIN] Failed to create ActivityLog:', logError);
            // Don't fail the request if logging fails, just continue
        }

        res.json({
            success: true,
            message: 'تم تسجيل الدخول كمدير الشركة بنجاح',
            data: {
                token,
                user: {
                    id: adminUser.id,
                    email: adminUser.email,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    role: adminUser.role,
                    companyId: adminUser.companyId
                }
            }
        });

    } catch (error) {
        console.error('❌ Error logging in as company admin:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تسجيل الدخول كمدير الشركة',
            error: error.message
        });
    }
};

const getStatistics = async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();

        const [
            totalCompanies,
            activeCompanies,
            totalUsers,
            totalCustomers,
            totalConversations,
            totalMessages,
        ] = await Promise.all([
            prisma.company.count(),
            prisma.company.count({ where: { isActive: true } }),
            prisma.user.count(),
            prisma.customer.count(),
            prisma.conversation.count(),
            prisma.message.count(),
        ]);

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            newCompaniesLast30Days,
            newUsersLast30Days,
            newCustomersLast30Days
        ] = await Promise.all([
            prisma.company.count({
                where: { createdAt: { gte: thirtyDaysAgo } }
            }),
            prisma.user.count({
                where: { createdAt: { gte: thirtyDaysAgo } }
            }),
            prisma.customer.count({
                where: { createdAt: { gte: thirtyDaysAgo } }
            })
        ]);

        res.json({
            success: true,
            message: 'تم جلب إحصائيات النظام بنجاح',
            data: {
                overview: {
                    totalCompanies,
                    activeCompanies,
                    inactiveCompanies: totalCompanies - activeCompanies,
                    totalUsers,
                    totalCustomers,
                    totalConversations,
                    totalMessages
                },
                recentActivity: {
                    newCompaniesLast30Days,
                    newUsersLast30Days,
                    newCustomersLast30Days
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب الإحصائيات',
            error: error.message
        });
    }
};

const bulkDeleteCompanies = async (req, res) => {
    try {
        const { companyIds } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب تحديد شركات للحذف'
            });
        }

        console.log(`🗑️ [BULK DELETE] Deleting ${companyIds.length} companies...`);

        // deleteMany does NOT cascade in Prisma; use individual delete() in a transaction
        const prisma = getSharedPrismaClient();
        const result = await prisma.$transaction(async (tx) => {
            let count = 0;
            for (const id of companyIds) {
                try {
                    await tx.company.delete({ where: { id } });
                    count++;
                } catch (err) {
                    console.warn(`⚠️ [BULK DELETE] Skipping company ${id}: ${err.message}`);
                }
            }
            return { count };
        });

        console.log(`✅ [BULK DELETE] Deleted ${result.count} companies`);

        res.json({
            success: true,
            message: `تم حذف ${result.count} شركة بنجاح`,
            data: { count: result.count }
        });

    } catch (error) {
        console.error('❌ Error in bulk delete:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الشركات المحددة',
            error: error.message
        });
    }
};

const bulkUpdateCompanyStatus = async (req, res) => {
    try {
        const { companyIds, isActive } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب تحديد شركات للتحديث'
            });
        }

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'حالة النشاط غير صحيحة'
            });
        }

        console.log(`🔄 [BULK STATUS] Updating ${companyIds.length} companies to isActive=${isActive}...`);

        const result = await getSharedPrismaClient().company.updateMany({
            where: {
                id: {
                    in: companyIds
                }
            },
            data: {
                isActive: isActive
            }
        });

        console.log(`✅ [BULK STATUS] Updated ${result.count} companies`);

        res.json({
            success: true,
            message: `تم تحديث حالة ${result.count} شركة بنجاح`,
            data: { count: result.count }
        });

    } catch (error) {
        console.error('❌ Error in bulk status update:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث حالة الشركات',
            error: error.message
        });
    }
};



const forceTransferOwnership = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { newOwnerEmail, targetUserId } = req.body;

        if (!newOwnerEmail && !targetUserId) {
            return res.status(400).json({ success: false, message: 'مطلوب البريد الإلكتروني أو معرف المالك الجديد' });
        }

        const prisma = getSharedPrismaClient();

        // 1. Find the company and current owner
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: {
                    where: { role: 'OWNER' }
                }
            }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
        }

        // 2. Find the new owner user
        let newOwnerUser;
        if (targetUserId) {
            newOwnerUser = await prisma.user.findUnique({
                where: { id: targetUserId }
            });
        } else {
            newOwnerUser = await prisma.user.findUnique({
                where: { email: newOwnerEmail }
            });
        }

        if (!newOwnerUser) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            // 3. Downgrade current owner(s) to COMPANY_ADMIN
            if (company.users.length > 0) {
                const currentOwnerIds = company.users.map(u => u.id);

                // Update UserCompany records
                await tx.userCompany.updateMany({
                    where: {
                        companyId: companyId,
                        userId: { in: currentOwnerIds }
                    },
                    data: { role: 'COMPANY_ADMIN' }
                });
            }

            // 4. Assign new owner
            // Check if user is already in company
            const userCompany = await tx.userCompany.findUnique({
                where: {
                    userId_companyId: {
                        userId: newOwnerUser.id,
                        companyId: companyId
                    }
                }
            });

            if (userCompany) {
                // Update existing relation
                await tx.userCompany.update({
                    where: {
                        userId_companyId: {
                            userId: newOwnerUser.id,
                            companyId: companyId
                        }
                    },
                    data: { role: 'OWNER' }
                });
            } else {
                // Create new relation
                await tx.userCompany.create({
                    data: {
                        userId: newOwnerUser.id,
                        companyId: companyId,
                        role: 'OWNER',
                        isActive: true
                    }
                });
            }

            // Also update the main user role to OWNER if they are now an owner
            await tx.user.update({
                where: { id: newOwnerUser.id },
                data: { role: 'OWNER' }
            });
        });

        res.json({
            success: true,
            message: `تم نقل الملكية بنجاح إلى ${newOwnerEmail}`
        });

    } catch (error) {
        console.error('❌ Error transferring ownership:', error);
        res.status(500).json({ success: false, message: 'فشل في نقل الملكية', error: error.message });
    }
};

const addEmployeeToCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { firstName, lastName, email, password, role = 'COMPANY_ADMIN' } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
        }

        const prisma = getSharedPrismaClient();

        // Check company exists
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
        }

        // Check if user exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // User exists, check if already in company
            const existingLink = await prisma.userCompany.findUnique({
                where: {
                    userId_companyId: {
                        userId: user.id,
                        companyId: companyId
                    }
                }
            });

            if (existingLink) {
                return res.status(400).json({ success: false, message: 'المستخدم موجود بالفعل في هذه الشركة' });
            }

            // Update user password and name if provided by Super Admin
            const userUpdateData = { isActive: true };
            if (password) {
                userUpdateData.password = await bcrypt.hash(password, 12);
            }
            if (firstName) userUpdateData.firstName = firstName;
            if (lastName) userUpdateData.lastName = lastName;

            await prisma.user.update({
                where: { id: user.id },
                data: userUpdateData
            });

            // Add to company
            await prisma.userCompany.create({
                data: {
                    userId: user.id,
                    companyId: companyId,
                    role: role,
                    isActive: true
                }
            });

        } else {
            // Create New User
            const hashedPassword = await bcrypt.hash(password, 12);
            user = await prisma.user.create({
                data: {
                    email,
                    firstName,
                    lastName,
                    password: hashedPassword,
                    role: 'COMPANY_ADMIN', // Default system role
                    companyId: companyId, // Set as default company
                    isActive: true,
                    isEmailVerified: true,
                    userCompanies: {
                        create: {
                            companyId: companyId,
                            role: role
                        }
                    }
                }
            });
        }

        res.json({
            success: true,
            message: 'تم إضافة الموظف بنجاح',
            data: { user }
        });

    } catch (error) {
        console.error('❌ Error adding employee:', error);
        res.status(500).json({ success: false, message: 'فشل في إضافة الموظف', error: error.message });
    }
};

const toggleCompanyFeature = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { feature, enabled } = req.body;

        if (!feature) {
            return res.status(400).json({ success: false, message: 'feature is required' });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
        }

        const currentSettings = company.settings ? JSON.parse(company.settings) : {};
        currentSettings[feature] = enabled;

        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(currentSettings) }
        });

        return res.json({ success: true, settings: currentSettings });
    } catch (error) {
        console.error('Error toggling company feature:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
};

const setCompanyTrial = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { action } = req.body || {};
        const durationDays = Number(req.body?.durationDays);

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true, name: true, trialModeEnabled: true, trialEndsAt: true },
        });

        if (!company) {
            return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
        }

        if (action === 'activate') {
            if (!Number.isFinite(durationDays) || durationDays <= 0) {
                return res.status(400).json({ success: false, message: 'حدد مدة الفترة التجريبية بالأيام (رقم أكبر من صفر)' });
            }

            const now = new Date();
            const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

            await prisma.company.update({
                where: { id: companyId },
                data: { trialModeEnabled: true, trialStartedAt: now, trialEndsAt: endsAt },
            });

            return res.json({
                success: true,
                message: `تم تفعيل الفترة التجريبية المجانية لـ ${company.name} لمدة ${durationDays} يوم`,
                data: { trialModeEnabled: true, trialStartedAt: now.toISOString(), trialEndsAt: endsAt.toISOString(), days: durationDays },
            });
        }

        if (action === 'deactivate') {
            await prisma.company.update({
                where: { id: companyId },
                data: { trialModeEnabled: false },
            });

            // تجميد التطبيقات المثبتة أثناء التجربة وفوترة الاستهلاك فوراً
            let frozen = 0;
            try {
                const { expireCompanyTrial } = require('../services/companyTrialService');
                const result = await expireCompanyTrial(companyId);
                frozen = result.frozen || 0;
            } catch (expireError) {
                console.error('[TRIAL-DEACTIVATE] Error expiring trial:', expireError.message);
            }

            return res.json({
                success: true,
                message: `تم إيقاف الفترة التجريبية وتجميد ${frozen} من التطبيقات`,
                data: { trialModeEnabled: false, frozen },
            });
        }

        if (action === 'status') {
            return res.json({
                success: true,
                data: {
                    trialModeEnabled: company.trialModeEnabled,
                    trialEndsAt: company.trialEndsAt || null,
                },
            });
        }

        return res.status(400).json({ success: false, message: 'action غير صالح (activate / deactivate / status)' });
    } catch (error) {
        console.error('Error setting company trial:', error);
        return res.status(500).json({ success: false, message: 'فشل في تحديث الفترة التجريبية', error: error.message });
    }
};

module.exports = {
    getAllCompanies,
    getCompanyDetails,
    getFollowUpOwners,
    updateCompanyFollowUp,
    createNewCompany,
    updateCompany,
    deleteCompany,
    searchFacebookPages,
    getCompanyFacebookPages,
    loginAsCompanyAdmin,
    getStatistics,
    bulkDeleteCompanies,
    bulkUpdateCompanyStatus,
    forceTransferOwnership,
    addEmployeeToCompany,
    toggleCompanyFeature,
    setCompanyTrial
};
