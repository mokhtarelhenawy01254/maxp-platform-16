const { getSharedPrismaClient } = require('../sharedDatabase');
const WhatsAppNotificationService = require('./WhatsAppNotificationService');

/**
 * 🚀 WhatsApp Journey Service
 * نظام جدولة رسائل المتابعة بالتسلسل بعد تسليم الطلب
 */
class WhatsAppJourneyService {
    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * تسجيل عميل في رحلة من تصنيف (category trigger)
     * بتتسمى لما يتغير تصنيف العميل لتصنيف عنده triggerFlowId
     * لو التصنيف ملوش flow مخصص, بتدور على flow عام
     */
    async enrollFromCategory(companyId, customerId, whatsappContactId, categoryId) {
        try {
            const category = categoryId ? await this.prisma.leadCategory.findUnique({
                where: { id: categoryId },
                select: { triggerFlowId: true, companyId: true }
            }) : null;

            let flow = null;

            // 1. لو التصنيف عنده flow مخصص
            if (category && category.triggerFlowId && category.companyId === companyId) {
                flow = await this.prisma.whatsAppFollowUpFlow.findUnique({
                    where: { id: category.triggerFlowId, isEnabled: true },
                    include: { steps: { orderBy: { stepOrder: 'asc' } } }
                });
            }

            // 2. لو مفيش flow مخصص → دور على flow عام
            if (!flow) {
                flow = await this.prisma.whatsAppFollowUpFlow.findFirst({
                    where: { companyId, isGeneral: true, isEnabled: true },
                    include: { steps: { orderBy: { stepOrder: 'asc' } } }
                });
            }

            if (!flow || flow.steps.length === 0) {
                console.log(`[JOURNEY-CATEGORY] No suitable flow found for category ${categoryId}`);
                return;
            }

            // Check no active journey for this customer & flow
            const existing = await this.prisma.customerJourney.findFirst({
                where: { companyId, customerId, flowId: flow.id, status: 'ACTIVE' }
            });

            if (existing) {
                console.log(`[JOURNEY-CATEGORY] Customer already in active journey for flow ${flow.name}`);
                return;
            }

            // Calculate first step send time (support hours or days)
            const firstStep = flow.steps[0];
            const nextSendAt = new Date();
            if (firstStep.delayUnit === 'HOURS' && firstStep.delayHours != null && firstStep.delayHours > 0) {
                nextSendAt.setHours(nextSendAt.getHours() + Math.min(firstStep.delayHours, 720));
            } else if (firstStep.delayDays != null && firstStep.delayDays > 0) {
                nextSendAt.setDate(nextSendAt.getDate() + Math.min(firstStep.delayDays, 365));
            } else {
                nextSendAt.setHours(nextSendAt.getHours() + 1);
            }

            await this.prisma.customerJourney.create({
                data: {
                    companyId,
                    customerId,
                    flowId: flow.id,
                    currentStep: 0,
                    status: 'ACTIVE',
                    nextSendAt,
                    logs: `Started${flow.isGeneral ? ' from general flow' : ' from category trigger'} at ${new Date().toISOString()}`
                }
            });

            console.log(`[JOURNEY-CATEGORY] Enrolled customer ${customerId} in flow "${flow.name}" (${flow.isGeneral ? 'general' : 'category-specific'})`);
        } catch (error) {
            console.error('[JOURNEY-CATEGORY-ERROR] Enrollment failed:', error);
        }
    }

    /**
     * تسجيل عميل في flow عام (لما ميكونش ليه تصنيف محدد)
     */
    async enrollInGeneralFlow(companyId, customerId, whatsappContactId) {
        return this.enrollFromCategory(companyId, customerId, whatsappContactId, null);
    }

    /**
     * إلغاء أي رحلة نشطة للعميل وإعادة تسجيله في رحلة التصنيف
     */
    async reEnrollFromCategory(companyId, customerId, whatsappContactId, categoryId) {
        try {
            await this.prisma.$transaction(async (tx) => {
                // Cancel any active journeys for this customer
                const active = await tx.customerJourney.findMany({
                    where: { companyId, customerId, status: 'ACTIVE' }
                });
                for (const j of active) {
                    await tx.customerJourney.update({
                        where: { id: j.id },
                        data: { status: 'CANCELLED', logs: (j.logs || '') + `\nCancelled for re-enrollment at ${new Date().toISOString()}` }
                    });
                }
            });

            // Enroll fresh (outside transaction — separate operation)
            await this.enrollFromCategory(companyId, customerId, whatsappContactId, categoryId);
        } catch (error) {
            console.error('[JOURNEY-REENROLL-ERROR]', error);
        }
    }

