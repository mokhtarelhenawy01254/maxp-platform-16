const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const { fromZonedTime } = require('date-fns-tz');
const { startOfDay, endOfDay, subDays } = require('date-fns');
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
            viewedOrdersCount
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
            withDashboardFallback('orderStatuses', () => getSharedPrismaClient().order.groupBy({
                by: ['status'],
                where: trackedOrdersWhereClause,
                _count: true
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
            topProducts
        };

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
                plan: true,
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
                plan: true,
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

module.exports = {
    companyDashboardOverview,
    companySettings,
    updateCompanySettings,
    getCompanyLinks,
    createCompanyLink,
    updateCompanyLink,
    deleteCompanyLink,
    getCompanyLinkPassword
}
