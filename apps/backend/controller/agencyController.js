const crypto = require('crypto');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

function parseAgencyData(settingsRaw) {
    if (!settingsRaw) return { clients: [], approvals: [], settings: {} };
    let parsed = {};
    try {
        parsed = typeof settingsRaw === 'string' ? JSON.parse(settingsRaw) : settingsRaw;
    } catch (e) {
        parsed = {};
    }
    const agencyData = parsed.agencyData || {};
    return {
        clients: Array.isArray(agencyData.clients) ? agencyData.clients : [],
        approvals: Array.isArray(agencyData.approvals) ? agencyData.approvals : [],
        settings: agencyData.settings || {},
    };
}

async function saveAgencyData(prisma, companyId, agencyData) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
    });
    let currentSettings = {};
    try {
        currentSettings = typeof company?.settings === 'string' ? JSON.parse(company.settings) : (company?.settings || {});
    } catch (e) {
        currentSettings = {};
    }
    currentSettings.agencyData = agencyData;
    await prisma.company.update({
        where: { id: companyId },
        data: {
            settings: JSON.stringify(currentSettings),
        },
    });
}

// Calculation Engine for Agency Profit / Billing Models
function calculateClientFee(client, perf = {}) {
    const pricingModel = client.pricingModel || 'RETAINER';
    const spend = Number(perf.adSpend !== undefined ? perf.adSpend : (client.currentSpend || 0));
    const sales = Number(perf.salesRevenue !== undefined ? perf.salesRevenue : (client.monthlySales || 0));
    const orders = Number(perf.ordersCount !== undefined ? perf.ordersCount : (client.monthlyOrders || 0));
    const units = Number(perf.unitsSold !== undefined ? perf.unitsSold : (client.monthlyUnits || 0));

    const rate = Number(client.pricingRate || 0);
    const feePerOrder = Number(client.feePerOrder || 0);
    const feePerItem = Number(client.feePerItem || 0);
    const baseRetainer = Number(client.baseRetainer !== undefined ? client.baseRetainer : (client.monthlyRetainer || 0));

    let fee = 0;
    let calculationExplanation = '';

    switch (pricingModel) {
        case 'PERCENT_SPEND':
            fee = Math.round(spend * (rate / 100));
            calculationExplanation = `${rate}% من إجمالي الإنفاق الإعلاني (${spend.toLocaleString()} ج.م)`;
            break;
        case 'PERCENT_SALES':
            fee = Math.round(sales * (rate / 100));
            calculationExplanation = `${rate}% من إجمالي المبيعات (${sales.toLocaleString()} ج.م)`;
            break;
        case 'FIXED_ORDER':
            fee = Math.round(orders * feePerOrder);
            calculationExplanation = `${feePerOrder} ج.م لكل طلب × ${orders} طلب`;
            break;
        case 'FIXED_ITEM':
            fee = Math.round(units * feePerItem);
            calculationExplanation = `${feePerItem} ج.م لكل قطعة مباعة × ${units} قطعة`;
            break;
        case 'HYBRID': {
            const hybridType = client.hybridType || 'PERCENT_SPEND';
            let commission = 0;
            let commExp = '';
            if (hybridType === 'PERCENT_SPEND') {
                commission = Math.round(spend * (rate / 100));
                commExp = `+ عمولة ${rate}% من الإنفاق (${commission.toLocaleString()} ج.م)`;
            } else if (hybridType === 'PERCENT_SALES') {
                commission = Math.round(sales * (rate / 100));
                commExp = `+ عمولة ${rate}% من المبيعات (${commission.toLocaleString()} ج.م)`;
            } else if (hybridType === 'FIXED_ORDER') {
                commission = Math.round(orders * feePerOrder);
                commExp = `+ عمولة ${feePerOrder} ج.م لكل طلب × ${orders} (${commission.toLocaleString()} ج.م)`;
            }
            fee = baseRetainer + commission;
            calculationExplanation = `اشتراك ثابت (${baseRetainer.toLocaleString()} ج.م) ${commExp}`;
            break;
        }
        case 'RETAINER':
        default:
            fee = baseRetainer;
            calculationExplanation = `اشتراك شهري ثابت (${baseRetainer.toLocaleString()} ج.م)`;
            break;
    }

    return { fee, calculationExplanation, spend, sales, orders, units };
}

