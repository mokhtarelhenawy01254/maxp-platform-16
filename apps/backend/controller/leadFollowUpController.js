const { getSharedPrismaClient } = require('../services/sharedDatabase');

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

    async getFlows(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const flows = await this.prisma.leadFollowUpFlow.findMany({
                where: { companyId },
                include: {
                    _count: {
                        select: { steps: true, enrollments: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, data: flows });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getFlows error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createFlow(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { name } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, message: 'Flow name is required' });
            }

            const flow = await this.prisma.leadFollowUpFlow.create({
                data: { companyId, name, isEnabled: true }
            });

            res.json({ success: true, data: flow });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] createFlow error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateFlow(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;
            const { name, isEnabled } = req.body;

            const flow = await this.prisma.leadFollowUpFlow.update({
                where: { id, companyId },
                data: { name, isEnabled }
            });

            res.json({ success: true, data: flow });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] updateFlow error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteFlow(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;

            await this.prisma.leadFollowUpFlow.delete({
                where: { id, companyId }
            });

            res.json({ success: true, message: 'Flow deleted successfully' });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] deleteFlow error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getFlowSteps(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { flowId } = req.params;

            const steps = await this.prisma.leadFollowUpStep.findMany({
                where: {
                    flowId,
                    flow: { companyId }
                },
                orderBy: { stepOrder: 'asc' }
            });

            res.json({ success: true, data: steps });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] getFlowSteps error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async upsertStep(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { flowId } = req.params;
            const { id, delayHours, content, mediaUrl, stepOrder } = req.body;

            const flow = await this.prisma.leadFollowUpFlow.findUnique({
                where: { id: flowId, companyId }
            });

            if (!flow) return res.status(404).json({ success: false, message: 'Flow not found' });

            let step;
            if (id) {
                step = await this.prisma.leadFollowUpStep.update({
                    where: { id },
                    data: { delayHours, content, mediaUrl, stepOrder }
                });
            } else {
                step = await this.prisma.leadFollowUpStep.create({
                    data: { flowId, delayHours, content, mediaUrl, stepOrder }
                });
            }

            res.json({ success: true, data: step });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] upsertStep error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteStep(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;

            const step = await this.prisma.leadFollowUpStep.findFirst({
                where: { id, flow: { companyId } }
            });

            if (!step) return res.status(404).json({ success: false, message: 'Step not found' });

            await this.prisma.leadFollowUpStep.delete({
                where: { id }
            });

            res.json({ success: true, message: 'Step deleted successfully' });
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-CTRL] deleteStep error:', error.message);
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
                    },
                    flow: {
                        select: { name: true }
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
}

module.exports = new LeadFollowUpController();
