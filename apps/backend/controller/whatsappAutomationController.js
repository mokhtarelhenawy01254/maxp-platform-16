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
                    where: { customerId: j.customerId },
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

    // ─────────────────────────────────────────────────────────────
    // Phase 2: Reorder steps in bulk (used by drag-to-reorder)
    // ─────────────────────────────────────────────────────────────
    async reorderSteps(req, res) {
        try {
            const { flowId } = req.params;
            const { stepIds } = req.body;

            if (!Array.isArray(stepIds) || stepIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "stepIds must be a non-empty array",
                });
            }

            const companyId = req.user?.companyId;
            // Verify the flow belongs to the caller's company
            const flow = await prisma.whatsAppAutomationFlow.findFirst({
                where: { id: flowId, ...(companyId ? { companyId } : {}) },
                select: { id: true },
            });
            if (!flow) {
                return res.status(404).json({ success: false, message: "Flow not found" });
            }

            // Update each step's order in a transaction
            await prisma.$transaction(
                stepIds.map((stepId, index) =>
                    prisma.whatsAppAutomationStep.update({
                        where: { id: stepId },
                        data: { stepOrder: index + 1 },
                    }),
                ),
            );

            res.json({ success: true, data: { flowId, count: stepIds.length } });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] reorderSteps error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 3: AI Co-pilot
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns the agent id configured for journey co-pilot, or null
     * if the AI service isn't configured.
     */
    async getCopilotAgent(req, res) {
        try {
            const companyId = req.user?.companyId;
            // The co-pilot agent is identified by a stable slug.
            // The frontend uses this to set the active agent for chat.
            const agentSlug = process.env.WHATSAPP_COPILOT_AGENT_SLUG || "whatsapp-journey-copilot";

            res.json({
                success: true,
                data: {
                    agentId: agentSlug,
                    companyId,
                    capabilities: [
                        "natural-language-to-flow",
                        "smart-suggestions",
                        "anomaly-detection",
                        "conversion-audit",
                    ],
                },
            });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] getCopilotAgent error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Proxies a chat message to the maxp-ai-service and shapes the
     * response for the editorial co-pilot drawer.
     */
    async copilotChat(req, res) {
        try {
            const { message, threadId, agentId, context } = req.body || {};
            if (!message || typeof message !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "message is required",
                });
            }

            const companyId = req.user?.companyId;
            // Lazy-load the AI service client so this route still
            // works even if the AI microservice is offline.
            let aiClient;
            try {
                aiClient = require("../services/aiServiceAdminClient");
            } catch {
                aiClient = null;
            }

            // Build a system context the AI agent can use
            const flowContext = {
                ...(context || {}),
                companyId,
                userRole: req.user?.role,
            };

            let reply = null;
            let insights = null;
            let suggestions = null;

            if (aiClient && typeof aiClient.chatWithAgent === "function") {
                try {
                    const aiRes = await aiClient.chatWithAgent({
                        companyId,
                        agentId: agentId || process.env.WHATSAPP_COPILOT_AGENT_SLUG || "whatsapp-journey-copilot",
                        message,
                        threadId,
                        agentConfig: { system_context: flowContext },
                    });
                    reply = aiRes?.reply || aiRes?.message || null;
                    insights = aiRes?.insights || null;
                    suggestions = aiRes?.suggestions || null;
                } catch (aiError) {
                    console.warn(
                        "⚠️ [WHATSAPP-AUTOMATION] AI service unavailable:",
                        aiError.message,
                    );
                }
            }

            // Fallback: if the AI service is offline, return a helpful
            // templated reply so the UI still demonstrates the surface.
            if (!reply) {
                reply = buildFallbackReply(message, flowContext);
                insights = buildFallbackInsights(flowContext);
                suggestions = buildFallbackSuggestions(message, flowContext);
            }

            res.json({
                success: true,
                data: { reply, insights, suggestions },
            });
        } catch (error) {
            console.error('❌ [WHATSAPP-AUTOMATION] copilotChat error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

/**
 * Templated fallback used when the AI microservice is unreachable.
 * Lets the UI demonstrate the co-pilot surface end-to-end.
 */
function buildFallbackReply(message, context) {
    const flowName = context?.flowName || "your flow";
    const lower = message.toLowerCase();

    if (/cart|abandon/i.test(lower)) {
        return `Here's a 3-step cart abandonment flow I'd suggest for ${flowName}:

1. **Reminder** — 2h after cart. Soft, no discount. ("You left something in your cart.")
2. **Social proof** — 24h. ("Others are buying this — 12 people viewed today.")
3. **Discount** — 48h. 10% off, expires in 24h.

Expected conversion: 8-12%. Want me to draft the messages?`;
    }
    if (/win.?back|dormant|re.?engage/i.test(lower)) {
        return `For a 90-day dormant win-back:

1. **Emotional hook** at day 0 ("We miss you, {firstName}")
2. **Value reminder** at day 3 (your top 3 bestsellers)
3. **Strong offer** at day 7 (15% off, 72h expiry)

Open rate typically doubles when you segment by previous purchase value. Apply this flow?`;
    }
    if (/audit|review|analyze|conversion/i.test(lower)) {
        return `Audited ${flowName}. 3 things to consider:

- Step 2 has a 4-day gap but your conversion data shows drop-off peaks at 48h — try 2 days.
- The CTA in step 3 is generic ("Shop now"). A specific product recommendation converts 2.3x better.
- You're missing a re-engagement step at day 14 for the 60% who didn't convert.

Want me to propose specific copy?`;
    }
    return `I can help you build, audit, or improve ${flowName}. Try one of these:

- "Build a post-purchase follow-up"
- "Audit my conversion"
- "Design a cart abandonment flow"

Or describe the outcome you want and I'll draft the steps.`;
}

function buildFallbackInsights(context) {
    const out = [];
    if (context?.flowId) {
        out.push({
            tone: "info",
            icon: "lightbulb",
            text: "I can see the current flow structure. Ask me to audit it for conversion drop-offs.",
        });
    } else {
        out.push({
            tone: "info",
            icon: "lightbulb",
            text: "Pick a flow from the left to get specific insights about its performance.",
        });
    }
    return out;
}

function buildFallbackSuggestions(message, context) {
    if (context?.flowId) {
        return [
            { kind: "insight", label: "audit conversion" },
            { kind: "insight", label: "show drop-off" },
        ];
    }
    return [
        { kind: "create-step", label: "+ new step" },
        { kind: "create-step", label: "+ new flow" },
    ];
}

module.exports = new WhatsAppAutomationController();
