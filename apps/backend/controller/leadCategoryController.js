const { getSharedPrismaClient } = require('../services/sharedDatabase');

class LeadCategoryController {
    get prisma() {
        return getSharedPrismaClient();
    }

    _getCompanyId(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return null;
        }
        if (!req.user.companyId) {
            res.status(400).json({ success: false, message: 'Company context is required', code: 'COMPANY_REQUIRED' });
            return null;
        }
        return req.user.companyId;
    }

    async list(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const categories = await this.prisma.leadCategory.findMany({
                where: { companyId },
                orderBy: { sortOrder: 'asc' },
            });

            // Attach count of contacts per category
            const withCounts = await Promise.all(categories.map(async (cat) => {
                const count = await this.prisma.whatsAppContact.count({
                    where: { leadCategoryId: cat.id, session: { companyId } },
                });
                return { ...cat, contactCount: count };
            }));

            res.json({ success: true, data: withCounts });
        } catch (error) {
            console.error('❌ Error listing lead categories:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { name, color, sortOrder, autoFollowUp, autoPromoteCategoryId } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ success: false, message: 'Category name is required' });
            }

            const category = await this.prisma.leadCategory.create({
                data: {
                    companyId,
                    name: name.trim(),
                    color: color || '#6366f1',
                    sortOrder: sortOrder ?? 0,
                    autoFollowUp: autoFollowUp !== false,
                    autoPromoteCategoryId: autoPromoteCategoryId || null,
                },
            });

            res.json({ success: true, data: category });
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(409).json({ success: false, message: 'Category name already exists' });
            }
            console.error('❌ Error creating lead category:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;
            const { name, color, sortOrder, autoFollowUp, autoPromoteCategoryId } = req.body;

            const existing = await this.prisma.leadCategory.findFirst({
                where: { id, companyId },
            });
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Category not found' });
            }

            const category = await this.prisma.leadCategory.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name: name.trim() }),
                    ...(color !== undefined && { color }),
                    ...(sortOrder !== undefined && { sortOrder }),
                    ...(autoFollowUp !== undefined && { autoFollowUp }),
                    ...(autoPromoteCategoryId !== undefined && { autoPromoteCategoryId: autoPromoteCategoryId || null }),
                },
            });

            res.json({ success: true, data: category });
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(409).json({ success: false, message: 'Category name already exists' });
            }
            console.error('❌ Error updating lead category:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;

            const existing = await this.prisma.leadCategory.findFirst({
                where: { id, companyId },
            });
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Category not found' });
            }

            // Unlink all contacts from this category before deleting
            await this.prisma.whatsAppContact.updateMany({
                where: { leadCategoryId: id },
                data: { leadCategoryId: null },
            });

            await this.prisma.leadCategory.delete({ where: { id } });

            res.json({ success: true, message: 'Category deleted' });
        } catch (error) {
            console.error('❌ Error deleting lead category:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new LeadCategoryController();
