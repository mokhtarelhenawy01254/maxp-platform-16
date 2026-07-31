
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
        const { id, text } = normalizeInteractiveData(interactiveData);
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