// 1. Overview
const getAgencyOverview = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();

        const company = await executeWithRetry(async () => {
            return await prisma.company.findUnique({
                where: { id: companyId },
                include: {
                    installedApps: {
                        where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                        select: { app: { select: { slug: true, name: true } } },
                    },
                    _count: {
                        select: {
                            users: true,
                            facebookPages: true,
                        },
                    },
                },
            });
        });

        const agencyData = parseAgencyData(company?.settings);
        const clients = agencyData.clients;
        const approvals = agencyData.approvals;

        const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

        const totalClients = clients.length;
        const activeClients = clients.filter((c) => c.status === 'ACTIVE').length;
        const totalBudget = clients.reduce((acc, c) => acc + (Number(c.monthlyBudget) || 0), 0);
        const totalSpend = clients.reduce((acc, c) => acc + (Number(c.currentSpend) || 0), 0);

        // Calculate total agency profit/revenue across all models + extra services for current month
        let totalAgencyRevenue = 0;
        let totalRetainers = 0;
        let unpaidInvoicesCount = 0;
        let totalUncollected = 0;

        clients.forEach((client) => {
            const logs = Array.isArray(client.monthlyLogs) ? client.monthlyLogs : [];
            const currentLog = logs.find((l) => l.month === currentMonth) || {
                adSpend: client.currentSpend || 0,
                salesRevenue: client.monthlySales || 0,
                ordersCount: client.monthlyOrders || 0,
                unitsSold: client.monthlyUnits || 0,
                isPaid: false,
            };

            const feeInfo = calculateClientFee(client, currentLog);
            const extraServices = Array.isArray(client.extraServices) ? client.extraServices : [];
            const monthExtras = extraServices.filter((s) => !s.month || s.month === currentMonth);
            const extraSum = monthExtras.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const totalClientDue = feeInfo.fee + extraSum;

            totalAgencyRevenue += totalClientDue;
            totalRetainers += Number(client.baseRetainer !== undefined ? client.baseRetainer : (client.monthlyRetainer || 0));

            if (!currentLog.isPaid) {
                unpaidInvoicesCount += 1;
                totalUncollected += totalClientDue;
            }
        });

        const pendingApprovals = approvals.filter(
            (a) => a.status === 'CLIENT_REVIEW' || a.status === 'INTERNAL_REVIEW'
        ).length;

        const installedSlugs = (company?.installedApps || []).map((ca) => ca.app.slug);
        const suiteStatus = {
            hasAgencyPro: installedSlugs.includes('marketing-agency-pro'),
            hasFacebookAds: installedSlugs.includes('facebook-ads-pro'),
            hasUnifiedInbox: installedSlugs.includes('unified-inbox'),
            hasSmartScheduler: installedSlugs.includes('smart-scheduler'),
            hasMindmap: installedSlugs.includes('executable-mindmap'),
            hasAnalytics: installedSlugs.includes('analytics-advanced'),
            hasUgc: installedSlugs.includes('ugc-reviews-pro'),
            hasPixel: installedSlugs.includes('facebook-pixel-capi'),
            hasPages: installedSlugs.includes('facebook-pages-connect'),
        };

        // Calculate days left in month for pacing
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const expectedPacingPercent = Math.round((currentDay / daysInMonth) * 100);

        res.json({
            success: true,
            data: {
                metrics: {
                    totalClients,
                    activeClients,
                    totalBudget,
                    totalSpend,
                    totalRetainers,
                    totalAgencyRevenue,
                    unpaidInvoicesCount,
                    totalUncollected,
                    pendingApprovals,
                    expectedPacingPercent,
                    currentDay,
                    daysInMonth,
                    currentMonth,
                    totalTeamMembers: company?._count?.users || 1,
                    connectedPagesCount: company?._count?.facebookPages || 0,
                },
                suiteStatus,
            },
        });
    } catch (error) {
        console.error('❌ [AGENCY] getAgencyOverview error:', error);
        res.status(500).json({ success: false, message: 'فشل جلب بيانات الوكالة', error: error.message });
    }
};

// 2. Clients
const getClients = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });
        const agencyData = parseAgencyData(company?.settings);
        res.json({ success: true, data: agencyData.clients });
    } catch (error) {
        console.error('❌ [AGENCY] getClients error:', error);
        res.status(500).json({ success: false, message: 'فشل جلب قائمة العملاء' });
    }
};

