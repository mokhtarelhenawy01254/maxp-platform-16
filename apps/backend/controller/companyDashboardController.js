const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const { fromZonedTime } = require('date-fns-tz');
const { startOfDay, endOfDay, subDays, differenceInCalendarDays } = require('date-fns');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const { encrypt, decrypt } = require('../utils/encryption');
const { randomUUID } = require('crypto');
const {
    invalidateCompanySettingsCache,
    invalidateCompanyDashboardCache
} = require('../middleware/performanceOptimization');
const {
    parseCompanySettings,
    serializeCompanySettings
} = require('../utils/companyOnboarding');

const safeJsonParse = (value) => {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
        return {};
    }
};

const getCompanyIdFromRequest = (req) => req?.user?.effectiveCompanyId || req?.user?.companyId;
const DASHBOARD_EXCLUDED_ORDER_STATUSES = ['DRAFT', 'TRASH', 'DUPLICATE_ORDER'];
const DASHBOARD_OPEN_ORDER_STATUSES = ['PENDING', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING', 'SHIPPED'];
const COMPANY_DASHBOARD_OVERVIEW_SELECT = {
    id: true,
    name: true,
    slug: true,
    currency: true,
    phone: true,
    isActive: true,
    timezone: true,
    settings: true,
    _count: {
        select: {
            users: true,
            customers: true,
            products: true,
            orders: true,
            conversations: true
        }
    }
};

const toRoundedRate = (count, total) => (
    total > 0 ? parseFloat(((count / total) * 100).toFixed(2)) : 0
);

const sanitizeLinkForResponse = (link) => {
    if (!link || typeof link !== 'object') return null;
    const { passwordEncrypted, ...rest } = link;
    return {
        ...rest,
        hasPassword: Boolean(passwordEncrypted)
    };
};



const isDashboardCompatibilityError = (error) => {
    if (!error) {
        return false;
    }

    if (error.code === 'P2021' || error.code === 'P2022') {
        return true;
    }

    const message = String(error.message || '');
    return message.includes('invalid input value for enum');
};

const withDashboardFallback = async (label, operation, fallbackValue) => {
    try {
        return await operation();
    } catch (error) {
        if (!isDashboardCompatibilityError(error)) {
            throw error;
        }

        console.warn(`[DASHBOARD] Falling back for ${label}: ${error.message}`);
        return typeof fallbackValue === 'function' ? fallbackValue(error) : fallbackValue;
    }
};

const fetchCompanySpecialtyAndApps = async (companyId, prisma) => {
    let businessSpecialty = null;
    let installedApps = [];
    let specialtyMetrics = {};

    try {
        const companyWithSpecialty = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                businessSpecialty: {
                    select: {
                        id: true,
                        slug: true,
                        nameAr: true,
                        nameEn: true,
                        icon: true,
                        appSlugs: true
                    }
                }
            }
        });
        businessSpecialty = companyWithSpecialty?.businessSpecialty || null;
    } catch (e) {
        console.warn('[DASHBOARD] Could not fetch businessSpecialty:', e.message);
    }

    try {
        const rawApps = await prisma.companyApp.findMany({
            where: {
                companyId,
                status: { in: ['ACTIVE', 'TRIAL', 'EXPIRED', 'active', 'trial', 'expired'] }
            },
            include: {
                app: {
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        category: true,
                        icon: true,
                        monthlyPrice: true,
                        pricingModel: true,
                        description: true,
                        trialDays: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const now = new Date();
        installedApps = rawApps.map(item => {
            let daysLeft = null;
            if (item.status?.toUpperCase() === 'TRIAL' && item.trialEndsAt) {
                const diffMs = new Date(item.trialEndsAt).getTime() - now.getTime();
                daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            }
            return {
                id: item.id,
                appId: item.appId,
                slug: item.app?.slug || item.appId,
                name: item.app?.name || item.app?.slug || 'App',
                category: item.app?.category || 'general',
                icon: item.app?.icon || null,
                status: item.status,
                pricingModel: item.activePricingModel || item.app?.pricingModel || 'SUBSCRIPTION',
                monthlyPrice: item.app?.monthlyPrice ?? null,
                description: item.app?.description || null,
                trialEndsAt: item.trialEndsAt,
                daysRemainingInTrial: daysLeft,
                settings: item.settings,
                installedAt: item.createdAt
            };
        });
    } catch (e) {
        console.warn('[DASHBOARD] Could not fetch installedApps:', e.message);
    }

    try {
        const hasMedical = installedApps.some(a => ['medical-system', 'booking-app'].includes(a.slug)) || businessSpecialty?.slug === 'medical-clinics';
        if (hasMedical && prisma.appointment) {
            const [appointmentsCount, todayAppointments] = await Promise.all([
                prisma.appointment.count({ where: { companyId } }).catch(() => 0),
                prisma.appointment.count({
                    where: {
                        companyId,
                        date: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) }
                    }
                }).catch(() => 0)
            ]);
            specialtyMetrics.medical = {
                appointmentsCount,
                todayAppointments
            };
        }
    } catch (_) {}

    try {
        const hasDental = installedApps.some(a => a.slug === 'dental-lab-app') || businessSpecialty?.slug === 'dental-lab';
        if (hasDental && prisma.dentalLabCase) {
            const [activeCases, totalDoctors] = await Promise.all([
                prisma.dentalLabCase.count({ where: { companyId, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }).catch(() => 0),
                prisma.dentalLabDoctor ? prisma.dentalLabDoctor.count({ where: { companyId } }).catch(() => 0) : 0
            ]);
            specialtyMetrics.dentalLab = {
                activeCases,
                totalDoctors
            };
        }
    } catch (_) {}

    return { businessSpecialty, installedApps, specialtyMetrics };
};

const companyDashboardOverview = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        // Get company info
        console.log(`🔍 [DASHBOARD] Fetching dashboard for companyId: ${companyId}`);
        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: COMPANY_DASHBOARD_OVERVIEW_SELECT
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Map User to users for frontend compatibility
        const userCount = company._count.users || 0;

        const { startDate, endDate } = req.query;
        const timeZone = company.timezone || 'Africa/Cairo';
        const start = startDate
            ? startOfDay(fromZonedTime(startDate, timeZone))
            : subDays(new Date(), 7);
        const end = endDate
            ? endOfDay(fromZonedTime(endDate, timeZone))
            : new Date();
        const ordersWhereClause = {
            companyId,
            createdAt: { gte: start, lte: end }
        };
        const trackedOrdersWhereClause = {
            ...ordersWhereClause,
            status: {
                notIn: DASHBOARD_EXCLUDED_ORDER_STATUSES
            }
        };

        // ponytail: previous period = same length before `start`. One extra query batch, no caching layer needed yet.
        const periodDays = Math.max(differenceInCalendarDays(end, start), 1);
        const prevStart = subDays(start, periodDays);
        const prevEnd = subDays(start, 1);
        const prevOrdersWhereClause = {
            companyId,
            createdAt: { gte: prevStart, lte: prevEnd }
        };
        const prevTrackedOrdersWhereClause = {
            ...prevOrdersWhereClause,
            status: { notIn: DASHBOARD_EXCLUDED_ORDER_STATUSES }
        };

        const [
            newUsersCount,
            newCustomersCount,
            newConversationsCount,
            totalOrdersCount,
            trackedOrdersCount,
            confirmedOrdersCount,
            orderStatuses,
            orderItems,
            storeVisits,
            totalStoreVisits,
            lowStockCount,
            outOfStockCount,
            newOrdersCount,
            viewedOrdersCount,
            prevTrackedOrdersCount,
            prevOrderItems,
            prevStoreVisits,
            prevNewCustomersCount,
            revenueHistory
        ] = await Promise.all([
            withDashboardFallback('newUsersCount', () => getSharedPrismaClient().user.count({
                where: {
                    companyId,
                    createdAt: { gte: start, lte: end }
                }
            }), 0),
            withDashboardFallback('newCustomersCount', () => getSharedPrismaClient().customer.count({
                where: {
                    companyId,
                    createdAt: { gte: start, lte: end }
                }
            }), 0),
            withDashboardFallback('newConversationsCount', () => getSharedPrismaClient().conversation.count({
                where: {
                    companyId,
                    createdAt: { gte: start, lte: end }
                }
            }), 0),
            withDashboardFallback('totalOrdersCount', () => getSharedPrismaClient().order.count({
                where: ordersWhereClause
            }), 0),
            withDashboardFallback('trackedOrdersCount', () => getSharedPrismaClient().order.count({
                where: trackedOrdersWhereClause
            }), null),
            withDashboardFallback('confirmedOrdersCount', () => getSharedPrismaClient().order.count({
                where: {
                    ...trackedOrdersWhereClause,
                    confirmedAt: { not: null }
                }
            }), null),
            withDashboardFallback('orderStatuses', () => getSharedPrismaClient().order.findMany({
                where: trackedOrdersWhereClause,
                select: { status: true, customStatusCode: true, metadata: true }
            }).then(rows => {
                // 🛡️ PRODUCTION-FIX (custom-status-persist): عدّ بالحالة الفعلية (كود مخصص ←
                // تجهيز محوّلة ← enum) — بدل groupBy على الـ enum اللي بيخفي الحالات المخصصة.
                const { computeEffectiveOrderStatus } = require('../utils/orderEffectiveStatus');
                const counts = {};
                for (const row of rows) {
                    const key = computeEffectiveOrderStatus(row);
                    counts[key] = (counts[key] || 0) + 1;
                }
                return Object.entries(counts).map(([status, count]) => ({ status, _count: count }));
            }), []),
            withDashboardFallback('orderItems', () => getSharedPrismaClient().orderItem.findMany({
                where: {
                    order: {
                        is: trackedOrdersWhereClause
                    }
                },
                select: {
                    quantity: true,
                    total: true,
                    productName: true,
                    product: {
                        select: { name: true, cost: true }
                    }
                }
            }), []),
            withDashboardFallback('storeVisits', () => getSharedPrismaClient().storeVisit.count({
                where: {
                    companyId,
                    visitedAt: { gte: start, lte: end }
                }
            }), 0),
            withDashboardFallback('totalStoreVisits', () => getSharedPrismaClient().storeVisit.count({
                where: {
                    companyId
                }
            }), 0),
            withDashboardFallback('lowStockCount', () => getSharedPrismaClient().product.count({
                where: {
                    companyId,
                    trackInventory: true,
                    stock: { lte: 5 }
                }
            }), 0),
            withDashboardFallback('outOfStockCount', () => getSharedPrismaClient().product.count({
                where: {
                    companyId,
                    trackInventory: true,
                    stock: { lte: 0 }
                }
            }), 0),
            withDashboardFallback('newOrdersCount', () => Promise.all([
                getSharedPrismaClient().order.count({
                    where: {
                        companyId,
                        isViewed: false,
                        status: { notIn: DASHBOARD_EXCLUDED_ORDER_STATUSES }
                    }
                }),
                getSharedPrismaClient().guestOrder.count({
                    where: { companyId, isViewed: false }
                })
            ]).then(([orderCount, guestCount]) => orderCount + guestCount), 0),
            withDashboardFallback('viewedOrdersCount', () => Promise.all([
                getSharedPrismaClient().order.count({
                    where: {
                        companyId,
                        isViewed: true,
                        status: { notIn: DASHBOARD_EXCLUDED_ORDER_STATUSES }
                    }
                }),
                getSharedPrismaClient().guestOrder.count({
                    where: { companyId, isViewed: true }
                })
            ]).then(([orderCount, guestCount]) => orderCount + guestCount), 0),
            withDashboardFallback('prevTrackedOrdersCount', () => getSharedPrismaClient().order.count({
                where: prevTrackedOrdersWhereClause
            }), 0),
            withDashboardFallback('prevOrderItems', () => getSharedPrismaClient().orderItem.findMany({
                where: {
                    order: {
                        is: prevTrackedOrdersWhereClause
                    }
                },
                select: {
                    quantity: true,
                    total: true,
                    product: { select: { cost: true } }
                }
            }), []),
            withDashboardFallback('prevStoreVisits', () => getSharedPrismaClient().storeVisit.count({
                where: {
                    companyId,
                    visitedAt: { gte: prevStart, lte: prevEnd }
                }
            }), 0),
            withDashboardFallback('prevNewCustomersCount', () => getSharedPrismaClient().customer.count({
                where: {
                    companyId,
                    createdAt: { gte: prevStart, lte: prevEnd }
                }
            }), 0),
            withDashboardFallback('revenueHistory', () => getSharedPrismaClient().order.findMany({
                where: {
                    ...trackedOrdersWhereClause,
                    createdAt: { gte: start, lte: end }
                },
                select: {
                    createdAt: true,
                    total: true
                },
                orderBy: { createdAt: 'asc' }
            }).then(orders => {
                const byDate = {};
                orders.forEach(o => {
                    const date = o.createdAt.toISOString().slice(0, 10);
                    if (!byDate[date]) byDate[date] = { date, revenue: 0, orders: 0 };
                    byDate[date].revenue += parseFloat(o.total || 0);
                    byDate[date].orders += 1;
                });
                return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
            }), []),
        ]);

        const safeTrackedOrdersCount = trackedOrdersCount ?? totalOrdersCount;
        const safeConfirmedOrdersCount = confirmedOrdersCount ?? 0;

        const orderStatusCounts = orderStatuses.reduce((acc, item) => {
            acc[item.status] = Number(item?._count?._all ?? item?._count ?? 0);
            return acc;
        }, {});

        const cancelledOrders = orderStatusCounts.CANCELLED || 0;
        const returnedOrders = orderStatusCounts.RETURNED || 0;
        const deliveredOrders = orderStatusCounts.DELIVERED || 0;
        const openOrders = DASHBOARD_OPEN_ORDER_STATUSES.reduce(
            (sum, status) => sum + (orderStatusCounts[status] || 0),
            0
        );
        const excludedOrders = Math.max(totalOrdersCount - safeTrackedOrdersCount, 0);

        const productMap = {};
        let itemsCount = 0;
        let totalRevenue = 0;
        let totalCOGS = 0;
        orderItems.forEach(item => {
            const lineTotal = parseFloat(item.total || 0);
            const lineQuantity = item.quantity || 0;
            const lineCost = (item.product?.cost || 0);

            itemsCount += lineQuantity;
            totalRevenue += lineTotal;
            totalCOGS += (lineQuantity * lineCost);

            const name = item.product?.name || item.productName || 'منتج غير معروف';
            if (!productMap[name]) {
                productMap[name] = {
                    name,
                    quantity: 0,
                    revenue: 0
                };
            }
            productMap[name].quantity += lineQuantity;
            productMap[name].revenue += lineTotal;
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Previous period summary for delta comparison
        let prevRevenue = 0;
        prevOrderItems.forEach(item => {
            prevRevenue += parseFloat(item.total || 0);
        });
        const prevItemsCount = prevOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const prevConversionRate = (prevStoreVisits > 0 && prevTrackedOrdersCount > 0)
            ? parseFloat(((prevTrackedOrdersCount / prevStoreVisits) * 100).toFixed(2))
            : 0;
        const previousPeriod = {
            trackedOrders: prevTrackedOrdersCount,
            revenue: prevRevenue,
            items: prevItemsCount,
            visits: prevStoreVisits,
            newCustomers: prevNewCustomersCount,
            conversionRate: prevConversionRate,
            aov: prevTrackedOrdersCount > 0 ? (prevRevenue / prevTrackedOrdersCount) : 0
        };

        const visitsAvailable = totalStoreVisits > 0;
        const conversionRate = visitsAvailable
            ? (storeVisits > 0
                ? parseFloat(((safeTrackedOrdersCount / storeVisits) * 100).toFixed(2))
                : 0)
            : null;
        const confirmedRate = toRoundedRate(safeConfirmedOrdersCount, safeTrackedOrdersCount);
        const cancellationRate = toRoundedRate(cancelledOrders, safeTrackedOrdersCount);
        const returnRate = toRoundedRate(returnedOrders, safeTrackedOrdersCount);
        const piecesPerOrder = safeTrackedOrdersCount > 0
            ? parseFloat((itemsCount / safeTrackedOrdersCount).toFixed(2))
            : 0;

        const dashboardData = {
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                currency: company.currency,
                phone: company.phone,
                isActive: company.isActive,
            },
            dateRange: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            counts: {
                users: userCount,
                customers: company._count.customers,
                products: company._count.products,
                orders: company._count.orders,
                conversations: company._count.conversations
            },
            financials: {
                totalRevenue,
                grossProfit: totalRevenue - totalCOGS,
                aov: safeTrackedOrdersCount > 0 ? (totalRevenue / safeTrackedOrdersCount) : 0
            },
            inventory: {
                lowStockCount,
                outOfStockCount
            },
            recentActivity: {
                newUsers: newUsersCount,
                newCustomers: newCustomersCount,
                newConversations: newConversationsCount
            },
            metrics: {
                orders: trackedOrdersCount,
                items: itemsCount,
                visits: visitsAvailable ? storeVisits : null,
                conversionRate,
                confirmedOrders: confirmedOrdersCount,
                confirmedRate,
                cancelledOrders,
                cancellationRate,
                returnedOrders,
                returnRate,
                piecesPerOrder
            },
            orderHealth: {
                trackedOrders: trackedOrdersCount,
                excludedOrders,
                confirmedOrders: confirmedOrdersCount,
                confirmedRate,
                cancelledOrders,
                cancellationRate,
                returnedOrders,
                returnRate,
                deliveredOrders,
                openOrders,
                newOrders: newOrdersCount,
                viewedOrders: viewedOrdersCount,
                totalItems: itemsCount,
                piecesPerOrder
            },
            topProducts,
            previousPeriod,
            revenueHistory
        };

        const { businessSpecialty, installedApps, specialtyMetrics } = await fetchCompanySpecialtyAndApps(companyId, getSharedPrismaClient());
        dashboardData.businessSpecialty = businessSpecialty;
        dashboardData.installedApps = installedApps;
        dashboardData.specialtyMetrics = specialtyMetrics;

        res.json({
            success: true,
            message: 'تم جلب بيانات لوحة التحكم بنجاح',
            data: dashboardData
        });

    } catch (error) {
        console.error('❌ Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب بيانات لوحة التحكم',
            error: error.message
        });
    }
};

const companySettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                website: true,
                address: true,

                currency: true,
                timezone: true,
                isActive: true,
                settings: true,
                createdAt: true
            }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        // Parse settings
        const settings = parseCompanySettings(company.settings);

        res.json({
            success: true,
            message: 'تم جلب إعدادات الشركة بنجاح',
            data: {
                ...company,
                settings
            }
        });

    } catch (error) {
        console.error('❌ Error fetching company settings:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب إعدادات الشركة',
            error: error.message
        });
    }
};

const updateCompanySettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const {
            name,
            email,
            phone,
            website,
            address,
            settings,
            timezone
        } = req.body;

        const updatedCompany = await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone !== undefined && { phone }),
                ...(website !== undefined && { website }),
                ...(address !== undefined && { address }),
                ...(settings && { settings: JSON.stringify(settings) }),
                ...(timezone && { timezone })
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                website: true,
                address: true,

                currency: true,
                timezone: true,
                isActive: true,
                settings: true,
                updatedAt: true
            }
        });

        invalidateCompanySettingsCache(companyId);
        invalidateCompanyDashboardCache(companyId);

        res.json({
            success: true,
            message: 'تم تحديث إعدادات الشركة بنجاح',
            data: {
                ...updatedCompany,
                settings: parseCompanySettings(updatedCompany.settings)
            }
        });

    } catch (error) {
        console.error('❌ Error updating company settings:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث إعدادات الشركة',
            error: error.message
        });
    }
};





