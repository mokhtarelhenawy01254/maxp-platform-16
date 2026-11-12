
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

const ORDER_STATUS_LABELS_AR = {
    PENDING: 'قيد الانتظار',
    PENDING_CONFIRMATION: 'في انتظار التأكيد',
    CONFIRMED: 'مؤكد وجاري التجهيز ✅',
    PROCESSING: 'قيد التجهيز في المخزن 📦',
    SHIPPED: 'تم الشحن 🚚',
    OUT_FOR_DELIVERY: 'مع المندوب للتسليم اليوم 🛵',
    DELIVERED: 'تم التسليم بنجاح ✨',
    COMPLETED: 'مكتمل ✅',
    CANCELLED: 'ملغي ❌',
    RETURNED: 'مرتجع ↩️',
    PARTIALLY_RETURNED: 'مرتجع جزئياً ↩️',
    REFUNDED: 'مسترد 💰',
    DELIVERY_FAILED: 'فشل التوصيل ⚠️',
    DRAFT: 'مسودة',
    NEW: 'جديد',
    CREATED: 'جديد'
};

const BUTTON_STATUS_POLICY = {
    CONFIRM: ['PENDING', 'PENDING_CONFIRMATION', 'DRAFT', 'CREATED', 'NEW'],
    POSTPONE: ['PENDING', 'CONFIRMED', 'PROCESSING', 'CREATED', 'NEW'],
    CANCEL: ['PENDING', 'CONFIRMED', 'PROCESSING', 'CREATED', 'NEW']
};

function buildStaleButtonReply(order, currentStatus) {
    const customerGreeting = order?.customerName ? ` يا ${order.customerName}` : '';
    const statusLabel = ORDER_STATUS_LABELS_AR[currentStatus] || currentStatus;
    const orderNum = order?.orderNumber || order?.id || '';
    return `أهلاً بحضرتك${customerGreeting} 👋\n\nنود إفادتك بأن طلبك رقم ${orderNum} حالته الحالية: ${statusLabel}.\nلا يمكن تعديل حالة الطلب في هذه المرحلة. نسعد بخدمتك دائماً لأي استفسار 🙏`;
}

/**
 * Pure guard resolving whether a WhatsApp order button is permitted for the order's current status.
 * @returns {{ allowed: boolean, reply: string|null, reason: string|null }}
 */
function resolveButtonStatusGuard(order, buttonKind, allowedNextStatuses = null) {
    if (!order) {
        return { allowed: false, reply: null, reason: 'order_not_found' };
    }

    const currentStatus = String(order.status || '').trim().toUpperCase();
    const rawKind = String(buttonKind || '').trim();
    const normalizedKind = rawKind.toUpperCase();

    let targetStatus = normalizedKind;
    let actionKey = normalizedKind;

    if (normalizedKind === 'CONFIRM' || normalizedKind === 'CONFIRMED' || normalizedKind.startsWith('CONFIRM_ORDER_')) {
        actionKey = 'CONFIRM';
        targetStatus = 'CONFIRMED';
    } else if (normalizedKind === 'POSTPONE' || normalizedKind === 'DELAY' || normalizedKind === 'PROCESSING' || normalizedKind.startsWith('POSTPONE_ORDER_') || normalizedKind.startsWith('DELAY_ORDER_')) {
        actionKey = 'POSTPONE';
        targetStatus = 'PROCESSING';
    } else if (normalizedKind === 'CANCEL' || normalizedKind === 'CANCELLED' || normalizedKind.startsWith('CANCEL_ORDER_')) {
        actionKey = 'CANCEL';
        targetStatus = 'CANCELLED';
    } else if (normalizedKind.startsWith('SET_STATUS_')) {
        const setMatch = rawKind.match(/^set_status_(.+)_([^_]+)$/i);
        targetStatus = (setMatch ? setMatch[1] : rawKind.slice(11)).toUpperCase();
        actionKey = targetStatus === 'CONFIRMED' ? 'CONFIRM'
            : targetStatus === 'PROCESSING' ? 'POSTPONE'
            : targetStatus === 'CANCELLED' ? 'CANCEL'
            : targetStatus;
    }

    // Priority 1: explicit company-configured allowedNextStatuses (Decision #4)
    if (Array.isArray(allowedNextStatuses) && allowedNextStatuses.length > 0) {
        const normalizedAllowed = allowedNextStatuses.map(s => String(s || '').trim().toUpperCase());
        if (normalizedAllowed.includes(targetStatus)) {
            return { allowed: true, reply: null, reason: null };
        }
        return {
            allowed: false,
            reply: buildStaleButtonReply(order, currentStatus),
            reason: 'stale_button'
        };
    }

    // Priority 2: built-in BUTTON_STATUS_POLICY fallback (Decision #4)
    const allowedCurrentStatuses = BUTTON_STATUS_POLICY[actionKey];
    if (allowedCurrentStatuses) {
        if (allowedCurrentStatuses.includes(currentStatus)) {
            return { allowed: true, reply: null, reason: null };
        }
        return {
            allowed: false,
            reply: buildStaleButtonReply(order, currentStatus),
            reason: 'stale_button'
        };
    }

    // Priority 3: guard custom set_status_ transitions from post-dispatch/final back to early stages
    const POST_DISPATCH_OR_FINAL = new Set(['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED']);
    const EARLY_STAGES = new Set(['PENDING', 'PENDING_CONFIRMATION', 'DRAFT', 'CREATED', 'NEW', 'CONFIRMED', 'PROCESSING', 'WOO_TAGHEZ']);
    if (POST_DISPATCH_OR_FINAL.has(currentStatus) && EARLY_STAGES.has(targetStatus)) {
        return {
            allowed: false,
            reply: buildStaleButtonReply(order, currentStatus),
            reason: 'stale_button'
        };
    }

    return { allowed: true, reply: null, reason: null };
}