    /**
     * تسجيل العميل في رحلة متابعة
     * يتم استدعاؤها عند تغيير حالة الطلب إلى "تم التسليم"
     */
    async enrollCustomer(companyId, customerId, orderId) {
        try {
            console.log(`[JOURNEY] enrollCustomer called: company=${companyId}, customer=${customerId}, order=${orderId}`);

            // 1. جلب الرحلة المفعلة لهذه الشركة
            const flow = await this.prisma.whatsAppFollowUpFlow.findFirst({
                where: { companyId, isEnabled: true },
                orderBy: [{ isGeneral: 'desc' }, { createdAt: 'asc' }],
                include: {
                    steps: {
                        orderBy: { stepOrder: 'asc' }
                    }
                }
            });

            console.log(`[JOURNEY] Flow lookup result: ${flow ? `"${flow.name}" steps=${flow.steps?.length}` : 'NONE'}`);

            if (!flow || flow.steps.length === 0) {
                console.log(`[JOURNEY] No active flow found for company ${companyId}`);
                return;
            }

            // 2. التأكد من عدم وجود رحلة نشطة لنفس الطلب (تجنب التكرار)
            const existing = await this.prisma.customerJourney.findFirst({
                where: {
                    companyId,
                    orderId,
                    flowId: flow.id,
                    status: 'ACTIVE'
                }
            });

            if (existing) {
                console.log(`[JOURNEY] Customer already enrolled for order ${orderId}`);
                return;
            }

            // 3. تحديد موعد أول خطوة (يدعم التأخير بالساعات — فحص مقاس Day0+4س)
            const firstStep = flow.steps[0];
            const nextSendAt = new Date();
            if (firstStep.delayUnit === 'HOURS' && firstStep.delayHours != null && firstStep.delayHours > 0) {
                nextSendAt.setHours(nextSendAt.getHours() + Math.min(firstStep.delayHours, 720));
            } else {
                nextSendAt.setDate(nextSendAt.getDate() + (firstStep.delayDays || 0));
            }

            // 4. إنشاء السجل
            const created = await this.prisma.customerJourney.create({
                data: {
                    companyId,
                    customerId,
                    orderId,
                    flowId: flow.id,
                    currentStep: 0,
                    status: 'ACTIVE',
                    nextSendAt,
                    logs: `Started journey: ${flow.name} at ${new Date().toISOString()}`
                }
            });
            console.log(`✅ [JOURNEY] Journey created: ${created.id} for order ${orderId}, nextSendAt ${created.nextSendAt.toISOString()}`);

            console.log(`✅ [JOURNEY] Enrolled customer successfully in flow: ${flow.name}`);
        } catch (error) {
            console.error('❌ [JOURNEY-ERROR] Enrollment failed:', error.message, '| stack:', error?.stack?.split('\n').slice(0, 3).join(' '));
        }
    }

    /**
     * معالجة جميع الرحلات التي حان موعد رسالتها
     * يتم استدعاؤها عبر Cron Job
     */
    async processPendingJourneys() {
        try {
            const now = new Date();
            const { processInteractiveTimeouts } = require('../botFlowRuntime');
            await processInteractiveTimeouts(now);
            const journeys = await this.prisma.customerJourney.findMany({
                where: {
                    status: 'ACTIVE',
                    nextSendAt: { lte: now }
                },
                include: {
                    customer: true,
                    order: true,
                    flow: {
                        include: { steps: { orderBy: { stepOrder: 'asc' } } }
                    }
                }
            });

            if (journeys.length === 0) return;

            console.log(`[JOURNEY] Processing ${journeys.length} pending journeys...`);

            for (const journey of journeys) {
                await this.sendNextStep(journey);
            }
        } catch (error) {
            console.error('❌ [JOURNEY-ERROR] Processing journeys failed:', error);
        }
    }

    /**
     * إرسال الخطوة التالية في الرحلة
     */
    async _resolvePhoneForJourney(journey) {
        if (journey.customer?.phone) return journey.customer.phone;
        // Category-triggered journeys: lookup WhatsApp contact
        try {
            const contact = await this.prisma.whatsAppContact.findFirst({
                where: { customerId: journey.customerId },
                select: { phoneNumber: true }
            });
            return contact?.phoneNumber || '';
        } catch { return ''; }
    }

