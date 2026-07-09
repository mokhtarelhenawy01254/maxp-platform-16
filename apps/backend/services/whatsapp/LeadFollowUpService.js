const { getSharedPrismaClient } = require('../sharedDatabase');
const WhatsAppNotificationService = require('./WhatsAppNotificationService');

class LeadFollowUpService {
    get prisma() {
        return getSharedPrismaClient();
    }

    async enrollLead(companyId, customerId, whatsappContactId) {
        try {
            console.log(`[LEAD-FOLLOWUP] Attempting to enroll lead ${customerId} for company ${companyId}`);

            const settings = await this.prisma.leadFollowUpSettings.findUnique({
                where: { companyId }
            });

            if (!settings || !settings.isEnabled || !settings.message) {
                console.log(`[LEAD-FOLLOWUP] Lead follow-up not configured or disabled for company ${companyId}`);
                return;
            }

            const existing = await this.prisma.leadFollowUpEnrollment.findFirst({
                where: {
                    companyId,
                    whatsappContactId,
                    status: 'ACTIVE'
                }
            });

            if (existing) {
                console.log(`[LEAD-FOLLOWUP] Lead already enrolled for contact ${whatsappContactId}`);
                return;
            }

            const nextSendAt = new Date();
            nextSendAt.setHours(nextSendAt.getHours() + settings.delayHours);

            await this.prisma.leadFollowUpEnrollment.create({
                data: {
                    companyId,
                    customerId,
                    whatsappContactId,
                    status: 'ACTIVE',
                    nextSendAt,
                    logs: `Enrolled in lead follow-up at ${new Date().toISOString()}`
                }
            });

            console.log(`[LEAD-FOLLOWUP] Enrolled lead successfully`);
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
                    whatsAppContact: true
                }
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

            const result = await WhatsAppNotificationService.sendNotification({
                companyId: enrollment.companyId,
                recipientPhone: enrollment.whatsAppContact.phoneNumber,
                recipientName: `${enrollment.customer.firstName || ''} ${enrollment.customer.lastName || ''}`.trim(),
                recipientType: 'CUSTOMER',
                category: 'MARKETING',
                eventType: 'LEAD_FOLLOWUP',
                contentOverride: settings.message,
                variables: {
                    firstName: enrollment.customer.firstName || '',
                    lastName: enrollment.customer.lastName || '',
                    customerName: enrollment.customer.firstName
                },
                customerId: enrollment.customerId
            });

            if (result.success) {
                await this.prisma.leadFollowUpEnrollment.update({
                    where: { id: enrollment.id },
                    data: {
                        status: 'COMPLETED',
                        lastSentAt: new Date(),
                        logs: (enrollment.logs || '') + `\nSent follow-up at ${new Date().toISOString()}`
                    }
                });
                console.log(`[LEAD-FOLLOWUP] Follow-up sent to ${enrollment.whatsAppContact.phone}`);
            } else {
                console.error(`[LEAD-FOLLOWUP] Failed to send follow-up:`, result.reason);
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
                            message: `فشل إرسال رسالة المتابعة للعميل ${enrollment.customer.firstName || ''}. سيتم المحاولة مرة أخرى.`,
                            type: 'SYSTEM',
                            data: { enrollmentId: enrollment.id, reason: result.reason }
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
}

module.exports = new LeadFollowUpService();
