
const { getSharedPrismaClient } = require('../sharedDatabase');
const orderService = require('../orderService');
const taskNotificationService = require('../taskNotificationService');

function normalizeInteractiveData(interactiveData = {}) {
    if (interactiveData.id) {
        return {
            id: interactiveData.id,
            text: interactiveData.text || interactiveData.title || ''
        };
    }

    if (interactiveData.type === 'button_reply') {
        return {
            id: interactiveData.button_reply?.id,
            text: interactiveData.button_reply?.title || ''
        };
    }

    if (interactiveData.type === 'list_reply') {
        return {
            id: interactiveData.list_reply?.id,
            text: interactiveData.list_reply?.title || ''
        };
    }

    // 🚨 PRODUCTION-FIX: أزرار QUICK_REPLY من قوالب الميتا (type="button") —
    // الـ payload هو نص الزر (مثل "تأكيد الأوردر") وليس ID وظيفي.
    // نستخدم الـ payload كـ id مبدئياً + نحتفظ بالـ context (wamid الرسالة الأصلية)
    // لتحديد الطلب المقصود.
    if (interactiveData.type === 'button' && (interactiveData.payload || interactiveData.text)) {
        return {
            id: interactiveData.payload || interactiveData.text,
            text: interactiveData.text || interactiveData.payload || '',
            contextMessageId: interactiveData.contextMessageId || null,
            contextFrom: interactiveData.contextFrom || null
        };
    }

    return {
        id: null,
        text: ''
    };
}

function parseTaskExecutionButtonId(id = '') {
    const normalizedId = String(id || '');
    const match = normalizedId.match(/^task_(done|not_done|blocked)_(.+)$/);
    if (!match) return null;

    return {
        response: match[1],
        taskId: match[2]
    };
}

/**
 * ⚡ WhatsApp Interaction Service
 * معالجة التفاعلات المباشرة من العميل (أزرار، قوائم)
 */