const getCompanyLinks = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];

        res.json({
            success: true,
            message: 'تم جلب الروابط بنجاح',
            data: links.map(sanitizeLinkForResponse).filter(Boolean)
        });
    } catch (error) {
        console.error('❌ Error fetching company links:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب روابط الشركة',
            error: error.message
        });
    }
};

const createCompanyLink = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { name, url, username, password, openMode } = req.body || {};

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: 'اسم اللينك و URL مطلوبين'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];

        const now = new Date().toISOString();
        const id = typeof randomUUID === 'function' ? randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const link = {
            id,
            name: String(name),
            url: String(url),
            username: username ? String(username) : '',
            passwordEncrypted: password ? encrypt(String(password)) : null,
            openMode: openMode ? String(openMode) : 'new_tab',
            createdAt: now,
            updatedAt: now
        };

        settings.companyLinks = [...links, link];

        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(settings) }
        });

        res.json({
            success: true,
            message: 'تم إضافة الرابط بنجاح',
            data: sanitizeLinkForResponse(link)
        });
    } catch (error) {
        console.error('❌ Error creating company link:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في إضافة الرابط',
            error: error.message
        });
    }
};

const updateCompanyLink = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { linkId } = req.params;
        const { name, url, username, password, openMode } = req.body || {};

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!linkId) {
            return res.status(400).json({
                success: false,
                message: 'linkId مطلوب'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];
        const idx = links.findIndex((l) => l && String(l.id) === String(linkId));

        if (idx === -1) {
            return res.status(404).json({
                success: false,
                message: 'الرابط غير موجود'
            });
        }

        const existing = links[idx];
        const now = new Date().toISOString();

        const next = {
            ...existing,
            ...(name !== undefined ? { name: String(name) } : {}),
            ...(url !== undefined ? { url: String(url) } : {}),
            ...(username !== undefined ? { username: String(username || '') } : {}),
            ...(openMode !== undefined ? { openMode: String(openMode || 'new_tab') } : {}),
            ...(password !== undefined
                ? { passwordEncrypted: password ? encrypt(String(password)) : null }
                : {}),
            updatedAt: now
        };

        const updatedLinks = [...links];
        updatedLinks[idx] = next;
        settings.companyLinks = updatedLinks;

        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(settings) }
        });

        res.json({
            success: true,
            message: 'تم تحديث الرابط بنجاح',
            data: sanitizeLinkForResponse(next)
        });
    } catch (error) {
        console.error('❌ Error updating company link:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحديث الرابط',
            error: error.message
        });
    }
};

