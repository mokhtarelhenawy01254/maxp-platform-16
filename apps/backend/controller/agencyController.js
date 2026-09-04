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

        const totalClients = clients.length;
        const activeClients = clients.filter((c) => c.status === 'ACTIVE').length;
        const totalBudget = clients.reduce((acc, c) => acc + (Number(c.monthlyBudget) || 0), 0);
        const totalSpend = clients.reduce((acc, c) => acc + (Number(c.currentSpend) || 0), 0);
        const totalRetainers = clients.reduce((acc, c) => acc + (Number(c.monthlyRetainer) || 0), 0);

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
                    pendingApprovals,
                    expectedPacingPercent,
                    currentDay,
                    daysInMonth,
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
        const newClient = {
            id: `cli_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            name: name.trim(),
            contactPerson: (contactPerson || '').trim(),
            email: (email || '').trim(),
            phone: (phone || '').trim(),
            monthlyBudget: Number(monthlyBudget) || 0,
            currentSpend: Number(currentSpend) || 0,
            monthlyRetainer: Number(monthlyRetainer) || 0,
            status: status || 'ACTIVE',
            adAccountId: (adAccountId || '').trim(),
            primaryPlatforms: Array.isArray(primaryPlatforms) ? primaryPlatforms : ['facebook', 'instagram'],
            assignedLead: (assignedLead || '').trim(),
            notes: (notes || '').trim(),
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

        agencyData.clients[index] = {
            ...agencyData.clients[index],
            ...updates,
            monthlyBudget: updates.monthlyBudget !== undefined ? Number(updates.monthlyBudget) : agencyData.clients[index].monthlyBudget,
            currentSpend: updates.currentSpend !== undefined ? Number(updates.currentSpend) : agencyData.clients[index].currentSpend,
            monthlyRetainer: updates.monthlyRetainer !== undefined ? Number(updates.monthlyRetainer) : agencyData.clients[index].monthlyRetainer,
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

// 3. Approvals
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

// 4. Public Portal for Client (No Login Needed)
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
    getApprovals,
    createApproval,
    updateApproval,
    deleteApproval,
    getPublicApproval,
    respondPublicApproval,
};
