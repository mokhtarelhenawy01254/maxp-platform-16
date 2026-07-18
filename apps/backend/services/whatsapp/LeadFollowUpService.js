const { getSharedPrismaClient } = require('../sharedDatabase');
const WhatsAppNotificationService = require('./WhatsAppNotificationService');

class LeadFollowUpService {
    get prisma() {
        return getSharedPrismaClient();
    }

    _parseSteps(settings) {
        if (settings.steps) {
            try {
                return JSON.parse(settings.steps);
            } catch { /* fall through */ }
        }
        // Fallback: use legacy single-step fields
        return [{ delayHours: settings.delayHours ?? 24, message: settings.message ?? '', mediaUrl: settings.mediaUrl ?? null }];
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
            if (steps.length === 0 || !steps[0].message) {
                console.log(`[LEAD-FOLLOWUP] No message content configured for company ${companyId}`);
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
                // All steps done — shouldn't happen but safeguard
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

            const result = await WhatsAppNotificationService.sendNotification({
                companyId: enrollment.companyId,
                recipientPhone: enrollment.whatsAppContact.phoneNumber,
                recipientName: `${enrollment.customer.firstName || ''} ${enrollment.customer.lastName || ''}`.trim(),
                recipientType: 'CUSTOMER',
                category: 'MARKETING',
                eventType: 'LEAD_FOLLOWUP',
                contentOverride: step.message,
                variables: {
                    firstName: enrollment.customer.firstName || '',
                    lastName: enrollment.customer.lastName || '',
                    customerName: enrollment.customer.firstName
                },
                customerId: enrollment.customerId
            });

            if (result.success) {
                const nextStepIndex = stepIndex + 1;
                const hasMoreSteps = nextStepIndex < steps.length;

                if (hasMoreSteps) {
                    let nextSendAt = new Date();
                    nextSendAt.setHours(nextSendAt.getHours() + steps[nextStepIndex].delayHours);
                    if (!this._isWithinBusinessHours(settings)) {
                        nextSendAt = this._nextBusinessHourDate(settings);
                    }

                    await this.prisma.leadFollowUpEnrollment.update({
                        where: { id: enrollment.id },
                        data: {
                            currentStep: nextStepIndex,
                            nextSendAt,
                            lastSentAt: new Date(),
                            logs: (enrollment.logs || '') + `\nSent step ${stepIndex + 1}/${steps.length} at ${new Date().toISOString()}`
                        }
                    });
                    console.log(`[LEAD-FOLLOWUP] Step ${stepIndex + 1}/${steps.length} sent to ${enrollment.whatsAppContact.phone}, next step in ${steps[nextStepIndex].delayHours}h`);
                } else {
                    await this.prisma.leadFollowUpEnrollment.update({
                        where: { id: enrollment.id },
                        data: {
                            status: 'COMPLETED',
                            currentStep: nextStepIndex,
                            lastSentAt: new Date(),
                            logs: (enrollment.logs || '') + `\nAll steps completed at ${new Date().toISOString()}`
                        }
                    });
                    console.log(`[LEAD-FOLLOWUP] All steps completed for ${enrollment.whatsAppContact.phone}`);
                }
            } else {
                console.error(`[LEAD-FOLLOWUP] Failed to send follow-up:`, result.reason);
                const retryAt = new Date();
                retryAt.setHours(retryAt.getHours() + 1);

                if (!this._isWithinBusinessHours(settings)) {
                    // Don't retry during off-hours; wait until next business hour
                    // but cap at 1 hour anyway as a reasonable retry
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
                            message: `فشل إرسال ${stepLabel} للعميل ${enrollment.customer.firstName || ''}. سيتم المحاولة مرة أخرى.`,
                            type: 'SYSTEM',
                            data: { enrollmentId: enrollment.id, step: stepIndex, reason: result.reason }
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