    async sendNextStep(journey) {
        const stepIndex = journey.currentStep;
        const step = journey.flow.steps[stepIndex];

        if (!step) {
            await this.prisma.customerJourney.update({
                where: { id: journey.id },
                data: { status: 'COMPLETED' }
            });
            return;
        }

        const isCategoryTrigger = !journey.orderId;
        const phone = await this._resolvePhoneForJourney(journey);
        if (!phone) {
            console.warn(`[JOURNEY] No phone for journey ${journey.id}, cancelling`);
            await this.prisma.customerJourney.update({
                where: { id: journey.id },
                data: { status: 'CANCELLED', logs: (journey.logs || '') + '\nCancelled: no phone' }
            });
            return;
        }

        try {
            // 🎁 خط أنابيب الحوافز والخصم التلقائي والنقاط والروابط الذكية
            let discountPercent = '10';
            let voucherAmount = '0.00';
            let validityDays = '3';
            let expiryDate = '';
            let pointsBalance = '0';
            let cashbackBalance = '0.00';
            let storeLink = '';
            let reorderLink = '';

            try {
                const autoDiscountService = require('../autoDiscountService');
                const [activeVoucher, autoSettings, loyaltyRec, walletRec, company] = await Promise.all([
                    autoDiscountService.getActiveVoucher(journey.customerId, journey.companyId).catch(() => null),
                    autoDiscountService.getSettings(journey.companyId).catch(() => ({})),
                    this.prisma.customerLoyaltyRecord.findFirst({
                        where: { companyId: journey.companyId, customerId: journey.customerId },
                        select: { currentPoints: true }
                    }).catch(() => null),
                    this.prisma.customerWallet.findFirst({
                        where: { companyId: journey.companyId, customerId: journey.customerId },
                        select: { balance: true }
                    }).catch(() => null),
                    this.prisma.company.findUnique({
                        where: { id: journey.companyId },
                        select: { id: true, slug: true, customDomain: true }
                    }).catch(() => null)
                ]);

                if (activeVoucher) {
                    discountPercent = String(Number(activeVoucher.percent || 10));
                    voucherAmount = Number(activeVoucher.amount || 0).toFixed(2);
                    expiryDate = activeVoucher.expiresAt ? new Date(activeVoucher.expiresAt).toISOString().slice(0, 10) : '';
                } else if (autoSettings) {
                    discountPercent = String(Number(autoSettings.discountPercent || 10));
                }
                if (autoSettings?.validityDays) {
                    validityDays = String(autoSettings.validityDays);
                }
                if (loyaltyRec) {
                    pointsBalance = String(loyaltyRec.currentPoints || 0);
                }
                if (walletRec) {
                    cashbackBalance = Number(walletRec.balance || 0).toFixed(2);
                }

                if (company) {
                    const magicLinkService = require('../customerMagicLinkService');
                    const linkInfo = await magicLinkService.createMagicLink(this.prisma, {
                        companyId: journey.companyId,
                        customerId: journey.customerId,
                        phone,
                        ttlHours: 72
                    }).catch(() => null);

                    if (linkInfo) {
                        storeLink = magicLinkService.buildMagicLinkUrl(company, linkInfo.token, phone, '/shop');
                        reorderLink = magicLinkService.buildMagicLinkUrl(company, linkInfo.token, phone, '/checkout');
                    }
                }
            } catch (enrichErr) {
                console.warn(`⚠️ [JOURNEY-ENRICH] Could not enrich retention variables for customer ${journey.customerId}:`, enrichErr.message);
            }

            // إرسال الرسالة باستخدام contentOverride
            const result = await WhatsAppNotificationService.sendNotification({
                companyId: journey.companyId,
                deliveryStrategy: 'platform-fallback',
                recipientPhone: phone,
                recipientName: `${journey.customer.firstName || ''} ${journey.customer.lastName || ''}`.trim(),
                recipientType: 'CUSTOMER',
                category: 'OCCASION',
                // NOTE: مؤقتاً نستخدم قالب المناسبة المعتمد CUSTOMER_OCCASION_msvsy2ut
                // حتى يُنشأ قالب مخصص (POST_DELIVERY_FOLLOWUP / CATEGORY_FOLLOWUP) ومعتمد على Meta.
                eventType: 'CUSTOMER_OCCASION_msvsy2ut',
                contentOverride: step.content,
                variables: {
                    firstName: journey.customer.firstName || '',
                    lastName: journey.customer.lastName || '',
                    customerName: journey.customer.firstName || 'عميلنا العزيز',
                    reason: 'متابعة طلبك',
                    orderNumber: journey.order?.orderNumber || '',
                    totalPrice: journey.order?.total?.toString() || '0',
                    discountPercent,
                    voucherAmount,
                    validityDays,
                    expiryDate,
                    pointsBalance,
                    cashbackBalance,
                    storeLink: storeLink || '',
                    reorderLink: reorderLink || storeLink || ''
                },
                orderId: journey.orderId,
                customerId: journey.customerId
            });

            if (result.success) {
                const nextStepIndex = stepIndex + 1;
                const nextStep = journey.flow.steps[nextStepIndex];

                const updateData = {
                    currentStep: nextStepIndex,
                    lastSentAt: new Date(),
                    logs: (journey.logs || '') + `\nSent step ${stepIndex + 1} at ${new Date().toISOString()}`
                };

                if (!nextStep) {
                    updateData.status = 'COMPLETED';

                    // 🚨 إشعار فوري: خطوات الأتمتة انتهت بنجاح للعميل
                    try {
                        const systemIncidentAlertService = require('../systemIncidentAlertService');
                        const custName = `${journey.customer?.firstName || ''} ${journey.customer?.lastName || ''}`.trim() || 'عميل';
                        const orderNum = journey.order?.orderNumber ? ` (طلب #${journey.order.orderNumber})` : '';
                        systemIncidentAlertService.dispatchIncident({
                            companyId: journey.companyId,
                            incidentType: systemIncidentAlertService.INCIDENT_TYPES.AUTOMATION_ENDED,
                            title: '✅ اكتمال خطوات الأتمتة',
                            message: `اكتملت جميع خطوات أتمتة المتابعة بنجاح للعميل ${custName}${orderNum}.`,
                            severity: systemIncidentAlertService.SEVERITIES.INFO,
                            entityId: journey.id,
                            url: '/whatsapp-automation',
                            metadata: {
                                journeyId: journey.id,
                                customerId: journey.customerId,
                                totalSteps: journey.flow?.steps?.length || (stepIndex + 1)
                            }
                        }).catch(() => {});
                    } catch (_) {}
                } else {
                    const nextSendAt = new Date();
                    if (nextStep.delayUnit === 'HOURS' && nextStep.delayHours != null) {
                        nextSendAt.setHours(nextSendAt.getHours() + nextStep.delayHours);
                    } else {
                        nextSendAt.setDate(nextSendAt.getDate() + nextStep.delayDays);
                    }
                    updateData.nextSendAt = nextSendAt;
                }

                await this.prisma.customerJourney.update({
                    where: { id: journey.id },
                    data: updateData
                });

                console.log(`✅ [JOURNEY] Step ${stepIndex + 1} sent to ${phone}`);
            } else {
                console.error(`⚠️ [JOURNEY] Failed to send step ${stepIndex + 1}:`, result.reason);
                // محاولة أخرى لاحقاً (بإضافة ساعة مثلاً)
                const retryAt = new Date();
                retryAt.setHours(retryAt.getHours() + 1);
                await this.prisma.customerJourney.update({
                    where: { id: journey.id },
                    data: { nextSendAt: retryAt }
                });

                // 🚨 إشعار فوري لمديري الشركة عبر محرك الحوادث الفوري (Socket + Push + DB + Telegram)
                try {
                    const systemIncidentAlertService = require('../systemIncidentAlertService');
                    const custName = `${journey.customer?.firstName || ''} ${journey.customer?.lastName || ''}`.trim() || 'عميل';
                    const orderNum = journey.order?.orderNumber ? ` - طلب #${journey.order.orderNumber}` : '';
                    await systemIncidentAlertService.dispatchIncident({
                        companyId: journey.companyId,
                        incidentType: systemIncidentAlertService.INCIDENT_TYPES.AUTOMATION_STEP_FAILED,
                        title: '⚠️ تعثر إرسال خطوة أتمتة',
                        message: `تعثر إرسال الخطوة رقم ${stepIndex + 1} للعميل ${custName}${orderNum}. السبب: ${result.reason || 'خطأ أثناء الإرسال'}. سيتم إعادة المحاولة تلقائياً.`,
                        severity: systemIncidentAlertService.SEVERITIES.WARNING,
                        entityId: journey.id,
                        url: '/whatsapp-automation',
                        metadata: {
                            journeyId: journey.id,
                            stepNumber: stepIndex + 1,
                            reason: result.reason
                        }
                    });
                } catch(notifyErr) {
                    console.error('❌ [JOURNEY] Failed to notify admins about step failure:', notifyErr.message);
                }
            }
        } catch (error) {
            console.error('❌ [JOURNEY-ERROR] Failed to send step:', error);
        }
    }
}

module.exports = new WhatsAppJourneyService();