const createClient = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const {
            name,
            contactPerson,
            email,
            phone,
            monthlyBudget = 0,
            currentSpend = 0,
            monthlyRetainer = 0,
            baseRetainer = 0,
            pricingModel = 'RETAINER',
            pricingRate = 0,
            feePerOrder = 0,
            feePerItem = 0,
            hybridType = 'PERCENT_SPEND',
            monthlySales = 0,
            monthlyOrders = 0,
            monthlyUnits = 0,
            isOffPlatform = false,
            status = 'ACTIVE',
            adAccountId,
            primaryPlatforms = ['facebook', 'instagram'],
            assignedLead,
            notes,
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'اسم العميل / البراند مطلوب' });
        }

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const resolvedBaseRetainer = Number(baseRetainer || monthlyRetainer) || 0;

        const newClient = {
            id: `cli_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            name: name.trim(),
            contactPerson: (contactPerson || '').trim(),
            email: (email || '').trim(),
            phone: (phone || '').trim(),
            monthlyBudget: Number(monthlyBudget) || 0,
            currentSpend: Number(currentSpend) || 0,
            monthlyRetainer: resolvedBaseRetainer,
            baseRetainer: resolvedBaseRetainer,
            pricingModel: pricingModel || 'RETAINER',
            pricingRate: Number(pricingRate) || 0,
            feePerOrder: Number(feePerOrder) || 0,
            feePerItem: Number(feePerItem) || 0,
            hybridType: hybridType || 'PERCENT_SPEND',
            monthlySales: Number(monthlySales) || 0,
            monthlyOrders: Number(monthlyOrders) || 0,
            monthlyUnits: Number(monthlyUnits) || 0,
            isOffPlatform: Boolean(isOffPlatform),
            status: status || 'ACTIVE',
            adAccountId: (adAccountId || '').trim(),
            primaryPlatforms: Array.isArray(primaryPlatforms) ? primaryPlatforms : ['facebook', 'instagram'],
            assignedLead: (assignedLead || '').trim(),
            notes: (notes || '').trim(),
            extraServices: [],
            monthlyLogs: [],
            dailyLogs: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        agencyData.clients.unshift(newClient);
        await saveAgencyData(prisma, companyId, agencyData);

        res.status(201).json({ success: true, message: 'تم إضافة العميل بنجاح', data: newClient });
    } catch (error) {
        console.error('❌ [AGENCY] createClient error:', error);
        res.status(500).json({ success: false, message: 'فشل إضافة العميل', error: error.message });
    }
};

const updateClient = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId } = req.params;
        const updates = req.body;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const index = agencyData.clients.findIndex((c) => c.id === clientId);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        const existing = agencyData.clients[index];
        const baseRetainer = updates.baseRetainer !== undefined ? Number(updates.baseRetainer) : (updates.monthlyRetainer !== undefined ? Number(updates.monthlyRetainer) : (existing.baseRetainer ?? existing.monthlyRetainer ?? 0));

        agencyData.clients[index] = {
            ...existing,
            ...updates,
            baseRetainer,
            monthlyRetainer: baseRetainer,
            monthlyBudget: updates.monthlyBudget !== undefined ? Number(updates.monthlyBudget) : existing.monthlyBudget,
            currentSpend: updates.currentSpend !== undefined ? Number(updates.currentSpend) : existing.currentSpend,
            pricingModel: updates.pricingModel || existing.pricingModel || 'RETAINER',
            pricingRate: updates.pricingRate !== undefined ? Number(updates.pricingRate) : (existing.pricingRate || 0),
            feePerOrder: updates.feePerOrder !== undefined ? Number(updates.feePerOrder) : (existing.feePerOrder || 0),
            feePerItem: updates.feePerItem !== undefined ? Number(updates.feePerItem) : (existing.feePerItem || 0),
            hybridType: updates.hybridType || existing.hybridType || 'PERCENT_SPEND',
            monthlySales: updates.monthlySales !== undefined ? Number(updates.monthlySales) : (existing.monthlySales || 0),
            monthlyOrders: updates.monthlyOrders !== undefined ? Number(updates.monthlyOrders) : (existing.monthlyOrders || 0),
            monthlyUnits: updates.monthlyUnits !== undefined ? Number(updates.monthlyUnits) : (existing.monthlyUnits || 0),
            isOffPlatform: updates.isOffPlatform !== undefined ? Boolean(updates.isOffPlatform) : (existing.isOffPlatform || false),
            updatedAt: new Date().toISOString(),
        };

        await saveAgencyData(prisma, companyId, agencyData);
        res.json({ success: true, message: 'تم تحديث بيانات العميل', data: agencyData.clients[index] });
    } catch (error) {
        console.error('❌ [AGENCY] updateClient error:', error);
        res.status(500).json({ success: false, message: 'فشل تحديث العميل', error: error.message });
    }
};

const deleteClient = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId } = req.params;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        agencyData.clients = agencyData.clients.filter((c) => c.id !== clientId);
        await saveAgencyData(prisma, companyId, agencyData);

        res.json({ success: true, message: 'تم حذف العميل' });
    } catch (error) {
        console.error('❌ [AGENCY] deleteClient error:', error);
        res.status(500).json({ success: false, message: 'فشل حذف العميل' });
    }
};

// 3. Performance Logs (Daily & Monthly)
const logClientPerformance = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId } = req.params;
        const {
            month = new Date().toISOString().slice(0, 7),
            date,
            type = 'monthly', // 'daily' | 'monthly'
            adSpend = 0,
            salesRevenue = 0,
            ordersCount = 0,
            unitsSold = 0,
            isPaid,
            notes = '',
        } = req.body;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const client = agencyData.clients.find((c) => c.id === clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        if (!Array.isArray(client.monthlyLogs)) {
            client.monthlyLogs = [];
        }
        if (!Array.isArray(client.dailyLogs)) {
            client.dailyLogs = [];
        }

        const isDaily = type === 'daily' || Boolean(date);
        const currentMonthStr = new Date().toISOString().slice(0, 7);

        if (isDaily) {
            const targetDate = (date || new Date().toISOString().slice(0, 10)).trim();
            const targetMonth = targetDate.slice(0, 7);

            const dailyIdx = client.dailyLogs.findIndex((d) => d.date === targetDate);
            const dailyData = {
                id: dailyIdx !== -1 ? (client.dailyLogs[dailyIdx].id || `dlog_${Date.now()}`) : `dlog_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
                date: targetDate,
                month: targetMonth,
                adSpend: Number(adSpend) || 0,
                salesRevenue: Number(salesRevenue) || 0,
                ordersCount: Number(ordersCount) || 0,
                unitsSold: Number(unitsSold) || 0,
                notes: (notes || '').trim(),
                updatedAt: new Date().toISOString(),
            };

            if (dailyIdx !== -1) {
                client.dailyLogs[dailyIdx] = {
                    ...client.dailyLogs[dailyIdx],
                    ...dailyData,
                };
            } else {
                client.dailyLogs.push({
                    ...dailyData,
                    createdAt: new Date().toISOString(),
                });
            }

            // Keep dailyLogs sorted by date descending
            client.dailyLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            // Auto-rollup: Recalculate monthly totals for targetMonth from all daily logs
            const monthDailyLogs = client.dailyLogs.filter((d) => d.date && d.date.startsWith(targetMonth));
            const sumSpend = monthDailyLogs.reduce((acc, d) => acc + (Number(d.adSpend) || 0), 0);
            const sumSales = monthDailyLogs.reduce((acc, d) => acc + (Number(d.salesRevenue) || 0), 0);
            const sumOrders = monthDailyLogs.reduce((acc, d) => acc + (Number(d.ordersCount) || 0), 0);
            const sumUnits = monthDailyLogs.reduce((acc, d) => acc + (Number(d.unitsSold) || 0), 0);

            const mIdx = client.monthlyLogs.findIndex((l) => l.month === targetMonth);
            if (mIdx !== -1) {
                client.monthlyLogs[mIdx] = {
                    ...client.monthlyLogs[mIdx],
                    adSpend: sumSpend,
                    salesRevenue: sumSales,
                    ordersCount: sumOrders,
                    unitsSold: sumUnits,
                    updatedAt: new Date().toISOString(),
                };
            } else {
                client.monthlyLogs.push({
                    month: targetMonth,
                    adSpend: sumSpend,
                    salesRevenue: sumSales,
                    ordersCount: sumOrders,
                    unitsSold: sumUnits,
                    isPaid: false,
                    notes: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            // If logging for current month, sync to main client spend
            if (targetMonth === currentMonthStr) {
                client.currentSpend = sumSpend;
                client.monthlySales = sumSales;
                client.monthlyOrders = sumOrders;
                client.monthlyUnits = sumUnits;
            }

            client.updatedAt = new Date().toISOString();
            await saveAgencyData(prisma, companyId, agencyData);

            return res.json({
                success: true,
                message: 'تم تسجيل أداء اليوم وتحديث إجمالي الشهر بنجاح',
                data: {
                    dailyLog: client.dailyLogs.find((d) => d.date === targetDate),
                    monthlyLog: client.monthlyLogs.find((l) => l.month === targetMonth),
                    dailyLogs: client.dailyLogs.filter((d) => d.month === targetMonth),
                },
            });
        }

        // Monthly mode
        const targetMonth = month.trim();
        const logIdx = client.monthlyLogs.findIndex((l) => l.month === targetMonth);

        const newLogData = {
            month: targetMonth,
            adSpend: Number(adSpend) || 0,
            salesRevenue: Number(salesRevenue) || 0,
            ordersCount: Number(ordersCount) || 0,
            unitsSold: Number(unitsSold) || 0,
            notes: (notes || '').trim(),
            updatedAt: new Date().toISOString(),
        };

        if (logIdx !== -1) {
            client.monthlyLogs[logIdx] = {
                ...client.monthlyLogs[logIdx],
                ...newLogData,
                isPaid: isPaid !== undefined ? Boolean(isPaid) : client.monthlyLogs[logIdx].isPaid,
            };
        } else {
            client.monthlyLogs.push({
                ...newLogData,
                isPaid: Boolean(isPaid),
                createdAt: new Date().toISOString(),
            });
        }

        // If logging current month, sync to main client spend
        if (targetMonth === currentMonthStr) {
            client.currentSpend = Number(adSpend) || 0;
            client.monthlySales = Number(salesRevenue) || 0;
            client.monthlyOrders = Number(ordersCount) || 0;
            client.monthlyUnits = Number(unitsSold) || 0;
        }

        client.updatedAt = new Date().toISOString();
        await saveAgencyData(prisma, companyId, agencyData);

        res.json({
            success: true,
            message: 'تم تسجيل أداء العميل لهذا الشهر بنجاح',
            data: client.monthlyLogs.find((l) => l.month === targetMonth),
        });
    } catch (error) {
        console.error('❌ [AGENCY] logClientPerformance error:', error);
        res.status(500).json({ success: false, message: 'فشل تسجيل الأداء' });
    }
};

