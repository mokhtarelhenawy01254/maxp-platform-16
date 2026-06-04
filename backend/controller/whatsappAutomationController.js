const { getSharedPrismaClient } = require('../services/sharedDatabase');

class WhatsAppAutomationController {
    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * Helper: extract companyId from req, returning false + sending 401/400 if unavailable
     */
    _getCompanyId(req, res) {
        if (!req.user) {
            console.error('❌ [WHATSAPP-AUTOMATION] req.user is undefined!', {
                path: req.originalUrl,
                hasAuth: !!req.headers.authorization
            });
            res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
            return null;
        }
        if (!req.user.companyId) {
            console.error('❌ [WHATSAPP-AUTOMATION] req.user.companyId is missing!', {
                userId: req.user.id,
                email: req.user.email,
                role: req.user.role
            });
            res.status(400).json({ success: false, message: 'Company context is required', code: 'COMPANY_REQUIRED' });
            return null;
        }
        return req.user.companyId;
    }

    /**
     * Get all follow-up flows for a company
     */
    async getFlows(req, res) {
        console.log(`🔍 [WHATSAPP-AUTOMATION] getFlows: ${req.originalUrl}`);
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const flows = await this.prisma.whatsAppFollowUpFlow.findMany({
                where: { companyId },
                include: {
                    _count: {
                        select: { steps: true, journeys: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, data: flows });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] getFlows error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Create a new flow
     */
    async createFlow(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { name } = req.body;

            const flow = await this.prisma.whatsAppFollowUpFlow.create({
                data: {
                    companyId,
                    name,
                    isEnabled: true
                }
            });

            res.json({ success: true, data: flow });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] createFlow error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Update flow settings
     */
    async updateFlow(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;
            const { name, isEnabled } = req.body;

            const flow = await this.prisma.whatsAppFollowUpFlow.update({
                where: { id, companyId },
                data: { name, isEnabled }
            });

            res.json({ success: true, data: flow });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] updateFlow error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Delete a flow
     */
    async deleteFlow(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;

            await this.prisma.whatsAppFollowUpFlow.delete({
                where: { id, companyId }
            });

            res.json({ success: true, message: 'Flow deleted successfully' });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] deleteFlow error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get steps for a specific flow
     */
    async getFlowSteps(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { flowId } = req.params;

            const steps = await this.prisma.whatsAppFollowUpStep.findMany({
                where: {
                    flowId,
                    flow: { companyId }
                },
                orderBy: { stepOrder: 'asc' }
            });

            res.json({ success: true, data: steps });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] getFlowSteps error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Upsert a step (Create or Update)
     */
    async upsertStep(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { flowId } = req.params;
            const { id, delayDays, content, mediaUrl, stepOrder } = req.body;

            // Verify flow ownership
            const flow = await this.prisma.whatsAppFollowUpFlow.findUnique({
                where: { id: flowId, companyId }
            });

            if (!flow) return res.status(404).json({ success: false, message: 'Flow not found' });

            let step;
            if (id) {
                step = await this.prisma.whatsAppFollowUpStep.update({
                    where: { id },
                    data: { delayDays, content, mediaUrl, stepOrder }
                });
            } else {
                step = await this.prisma.whatsAppFollowUpStep.create({
                    data: { flowId, delayDays, content, mediaUrl, stepOrder }
                });
            }

            res.json({ success: true, data: step });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] upsertStep error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Delete a step
     */
    async deleteStep(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { id } = req.params;

            // Verify ownership through relation
            const step = await this.prisma.whatsAppFollowUpStep.findFirst({
                where: {
                    id,
                    flow: { companyId }
                }
            });

            if (!step) return res.status(404).json({ success: false, message: 'Step not found' });

            await this.prisma.whatsAppFollowUpStep.delete({
                where: { id }
            });

            res.json({ success: true, message: 'Step deleted successfully' });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] deleteStep error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get active journeys for monitoring
     */
    async getJourneys(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { status } = req.query;

            const journeys = await this.prisma.customerJourney.findMany({
                where: {
                    companyId,
                    ...(status && { status })
                },
                include: {
                    customer: {
                        select: { firstName: true, lastName: true, phone: true }
                    },
                    order: {
                        select: { orderNumber: true }
                    },
                    flow: {
                        select: { name: true }
                    }
                },
                orderBy: { nextSendAt: 'asc' },
                take: 100
            });

            res.json({ success: true, data: journeys });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] getJourneys error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new WhatsAppAutomationController();