const deleteCompanyLink = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { linkId } = req.params;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!linkId) {
            return res.status(400).json({
                success: false,
                message: 'linkId مطلوب'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];
        const nextLinks = links.filter((l) => l && String(l.id) !== String(linkId));

        if (nextLinks.length === links.length) {
            return res.status(404).json({
                success: false,
                message: 'الرابط غير موجود'
            });
        }

        settings.companyLinks = nextLinks;

        await getSharedPrismaClient().company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(settings) }
        });

        res.json({
            success: true,
            message: 'تم حذف الرابط بنجاح'
        });
    } catch (error) {
        console.error('❌ Error deleting company link:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في حذف الرابط',
            error: error.message
        });
    }
};

const getCompanyLinkPassword = async (req, res) => {
    try {
        const companyId = getCompanyIdFromRequest(req);
        const { linkId } = req.params;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'companyId مفقود'
            });
        }

        if (!linkId) {
            return res.status(400).json({
                success: false,
                message: 'linkId مطلوب'
            });
        }

        const company = await getSharedPrismaClient().company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'الشركة غير موجودة'
            });
        }

        const settings = safeJsonParse(company.settings);
        const links = Array.isArray(settings.companyLinks) ? settings.companyLinks : [];
        const link = links.find((l) => l && String(l.id) === String(linkId));

        if (!link) {
            return res.status(404).json({
                success: false,
                message: 'الرابط غير موجود'
            });
        }

        const password = link.passwordEncrypted ? decrypt(link.passwordEncrypted) : null;
        res.json({
            success: true,
            message: 'تم جلب كلمة المرور بنجاح',
            data: { password }
        });
    } catch (error) {
        console.error('❌ Error fetching company link password:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في جلب كلمة المرور',
            error: error.message
        });
    }
};