/**
 * ⚡ WhatsApp Interaction Service
 * معالجة التفاعلات المباشرة من العميل (أزرار، قوائم)
 */
const WhatsAppInteractionService = {
    ORDER_STATUS_LABELS_AR,
    BUTTON_STATUS_POLICY,
    resolveButtonStatusGuard,
    buildStaleButtonReply,

    /**
     * معالجة رد على زر
     */
    async handleButtonResponse(sessionId, companyId, remoteJid, interactiveData) {
        const { id, text, contextMessageId, contextFrom } = normalizeInteractiveData(interactiveData);
        if (!id) return null;

        console.log(`⚡ [INTERACTION] Button response: ${id} (${text}) from ${remoteJid}`);

        // 0-3. معالجة أزرار حالة الطلب (set_status_ / CONFIRM_ORDER_ / POSTPONE_ORDER_ / CANCEL_ORDER_) بحاجز الانتقالات
        const orderButton = this._parseOrderButtonPayload(id);
        if (orderButton) {
            return await this._handleGuardedOrderButton({
                sessionId,
                companyId,
                remoteJid,
                orderId: orderButton.orderId,
                buttonKind: orderButton.buttonKind,
                targetStatus: orderButton.targetStatus,
                note: orderButton.note
            });
        }

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

        // 4. 🚨 PRODUCTION-FIX: أزرار QUICK_REPLY من قوالب الميتا ترسل الـ payload نصياً
        // 4. 🚨 PRODUCTION-FIX: أزرار استعلام وتفاصيل الطلب ("تفاصيل الطلب" / "تتبع الطلب")
        if (this._isOrderDetailsRequest(id)) {
            const prisma = getSharedPrismaClient();
            let order = null;

            if (contextMessageId) {
                try {
                    const originalMsg = await prisma.whatsAppMessage.findFirst({
                        where: { messageId: contextMessageId, remoteJid, sessionId },
                        select: { interactiveData: true, content: true }
                    });
                    if (originalMsg) {
                        const parsed = typeof originalMsg.interactiveData === 'string'
                            ? JSON.parse(originalMsg.interactiveData)
                            : originalMsg.interactiveData;
                        const tplBody = parsed?.templateBody || parsed?.content || originalMsg.content || '';
                        const orderMatch = String(tplBody).match(/ORD-\d{6}-\d{3}/) || String(tplBody).match(/ORD-[A-Za-z0-9-]+/);
                        if (orderMatch) {
                            order = await prisma.order.findFirst({
                                where: { orderNumber: orderMatch[0], companyId },
                                include: { orderItems: { include: { product: true } } }
                            });
                        }
                    }
                } catch (ctxErr) {
                    console.error(`⚠️ [INTERACTION] Failed to resolve order details from context: ${ctxErr.message}`);
                }
            }

            if (!order) {
                const rawDigits = remoteJid.split('@')[0].replace(/\D/g, '');
                const phoneCandidates = [rawDigits];
                if (rawDigits.startsWith('20') && rawDigits.length === 12) {
                    phoneCandidates.push('0' + rawDigits.slice(2));
                    phoneCandidates.push(rawDigits.slice(2));
                    phoneCandidates.push('+' + rawDigits);
                } else if (rawDigits.startsWith('0') && rawDigits.length === 11) {
                    phoneCandidates.push('2' + rawDigits);
                    phoneCandidates.push('+2' + rawDigits);
                }
                order = await prisma.order.findFirst({
                    where: { companyId, customerPhone: { in: phoneCandidates } },
                    orderBy: { createdAt: 'desc' },
                    include: { orderItems: { include: { product: true } } }
                });
            }

            if (order) {
                const statusLabel = ORDER_STATUS_LABELS_AR[order.status] || order.status;
                let itemsSummary = '';
                if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
                    const { formatSingleOrderItem, extractCarModelFromNotes } = require('./orderItemFormatter');
                    const notesCarModel = extractCarModelFromNotes(order.notes || order.customerNotes);
                    itemsSummary = order.orderItems.map((it, idx) => {
                        return formatSingleOrderItem(it, idx, order, notesCarModel);
                    }).filter(Boolean).join('\n');
                }

                const replyText = `أهلاً بحضرتك يا ${order.customerName || 'عميلنا العزيز'} 👋\n\n📦 تفاصيل طلبك رقم ${order.orderNumber}:\n• الحالة: ${statusLabel}\n• الإجمالي: ${order.total} ${order.currency || 'EGP'}${itemsSummary ? '\n\n📋 محتويات الطلب:\n' + itemsSummary : ''}\n\nنحن بخدمتك دائماً لأي استفسار 🙏`;

                try {
                    const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
                    await WhatsAppMessageHandler.sendText(sessionId, remoteJid, replyText);
                    console.log(`✅ [INTERACTION] Sent order details response for ${order.orderNumber} to ${remoteJid}`);
                    return { success: true, orderNumber: order.orderNumber };
                } catch (sendErr) {
                    console.error(`❌ [INTERACTION] Failed to send order details text: ${sendErr.message}`);
                }
            }
        }

        // 5. 🚨 PRODUCTION-FIX: أزرار QUICK_REPLY من قوالب الميتا ترسل الـ payload نصياً
        // (مثل "تأكيد الأوردر" / "إلغاء الأوردر") بدون ID وظيفي.
        // نحدد الطلب من الرسالة الأصلية (contextMessageId = wamid القالب) أو من
        // أحدث طلب مرسل لهذا الرقم.
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
                        const orderMatch = String(tplBody).match(/ORD-\d{6}-\d{3}/) || String(tplBody).match(/ORD-[A-Za-z0-9-]+/);
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

            // محاولة 2: أحدث طلب لهذا الرقم (نشط أولاً ثم مؤكد)
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
                        status: { in: ['PENDING', 'CREATED', 'NEW', 'CONFIRMED'] }
                    },
                    orderBy: { createdAt: 'desc' }
                });
            }

            if (!order) {
                console.warn(`⚠️ [INTERACTION] Quick-reply "${id}" but no pending order found for ${remoteJid}`);
                return null;
            }

            // إذا كان الطلب مؤكداً بالفعل وضغط العميل "تأكيد الطلب" مرة أخرى — نرسل طمأنة فورية
            if (action.status === 'CONFIRMED' && order.status === 'CONFIRMED') {
                return await this._sendAlreadyConfirmedReply(order, sessionId, remoteJid);
            }

            const effectiveCompanyId = companyId || order.companyId;
            const buttonKind = action.status === 'CONFIRMED' ? 'CONFIRM'
                : action.status === 'PROCESSING' ? 'POSTPONE'
                : action.status === 'CANCELLED' ? 'CANCEL'
                : action.status;

            const guardCheck = await this._enforceButtonGuard(order, buttonKind, sessionId, remoteJid, effectiveCompanyId);
            if (!guardCheck.allowed) {
                return guardCheck.response;
            }

            return await this.updateOrderStatus(order.id, effectiveCompanyId, action.status, action.note);
        }

        return null;
    },

    _isOrderDetailsRequest(id) {
        const normalized = String(id || '').trim();
        const detailWords = [
            'تفاصيل الطلب',
            'تفاصيل الاوردر',
            'تتبع الطلب',
            'تتبع الشحنة',
            'حالة الطلب',
            'order details',
            'track order',
            'track shipment'
        ];
        return detailWords.some(w => normalized === w || normalized.includes(w));
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

    _parseOrderButtonPayload(id) {
        const strId = String(id || '').trim();

        const setStatusMatch = strId.match(/^set_status_(.+)_(.+)$/i);
        if (setStatusMatch) {
            const statusCode = setStatusMatch[1].toUpperCase();
            const orderId = setStatusMatch[2];
            return {
                orderId,
                buttonKind: statusCode,
                targetStatus: statusCode,
                note: `تم تغيير حالة الطلب إلى ${statusCode} عبر الواتساب ✅`
            };
        }

        const lowerId = strId.toLowerCase();
        if (lowerId.startsWith('confirm_order_')) {
            return {
                orderId: strId.slice(14),
                buttonKind: 'CONFIRM',
                targetStatus: 'CONFIRMED',
                note: 'تم تأكيد الطلب عبر الواتساب ✅'
            };
        }

        if (lowerId.startsWith('postpone_order_')) {
            return {
                orderId: strId.slice(15),
                buttonKind: 'POSTPONE',
                targetStatus: 'PROCESSING',
                note: 'العميل طلب تأجيل التسليم ⏳'
            };
        }

        if (lowerId.startsWith('delay_order_')) {
            return {
                orderId: strId.slice(12),
                buttonKind: 'POSTPONE',
                targetStatus: 'PROCESSING',
                note: 'العميل طلب تأجيل التسليم ⏳'
            };
        }

        if (lowerId.startsWith('cancel_order_')) {
            return {
                orderId: strId.slice(13),
                buttonKind: 'CANCEL',
                targetStatus: 'CANCELLED',
                note: 'العميل طلب إلغاء الطلب عبر الواتساب ❌'
            };
        }

        return null;
    },

    async _sendAlreadyConfirmedReply(order, sessionId, remoteJid) {
        const replyText = `أهلاً بحضرتك يا ${order.customerName || 'عميلنا العزيز'} ✨\nطلبك رقم ${order.orderNumber} مؤكد بالفعل وقيد التجهيز حالياً للبدء في الشحن فوراً! نسعد بخدمتك دائماً 🙏`;
        try {
            const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
            await WhatsAppMessageHandler.sendText(sessionId, remoteJid, replyText);
            console.log(`✅ [INTERACTION] Re-assured customer for already confirmed order ${order.orderNumber}`);
        } catch (sendErr) {
            console.error(`❌ [INTERACTION] Failed to send already-confirmed text: ${sendErr.message}`);
        }
        return { success: true, alreadyConfirmed: true };
    },

    async logRejectedInteraction(order, buttonKind, currentStatus) {
        try {
            const prisma = getSharedPrismaClient();
            const normalizedStatus = String(currentStatus || order?.status || '').trim().toUpperCase();
            await prisma.orderStatusHistory.create({
                data: {
                    orderId: order.id,
                    status: normalizedStatus,
                    oldStatus: normalizedStatus,
                    reason: `مرفوض — زر قديم (الحالة الحالية: ${normalizedStatus})`,
                    userName: 'WhatsApp Bot',
                    changedBy: 'SYSTEM_WHATSAPP'
                }
            });
        } catch (err) {
            console.error(`❌ [INTERACTION] Failed to log rejected interaction for order ${order?.orderNumber}:`, err.message);
        }
    },

    async _enforceButtonGuard(order, buttonKind, sessionId, remoteJid, companyId) {
        const effectiveCompanyId = companyId || order.companyId;
        let allowedNextStatuses = null;
        if (effectiveCompanyId) {
            try {
                const prisma = getSharedPrismaClient();
                const statusConfig = await prisma.orderStatusConfig.findFirst({
                    where: {
                        companyId: effectiveCompanyId,
                        code: String(order.status || '').trim().toUpperCase(),
                        statusType: 'order',
                        isActive: true
                    }
                });
                if (statusConfig?.allowedNextStatuses) {
                    const parsed = JSON.parse(statusConfig.allowedNextStatuses);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        allowedNextStatuses = parsed;
                    }
                }
            } catch (cfgErr) {
                console.warn(`⚠️ [INTERACTION] Failed to parse allowedNextStatuses for ${order.orderNumber}: ${cfgErr.message}`);
            }
        }

        const guard = resolveButtonStatusGuard(order, buttonKind, allowedNextStatuses);
        if (!guard.allowed) {
            console.warn(`⚠️ [INTERACTION] Stale button rejected: ${buttonKind} on order ${order.orderNumber} (current: ${order.status})`);
            await this.logRejectedInteraction(order, buttonKind, order.status);

            if (guard.reply) {
                try {
                    const WhatsAppMessageHandler = require('./WhatsAppMessageHandler');
                    await WhatsAppMessageHandler.sendText(sessionId, remoteJid, guard.reply);
                    console.log(`✅ [INTERACTION] Sent stale-button notice for ${order.orderNumber} to ${remoteJid}`);
                } catch (sendErr) {
                    console.error(`❌ [INTERACTION] Failed to send stale-button text: ${sendErr.message}`);
                }
            }

            return {
                allowed: false,
                response: {
                    success: false,
                    rejected: true,
                    reason: guard.reason || 'stale_button',
                    currentStatus: order.status
                }
            };
        }

        return { allowed: true };
    },

    async _handleGuardedOrderButton({ sessionId, companyId, remoteJid, orderId, buttonKind, targetStatus, note }) {
        const prisma = getSharedPrismaClient();

        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { id: orderId },
                    { orderNumber: orderId }
                ],
                ...(companyId ? { companyId } : {})
            }
        });

        if (!order) {
            console.error(`❌ [INTERACTION] Order ${orderId} not found for button ${buttonKind}`);
            return null;
        }

        const effectiveCompanyId = companyId || order.companyId;

        if (targetStatus === 'CONFIRMED' && order.status === 'CONFIRMED') {
            return await this._sendAlreadyConfirmedReply(order, sessionId, remoteJid);
        }

        const guardCheck = await this._enforceButtonGuard(order, buttonKind, sessionId, remoteJid, effectiveCompanyId);
        if (!guardCheck.allowed) {
            return guardCheck.response;
        }

        return await this.updateOrderStatus(order.id, effectiveCompanyId, targetStatus, note);
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

            // 🛡️ Data Synchronization: Ensure governorate, city and area are resolved if missing or unspecified
            if (status === 'CONFIRMED') {
                try {
                    const { getBestShippingAddressFields } = require('../../utils/turbo/addressParser');
                    const { getTurboGovernorateName, isUnspecified } = require('../../utils/turbo/governorateMapper');

                    const addrFields = getBestShippingAddressFields(order.shippingAddress, order.customerAddress);
                    const updatePayload = {};

                    if (isUnspecified(order.governorate)) {
                        const resolvedGov = getTurboGovernorateName(
                            addrFields.governorate || order.city || addrFields.city,
                            order.city || addrFields.city,
                            order.shippingAddress || order.customerAddress
                        );
                        if (resolvedGov && !isUnspecified(resolvedGov)) {
                            updatePayload.governorate = resolvedGov;
                        }
                    }

                    if (isUnspecified(order.city) && addrFields.city && !isUnspecified(addrFields.city)) {
                        updatePayload.city = addrFields.city;
                    }

                    if (Object.keys(updatePayload).length > 0) {
                        await prisma.order.update({
                            where: { id: orderId },
                            data: updatePayload
                        }).catch(() => {});
                        Object.assign(order, updatePayload);
                    }
                } catch (syncErr) {
                    console.warn(`⚠️ [INTERACTION] Address resolution warning for order ${order.orderNumber}:`, syncErr.message);
                }
            }

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
                { skipCallAttemptGuard: status === 'CANCELLED', source: 'whatsapp_bot' }
            );

            return updatedOrder;
        } catch (error) {
            console.error('❌ Error updating order from WhatsApp interaction:', error);
            return null;
        }
    }
};

module.exports = WhatsAppInteractionService;
