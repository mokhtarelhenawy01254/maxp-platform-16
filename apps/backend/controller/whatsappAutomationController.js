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
                        select: { steps: true, journeys: true, categories: true }
                    },
                    categories: { select: { id: true, name: true, color: true } }
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

            const { name, isGeneral } = req.body;

            // Only one general flow allowed per company
            if (isGeneral) {
                const existingGeneral = await this.prisma.whatsAppFollowUpFlow.findFirst({
                    where: { companyId, isGeneral: true }
                });
                if (existingGeneral) {
                    return res.status(400).json({ success: false, message: 'يوجد تدفق عام بالفعل. يمكنك تعديله بدلاً من إنشاء واحد جديد.', code: 'GENERAL_ALREADY_EXISTS' });
                }
            }

            const flow = await this.prisma.whatsAppFollowUpFlow.create({
                data: {
                    companyId,
                    name,
                    isEnabled: true,
                    isGeneral: isGeneral || false
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
            const { name, isEnabled, isGeneral } = req.body;

            const data = {};
            if (name !== undefined) data.name = name;
            if (isEnabled !== undefined) data.isEnabled = isEnabled;
            if (isGeneral !== undefined) {
                // Only one general flow allowed
                if (isGeneral) {
                    const existingGeneral = await this.prisma.whatsAppFollowUpFlow.findFirst({
                        where: { companyId, isGeneral: true, id: { not: id } }
                    });
                    if (existingGeneral) {
                        return res.status(400).json({ success: false, message: 'يوجد تدفق عام بالفعل', code: 'GENERAL_ALREADY_EXISTS' });
                    }
                }
                data.isGeneral = isGeneral;
            }

            const flow = await this.prisma.whatsAppFollowUpFlow.update({
                where: { id, companyId },
                data
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
            const { id, delayDays, delayHours, delayUnit, content, mediaUrl, stepOrder } = req.body;

            // Verify flow ownership
            const flow = await this.prisma.whatsAppFollowUpFlow.findUnique({
                where: { id: flowId, companyId }
            });

            if (!flow) return res.status(404).json({ success: false, message: 'Flow not found' });

            let step;
            if (id) {
                step = await this.prisma.whatsAppFollowUpStep.update({
                    where: { id },
                    data: { delayDays, delayHours, delayUnit, content, mediaUrl, stepOrder }
                });
            } else {
                step = await this.prisma.whatsAppFollowUpStep.create({
                    data: { flowId, delayDays, delayHours, delayUnit, content, mediaUrl, stepOrder }
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
     * Create a preset 24-hour welcome flow
     */
    async createPresetFlow(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { name } = req.body;
            const flowName = name?.trim() || 'رحلة ترحيبية ٢٤ ساعة';

            const flow = await this.prisma.whatsAppFollowUpFlow.create({
                data: {
                    companyId,
                    name: flowName,
                    isEnabled: true,
                    steps: {
                        create: [
                            { delayDays: 0, delayHours: 1, delayUnit: 'HOURS', stepOrder: 1, content: 'مرحبًا {firstName}! شكرًا على تواصلك معنا. 🤝 كيف نقدر نساعدك اليوم؟' },
                            { delayDays: 0, delayHours: 6, delayUnit: 'HOURS', stepOrder: 2, content: 'مرحبًا {firstName}! 🎁 عندنا عرض خاص النهاردة! تواصل معنا عشان تعرف التفاصيل.' },
                            { delayDays: 0, delayHours: 12, delayUnit: 'HOURS', stepOrder: 3, content: 'أهلًا {firstName} 👋 لسه محتاج مساعدة في حاجة؟ احنا موجودين.' },
                            { delayDays: 0, delayHours: 24, delayUnit: 'HOURS', stepOrder: 4, content: 'مرحبًا {firstName} ⏳ آخر فرصة! العرض بينتهي قريب. كلمنا قبل ما يفوتك.' },
                        ],
                    },
                },
            });

            res.json({ success: true, data: flow, message: 'تم إنشاء الرحلة الترحيبية بنجاح' });
        } catch (error) {
            console.error('[PRESET-FLOW] Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Re-enroll a customer in a category-triggered journey
     */
    async reEnrollJourney(req, res) {
        try {
            const companyId = this._getCompanyId(req, res);
            if (!companyId) return;

            const { customerId, contactId, categoryId } = req.body;
            if (!customerId || !contactId || !categoryId) {
                return res.status(400).json({ success: false, message: 'customerId, contactId, categoryId required' });
            }

            const WhatsAppJourneyService = require('../services/whatsapp/WhatsAppJourneyService');
            await WhatsAppJourneyService.reEnrollFromCategory(companyId, customerId, contactId, categoryId);

            res.json({ success: true, message: 'Journey re-enrolled successfully' });
        } catch (error) {
            console.error('[REENROLL] Error:', error);
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

            const { status, customerId } = req.query;

            const journeys = await this.prisma.customerJourney.findMany({
                where: {
                    companyId,
                    ...(status && { status }),
                    ...(customerId && { customerId })
                },
                include: {
                    customer: {
                        select: { firstName: true, lastName: true, phone: true }
                    },
                    order: {
                        select: { orderNumber: true }
                    },
                    flow: {
                        select: { name: true, steps: { select: { id: true }, orderBy: { stepOrder: 'asc' } } }
                    }
                },
                orderBy: { nextSendAt: 'asc' },
                take: 100
            });

            // Attach WhatsApp contact info for chat linking
            const withContact = await Promise.all(journeys.map(async (j) => {
                const waContact = await this.prisma.whatsAppContact.findFirst({
                    where: { customerId: j.customerId, companyId },
                    select: { id: true, phoneNumber: true, name: true, jid: true }
                });
                return { ...j, whatsappContactId: waContact?.id || null, whatsappPhone: waContact?.phoneNumber || null };
            }));

            res.json({ success: true, data: withContact });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] getJourneys error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new WhatsAppAutomationController();