// ─── Widget Data (per-app live metrics) ───────────────────────────────
const getWidgetData = async (req, res) => {
    try {
        const companyId = req.user.effectiveCompanyId || req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company context required' });
        }

        const prisma = getSharedPrismaClient();
        const activeInstalls = await prisma.companyApp.findMany({
            where: { companyId, status: { in: ['TRIAL', 'ACTIVE'] } },
            include: { app: true }
        });
        const slugs = new Set(activeInstalls.map(i => i.app.slug));
        const hasAll = slugs.size === 0;

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

        const data = {};

        const tasks = [];

        if (hasAll || slugs.has('whatsapp-business') || slugs.has('whatsapp')) {
            tasks.push((async () => {
                try {
                    const [conversations, unread, sessions] = await Promise.all([
                        prisma.conversation.count({ where: { companyId, channel: 'WHATSAPP', status: { not: 'CLOSED' } } }),
                        prisma.conversation.count({ where: { companyId, channel: 'WHATSAPP', isRead: false } }),
                        prisma.whatsAppSession.count({ where: { companyId, status: 'CONNECTED' } }),
                    ]);
                    data.whatsapp = { conversations, unread, sessions };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('ai-chat-basic') || slugs.has('ai')) {
            tasks.push((async () => {
                try {
                    const [interactionsToday, sessions] = await Promise.all([
                        prisma.aiInteraction.count({ where: { companyId, createdAt: { gte: today } } }),
                        prisma.aiSandboxSession.count({ where: { companyId, isDeleted: false } }),
                    ]);
                    data.ai = { interactionsToday, sessions };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('hr') || slugs.has('hr-payroll')) {
            tasks.push((async () => {
                try {
                    const [active, present, onLeave] = await Promise.all([
                        prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
                        prisma.attendance.count({ where: { companyId, date: today, checkIn: { not: null } } }),
                        prisma.leaveRequest.count({ where: { companyId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } } }),
                    ]);
                    data.hr = { activeEmployees: active, presentToday: present, onLeave };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('facebook-ads-pro') || slugs.has('marketing')) {
            tasks.push((async () => {
                try {
                    const [total, active] = await Promise.all([
                        prisma.facebookCampaign.count({ where: { companyId } }),
                        prisma.facebookCampaign.count({ where: { companyId, status: 'ACTIVE' } }),
                    ]);
                    data.marketing = { campaigns: total, activeCampaigns: active };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('medical') || slugs.has('clinic')) {
            tasks.push((async () => {
                try {
                    const todayAppts = await prisma.appointment.count({
                        where: { companyId, appointmentDate: today, status: { in: ['pending', 'confirmed'] } }
                    });
                    data.medical = { appointmentsToday: todayAppts };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('education') || slugs.has('courses')) {
            tasks.push((async () => {
                try {
                    const [students, sessionsToday] = await Promise.all([
                        prisma.educationStudent.count({ where: { companyId, isActive: true } }),
                        prisma.educationSession.count({ where: { companyId, scheduledAt: { gte: today, lt: tomorrow } } }),
                    ]);
                    data.education = { activeStudents: students, sessionsToday };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('hotel') || slugs.has('hospitality')) {
            tasks.push((async () => {
                try {
                    const [checkedIn, occupied, available] = await Promise.all([
                        prisma.hotelReservation.count({ where: { companyId, status: 'CHECKED_IN' } }),
                        prisma.hotelRoom.count({ where: { companyId, status: 'OCCUPIED' } }),
                        prisma.hotelRoom.count({ where: { companyId, status: 'AVAILABLE' } }),
                    ]);
                    data.hotel = { checkedIn, occupiedRooms: occupied, availableRooms: available };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('booking') || slugs.has('appointments')) {
            tasks.push((async () => {
                try {
                    const todayAppts = await prisma.appointment.count({
                        where: { companyId, appointmentDate: today, status: { in: ['pending', 'confirmed'] } }
                    });
                    data.booking = { appointmentsToday: todayAppts };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('procurement') || slugs.has('purchasing')) {
            tasks.push((async () => {
                try {
                    const [pending, suppliers] = await Promise.all([
                        prisma.purchaseOrder.count({ where: { companyId, status: { in: ['PENDING', 'ORDERED'] } } }),
                        prisma.supplier.count({ where: { companyId, isActive: true } }),
                    ]);
                    data.procurement = { pendingOrders: pending, activeSuppliers: suppliers };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('wholesale') || slugs.has('b2b')) {
            tasks.push((async () => {
                try {
                    const customers = await prisma.wholesaleCustomer.count({ where: { companyId, isActive: true } });
                    data.wholesale = { activeCustomers: customers };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('affiliate') || slugs.has('affiliates')) {
            tasks.push((async () => {
                try {
                    const [affiliates, pendingCommissions] = await Promise.all([
                        prisma.affiliate.count({ where: { companyId, status: 'ACTIVE' } }),
                        prisma.commission.count({ where: { companyId, status: 'PENDING' } }),
                    ]);
                    data.affiliate = { activeAffiliates: affiliates, pendingCommissions };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('competitors') || slugs.has('market-research')) {
            tasks.push((async () => {
                try {
                    const tracked = await prisma.competitor.count({ where: { companyId, isActive: true } });
                    data.competitors = { tracked };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('tasks') || slugs.has('workspace')) {
            tasks.push((async () => {
                try {
                    const [open, completedWeek] = await Promise.all([
                        prisma.task.count({ where: { companyId, status: { not: 'COMPLETED' }, parentTaskId: null } }),
                        prisma.task.count({ where: { companyId, status: 'COMPLETED', completedDate: { gte: weekAgo } } }),
                    ]);
                    data.tasks = { openTasks: open, completedThisWeek: completedWeek };
                } catch (_) {}
            })());
        }

        if (hasAll || slugs.has('telegram') || slugs.has('telegram-bot')) {
            tasks.push((async () => {
                try {
                    const groups = await prisma.telegramGroup.count({ where: { companyId, managedByUs: true } });
                    data.telegram = { groups };
                } catch (_) {}
            })());
        }

        await Promise.allSettled(tasks);

        return res.json({ success: true, data });
    } catch (error) {
        console.error('❌ [WIDGET-DATA] Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load widget data', error: error.message });
    }
};

module.exports = {
    companyDashboardOverview,
    companySettings,
    updateCompanySettings,
    getCompanyLinks,
    createCompanyLink,
    updateCompanyLink,
    deleteCompanyLink,
    getCompanyLinkPassword,
    getWidgetData
}