const deleteDailyLog = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId, date } = req.params;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const client = agencyData.clients.find((c) => c.id === clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        if (!Array.isArray(client.dailyLogs)) {
            client.dailyLogs = [];
        }

        client.dailyLogs = client.dailyLogs.filter((d) => d.date !== date);
        const targetMonth = date.slice(0, 7);

        // Re-calculate monthly totals for targetMonth
        const monthDailyLogs = client.dailyLogs.filter((d) => d.date && d.date.startsWith(targetMonth));
        if (!Array.isArray(client.monthlyLogs)) client.monthlyLogs = [];
        const logIdx = client.monthlyLogs.findIndex((l) => l.month === targetMonth);

        const sumSpend = monthDailyLogs.reduce((acc, d) => acc + (Number(d.adSpend) || 0), 0);
        const sumSales = monthDailyLogs.reduce((acc, d) => acc + (Number(d.salesRevenue) || 0), 0);
        const sumOrders = monthDailyLogs.reduce((acc, d) => acc + (Number(d.ordersCount) || 0), 0);
        const sumUnits = monthDailyLogs.reduce((acc, d) => acc + (Number(d.unitsSold) || 0), 0);

        if (logIdx !== -1) {
            client.monthlyLogs[logIdx] = {
                ...client.monthlyLogs[logIdx],
                adSpend: sumSpend,
                salesRevenue: sumSales,
                ordersCount: sumOrders,
                unitsSold: sumUnits,
                updatedAt: new Date().toISOString(),
            };
        }

        const currentMonthStr = new Date().toISOString().slice(0, 7);
        if (targetMonth === currentMonthStr) {
            client.currentSpend = sumSpend;
            client.monthlySales = sumSales;
            client.monthlyOrders = sumOrders;
            client.monthlyUnits = sumUnits;
        }

        client.updatedAt = new Date().toISOString();
        await saveAgencyData(prisma, companyId, agencyData);

        res.json({
            success: true,
            message: 'تم حذف سجل أداء اليوم وتحديث إجمالي الشهر بنجاح',
            data: {
                dailyLogs: client.dailyLogs.filter((d) => d.month === targetMonth),
                monthlyLog: client.monthlyLogs.find((l) => l.month === targetMonth),
            },
        });
    } catch (error) {
        console.error('❌ [AGENCY] deleteDailyLog error:', error);
        res.status(500).json({ success: false, message: 'فشل حذف سجل أداء اليوم' });
    }
};

