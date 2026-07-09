const { getSharedPrismaClient } = require('../sharedDatabase');
const WhatsAppNotificationService = require('./WhatsAppNotificationService');

class LeadFollowUpService {
    get prisma() {
        return getSharedPrismaClient();
    }

    async enrollLead(companyId, customerId, whatsappContactId) {
        try {
            console.log(`[LEAD-FOLLOWUP] Attempting to enroll lead ${customerId} for company ${companyId}`);

            const flow = await this.prisma.leadFollowUpFlow.findFirst({
                where: { companyId, isEnabled: true },
                include: {
                    steps: {
                        orderBy: { stepOrder: 'asc' }
                    }
                }
            });

            if (!flow || flow.steps.length === 0) {
                console.log(`[LEAD-FOLLOWUP] No active flow found for company ${companyId}`);
                return;
            }

            const existing = await this.prisma.leadFollowUpEnrollment.findFirst({
                where: {
                    companyId,
                    whatsappContactId,
                    flowId: flow.id,
                    status: 'ACTIVE'
                }
            });

            if (existing) {
                console.log(`[LEAD-FOLLOWUP] Lead already enrolled for contact ${whatsappContactId}`);
                return;
            }

            const firstStep = flow.steps[0];
            const nextSendAt = new Date();
            nextSendAt.setHours(nextSendAt.getHours() + firstStep.delayHours);

            await this.prisma.leadFollowUpEnrollment.create({
                data: {
                    companyId,
                    customerId,
                    whatsappContactId,
                    flowId: flow.id,
                    currentStep: 0,
                    status: 'ACTIVE',
                    nextSendAt,
                    logs: `Started lead follow-up: ${flow.name} at ${new Date().toISOString()}`
                }
            });

            console.log(`[LEAD-FOLLOWUP] Enrolled lead successfully in flow: ${flow.name}`);
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] Enrollment failed:', error);
        }
    }

    async processPendingEnrollments() {
        try {
            const now = new Date();
            const enrollments = await this.prisma.leadFollowUpEnrollment.findMany({
                where: {
                    status: 'ACTIVE',
                    nextSendAt: { lte: now }
                },
                include: {
                    customer: true,
                    whatsAppContact: true,
                    flow: {
                        include: { steps: { orderBy: { stepOrder: 'asc' } } }
                    }
                }
            });

            if (enrollments.length === 0) return;

            console.log(`[LEAD-FOLLOWUP] Processing ${enrollments.length} pending enrollments...`);

            for (const enrollment of enrollments) {
                await this.sendNextStep(enrollment);
            }
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] Processing enrollments failed:', error);
        }
    }

    async sendNextStep(enrollment) {
        const stepIndex = enrollment.currentStep;
        const step = enrollment.flow.steps[stepIndex];

        if (!step) {
            await this.prisma.leadFollowUpEnrollment.update({
                where: { id: enrollment.id },
                data: { status: 'COMPLETED' }
            });
            return;
        }

        try {
            const result = await WhatsAppNotificationService.sendNotification({
                companyId: enrollment.companyId,
                recipientPhone: enrollment.whatsAppContact.phoneNumber,
                recipientName: `${enrollment.customer.firstName || ''} ${enrollment.customer.lastName || ''}`.trim(),
                recipientType: 'CUSTOMER',
                category: 'MARKETING',
                eventType: 'LEAD_FOLLOWUP',
                contentOverride: step.content,
                variables: {
                    firstName: enrollment.customer.firstName || '',
                    lastName: enrollment.customer.lastName || '',
                    customerName: enrollment.customer.firstName
                },
                customerId: enrollment.customerId
            });

            if (result.success) {
                const nextStepIndex = stepIndex + 1;
                const nextStep = enrollment.flow.steps[nextStepIndex];

                const updateData = {
                    currentStep: nextStepIndex,
                    lastSentAt: new Date(),
                    logs: (enrollment.logs || '') + `\nSent step ${stepIndex + 1} at ${new Date().toISOString()}`
                };

                if (!nextStep) {
                    updateData.status = 'COMPLETED';
                } else {
                    const nextSendAt = new Date();
                    nextSendAt.setHours(nextSendAt.getHours() + nextStep.delayHours);
                    updateData.nextSendAt = nextSendAt;
                }

                await this.prisma.leadFollowUpEnrollment.update({
                    where: { id: enrollment.id },
                    data: updateData
                });

                console.log(`[LEAD-FOLLOWUP] Step ${stepIndex + 1} sent to ${enrollment.whatsAppContact.phone}`);
            } else {
                console.error(`[LEAD-FOLLOWUP] Failed to send step ${stepIndex + 1}:`, result.reason);

                const retryAt = new Date();
                retryAt.setHours(retryAt.getHours() + 1);
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
                        const notificationsData = admins.map(admin => ({
                            companyId: enrollment.companyId,
                            userId: admin.userId,
                            title: 'فشل إرسال رسالة متابعة عميل محتمل',
                            message: `فشل أو تأخر إرسال الخطوة رقم ${stepIndex + 1} للعميل ${enrollment.customer.firstName || ''}. سيتم المحاولة مرة أخرى.`,
                            type: 'SYSTEM',
                            data: { enrollmentId: enrollment.id, reason: result.reason }
                        }));
                        await this.prisma.notification.createMany({ data: notificationsData });
                    }
                } catch(notifyErr) {
                    console.error('[LEAD-FOLLOWUP] Failed to notify admins about step failure:', notifyErr.message);
                }
            }
        } catch (error) {
            console.error('[LEAD-FOLLOWUP-ERROR] Failed to send step:', error);
        }
    }
}

module.exports = new LeadFollowUpService();