const WhatsAppInteractionService = {
    /**
     * معالجة رد على زر
     */
    async handleButtonResponse(sessionId, companyId, remoteJid, interactiveData) {
        const { id, text, contextMessageId, contextFrom } = normalizeInteractiveData(interactiveData);
        if (!id) return null;

        console.log(`⚡ [INTERACTION] Button response: ${id} (${text}) from ${remoteJid}`);

        const taskResponse = parseTaskExecutionButtonId(id);
        if (taskResponse) {
            return await taskNotificationService.handleExecutionResponse({
                companyId,
                taskId: taskResponse.taskId,
                remoteJid,
                response: taskResponse.response,
                source: 'whatsapp_button'
            });
        }

        // 0. معالجة تغيير حالة مخصصة: set_status_{STATUS_CODE}_{orderId}
        const setStatusMatch = String(id).match(/^set_status_(.+)_(.+)$/);
        if (setStatusMatch) {
            const statusCode = setStatusMatch[1];
            const orderId = setStatusMatch[2];
            return await this.updateOrderStatus(orderId, companyId, statusCode, `تم تغيير حالة الطلب إلى ${statusCode} عبر الواتساب ✅`);
        }

        // 1. معالجة تأكيد الطلب
        if (id.startsWith('CONFIRM_ORDER_') || id.startsWith('confirm_order_')) {
            const orderId = id.replace('CONFIRM_ORDER_', '').replace('confirm_order_', '');
            return await this.updateOrderStatus(orderId, companyId, 'CONFIRMED', 'تم تأكيد الطلب عبر الواتساب ✅');
        }

        // 2. معالجة تأجيل الطلب
        if (id.startsWith('POSTPONE_ORDER_') || id.startsWith('delay_order_')) {
            const orderId = id.replace('POSTPONE_ORDER_', '').replace('delay_order_', '');
            return await this.updateOrderStatus(orderId, companyId, 'PROCESSING', 'العميل طلب تأجيل التسليم ⏳');
        }

        // 3. معالجة إلغاء الطلب
        if (id.startsWith('CANCEL_ORDER_') || id.startsWith('cancel_order_')) {
            const orderId = id.replace('CANCEL_ORDER_', '').replace('cancel_order_', '');
            return await this.updateOrderStatus(orderId, companyId, 'CANCELLED', 'العميل طلب إلغاء الطلب عبر الواتساب ❌');
        }

        // 4. 🚨 PRODUCTION-FIX: أزرار QUICK_REPLY من قوالب الميتا ترسل الـ payload نصياً
        // (مثل "تأكيد الأوردر" / "إلغاء الأوردر") بدون ID وظيفي.
        // نحدد الطلب من الرسالة الأصلية (contextMessageId = wamid القالب) أو من
        // أحدث طلب غير مؤكد مرسل لهذا الرقم.
        if (this._isQuickReplyText(id)) {
            const action = this._mapQuickReplyAction(id);
            if (!action) return null;

            const prisma = getSharedPrismaClient();
            let order = null;

            // محاولة 1: البحث عن الطلب المرتبط برسالة القالب الأصلية (wamid)
            if (contextMessageId) {
                try {
                    const originalMsg = await prisma.whatsAppMessage.findFirst({
                        where: {
                            messageId: contextMessageId,
                            remoteJid,
                            sessionId
                        },
                        select: { interactiveData: true, content: true }
                    });
                    if (originalMsg?.interactiveData) {
                        const parsed = typeof originalMsg.interactiveData === 'string'
                            ? JSON.parse(originalMsg.interactiveData)
                            : originalMsg.interactiveData;
                        const tplBody = parsed?.templateBody || parsed?.content || originalMsg.content || '';
                        const orderMatch = String(tplBody).match(/ORD-\d{6}-\d{3}/);
                        if (orderMatch) {
                            order = await prisma.order.findFirst({
                                where: { orderNumber: orderMatch[0], companyId }
                            });
                        }
                    }
                } catch (ctxErr) {
                    console.error(`⚠️ [INTERACTION] Failed to resolve order from context: ${ctxErr.message}`);
                }
            }

            // محاولة 2: أحدث طلب نشط (غير مؤكد/غير ملغي) لهذا الرقم
            if (!order) {
                const rawDigits = remoteJid.split('@')[0].replace(/\D/g, '');
                const phoneCandidates = [rawDigits];
                if (rawDigits.startsWith('20') && rawDigits.length === 12) {
                    phoneCandidates.push('0' + rawDigits.slice(2)); // e.g. 01151398486
                    phoneCandidates.push(rawDigits.slice(2));       // e.g. 1151398486
                    phoneCandidates.push('+' + rawDigits);
                } else if (rawDigits.startsWith('0') && rawDigits.length === 11) {
                    phoneCandidates.push('2' + rawDigits);
                    phoneCandidates.push('+2' + rawDigits);
                }
                order = await prisma.order.findFirst({
                    where: {
                        companyId,
                        customerPhone: { in: phoneCandidates },
                        status: { in: ['PENDING', 'CREATED', 'NEW'] }
                    },
                    orderBy: { createdAt: 'desc' }
                });
            }

            if (!order) {
                console.warn(`⚠️ [INTERACTION] Quick-reply "${id}" but no pending order found for ${remoteJid}`);
                return null;
            }

            return await this.updateOrderStatus(order.id, companyId, action.status, action.note);
        }

        return null;
    },

    _isQuickReplyText(id) {
        const normalized = String(id || '').trim();
        const confirmWords = ['تأكيد الأوردر', 'تأكيد', 'confirm', 'تأكيد الطلب'];
        const cancelWords = ['إلغاء الأوردر', 'إلغاء', 'cancel', 'الغاء'];
        const delayWords = ['تأجيل', 'delay', 'postpone', 'تأجيل التسليم'];
        return [...confirmWords, ...cancelWords, ...delayWords].some(w => normalized === w);
    },

    _mapQuickReplyAction(id) {
        const normalized = String(id || '').trim();
        if (['تأكيد الأوردر', 'تأكيد', 'confirm', 'تأكيد الطلب'].includes(normalized)) {
            return { status: 'CONFIRMED', note: 'تم تأكيد الطلب عبر الواتساب ✅' };
        }
        if (['إلغاء الأوردر', 'إلغاء', 'cancel', 'الغاء'].includes(normalized)) {
            return { status: 'CANCELLED', note: 'العميل طلب إلغاء الطلب عبر الواتساب ❌' };
        }
        if (['تأجيل', 'delay', 'postpone', 'تأجيل التسليم'].includes(normalized)) {
            return { status: 'PROCESSING', note: 'العميل طلب تأجيل التسليم ⏳' };
        }
        return null;
    },

    /**
     * تحديث حالة الطلب
     */
    async updateOrderStatus(orderId, companyId, status, note) {
        try {
            const prisma = getSharedPrismaClient();

            // التأكد من وجود الطلب
            const order = await prisma.order.findUnique({
                where: { id: orderId }
            });

            if (!order) {
                console.error(`❌ Order ${orderId} not found for interaction`);
                return null;
            }

            console.log(`📦 Updating order ${order.orderNumber} to ${status}`);

            // استخدام orderService لضمان تشغيل كل التوابع (إشعارات، لوج، إلخ)
            const updatedOrder = await orderService.updateOrderStatus(
                orderId,
                companyId,
                status,
                note,
                'SYSTEM_WHATSAPP',
                'WhatsApp Bot',
                null,
                false,
                { skipCallAttemptGuard: status === 'CANCELLED' }
            );

            return updatedOrder;
        } catch (error) {
            console.error('❌ Error updating order from WhatsApp interaction:', error);
            return null;
        }
    }
};

module.exports = WhatsAppInteractionService;
