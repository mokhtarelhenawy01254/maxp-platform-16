const { getSharedPrismaClient } = require('../services/sharedDatabase');
const LeadFollowUpService = require('../services/whatsapp/LeadFollowUpService');

class LeadFollowUpController {
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

    async getSettings(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            let settings = await this.prisma.leadFollowUpSettings.findUnique({
                where: { companyId }
            });

            if (!settings) {
                settings = await this.prisma.leadFollowUpSettings.create({
                    data: { companyId, isEnabled: false, delayHours: 24, message: '' }
                });
            }

            res.json({ success: true, data: settings });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getSettings error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateSettings(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { isEnabled, delayHours, message, mediaUrl } = req.body;

            const settings = await this.prisma.leadFollowUpSettings.upsert({
                where: { companyId },
                update: {
                    ...(isEnabled !== undefined && { isEnabled }),
                    ...(delayHours !== undefined && { delayHours }),
                    ...(message !== undefined && { message }),
                    ...(mediaUrl !== undefined && { mediaUrl })
                },
                create: {
                    companyId,
                    isEnabled: isEnabled ?? false,
                    delayHours: delayHours ?? 24,
                    message: message ?? '',
                    mediaUrl
                }
            });

            res.json({ success: true, data: settings });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] updateSettings error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getEnrollments(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { status } = req.query;

            const enrollments = await this.prisma.leadFollowUpEnrollment.findMany({
                where: {
                    companyId,
                    ...(status && { status })
                },
                include: {
                    customer: {
                        select: { firstName: true, lastName: true, phone: true }
                    },
                    whatsAppContact: {
                        select: { phoneNumber: true, name: true, pushName: true }
                    }
                },
                orderBy: { nextSendAt: 'asc' },
                take: 100
            });

            res.json({ success: true, data: enrollments });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getEnrollments error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getStats(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const [active, completed, cancelled] = await Promise.all([
                this.prisma.leadFollowUpEnrollment.count({ where: { companyId, status: 'ACTIVE' } }),
                this.prisma.leadFollowUpEnrollment.count({ where: { companyId, status: 'COMPLETED' } }),
                this.prisma.leadFollowUpEnrollment.count({ where: { companyId, status: 'CANCELLED' } })
            ]);

            res.json({ success: true, data: { active, completed, cancelled, total: active + completed + cancelled } });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getStats error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new LeadFollowUpController();