// 4. Extra Services / Add-on Line Items
const addExtraService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId } = req.params;
        const {
            month = new Date().toISOString().slice(0, 7),
            title,
            category = 'OTHER',
            amount = 0,
            notes = '',
            date = new Date().toISOString().slice(0, 10),
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'عنوان البند الإضافي أو الخدمة مطلوب' });
        }

        const numAmount = Number(amount) || 0;
        if (numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'مبلغ الخدمة يجب أن يكون أكبر من صفر' });
        }

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const client = agencyData.clients.find((c) => c.id === clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        if (!Array.isArray(client.extraServices)) {
            client.extraServices = [];
        }

        const serviceItem = {
            id: `srv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            month,
            title: title.trim(),
            category: category || 'OTHER',
            amount: numAmount,
            notes: (notes || '').trim(),
            date,
            createdAt: new Date().toISOString(),
        };

        client.extraServices.unshift(serviceItem);
        client.updatedAt = new Date().toISOString();

        await saveAgencyData(prisma, companyId, agencyData);
        res.status(201).json({ success: true, message: 'تم إضافة الخدمة الإضافية بنجاح', data: serviceItem });
    } catch (error) {
        console.error('❌ [AGENCY] addExtraService error:', error);
        res.status(500).json({ success: false, message: 'فشل إضافة الخدمة الإضافية' });
    }
};

const deleteExtraService = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId, serviceId } = req.params;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const client = agencyData.clients.find((c) => c.id === clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        if (Array.isArray(client.extraServices)) {
            client.extraServices = client.extraServices.filter((s) => s.id !== serviceId);
        }

        client.updatedAt = new Date().toISOString();
        await saveAgencyData(prisma, companyId, agencyData);

        res.json({ success: true, message: 'تم حذف البند الإضافي' });
    } catch (error) {
        console.error('❌ [AGENCY] deleteExtraService error:', error);
        res.status(500).json({ success: false, message: 'فشل حذف البند الإضافي' });
    }
};

// 5. Invoices & Billing Statements
const getInvoices = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const month = req.query.month || new Date().toISOString().slice(0, 7);

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { name: true, phone: true, settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const clients = agencyData.clients;

        let totalInvoiced = 0;
        let totalPaid = 0;
        let totalUnpaid = 0;

        const clientStatements = clients.map((client) => {
            const logs = Array.isArray(client.monthlyLogs) ? client.monthlyLogs : [];
            const monthLog = logs.find((l) => l.month === month) || {
                month,
                adSpend: client.currentSpend || 0,
                salesRevenue: client.monthlySales || 0,
                ordersCount: client.monthlyOrders || 0,
                unitsSold: client.monthlyUnits || 0,
                isPaid: false,
            };

            const feeInfo = calculateClientFee(client, monthLog);
            const extraServices = Array.isArray(client.extraServices) ? client.extraServices : [];
            const monthExtras = extraServices.filter((s) => !s.month || s.month === month);
            const extraServicesSum = monthExtras.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

            const totalAmount = feeInfo.fee + extraServicesSum;
            const isPaid = Boolean(monthLog.isPaid);

            totalInvoiced += totalAmount;
            if (isPaid) {
                totalPaid += totalAmount;
            } else {
                totalUnpaid += totalAmount;
            }

            const spend = feeInfo.spend;
            const sales = feeInfo.sales;
            const orders = feeInfo.orders;
            const units = feeInfo.units;
            const roas = spend > 0 ? Number((sales / spend).toFixed(2)) : 0;
            const cpa = orders > 0 ? Math.round(spend / orders) : 0;
            const aov = orders > 0 ? Math.round(sales / orders) : 0;

            return {
                clientId: client.id,
                clientName: client.name,
                contactPerson: client.contactPerson,
                phone: client.phone,
                email: client.email,
                pricingModel: client.pricingModel || 'RETAINER',
                isOffPlatform: Boolean(client.isOffPlatform),
                month,
                performance: {
                    spend,
                    sales,
                    orders,
                    units,
                    roas,
                    cpa,
                    aov,
                },
                baseAgencyFee: feeInfo.fee,
                calculationExplanation: feeInfo.calculationExplanation,
                extraServices: monthExtras,
                extraServicesSum,
                totalAmount,
                isPaid,
                paidAt: monthLog.paidAt || null,
            };
        });

        res.json({
            success: true,
            data: {
                month,
                agencyName: company?.name || 'وكالتنا للتسويق',
                summary: {
                    totalClientsCount: clients.length,
                    totalInvoiced,
                    totalPaid,
                    totalUnpaid,
                },
                statements: clientStatements,
            },
        });
    } catch (error) {
        console.error('❌ [AGENCY] getInvoices error:', error);
        res.status(500).json({ success: false, message: 'فشل استخراج كشوف الحساب والفواتير' });
    }
};

const toggleInvoiceStatus = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { clientId, month } = req.params;
        const { isPaid } = req.body;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const client = agencyData.clients.find((c) => c.id === clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }

        if (!Array.isArray(client.monthlyLogs)) {
            client.monthlyLogs = [];
        }

        const logIdx = client.monthlyLogs.findIndex((l) => l.month === month);
        const paidStatus = Boolean(isPaid);
        const paidAt = paidStatus ? new Date().toISOString() : null;

        if (logIdx !== -1) {
            client.monthlyLogs[logIdx].isPaid = paidStatus;
            client.monthlyLogs[logIdx].paidAt = paidAt;
        } else {
            client.monthlyLogs.push({
                month,
                adSpend: client.currentSpend || 0,
                salesRevenue: client.monthlySales || 0,
                ordersCount: client.monthlyOrders || 0,
                unitsSold: client.monthlyUnits || 0,
                isPaid: paidStatus,
                paidAt,
                createdAt: new Date().toISOString(),
            });
        }

        client.updatedAt = new Date().toISOString();
        await saveAgencyData(prisma, companyId, agencyData);

        res.json({
            success: true,
            message: paidStatus ? 'تم تأكيد تحصيل الفاتورة بنجاح' : 'تم تعيين الفاتورة كـ غير مسددة',
            isPaid: paidStatus,
        });
    } catch (error) {
        console.error('❌ [AGENCY] toggleInvoiceStatus error:', error);
        res.status(500).json({ success: false, message: 'فشل تغيير حالة الفاتورة' });
    }
};

// 6. Approvals
const getApprovals = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });
        const agencyData = parseAgencyData(company?.settings);
        res.json({ success: true, data: agencyData.approvals });
    } catch (error) {
        console.error('❌ [AGENCY] getApprovals error:', error);
        res.status(500).json({ success: false, message: 'فشل جلب قائمة الاعتمادات' });
    }
};

const createApproval = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const {
            clientId,
            clientName,
            title,
            type = 'IMAGE',
            campaignName,
            platform = 'facebook',
            status = 'CLIENT_REVIEW',
            creativeUrl,
            copyText,
            targetAudience,
            deadline,
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'عنوان التصميم أو الإعلان مطلوب' });
        }

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const shareToken = `apr_${crypto.randomBytes(16).toString('hex')}`;

        const newApproval = {
            id: `aprv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            clientId: clientId || null,
            clientName: (clientName || 'عميل').trim(),
            title: title.trim(),
            type: type || 'IMAGE',
            campaignName: (campaignName || '').trim(),
            platform: platform || 'facebook',
            status: status || 'CLIENT_REVIEW',
            creativeUrl: (creativeUrl || '').trim(),
            copyText: (copyText || '').trim(),
            targetAudience: (targetAudience || '').trim(),
            shareToken,
            deadline: deadline || null,
            clientFeedback: '',
            reviewedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        agencyData.approvals.unshift(newApproval);
        await saveAgencyData(prisma, companyId, agencyData);

        res.status(201).json({ success: true, message: 'تم إنشاء عنصر المراجعة والاعتماد', data: newApproval });
    } catch (error) {
        console.error('❌ [AGENCY] createApproval error:', error);
        res.status(500).json({ success: false, message: 'فشل إنشاء عنصر الاعتماد', error: error.message });
    }
};

