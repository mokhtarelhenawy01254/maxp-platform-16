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

            // Parse steps JSON for the frontend
            const data = { ...settings };
            if (data.steps) {
                try { data.steps = JSON.parse(data.steps); } catch { data.steps = null; }
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getSettings error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateSettings(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { isEnabled, delayHours, message, mediaUrl, steps, businessHourStart, businessHourEnd, timezone } = req.body;

            const updateData = {};
            if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
            if (delayHours !== undefined) updateData.delayHours = delayHours;
            if (message !== undefined) updateData.message = message;
            if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
            if (steps !== undefined) updateData.steps = JSON.stringify(steps);
            if (businessHourStart !== undefined) updateData.businessHourStart = businessHourStart;
            if (businessHourEnd !== undefined) updateData.businessHourEnd = businessHourEnd;
            if (timezone !== undefined) updateData.timezone = timezone;

            const settings = await this.prisma.leadFollowUpSettings.upsert({
                where: { companyId },
                update: updateData,
                create: {
                    companyId,
                    isEnabled: isEnabled ?? false,
                    delayHours: delayHours ?? 24,
                    message: message ?? '',
                    mediaUrl,
                    steps: steps ? JSON.stringify(steps) : undefined,
                    businessHourStart,
                    businessHourEnd,
                    timezone
                }
            });

            const data = { ...settings };
            if (data.steps) {
                try { data.steps = JSON.parse(data.steps); } catch { data.steps = null; }
            }

            res.json({ success: true, data });
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

            // Get settings for step count
            const settings = await this.prisma.leadFollowUpSettings.findUnique({
                where: { companyId },
                select: { steps: true }
            });

            let totalSteps = 1;
            if (settings?.steps) {
                try { totalSteps = JSON.parse(settings.steps).length; } catch { /* ignore */ }
            }

            const data = enrollments.map(e => ({
                ...e,
                totalSteps
            }));

            res.json({ success: true, data });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getEnrollments error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getEnrollment(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;
            const enrollment = await this.prisma.leadFollowUpEnrollment.findFirst({
                where: { id, companyId },
                include: {
                    customer: {
                        select: { firstName: true, lastName: true, phone: true, email: true }
                    },
                    whatsAppContact: {
                        select: { phoneNumber: true, name: true, pushName: true }
                    }
                }
            });

            if (!enrollment) {
                return res.status(404).json({ success: false, message: 'Enrollment not found' });
            }

            res.json({ success: true, data: enrollment });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getEnrollment error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async cancelEnrollment(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;
            const result = await LeadFollowUpService.cancelEnrollment(id, companyId);

            if (!result.success) {
                const statusCode = result.reason === 'NOT_FOUND' ? 404 : 400;
                return res.status(statusCode).json({ success: false, message: result.reason });
            }

            res.json({ success: true, message: 'Enrollment cancelled' });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] cancelEnrollment error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getStats(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const [active, completed, cancelled, replied] = await Promise.all([
                this.prisma.leadFollowUpEnrollment.count({ where: { companyId, status: 'ACTIVE' } }),
                this.prisma.leadFollowUpEnrollment.count({ where: { companyId, status: 'COMPLETED' } }),
                this.prisma.leadFollowUpEnrollment.count({ where: { companyId, status: 'CANCELLED' } }),
                this.prisma.leadFollowUpEnrollment.count({ where: { companyId, repliedAt: { not: null } } })
            ]);

            const total = active + completed + cancelled;
            const totalSent = completed;
            const replyRate = totalSent > 0 ? Math.round((replied / totalSent) * 100) : 0;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            res.json({
                success: true,
                data: { active, completed, cancelled, replied, total, totalSent, replyRate, completionRate }
            });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getStats error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new LeadFollowUpController();
