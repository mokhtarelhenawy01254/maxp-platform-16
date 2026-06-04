const platformPartnerService = require('../services/platformPartner.service');

exports.registerPartner = async (req, res, next) => {
    try {
        const userId = req.user.id; // From auth middleware
        const { companyName, parentPartnerCode } = req.body;

        const partner = await platformPartnerService.registerPartner(userId, {
            companyName,
            parentPartnerCode
        });

        res.status(201).json({
            status: 'success',
            data: { partner }
        });
    } catch (err) {
        if (err.message.includes('already registered')) {
            return res.status(400).json({ status: 'fail', message: err.message });
        }
        if (err.message.includes('permission to invite')) {
            return res.status(403).json({ status: 'fail', message: err.message });
        }
        if (err.message.includes('Invalid Referral')) {
            return res.status(400).json({ status: 'fail', message: err.message });
        }
        next(err);
    }
};

exports.getPartnerDashboard = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const dashboardData = await platformPartnerService.getPartnerDashboardData(userId);

        res.status(200).json({
            status: 'success',
            data: { dashboard: dashboardData }
        });
    } catch (err) {
        next(err);
    }
};

exports.updateTitle = async (req, res, next) => {
    try {
        const { partnerId } = req.params;
        const { title } = req.body;

        const updatedPartner = await platformPartnerService.updatePartnerTitle(partnerId, title);

        res.status(200).json({
            status: 'success',
            data: { partner: updatedPartner }
        });
    } catch (err) {
        next(err);
    }
};

exports.requestPayout = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { amount, method, details } = req.body;

        const payout = await platformPartnerService.requestPayout(userId, amount, method, details);

        res.status(201).json({
            status: 'success',
            data: { payout }
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.processPayout = async (req, res, next) => {
    try {
        const { payoutId } = req.params;
        const { status, transactionDetails } = req.body;

        const result = await platformPartnerService.processPayout(payoutId, status, transactionDetails);

        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

exports.getAdminStats = async (req, res, next) => {
    try {
        const stats = await platformPartnerService.getAdminStats();

        res.status(200).json({
            status: 'success',
            data: { stats }
        });
    } catch (err) {
        next(err);
    }
};
