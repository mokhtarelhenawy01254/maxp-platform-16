const { getSharedPrismaClient } = require('../sharedDatabase');
const WhatsAppNotificationService = require('./WhatsAppNotificationService');

class LeadFollowUpService {
    get prisma() {
        return getSharedPrismaClient();
    }

    _parseSteps(settings) {
        if (settings.steps) {
            try {
                const parsed = JSON.parse(settings.steps);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch { /* fall through */ }
        }
        // Fallback: use legacy single-step fields
        return [{
            delayHours: settings.delayHours ?? 24,
            message: settings.message ?? '',
            mediaUrl: settings.mediaUrl ?? null,
            templateName: settings.templateName ?? null,
            templateLanguage: settings.templateLanguage ?? 'ar',
            templateParams: settings.templateParams ?? null
        }];
    }

    _getHourInTimezone(tz) {
        if (!tz || tz === 'UTC') return new Date().getUTCHours();
        try {
            return parseInt(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: false }), 10);
        } catch {
            return new Date().getUTCHours();
        }
    }

    _isWithinBusinessHours(settings) {
        if (settings.businessHourStart == null || settings.businessHourEnd == null) return true;
        const hour = this._getHourInTimezone(settings.timezone);
        if (settings.businessHourStart <= settings.businessHourEnd) {
            return hour >= settings.businessHourStart && hour < settings.businessHourEnd;
        }
        return hour >= settings.businessHourStart || hour < settings.businessHourEnd;
    }

    _nextBusinessHourDate(settings) {
        if (settings.businessHourStart == null) return new Date();
        const next = new Date();
        if (next.getHours() >= settings.businessHourStart) {
            next.setDate(next.getDate() + 1);
        }
        next.setHours(settings.businessHourStart, 0, 0, 0);
        return next;
    }

    async enrollLead(companyId, customerId, whatsappContactId) {
        try {
            console.log(`[LEAD-FOLLOWUP] Attempting to enroll lead ${customerId} for company ${companyId}`);

            const settings = await this.prisma.leadFollowUpSettings.findUnique({
                where: { companyId }
            });

            if (!settings || !settings.isEnabled) {
                console.log(`[LEAD-FOLLOWUP] Lead follow-up not configured or disabled for company ${companyId}`);
                return;
            }

            const steps = this._parseSteps(settings);
            if (steps.length === 0 || (!steps[0].message && !steps[0].templateName)) {
                console.log(`[LEAD-FOLLOWUP] No message or template configured for company ${companyId}`);
                return;
            }

            // Check lead category — autoFollowUp + triggerFlowId
            const contact = await this.prisma.whatsAppContact.findUnique({
                where: { id: whatsappContactId },
                select: { leadCategoryId: true }
            });
            if (contact?.leadCategoryId) {
                const category = await this.prisma.leadCategory.findUnique({
                    where: { id: contact.leadCategoryId },
                    select: { autoFollowUp: true, triggerFlowId: true }
                });
                if (category && !category.autoFollowUp) {
                    console.log(`[LEAD-FOLLOWUP] Contact ${whatsappContactId} category has autoFollowUp disabled, skipping`);
                    return;
                }
                if (category?.triggerFlowId) {
                    const journeyService = require('./WhatsAppJourneyService');
                    await journeyService.enrollFromCategory(companyId, customerId, whatsappContactId, contact.leadCategoryId);
                    return;
                }
                // التصنيف ملوش flow مخصص → شوف لو فيه flow عام
                const generalFlow = await this.prisma.whatsAppFollowUpFlow.findFirst({
                    where: { companyId, isGeneral: true, isEnabled: true }
                });
                if (generalFlow) {
                    const journeyService = require('./WhatsAppJourneyService');
                    await journeyService.enrollInGeneralFlow(companyId, customerId, whatsappContactId);
                    return;
                }
            } else {
                // العميل مالوش تصنيف → شوف لو فيه flow عام
                const generalFlow = await this.prisma.whatsAppFollowUpFlow.findFirst({
                    where: { companyId, isGeneral: true, isEnabled: true }
                });
                if (generalFlow) {
                    const journeyService = require('./WhatsAppJourneyService');
                    await journeyService.enrollInGeneralFlow(companyId, customerId, whatsappContactId);
                    return;
                }
            }

            const existing = await this.prisma.leadFollowUpEnrollment.findFirst({
                where: { companyId, whatsappContactId, status: 'ACTIVE' }
            });

            if (existing) {
                console.log(`[LEAD-FOLLOWUP] Lead already enrolled for contact ${whatsappContactId}`);
                return;
            }

            let nextSendAt = new Date();
            nextSendAt.setHours(nextSendAt.getHours() + steps[0].delayHours);
            if (!this._isWithinBusinessHours(settings)) {
                nextSendAt = this._nextBusinessHourDate(settings);
            }

            await this.prisma.leadFollowUpEnrollment.create({
                data: {
                    companyId,
                    customerId,
                    whatsappContactId,
                    status: 'ACTIVE',
                    currentStep: 0,
                    nextSendAt,
                    logs: `Enrolled in lead follow-up at ${new Date().toISOString()} (${steps.length} step(s))`
                }
            });

            console.log(`[LEAD-FOLLOWUP] Enrolled lead successfully with ${steps.length} step(s)`);
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] Enrollment failed:', error);
        }
    }

    async processPendingEnrollments() {
        try {
            const now = new Date();
            const enrollments = await this.prisma.leadFollowUpEnrollment.findMany({
                where: { status: 'ACTIVE', nextSendAt: { lte: now } },
                include: { customer: true, whatsAppContact: true }
            });

            if (enrollments.length === 0) return;
            console.log(`[LEAD-FOLLOWUP] Processing ${enrollments.length} pending enrollments...`);

            for (const enrollment of enrollments) {
                await this.sendFollowUp(enrollment);
            }
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] Processing enrollments failed:', error);
        }
    }

    async sendFollowUp(enrollment) {
        try {
            const settings = await this.prisma.leadFollowUpSettings.findUnique({
                where: { companyId: enrollment.companyId }
            });

            if (!settings || !settings.isEnabled) {
                await this.prisma.leadFollowUpEnrollment.update({
                    where: { id: enrollment.id },
                    data: { status: 'CANCELLED' }
                });
                return;
            }

            const steps = this._parseSteps(settings);
            const stepIndex = enrollment.currentStep;

            if (stepIndex >= steps.length) {
                await this.prisma.leadFollowUpEnrollment.update({
                    where: { id: enrollment.id },
                    data: { status: 'COMPLETED' }
                });
                return;
            }

            const step = steps[stepIndex];

            // Check business hours
            if (!this._isWithinBusinessHours(settings)) {
                const rescheduleAt = this._nextBusinessHourDate(settings);
                await this.prisma.leadFollowUpEnrollment.update({
                    where: { id: enrollment.id },
                    data: { nextSendAt: rescheduleAt }
                });
                return;
            }

            const contact = enrollment.whatsAppContact || {};
            const customer = enrollment.customer || {};
            const recipientPhone = contact.phoneNumber || customer.phone;
            const recipientName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

            const templateName = step.templateName || settings.templateName || null;
            const templateLanguage = step.templateLanguage || settings.templateLanguage || 'ar';
            const templateParamsRaw = step.templateParams || settings.templateParams || null;

            // Resolve company session
            const session = await this.prisma.whatsAppSession.findFirst({
                where: { companyId: enrollment.companyId, isDefault: true }
            }) || await this.prisma.whatsAppSession.findFirst({
                where: { companyId: enrollment.companyId, status: 'CONNECTED' },
                orderBy: [{ lastConnectedAt: 'desc' }, { createdAt: 'desc' }]
            }) || await this.prisma.whatsAppSession.findFirst({
                where: { companyId: enrollment.companyId },
                orderBy: { createdAt: 'desc' }
            });

            const isMetaSession = session?.provider === 'META_CLOUD';

            const company = await this.prisma.company.findUnique({
                where: { id: enrollment.companyId },
                select: { name: true }
            });

            const variables = {
                firstName: customer.firstName || '',
                lastName: customer.lastName || '',
                customerName: recipientName || customer.firstName || 'عميلنا العزيز',
                customerPhone: customer.phone || recipientPhone || '',
                email: customer.email || '',
                companyName: company?.name || 'المنصة',
                date: new Date().toLocaleDateString('ar-EG')
            };

            const advanceOrComplete = async (logLine) => {
                const nextStepIndex = stepIndex + 1;
                const hasMoreSteps = nextStepIndex < steps.length;
                const currentLogs = enrollment.logs || '';
                const updatedLogs = currentLogs + (currentLogs ? '\n' : '') + logLine;

                if (hasMoreSteps) {
                    let nextSendAt = new Date();
                    nextSendAt.setHours(nextSendAt.getHours() + (steps[nextStepIndex].delayHours || 24));
                    if (!this._isWithinBusinessHours(settings)) {
                        nextSendAt = this._nextBusinessHourDate(settings);
                    }

                    await this.prisma.leadFollowUpEnrollment.update({
                        where: { id: enrollment.id },
                        data: {
                            currentStep: nextStepIndex,
                            nextSendAt,
                            lastSentAt: new Date(),
                            logs: updatedLogs
                        }
                    });
                    console.log(`[LEAD-FOLLOWUP] Advanced to step ${nextStepIndex + 1}/${steps.length} for ${recipientPhone}`);
                } else {
                    await this.prisma.leadFollowUpEnrollment.update({
                        where: { id: enrollment.id },
                        data: {
                            status: 'COMPLETED',
                            currentStep: nextStepIndex,
                            lastSentAt: new Date(),
                            logs: updatedLogs + `\nAll steps completed at ${new Date().toISOString()}`
                        }
                    });
                    console.log(`[LEAD-FOLLOWUP] All steps completed for ${recipientPhone}`);
                }
            };

            const skipStepGracefully = async (reason) => {
                console.warn(`⚠️ [LEAD-FOLLOWUP] Skipping step ${stepIndex + 1}/${steps.length} for ${recipientPhone}: ${reason}`);
                const logLine = `Skipped step ${stepIndex + 1}/${steps.length} (${reason}) at ${new Date().toISOString()}`;
                await advanceOrComplete(logLine);
            };

            let sentSuccess = false;
            let metaMessageId = null;

            if (isMetaSession && templateName && session?.id) {
                // Meta Cloud template send path
                try {
                    const MetaCloudProvider = require('./providers/MetaCloudProvider');
                    let allTemplates = [];
                    try {
                        allTemplates = await MetaCloudProvider.listTemplates(session.id);
                    } catch (listErr) {
                        console.warn(`⚠️ [LEAD-FOLLOWUP] listTemplates failed for session ${session.id}:`, listErr.message);
                    }

                    const tmpl = Array.isArray(allTemplates) ? allTemplates.find(t => t.name === templateName) : null;

                    if (!tmpl) {
                        await skipStepGracefully(`Template "${templateName}" not found on Meta WABA`);
                        return;
                    }

                    if (String(tmpl.status).toUpperCase() !== 'APPROVED') {
                        await skipStepGracefully(`Template "${templateName}" status is ${tmpl.status || 'PENDING'}`);
                        return;
                    }

                    // Build components from templateParams
                    let parsedParams = {};
                    if (templateParamsRaw) {
                        try {
                            parsedParams = typeof templateParamsRaw === 'object' ? templateParamsRaw : JSON.parse(templateParamsRaw);
                        } catch { parsedParams = {}; }
                    }

                    const bodyParams = [];
                    const bodyComp = (tmpl.components || []).find(c => String(c.type || '').toUpperCase() === 'BODY');
                    const placeholderMatches = (bodyComp?.text || '').match(/\{\{\s*(\d+)\s*\}\}/g) || [];
                    const count = placeholderMatches.length;

                    for (let i = 1; i <= count; i++) {
                        const varKey = parsedParams[String(i)] || (i === 1 ? 'firstName' : (i === 2 ? 'companyName' : ''));
                        const val = variables[varKey] !== undefined ? variables[varKey] : (variables[i] || '');
                        bodyParams.push({ type: 'text', text: String(val || '') });
                    }

                    const components = [];
                    if (bodyParams.length > 0) {
                        components.push({ type: 'BODY', parameters: bodyParams });
                    }

                    const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
                    const sendRes = await WhatsAppMessageHandler.sendTemplateMessage(
                        session.id,
                        recipientPhone,
                        templateName,
                        {
                            name: templateName,
                            language: templateLanguage || tmpl.language || 'ar',
                            components
                        },
                        {
                            templateBody: bodyComp?.text || `Template: ${templateName}`,
                            senderId: null
                        }
                    );

                    metaMessageId = sendRes?.messageId || sendRes?.key?.id || null;
                    sentSuccess = true;
                } catch (metaErr) {
                    console.error(`❌ [LEAD-FOLLOWUP] Meta template sending failed for "${templateName}":`, metaErr?.message || metaErr);
                    const errMsg = metaErr?.details || metaErr?.message || 'Meta template send error';
                    await skipStepGracefully(`Meta send error: ${errMsg}`);
                    return;
                }
            } else if (isMetaSession && !templateName) {
                // Meta Cloud without template: check 24h customer window
                const WhatsAppWindowService = require('./WhatsAppWindowService');
                const windowStatus = WhatsAppWindowService.computeWindowStatus(contact);

                if (!windowStatus.isOpen) {
                    await skipStepGracefully('Meta 24h customer window is closed and no approved template is configured');
                    return;
                }

                // Window is open: send free text fallback
                const result = await WhatsAppNotificationService.sendNotification({
                    companyId: enrollment.companyId,
                    recipientPhone,
                    recipientName,
                    recipientType: 'CUSTOMER',
                    category: 'MARKETING',
                    eventType: 'LEAD_FOLLOWUP',
                    contentOverride: step.message,
                    variables,
                    customerId: enrollment.customerId
                });

                if (result.success) {
                    sentSuccess = true;
                    metaMessageId = result.messageId || null;
                } else {
                    console.error(`[LEAD-FOLLOWUP] Free-text sendNotification failed:`, result.reason);
                }
            } else {
                // Baileys session or notification fallback
                const result = await WhatsAppNotificationService.sendNotification({
                    companyId: enrollment.companyId,
                    recipientPhone,
                    recipientName,
                    recipientType: 'CUSTOMER',
                    category: 'MARKETING',
                    eventType: 'LEAD_FOLLOWUP',
                    contentOverride: step.message,
                    variables,
                    customerId: enrollment.customerId
                });

                if (result.success) {
                    sentSuccess = true;
                    metaMessageId = result.messageId || null;
                } else {
                    console.error(`[LEAD-FOLLOWUP] Notification send failed:`, result.reason);
                }
            }

            if (sentSuccess) {
                const stepLabel = `Step ${stepIndex + 1}/${steps.length}`;
                const methodInfo = templateName ? `via template "${templateName}"` : 'via message';
                const messageIdStr = metaMessageId ? ` (MessageID: ${metaMessageId})` : '';
                const logLine = `Sent ${stepLabel} ${methodInfo}${messageIdStr} at ${new Date().toISOString()}`;
                await advanceOrComplete(logLine);
            } else {
                console.error(`[LEAD-FOLLOWUP] Follow-up delivery was not successful, scheduling retry`);
                let retryAt = new Date();
                retryAt.setHours(retryAt.getHours() + 1);
                if (!this._isWithinBusinessHours(settings)) {
                    retryAt = this._nextBusinessHourDate(settings);
                }

                await this.prisma.leadFollowUpEnrollment.update({
                    where: { id: enrollment.id },
                    data: { nextSendAt: retryAt }
                });

                try {
                    const admins = await this.prisma.userCompany.findMany({
                        where: {
                            companyId: enrollment.companyId,
                            role: { in: ['OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'] },
                            isActive: true
                        },
                        select: { userId: true }
                    });

                    if (admins.length > 0) {
                        const stepLabel = `الخطوة ${stepIndex + 1}/${steps.length}`;
                        const notificationsData = admins.map(admin => ({
                            companyId: enrollment.companyId,
                            userId: admin.userId,
                            title: 'فشل إرسال رسالة متابعة عميل محتمل',
                            message: `فشل إرسال ${stepLabel} للعميل ${customer.firstName || ''}. سيتم المحاولة مرة أخرى.`,
                            type: 'SYSTEM',
                            data: { enrollmentId: enrollment.id, step: stepIndex }
                        }));
                        await this.prisma.notification.createMany({ data: notificationsData });
                    }
                } catch(notifyErr) {
                    console.error('[LEAD-FOLLOWUP] Failed to notify admins:', notifyErr.message);
                }
            }
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] Failed to send follow-up:', error);
        }
    }

    async markReplied(whatsappContactId) {
        try {
            const enrollment = await this.prisma.leadFollowUpEnrollment.findFirst({
                where: { whatsappContactId, status: 'ACTIVE', lastSentAt: { not: null } }
            });
            if (!enrollment) return;

            await this.prisma.leadFollowUpEnrollment.update({
                where: { id: enrollment.id },
                data: {
                    repliedAt: new Date(),
                    status: 'COMPLETED',
                    logs: (enrollment.logs || '') + `\nLead replied at ${new Date().toISOString()}, follow-up completed`
                }
            });
            console.log(`[LEAD-FOLLOWUP] Lead replied, enrollment ${enrollment.id} marked as completed`);
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] markReplied failed:', error);
        }
    }

    async cancelEnrollment(enrollmentId, companyId) {
        try {
            const enrollment = await this.prisma.leadFollowUpEnrollment.findFirst({
                where: { id: enrollmentId, companyId }
            });
            if (!enrollment) return { success: false, reason: 'NOT_FOUND' };
            if (enrollment.status !== 'ACTIVE') return { success: false, reason: 'ALREADY_' + enrollment.status };

            await this.prisma.leadFollowUpEnrollment.update({
                where: { id: enrollmentId },
                data: {
                    status: 'CANCELLED',
                    logs: (enrollment.logs || '') + `\nCancelled manually at ${new Date().toISOString()}`
                }
            });
            return { success: true };
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] cancelEnrollment failed:', error);
            return { success: false, reason: error.message };
        }
    }
}

module.exports = new LeadFollowUpService();