const updateApproval = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { approvalId } = req.params;
        const updates = req.body;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        const index = agencyData.approvals.findIndex((a) => a.id === approvalId);
        if (index === -1) {
            return res.status(404).json({ success: false, message: 'عنصر الاعتماد غير موجود' });
        }

        agencyData.approvals[index] = {
            ...agencyData.approvals[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await saveAgencyData(prisma, companyId, agencyData);
        res.json({ success: true, message: 'تم تحديث حالة الاعتماد', data: agencyData.approvals[index] });
    } catch (error) {
        console.error('❌ [AGENCY] updateApproval error:', error);
        res.status(500).json({ success: false, message: 'فشل تحديث عنصر الاعتماد' });
    }
};

const deleteApproval = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { approvalId } = req.params;

        const prisma = getSharedPrismaClient();
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true },
        });

        const agencyData = parseAgencyData(company?.settings);
        agencyData.approvals = agencyData.approvals.filter((a) => a.id !== approvalId);
        await saveAgencyData(prisma, companyId, agencyData);

        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        console.error('❌ [AGENCY] deleteApproval error:', error);
        res.status(500).json({ success: false, message: 'فشل الحذف' });
    }
};

// 7. Public Portal for Client (No Login Needed)
const getPublicApproval = async (req, res) => {
    try {
        const { token } = req.params;
        const prisma = getSharedPrismaClient();

        // Search company containing this approval token
        const companies = await prisma.company.findMany({
            where: {
                settings: {
                    contains: token,
                },
            },
            select: { id: true, name: true, logo: true, settings: true },
            take: 5,
        });

        let foundItem = null;
        let agencyInfo = null;

        for (const comp of companies) {
            const agencyData = parseAgencyData(comp.settings);
            const match = agencyData.approvals.find((a) => a.shareToken === token);
            if (match) {
                foundItem = match;
                agencyInfo = {
                    agencyName: comp.name,
                    agencyLogo: comp.logo,
                };
                break;
            }
        }

        if (!foundItem) {
            return res.status(404).json({ success: false, message: 'رابط الاعتماد غير صالح أو منتهي الصلاحية' });
        }

        res.json({
            success: true,
            data: {
                approval: foundItem,
                agency: agencyInfo,
            },
        });
    } catch (error) {
        console.error('❌ [AGENCY] getPublicApproval error:', error);
        res.status(500).json({ success: false, message: 'فشل تحميل تفاصيل الاعتماد' });
    }
};

