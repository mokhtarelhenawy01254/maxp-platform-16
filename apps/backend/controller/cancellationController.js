const { getSharedPrismaClient } = require('../services/sharedDatabase');
const getPrisma = () => getSharedPrismaClient();

exports.getCategories = async (req, res) => {
    try {
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const categories = await getPrisma().cancellationReasonCategory.findMany({
            where: { companyId: effectiveCompanyId },
            include: { reasons: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(categories);
    } catch (error) {
        console.error('❌ [CANCELLATION_GET_CATEGORIES] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const category = await getPrisma().cancellationReasonCategory.create({
            data: {
                name,
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
        const { name, isActive } = req.body;
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const category = await getPrisma().cancellationReasonCategory.update({
            where: { id, companyId: effectiveCompanyId },
            data: { name, isActive }
        });
        res.json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

exports.getReasons = async (req, res) => {
    try {
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const reasons = await getPrisma().cancellationReason.findMany({
            where: {
                companyId: effectiveCompanyId,
                isActive: true
            },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json(reasons);
    } catch (error) {
        console.error('❌ [CANCELLATION_GET_REASONS] ERROR:', error.message);
        res.status(500).json({ error: 'Failed to fetch cancellation reasons', details: error.message });
    }
};

exports.createReason = async (req, res) => {
    try {
        const { reason, description, categoryId } = req.body;
        const newReason = await getPrisma().cancellationReason.create({
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
        res.status(500).json({ error: 'Failed to create cancellation reason' });
    }
};

exports.updateReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, description, categoryId, isActive } = req.body;
        const effectiveCompanyId = req.user.effectiveCompanyId || req.user.companyId;
        const updated = await getPrisma().cancellationReason.update({
            where: { id, companyId: effectiveCompanyId },
            data: { reason, description, categoryId, isActive }
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update cancellation reason' });
    }
};

exports.deleteReason = async (req, res) => {
    try {
        const { id } = req.params;

        const reason = await getPrisma().cancellationReason.findFirst({
            where: { id, companyId: req.user.effectiveCompanyId || req.user.companyId }
        });

        if (!reason) {
            return res.status(404).json({ error: 'Cancellation reason not found' });
        }

        await getPrisma().cancellationReason.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete cancellation reason' });
    }
};