const respondPublicApproval = async (req, res) => {
    try {
        const { token } = req.params;
        const { action, feedback } = req.body; // action: 'APPROVED' | 'CHANGES_REQUESTED'

        if (!action || !['APPROVED', 'CHANGES_REQUESTED'].includes(action)) {
            return res.status(400).json({ success: false, message: 'إجراء غير صالح' });
        }

        const prisma = getSharedPrismaClient();
        const companies = await prisma.company.findMany({
            where: {
                settings: {
                    contains: token,
                },
            },
            select: { id: true, settings: true },
            take: 5,
        });

        let targetCompanyId = null;
        let targetApprovalIndex = -1;
        let agencyData = null;

        for (const comp of companies) {
            const data = parseAgencyData(comp.settings);
            const idx = data.approvals.findIndex((a) => a.shareToken === token);
            if (idx !== -1) {
                targetCompanyId = comp.id;
                targetApprovalIndex = idx;
                agencyData = data;
                break;
            }
        }

        if (!targetCompanyId || targetApprovalIndex === -1) {
            return res.status(404).json({ success: false, message: 'رابط الاعتماد غير موجود' });
        }

        agencyData.approvals[targetApprovalIndex].status = action;
        agencyData.approvals[targetApprovalIndex].clientFeedback = (feedback || '').trim();
        agencyData.approvals[targetApprovalIndex].reviewedAt = new Date().toISOString();
        agencyData.approvals[targetApprovalIndex].updatedAt = new Date().toISOString();

        await saveAgencyData(prisma, targetCompanyId, agencyData);

        res.json({
            success: true,
            message: action === 'APPROVED' ? 'تم اعتماد التصميم بنجاح، شكراً لك!' : 'تم إرسال ملاحظاتك للوكالة بنجاح!',
            data: agencyData.approvals[targetApprovalIndex],
        });
    } catch (error) {
        console.error('❌ [AGENCY] respondPublicApproval error:', error);
        res.status(500).json({ success: false, message: 'فشل تسجيل الرد' });
    }
};

module.exports = {
    getAgencyOverview,
    getClients,
    createClient,
    updateClient,
    deleteClient,
    logClientPerformance,
    deleteDailyLog,
    addExtraService,
    deleteExtraService,
    getInvoices,
    toggleInvoiceStatus,
    getApprovals,
    createApproval,
    updateApproval,
    deleteApproval,
    getPublicApproval,
    respondPublicApproval,
};
