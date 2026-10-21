/**
 * 💬 WhatsApp Message Handler Service
 * معالجة إرسال واستقبال الرسائل
 * 
 * المميزات:
 * - إرسال رسائل نصية ووسائط
 * - معالجة الردود والاقتباسات
 * - إدارة حالة الرسائل
 * - دعم الردود السريعة
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues // ❌ Removed to prevent early loading issues
const WhatsAppManager = require('./WhatsAppManager');
const WhatsAppSyncService = require('./WhatsAppSyncService');
const MetaCloudProvider = require('./providers/MetaCloudProvider');
const WhatsAppReactionService = require('./WhatsAppReactionService');
const socketService = require('../socketService');
const getIO = () => socketService.getIO();
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');
const { normalizeWhatsAppContactIdentity } = require('./contactIdentity');
const { emitToAudience, getConversationAudience } = require('../whatsappRealtimeAudienceService');

const DEFAULT_BAILEYS_SEND_RECONNECT_WAIT_MS = 10000;
const BAILEYS_SEND_RECONNECT_POLL_MS = 500;

/**
 * 🚨 PRODUCTION-FIX: تحديث بيانات الـ contact بعد إرسال ناجح.
 * فشل هذا التحديث (DB/network) لا يجب أبداً أن يحوّل إرسالاً نجح فعلاً إلى
 * "فشل" — كان يسبب fallback مكرر (رسالة مكررة للعميل) أو failureReason مضلل.
 */
async function safeUpdateContact(sessionId, jid, options = {}) {
  try {
    await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, options.sock, { isOutgoing: true });
  } catch (contactErr) {
    console.warn(`⚠️ [WhatsAppMessageHandler] updateContact failed (non-critical): ${contactErr.message}`);
  }
}

async function getSessionProvider(sessionId) {
    const session = await getSharedPrismaClient().whatsAppSession.findUnique({
        where: { id: sessionId }
    });
    const provider = session?.provider || 'BAILEYS';
    return { session, provider };
}

async function ensureMetaContact(sessionId, jid, options = {}) {
    try {
        const normalizedJid = formatJid(jid);
        const phoneNumber = normalizedJid?.split('@')[0] || null;
        const isOutgoing = options.isOutgoing !== false;

        return await getSharedPrismaClient().whatsAppContact.upsert({
            where: {
                sessionId_jid: {
                    sessionId,
                    jid: normalizedJid
                }
            },
            update: {
                lastMessageAt: new Date(),
                lastMessageIsFromMe: isOutgoing,
                totalMessages: { increment: 1 },
                unreadCount: isOutgoing ? undefined : { increment: 1 },
                updatedAt: new Date()
            },
            create: {
                jid: normalizedJid,
                phoneNumber,
                lastMessageAt: new Date(),
                lastMessageIsFromMe: isOutgoing,
                totalMessages: 1,
                unreadCount: isOutgoing ? 0 : 1,
                isGroup: false,
                whatsAppSession: {
                    connect: { id: sessionId }
                },
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('❌ Error updating Meta contact:', error.message);
        return null;
    }
}

function isSendableBaileysSession(session) {
    if (!session || session.status !== 'connected' || !session.sock || typeof session.sock.sendMessage !== 'function') {
        return false;
    }
    const readyState = WhatsAppManager.getSocketReadyState(session.sock);
    if (typeof readyState === 'number' && readyState !== 1) {
        return false;
    }
    return true;
}

function getBaileysSessionReadinessReason(session) {
    if (!session) return 'not_in_memory';
    if (session.status !== 'connected') return `status_${session.status || 'unknown'}`;
    if (!session.sock) return 'no_socket';
    if (typeof session.sock.sendMessage !== 'function') return 'send_message_unavailable';
    const readyState = WhatsAppManager.getSocketReadyState(session.sock);
    if (typeof readyState === 'number' && readyState !== 1) {
        return `socket_readyState_${readyState}`;
    }
    return 'unknown';
}

function createBaileysSessionNotReadyError(sessionId, reason) {
    const error = new Error('جلسة واتساب غير جاهزة للإرسال');
    error.code = 'WA_SESSION_NOT_READY';
    error.sessionId = sessionId;
    error.reason = reason;
    return error;
}

/**
 * إعادة فحص الجاهزية بعد تحضير الوسائط/تأخير الكتابة — قراءة فقط (no reconnect).
 * لو socket مات أثناء التحضير نرفض فوراً بـ WA_SESSION_NOT_READY بدل ما
 * getSendableBaileysSession يعمل reconnect كامل كـ side effect (خطر إرسال مكرر).
 */
function assertSessionReadyAfterPrep(sessionId, phase) {
    const session = WhatsAppManager.getSession(sessionId);
    if (!isSendableBaileysSession(session)) {
        throw createBaileysSessionNotReadyError(sessionId, getBaileysSessionReadinessReason(session) || `socket died during ${phase}`);
    }
    return session;
}

// 🛡️ Per-session serial send queue to avoid concurrent Baileys WebSocket frame collisions
// and enforce safe spacing between outgoing messages without delaying the caller's HTTP response
const sessionSendQueues = new Map();

async function enqueueSessionSend(sessionId, sendFn, minDelayMs = 600) {
    const prev = sessionSendQueues.get(sessionId) || Promise.resolve();
    let resolveResult, rejectResult;
    const resultPromise = new Promise((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
    });

    const current = prev.catch(() => {}).then(async () => {
        try {
            const res = await sendFn();
            resolveResult(res);
        } catch (err) {
            rejectResult(err);
        }

        // Pacing delay between this message and any subsequent message
        if (minDelayMs > 0) {
            const jitter = Math.floor(Math.random() * 300);
            await delay(minDelayMs + jitter);
        }
    });

    sessionSendQueues.set(sessionId, current);
    current.finally(() => {
        if (sessionSendQueues.get(sessionId) === current) {
            sessionSendQueues.delete(sessionId);
        }
    });

    return resultPromise;
}

function getBaileysSendReconnectWaitMs() {
    const configured = Number(process.env.WHATSAPP_SEND_RECONNECT_WAIT_MS);
    return Number.isFinite(configured) && configured >= 0
        ? configured
        : DEFAULT_BAILEYS_SEND_RECONNECT_WAIT_MS;
}

async function waitForSendableBaileysSession(sessionId, timeoutMs = getBaileysSendReconnectWaitMs()) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
        const session = WhatsAppManager.getSession(sessionId);
        if (isSendableBaileysSession(session)) {
            return session;
        }

        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await delay(Math.min(BAILEYS_SEND_RECONNECT_POLL_MS, remaining));
    }

    return null;
}

async function getSendableBaileysSession(sessionId, dbSession = null) {
    let session = WhatsAppManager.getSession(sessionId);
    if (isSendableBaileysSession(session)) {
        return session;
    }

    const reason = getBaileysSessionReadinessReason(session);
    const companyId = session?.companyId || dbSession?.companyId;

    if (!session && dbSession?.status && dbSession.status !== 'CONNECTED') {
        throw new Error('الجلسة غير متصلة');
    }

    if (session && session.status !== 'connected') {
        throw new Error('الجلسة غير متصلة');
    }

    if (companyId && typeof WhatsAppManager.reconnectSession === 'function') {
        console.warn(`⚠️ [WA-SEND:${sessionId}] Baileys session is not ready (${reason}); reconnecting before send`);
        try {
            const reconnectedSession = await WhatsAppManager.reconnectSession(sessionId, companyId, 0, {
                syncFullHistory: session?.syncFullHistory || false
            });

            if (isSendableBaileysSession(reconnectedSession)) {
                return reconnectedSession;
            }
        } catch (reconnectError) {
            console.error(`❌ [WA-SEND:${sessionId}] Reconnect before send failed:`, reconnectError.message);
        }

        session = await waitForSendableBaileysSession(sessionId);
        if (session) {
            return session;
        }
    }

    throw createBaileysSessionNotReadyError(sessionId, reason);
}

async function sendTypingSafely(sessionId, jid, isTyping) {
    try {
        await WhatsAppManager.sendTyping(sessionId, jid, isTyping);
    } catch (typingError) {
        console.warn(`⚠️ [WA-SEND:${sessionId}] Failed to update typing state:`, typingError.message);
    }
}

function serializeOutgoingMetadata(metadata) {
    if (metadata === undefined) return undefined;
    if (metadata === null) return null;
    return typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
}

/**
 * 🔒 حل معرّف الواتساب قبل الإرسال والتحقق من أنه ليس LID مجهول بدون رقم هاتف.
 * لو كان المعرّف @lid، يحاول استرجاع الرقم من جدول المطابقات أو جلسات الشركة أو CRM.
 * لو فشل الحل، يرمي خطأ 400 (WA_UNRESOLVED_LID) لمنع الإرسال الوهمي والـ 500.
 */
async function resolveAndValidateOutgoingJid(sessionId, to) {
    let jid = formatJid(to);
    if (jid && jid.includes('@lid')) {
        const resolved = await WhatsAppManager.resolveOutgoingRemoteJid(sessionId, jid);
        if (resolved && !String(resolved).includes('@lid')) {
            return resolved;
        }
        const error = new Error('لا يمكن إرسال رسالة إلى جهة اتصال بدون رقم هاتف (معرّف LID غير محلول). يرجى إدخال رقم هاتف العميل أولاً من لوحة التفاصيل الجانبية.');
        error.statusCode = 400;
        error.code = 'WA_UNRESOLVED_LID';
        throw error;
    }
    return jid;
}

/**
 * إرسال رسالة نصية
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {string} text - نص الرسالة
 * @param {object} options - خيارات إضافية
 */
async function sendText(sessionId, to, text, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const result = await MetaCloudProvider.sendText(sessionId, targetPhone, text, {
                previewUrl: options.previewUrl
            });

            // 🚨 PRODUCTION-FIX: حفظ الرسالة محلياً بعد نجاح إرسال ميتا الفعلي.
            // لو فشل الـ upsert (DB error)، لا يجب أن يحوّل إرسالاً وصل فعلاً إلى "فشل".
            let savedMessage;
            try {
                savedMessage = await saveOutgoingMessage(sessionId, jid, {
                    messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                    type: 'TEXT',
                    content: text,
                    quotedMessageId: options.quotedMessageId,
                    interactiveData: options.interactiveData ? JSON.stringify(options.interactiveData) : null,
                    isAIResponse: options.isAIResponse || false,
                    aiConfidence: options.aiConfidence,
                    metadata: options.metadata
                }, { companyId: dbSession?.companyId, senderId: options.senderId });
            } catch (saveErr) {
                console.warn(`⚠️ [WhatsAppMessageHandler] saveOutgoingMessage failed (non-critical, send already succeeded): ${saveErr.message}`);
                savedMessage = {
                    messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                    messageType: 'TEXT',
                    content: text
                };
            }

            try {
                await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            } catch (contactErr) {
                // 🚨 PRODUCTION-FIX: فشل تحديث بيانات الـ contact (مثل upsert فشل)
                // لا يجب أبداً أن يحوّل إرسالاً نجح فعلاً إلى "فشل".
                console.warn(`⚠️ [WhatsAppMessageHandler] ensureMetaContact failed (non-critical): ${contactErr.message}`);
            }
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);
        console.log(`🔍 [DEBUG] sendText: Retrieving session ${sessionId}`, {
            exists: !!session,
            status: session?.status,
            isConnected: session?.status === 'connected',
            hasSocket: !!session?.sock
        });

        // إرسال حالة الكتابة
        await sendTypingSafely(sessionId, jid, true);

        // تأخير بسيط لمحاكاة الكتابة — opt-in للإرسال التفاعلي اليدوي فقط
        // (typingSimulation: true). للإرسال الآلي (notification/API/AI/queue)
        // لا ندفع حتى 2s تأخير ولا نوسّع نافذة موت الـ socket أثناء الـ flap.
        if (options.typingSimulation) {
            await delay(Math.min(text.length * 20, 2000));
        }

        // إرسال الرسالة
        // لا يوجد blind retry: getSendableBaileysSession يضمن جلسة جاهزة قبل الإرسال،
        // وإعادة الإرسال بعد خطأ شبكة بيسبب رسائل مكررة للعميل (الإرسال قد يكون وصل فعلاً)
        const messageOptions = {
            text
        };

        // إضافة الاقتباس إذا وجد
        if (options.quotedMessageId) {
            messageOptions.quoted = {
                key: {
                    remoteJid: jid,
                    id: options.quotedMessageId
                }
            };
        }

        let result;
        try {
            session = assertSessionReadyAfterPrep(sessionId, 'typing delay');
            result = await enqueueSessionSend(sessionId, () => session.sock.sendMessage(jid, messageOptions));
        } catch (sendError) {
            console.error(`❌ [WA-SEND:${sessionId}] Send failed: ${sendError.message}. No blind retry (would duplicate customer messages).`);
            throw sendError;
        }

        // إيقاف حالة الكتابة
        await sendTypingSafely(sessionId, jid, false);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'TEXT',
            content: text,
            quotedMessageId: options.quotedMessageId,
            interactiveData: options.interactiveData ? JSON.stringify(options.interactiveData) : null,
            isAIResponse: options.isAIResponse || false,
            aiConfidence: options.aiConfidence,
            metadata: options.metadata
        }, { companyId: session.companyId, senderId: options.senderId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending text message:', error);
        throw error;
    }
}

/**
 * إرسال صورة
 */
async function sendImage(sessionId, to, imageSource, caption = '', options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const result = await MetaCloudProvider.sendMedia(sessionId, targetPhone, imageSource, 'image', { caption });

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'IMAGE',
                content: caption,
                mediaUrl: (imageSource && imageSource.url) || (imageSource && imageSource.filePath) || (typeof imageSource === 'string' ? imageSource : null),
                mediaType: 'image',
                mediaMimeType: imageSource && imageSource.mimetype,
                isAIResponse: options.isAIResponse || false
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        // توحيد شكل مصدر الصورة (كائن/سلسلة نصية) عشان نتعامل معه بشكل ثابت
        let source = imageSource;
        if (typeof imageSource === 'string') {
            source = { url: imageSource };
        } else {
            source = imageSource || {};
        }

        // 🖼️ تحويل صور WEBP/BMP/SVG لـ JPEG قبل الإرسال عبر Baileys برضه
        // (واتساب نفسه بيكتشف نوع الملف، والصيغ غير JPEG/PNG/GIF ممكن تطلع شاشة
        // "غير مدعومة" عند العميل). لو معانا buffer أو ملف محلي نحوله مباشرة.
        let image = source.buffer || { url: source.filePath || source.url };
        let mimetype = source.mimetype || 'image/jpeg';
        if (source.buffer && typeof source.buffer !== 'undefined') {
            const { normalizeImageForWhatsApp } = require('../../utils/whatsAppImageCompat');
            const normalized = await normalizeImageForWhatsApp(source.buffer, mimetype);
            image = normalized.buffer;
            mimetype = normalized.mimetype;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            image,
            caption,
            mimetype
        };

        if (options.quotedMessageId) {
            messageOptions.quoted = {
                key: { remoteJid: jid, id: options.quotedMessageId }
            };
        }

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await enqueueSessionSend(sessionId, () => session.sock.sendMessage(jid, messageOptions));

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'IMAGE',
            content: caption,
            mediaUrl: source.url,
            mediaType: 'image',
            mediaMimeType: mimetype,
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending image:', error);
        throw error;
    }
}

/**
 * إرسال فيديو
 */
async function sendVideo(sessionId, to, videoSource, caption = '', options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const result = await MetaCloudProvider.sendMedia(sessionId, targetPhone, videoSource, 'video', { caption });

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'VIDEO',
                content: caption,
                mediaUrl: videoSource.url || videoSource.filePath,
                mediaType: 'video',
                mediaMimeType: videoSource.mimetype
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            video: videoSource.buffer || { url: videoSource.filePath || videoSource.url },
            caption,
            mimetype: videoSource.mimetype || 'video/mp4'
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await enqueueSessionSend(sessionId, () => session.sock.sendMessage(jid, messageOptions));

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'VIDEO',
            content: caption,
            mediaUrl: videoSource.url,
            mediaType: 'video',
            mediaMimeType: videoSource.mimetype
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending video:', error);
        throw error;
    }
}

/**
 * إرسال ملف صوتي
 */
async function sendAudio(sessionId, to, audioSource, options = {}) {
    try {
        const cleanMime = (audioSource.mimetype || 'audio/mp4').split(';')[0].trim();

        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const result = await MetaCloudProvider.sendMedia(sessionId, targetPhone, audioSource, 'audio', {});

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'AUDIO',
                mediaUrl: audioSource.url || audioSource.filePath,
                mediaType: 'audio',
                mediaMimeType: cleanMime
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            audio: audioSource.buffer || { url: audioSource.filePath || audioSource.url },
            mimetype: cleanMime,
            ptt: options.ptt || false // voice note
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await enqueueSessionSend(sessionId, () => session.sock.sendMessage(jid, messageOptions));

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'AUDIO',
            mediaUrl: audioSource.url,
            mediaType: 'audio',
            mediaMimeType: cleanMime
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending audio:', error);
        throw error;
    }
}

/**
 * إرسال ملف/مستند
 */
async function sendDocument(sessionId, to, documentSource, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const result = await MetaCloudProvider.sendMedia(sessionId, targetPhone, documentSource, 'document', {
                caption: options.caption,
                fileName: documentSource.fileName
            });

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'DOCUMENT',
                content: options.caption,
                mediaUrl: documentSource.url || documentSource.filePath,
                mediaType: 'document',
                mediaMimeType: documentSource.mimetype,
                mediaFileName: documentSource.fileName
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            document: documentSource.buffer || { url: documentSource.filePath || documentSource.url },
            mimetype: documentSource.mimetype || 'application/pdf',
            fileName: documentSource.fileName || 'document',
            caption: options.caption
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await enqueueSessionSend(sessionId, () => session.sock.sendMessage(jid, messageOptions));

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'DOCUMENT',
            content: options.caption,
            mediaUrl: documentSource.url,
            mediaType: 'document',
            mediaMimeType: documentSource.mimetype,
            mediaFileName: documentSource.fileName
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending document:', error);
        throw error;
    }
}

/**
 * إرسال موقع
 */
async function sendLocation(sessionId, to, latitude, longitude, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const result = await MetaCloudProvider.sendLocation(sessionId, targetPhone, {
                latitude,
                longitude,
                name: options.name,
                address: options.address
            });

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'LOCATION',
                content: `${latitude},${longitude}`
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            location: {
                degreesLatitude: latitude,
                degreesLongitude: longitude,
                name: options.name,
                address: options.address
            }
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await enqueueSessionSend(sessionId, () => session.sock.sendMessage(jid, messageOptions));

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'LOCATION',
            content: `${latitude},${longitude}`
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending location:', error);
        throw error;
    }
}

/**
 * إرسال جهة اتصال
 */
async function sendContact(sessionId, to, contact, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const contactsPayload = [
                {
                    name: { formatted_name: contact.fullName },
                    phones: [
                        {
                            phone: contact.phoneNumber,
                            type: 'CELL',
                            wa_id: contact.phoneNumber
                        }
                    ]
                }
            ];

            const result = await MetaCloudProvider.sendContacts(sessionId, targetPhone, contactsPayload);

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'CONTACT',
                content: contact.fullName
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.fullName}
TEL;type=CELL;type=VOICE;waid=${contact.phoneNumber}:+${contact.phoneNumber}
END:VCARD`;

        const messageOptions = {
            contacts: {
                displayName: contact.fullName,
                contacts: [{ vcard }]
            }
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await enqueueSessionSend(sessionId, () => session.sock.sendMessage(jid, messageOptions));

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'CONTACT',
            content: contact.fullName
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending contact:', error);
        throw error;
    }
}

/**
 * إرسال تفاعل (Reaction)
 */
async function sendReaction(sessionId, to, messageId, emoji) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        let result;
        if (provider === 'META_CLOUD') {
            result = await MetaCloudProvider.sendReaction(sessionId, targetPhone, messageId, emoji || '');
        } else {
            let session = await getSendableBaileysSession(sessionId, dbSession);
            session = assertSessionReadyAfterPrep(sessionId, 'reaction');
            result = await session.sock.sendMessage(jid, {
                react: {
                    text: emoji || '',
                    key: {
                        remoteJid: jid,
                        id: messageId
                    }
                }
            });
        }

        // حفظ التفاعل وتحديث الرسالة الأصلية وإرسال حدث السوكيت
        const reactionResult = await WhatsAppReactionService.applyReactionToMessage({
            sessionId,
            companyId: dbSession?.companyId,
            remoteJid: jid,
            targetMessageId: messageId,
            reactorKey: 'me',
            emoji: emoji || '',
            fromMe: true
        });

        return {
            result,
            messageId,
            emoji: emoji || null,
            reactions: reactionResult?.reactions || { me: emoji }
        };
    } catch (error) {
        console.error('❌ Error sending reaction:', error);
        throw error;
    }
}

/**
 * إرسال رسالة بأزرار تفاعلية (Interactive Buttons)
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {string} text - نص الرسالة
 * @param {Array} buttons - مصفوفة الأزرار [{id, text}]
 * @param {object} options - خيارات إضافية
 */
async function sendButtons(sessionId, to, text, buttons, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const footer = options.footer || undefined;

            const limitedButtons = buttons.length > 3 ? buttons.slice(0, 3) : buttons;
            const interactivePayload = {
                type: 'button',
                body: { text },
                action: {
                    buttons: limitedButtons.map((btn) => ({
                        type: 'reply',
                        reply: {
                            id: btn.id || btn.text,
                            title: btn.text
                        }
                    }))
                }
            };
            if (footer) {
                interactivePayload.footer = { text: footer };
            }

            const result = await MetaCloudProvider.sendInteractive(sessionId, targetPhone, interactivePayload);

            // 🚨 PRODUCTION-FIX: حفظ الرسالة محلياً بعد نجاح إرسال ميتا الفعلي.
            // لو فشل الـ upsert (DB error)، لا يجب أن يحوّل إرسالاً وصل فعلاً إلى "فشل".
            let savedMessage;
            try {
                savedMessage = await saveOutgoingMessage(sessionId, jid, {
                    messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                    type: 'BUTTONS',
                    content: text,
                    interactiveData: JSON.stringify({ buttons: limitedButtons, footer }),
                    isAIResponse: options.isAIResponse || false
                }, { companyId: dbSession?.companyId });
            } catch (saveErr) {
                console.warn(`⚠️ [WhatsAppMessageHandler] saveOutgoingMessage failed (non-critical, send already succeeded): ${saveErr.message}`);
                savedMessage = {
                    messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                    messageType: 'BUTTONS',
                    content: text
                };
            }

            try {
                await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            } catch (contactErr) {
                // 🚨 PRODUCTION-FIX: فشل تحديث بيانات الـ contact (مثل upsert فشل)
                // لا يجب أبداً أن يحوّل إرسالاً نجح فعلاً إلى "فشل".
                console.warn(`⚠️ [WhatsAppMessageHandler] ensureMetaContact failed (non-critical): ${contactErr.message}`);
            }
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);
        const footer = options.footer || '';

        // التحقق من عدد الأزرار (حد أقصى 3)
        if (buttons.length > 3) {
            buttons = buttons.slice(0, 3);
        }

        console.log(`🚀 [WHATSAPP-BTN] Sending formatted text with ${buttons.length} options to ${jid}`);

        // رسالة نصية منسقة مع الخيارات - مضمونة 100% على كل إصدارات واتساب
        const btnText = buttons.map((btn, i) => `   ${['1️⃣', '2️⃣', '3️⃣'][i]} *${btn.text}*`).join('\n');
        const formattedText = `${text}\n\n┌─────────────────┐\n${btnText}\n└─────────────────┘\n\n_${footer}_`;

        session = assertSessionReadyAfterPrep(sessionId, 'buttons prep');
        const result = await session.sock.sendMessage(jid, { text: formattedText });
        console.log(`✅ [WHATSAPP-BTN] Formatted text message sent successfully to ${jid}`);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'BUTTONS',
            content: formattedText,
            interactiveData: JSON.stringify({ buttons, footer }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error in sendButtons:', error);
        throw error;
    }
}

/**
 * إرسال رسالة بقائمة (List)
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {string} text - نص الرسالة
 * @param {string} buttonText - نص الزر الرئيسي
 * @param {Array} sections - مصفوفة الأقسام [{title, rows: [{id, title, description}]}]
 * @param {object} options - خيارات إضافية
 */
async function sendList(sessionId, to, text, buttonText, sections, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            // التحقق من عدد الأقسام (حد أقصى 10)
            if (sections.length > 10) {
                throw new Error('الحد الأقصى للأقسام هو 10');
            }

            for (const section of sections) {
                if (section.rows && section.rows.length > 10) {
                    throw new Error('الحد الأقصى للصفوف في كل قسم هو 10');
                }
            }

            const interactivePayload = {
                type: 'list',
                body: { text },
                action: {
                    button: buttonText,
                    sections: sections.map(section => ({
                        title: section.title,
                        rows: (section.rows || []).map(row => ({
                            id: row.id,
                            title: row.title,
                            description: row.description
                        }))
                    }))
                }
            };

            if (options.footer) {
                interactivePayload.footer = { text: options.footer };
            }

            const result = await MetaCloudProvider.sendInteractive(sessionId, targetPhone, interactivePayload);

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'LIST',
                content: text,
                interactiveData: JSON.stringify({ buttonText, sections, title: options.title, footer: options.footer }),
                isAIResponse: options.isAIResponse || false
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        // التحقق من عدد الأقسام (حد أقصى 10)
        if (sections.length > 10) {
            throw new Error('الحد الأقصى للأقسام هو 10');
        }

        // التحقق من عدد الصفوف في كل قسم (حد أقصى 10)
        for (const section of sections) {
            if (section.rows && section.rows.length > 10) {
                throw new Error('الحد الأقصى للصفوف في كل قسم هو 10');
            }
        }

        const messageOptions = {
            text,
            sections,
            buttonText,
            title: options.title || text,
            footer: options.footer,
            description: options.description
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await session.sock.sendMessage(jid, messageOptions);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'LIST',
            content: text,
            interactiveData: JSON.stringify({ buttonText, sections, title: options.title, footer: options.footer }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending list:', error);
        throw error;
    }
}

/**
 * إرسال منتج (Product)
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {object} product - بيانات المنتج
 * @param {object} options - خيارات إضافية
 */
async function sendProduct(sessionId, to, product, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const fallbackText = `*${product.name}*\n\n${product.description || ''}\n\n💰 السعر: ${product.price || 'غير محدد'}`;

            const result = await MetaCloudProvider.sendText(sessionId, targetPhone, fallbackText, {});

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'PRODUCT',
                content: `${product.name} - ${product.price || ''}`,
                mediaUrl: product.imageUrl,
                interactiveData: JSON.stringify({ product, buttons: options.buttons }),
                isAIResponse: options.isAIResponse || false
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        // بناء رسالة المنتج
        const messageOptions = {
            text: `*${product.name}*\n\n${product.description || ''}\n\n💰 السعر: ${product.price || 'غير محدد'}`,
            footer: options.footer || 'منتج من متجرنا'
        };

        // إضافة صورة المنتج إذا كانت موجودة
        if (product.imageUrl) {
            messageOptions.image = { url: product.imageUrl };
        }

        // إضافة أزرار تفاعلية
        if (options.buttons && options.buttons.length > 0) {
            const buttonRows = options.buttons.map(btn => ({
                id: btn.id || btn.text,
                title: btn.text
            }));
            messageOptions.buttons = buttonRows;
        }

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await session.sock.sendMessage(jid, messageOptions);

        // حفظ الرسالة في قاعدة البيانات
        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'PRODUCT',
            content: `${product.name} - ${product.price || ''}`,
            mediaUrl: product.imageUrl,
            interactiveData: JSON.stringify({ product, buttons: options.buttons }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });



        // تحديث جهة الاتصال
        await safeUpdateContact(sessionId, jid, { sock: session.sock });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending product:', error);
        throw error;
    }
}

/**
 * إرسال رد سريع
 */
async function sendQuickReply(sessionId, to, quickReplyId, variables = {}) {
    try {
        // جلب الرد السريع
        const quickReply = await getSharedPrismaClient().whatsAppQuickReply.findUnique({
            where: { id: quickReplyId }
        });

        if (!quickReply) {
            throw new Error('الرد السريع غير موجود');
        }

        // استبدال المتغيرات
        let content = quickReply.content;
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        // إرسال الرسالة
        const result = await sendText(sessionId, to, content);

        // تحديث إحصائيات الرد السريع
        await getSharedPrismaClient().whatsAppQuickReply.update({
            where: { id: quickReplyId },
            data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date()
            }
        });

        return result;
    } catch (error) {
        console.error('❌ Error sending quick reply:', error);
        throw error;
    }
}

/**
 * جلب الرسائل من محادثة
 */
async function getMessages(sessionId, remoteJid, options = {}) {
    try {
        const { page = 1, limit = 50, before, after } = options;
        const remoteJids = getRemoteJidLookupValues(remoteJid);

        const prisma = getSharedPrismaClient();
        if (prisma.whatsAppLidMapping && sessionId && remoteJid) {
            try {
                if (String(remoteJid).includes('@lid')) {
                    const map = await prisma.whatsAppLidMapping.findUnique({
                        where: { sessionId_lidJid: { sessionId, lidJid: remoteJid } },
                        select: { phoneJid: true }
                    });
                    if (map?.phoneJid && !remoteJids.includes(map.phoneJid)) {
                        remoteJids.push(map.phoneJid);
                    }
                } else {
                    const maps = await prisma.whatsAppLidMapping.findMany({
                        where: { sessionId, phoneJid: remoteJid },
                        select: { lidJid: true }
                    });
                    for (const m of maps) {
                        if (m.lidJid && !remoteJids.includes(m.lidJid)) {
                            remoteJids.push(m.lidJid);
                        }
                    }
                }
            } catch (e) {}
        }

        const where = {
            sessionId,
            remoteJid: remoteJids.length > 1 ? { in: remoteJids } : remoteJids[0],
            isHidden: false
        };

        if (before) {
            where.timestamp = { lt: new Date(before) };
        }
        if (after) {
            where.timestamp = { gt: new Date(after) };
        }

        const messages = await getSharedPrismaClient().whatsAppMessage.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        });

        const total = await getSharedPrismaClient().whatsAppMessage.count({ where });

        const senderIds = [...new Set(messages.filter(m => m.fromMe && m.senderId).map(m => m.senderId))];
        const senders = senderIds.length > 0
            ? await getSharedPrismaClient().user.findMany({
                where: { id: { in: senderIds } },
                select: { id: true, firstName: true, lastName: true }
              })
            : [];
        const senderMap = Object.fromEntries(senders.map(u => [u.id, [u.firstName, u.lastName].filter(Boolean).join(' ')]));

        // حل أسماء المرسلين داخل رسائل الجروبات: المشارك قد يكون LID أو رقم تلفون.
        const participantNameMap = await resolveGroupParticipantNames(sessionId, messages);

        // Backfill Meta template buttons for older TEMPLATE messages that predate
        // storing templateButtons in interactiveData, so they render on the
        // business-side chat. Only fires when such messages exist; fails silently.
        const hasTemplateWithoutButtons = messages.some((m) => {
          if (m.messageType !== 'TEMPLATE' || !m.interactiveData) return false;
          try {
            const p = JSON.parse(m.interactiveData);
            return Boolean(p?.templateName) && !p?.templateButtons;
          } catch {
            return false;
          }
        });
        if (hasTemplateWithoutButtons) {
          try {
            const allTemplates = await MetaCloudProvider.listTemplates(sessionId);
            if (Array.isArray(allTemplates) && allTemplates.length > 0) {
              const byName = Object.fromEntries(allTemplates.map((t) => [t.name, t]));
              for (const m of messages) {
                if (m.messageType !== 'TEMPLATE' || !m.interactiveData) continue;
                let parsed;
                try {
                  parsed = JSON.parse(m.interactiveData);
                } catch {
                  continue;
                }
                if (parsed?.templateButtons || !parsed?.templateName) continue;
                const tmpl = byName[parsed.templateName];
                const tmplComponents = tmpl?.components || [];
                const buttonsComp = tmplComponents.find((c) => (c.type || '').toUpperCase() === 'BUTTONS');
                if (buttonsComp?.buttons && Array.isArray(buttonsComp.buttons)) {
                  parsed.templateButtons = buttonsComp.buttons.map((b) => ({
                    type: b.type || null,
                    text: b.text || '',
                    url: b.url || (b.type === 'URL' ? (b.action?.url || null) : null) || null,
                  }));
                }
                const footerComp = tmplComponents.find((c) => (c.type || '').toUpperCase() === 'FOOTER');
                if (footerComp?.text) parsed.templateFooter = footerComp.text;
                if (parsed.templateButtons || parsed.templateFooter) {
                  m.interactiveData = JSON.stringify(parsed);
                }
              }
            }
          } catch (enrichErr) {
            console.warn(`[WhatsAppMessageHandler] Could not backfill template buttons for ${sessionId}:`, enrichErr?.message);
          }
        }

        const withReactions = WhatsAppReactionService.attachReactionsToMessages(messages);

        const enriched = withReactions.map(m => ({
            ...m,
            senderName: m.fromMe && m.senderId ? (senderMap[m.senderId] || null) : null,
            participantName: (!m.fromMe && m.participant) ? (participantNameMap[m.participant] || null) : null
        }));

        return {
            messages: enriched.reverse(),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        console.error('❌ Error getting messages:', error);
        throw error;
    }
}

function getRemoteJidLookupValues(remoteJid) {
    const values = new Set();
    const originalJid = String(remoteJid || '').trim();

    if (originalJid) {
        values.add(originalJid);
    }

    const { normalizedJid } = normalizeWhatsAppContactIdentity(originalJid);
    if (normalizedJid) {
        values.add(normalizedJid);
    }

    return Array.from(values);
}

/**
 * حل أسماء المرسلين داخل رسائل الجروبات.
 * المشارك قد يكون LID (@lid) أو رقم تلفون (@s.whatsapp.net) — نرجعه لرقم التلفون
 * عبر whatsAppLidMapping ثم نبحث عن اسم جهة الاتصال.
 * @param {string} sessionId
 * @param {Array<object>} messages
 * @returns {Promise<Record<string, string|null>>} map من JID المشارك إلى اسمه
 */
async function resolveGroupParticipantNames(sessionId, messages) {
    const participantJids = [...new Set(
        messages.filter(m => !m.fromMe && m.participant).map(m => m.participant)
    )];
    if (participantJids.length === 0) return {};

    const prisma = getSharedPrismaClient();
    const lidMap = {};
    const lidJids = participantJids.filter(j => String(j).includes('@lid'));

    try {
        if (lidJids.length > 0 && prisma.whatsAppLidMapping) {
            const lidRows = await prisma.whatsAppLidMapping.findMany({
                where: { sessionId, lidJid: { in: lidJids } },
                select: { lidJid: true, phoneJid: true }
            });
            for (const r of lidRows) lidMap[r.lidJid] = r.phoneJid;
        }
    } catch (e) {
        console.warn('⚠️ Failed to resolve group participant LIDs:', e.message);
    }

    const candidateJids = new Set(participantJids);
    for (const p of participantJids) {
        if (lidMap[p]) candidateJids.add(lidMap[p]);
    }

    let contacts = [];
    try {
        contacts = await prisma.whatsAppContact.findMany({
            where: { sessionId, jid: { in: [...candidateJids] } },
            select: { jid: true, name: true, pushName: true }
        });
    } catch (e) {
        console.warn('⚠️ Failed to load contacts for group participants:', e.message);
    }

    const nameByJid = {};
    for (const c of contacts) nameByJid[c.jid] = c.name || c.pushName || null;

    const result = {};
    for (const p of participantJids) {
        result[p] = nameByJid[p] || (lidMap[p] ? nameByJid[lidMap[p]] : null) || null;
    }
    return result;
}

/**
 * حذف رسالة
 */
async function deleteMessage(sessionId, remoteJid, messageId, forEveryone = false) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        let session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(remoteJid);

        if (forEveryone) {
            session = assertSessionReadyAfterPrep(sessionId, 'delete');
            await session.sock.sendMessage(jid, {
                delete: {
                    remoteJid: jid,
                    id: messageId,
                    participant: undefined
                }
            });
        }

        // حذف من قاعدة البيانات
        await getSharedPrismaClient().whatsAppMessage.deleteMany({
            where: { messageId }
        });

        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting message:', error);
        throw error;
    }
}

/**
 * تحديد الرسائل كمقروءة
 */
async function markAsRead(sessionId, remoteJid) {
    try {
        if (!sessionId || !remoteJid || typeof sessionId !== 'string' || typeof remoteJid !== 'string') {
            return { success: false, error: 'Invalid sessionId or remoteJid' };
        }
        const session = WhatsAppManager.getSession(sessionId);

        // We don't throw error if session is not connected, we just skip socket update
        // and proceed to update database so the UI reflects the read status.

        const jid = formatJid(remoteJid);

        // جلب آخر رسالة غير مقروءة
        const lastMessage = await getSharedPrismaClient().whatsAppMessage.findFirst({
            where: {
                sessionId,
                remoteJid: jid,
                fromMe: false,
                status: { not: 'READ' }
            },
            orderBy: { timestamp: 'desc' }
        });

        if (lastMessage) {
            if (session && session.status === 'connected') {
                try {
                    // محاولة استخدام readMessages أولاً
                    if (typeof session.sock.readMessages === 'function') {
                        await session.sock.readMessages([{
                            remoteJid: jid,
                            id: lastMessage.messageId,
                            fromMe: false
                        }]);
                    }
                    // استخدام chatModify كبديل
                    else if (typeof session.sock.chatModify === 'function') {
                        await session.sock.chatModify({
                            markRead: true,
                            lastMessages: [{
                                key: {
                                    remoteJid: jid,
                                    id: lastMessage.messageId,
                                    fromMe: false
                                }
                            }]
                        }, jid);
                    }
                } catch (sockError) {
                    console.warn('⚠️ Error in socket read/modify, continuing to DB update:', sockError.message);
                }
            }
        }

        // تحديث قاعدة البيانات
        if (lastMessage) {
            try {
                await getSharedPrismaClient().whatsAppMessage.updateMany({
                    where: {
                        sessionId,
                        remoteJid: jid,
                        fromMe: false,
                        status: { not: 'READ' }
                    },
                    data: { status: 'READ' }
                });
            } catch (updateError) {
                if (isPermissionError(updateError)) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`⚠️ [DB-PERMISSION] Cannot mark WhatsApp messages as read: ${getPermissionErrorMessage(updateError)}`);
                    }
                } else {
                    throw updateError;
                }
            }
        }

        try {
            await getSharedPrismaClient().whatsAppContact.updateMany({
                where: {
                    sessionId,
                    jid
                },
                data: { unreadCount: 0 }
            });
            if (remoteJid && remoteJid !== jid) {
                await getSharedPrismaClient().whatsAppContact.updateMany({
                    where: {
                        sessionId,
                        jid: remoteJid
                    },
                    data: { unreadCount: 0 }
                });
            }
        } catch (updateError) {
            if (isPermissionError(updateError)) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ [DB-PERMISSION] Cannot update WhatsApp contact unread count: ${getPermissionErrorMessage(updateError)}`);
                }
            } else {
                throw updateError;
            }
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error marking as read:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            sessionId,
            remoteJid
        });
        throw error;
    }
}

/**
 * حفظ رسالة صادرة
 */
async function saveOutgoingMessage(sessionId, remoteJid, data, options = {}) {
    const metadata = serializeOutgoingMetadata(data.metadata);
    const savedMessage = await getSharedPrismaClient().whatsAppMessage.upsert({
        where: { messageId: data.messageId },
        update: {
            sessionId,
            remoteJid,
            fromMe: true,
            messageType: data.type,
            content: data.content,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            mediaMimeType: data.mediaMimeType,
            mediaFileName: data.mediaFileName,
            quotedMessageId: data.quotedMessageId,
            interactiveData: data.interactiveData,
            status: 'SENT',
            timestamp: new Date(),
            isAIResponse: data.isAIResponse || false,
            aiConfidence: data.aiConfidence,
            metadata,
            senderId: options.senderId || null,
            updatedAt: new Date()
        },
        create: {
            sessionId,
            remoteJid,
            messageId: data.messageId,
            fromMe: true,
            messageType: data.type,
            content: data.content,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            mediaMimeType: data.mediaMimeType,
            mediaFileName: data.mediaFileName,
            quotedMessageId: data.quotedMessageId,
            interactiveData: data.interactiveData,
            status: 'SENT',
            timestamp: new Date(),
            isAIResponse: data.isAIResponse || false,
            aiConfidence: data.aiConfidence,
            metadata,
            senderId: options.senderId || null,
            updatedAt: new Date()
        }
    });

    try {
        await getSharedPrismaClient().whatsAppContact.updateMany({
            where: {
                sessionId,
                jid: remoteJid
            },
            data: {
                unreadCount: 0,
                lastMessageAt: new Date()
            }
        });
    } catch (updateError) {
        if (isPermissionError(updateError)) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`⚠️ [DB-PERMISSION] Cannot clear WhatsApp unread count after outgoing message: ${getPermissionErrorMessage(updateError)}`);
            }
        } else {
            throw updateError;
        }
    }

    // Emit socket event
    try {
        const io = getIO();
        let companyId = options.companyId;

        if (!companyId) {
            const session = await getSharedPrismaClient().whatsAppSession.findUnique({
                where: { id: sessionId },
                select: { companyId: true }
            });
            companyId = session?.companyId;
        }

        if (companyId) {
            // ✅ SYNC TO MAIN CRM (Persistent Storage)
            let syncedConversation = null;
            try {
                const syncResult = await WhatsAppSyncService.syncMessage(
                    companyId,
                    sessionId,
                    remoteJid,
                    {
                        sessionId,
                        messageId: data.messageId,
                        type: data.type, // RAW WhatsApp type
                        content: data.content,
                        mediaUrl: data.mediaUrl,
                        mediaType: data.mediaType,
                        mediaMimeType: data.mediaMimeType,
                        mediaFileName: data.mediaFileName,
                        timestamp: new Date(),
                        senderId: options.senderId || data.senderId,
                        metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
                    },
                    false // isIncoming = false
                );
                syncedConversation = syncResult?.conversation;
            } catch (syncErr) {
                console.error('Failed to sync outgoing message to CRM:', syncErr);
            }

            const audience = await getConversationAudience({
                companyId,
                sessionId,
                conversationId: syncedConversation?.id || null,
                remoteJid
            });

            if (savedMessage.senderId) {
                const senderUser = await getSharedPrismaClient().user.findUnique({
                    where: { id: savedMessage.senderId },
                    select: { firstName: true, lastName: true }
                });
                if (senderUser) {
                    savedMessage.senderName = `${senderUser.firstName} ${senderUser.lastName}`.trim();
                }
            }

            emitToAudience(io, {
                companyId,
                userIds: audience.userIds,
                eventName: 'whatsapp:message:sent',
                payload: {
                    sessionId,
                    message: savedMessage
                }
            });
        }
    } catch (e) {
        console.error('Error emitting socket event:', e);
    }

    return savedMessage;
}

/**
 * تنسيق JID
 */
function formatJid(to) {
    if (!to) return to;
    const { normalizedJid } = normalizeWhatsAppContactIdentity(to);
    return normalizedJid;
}

/**
 * تأخير
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Poll Features ====================

/**
 * إرسال استطلاع
 */
async function sendPoll(sessionId, to, pollData, options = {}) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            poll: {
                name: pollData.name,
                selectableCount: pollData.selectableCount || 1,
                values: pollData.values || []
            }
        };

        if (options.quotedMessageId) {
            messageOptions.quoted = {
                key: {
                    remoteJid: jid,
                    id: options.quotedMessageId
                }
            };
        }

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'POLL',
            content: pollData.name,
            interactiveData: JSON.stringify(pollData),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending poll:', error);
        throw error;
    }
}

// ==================== Order & Catalog Features ====================

/**
 * إرسال طلب (لحسابات Business)
 */
async function sendOrder(sessionId, to, orderData, options = {}) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            order: orderData
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'PRODUCT',
            content: `طلب: ${orderData.orderId || ''}`,
            interactiveData: JSON.stringify(orderData),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending order:', error);
        throw error;
    }
}

/**
 * إرسال كتالوج (لحسابات Business)
 */
async function sendCatalog(sessionId, to, catalogData, options = {}) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            catalog: catalogData
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'PRODUCT',
            content: 'كتالوج المنتجات',
            interactiveData: JSON.stringify(catalogData),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending catalog:', error);
        throw error;
    }
}

/**
 * الحصول على الكتالوج
 */
async function getCatalog(sessionId) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        let session = await getSendableBaileysSession(sessionId, dbSession);

        const catalog = await session.sock.getCatalog();
        return catalog;
    } catch (error) {
        console.error('❌ Error getting catalog:', error);
        throw error;
    }
}

/**
 * الحصول على المنتجات
 */
async function getProducts(sessionId, catalogId) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        let session = await getSendableBaileysSession(sessionId, dbSession);

        const products = await session.sock.getProducts(catalogId);
        return products;
    } catch (error) {
        console.error('❌ Error getting products:', error);
        throw error;
    }
}

/**
 * الحصول على السلة
 */
async function getCart(sessionId, cartId) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        let session = await getSendableBaileysSession(sessionId, dbSession);

        const cart = await session.sock.getCart(cartId);
        return cart;
    } catch (error) {
        console.error('❌ Error getting cart:', error);
        throw error;
    }
}

// ==================== Template Messages ====================

/**
 * إرسال رسالة قالب (لحسابات Business)
 */
async function sendTemplateMessage(sessionId, to, templateId, parameters = {}, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const targetPhone = jid.split('@')[0];

        if (provider === 'META_CLOUD') {
            const templateName = parameters?.name || templateId;
            const languageCode = parameters?.language || parameters?.languageCode || 'en';
            const components = parameters?.components || [];

            const result = await MetaCloudProvider.sendTemplate(sessionId, targetPhone, templateName, languageCode, components);

            let templateBody = options?.templateBody || '';
            let templateButtons = null;
            let templateFooter = null;
            try {
                const allTemplates = await MetaCloudProvider.listTemplates(sessionId);
                const tmpl = Array.isArray(allTemplates) ? allTemplates.find(t => t.name === templateName) : null;
                const tmplComponents = tmpl?.components || [];
                const bodyComp = tmplComponents.find(c => (c.type || '').toUpperCase() === 'BODY');
                if (!templateBody && bodyComp?.text) {
                    let bodyText = bodyComp.text;
                    const bodyParamObj = components.find(c => (c.type || '').toUpperCase() === 'BODY');
                    if (bodyParamObj?.parameters && Array.isArray(bodyParamObj.parameters)) {
                        bodyParamObj.parameters.forEach((param, idx) => {
                            const val = param.text || param.value || '';
                            bodyText = bodyText.replace(new RegExp(`\\\\{\\\\{\\\\s*${idx + 1}\\\\s*\\\\}\\\\}`, 'g'), val);
                        });
                    }
                    templateBody = bodyText;
                }
                // Extract buttons + footer from the Meta template definition so they
                // can be displayed in the business-side chat bubble.
                const buttonsComp = tmplComponents.find(c => (c.type || '').toUpperCase() === 'BUTTONS');
                if (buttonsComp?.buttons && Array.isArray(buttonsComp.buttons)) {
                    templateButtons = buttonsComp.buttons.map((b) => ({
                        type: b.type || null,
                        text: b.text || '',
                        url: b.url || (b.type === 'URL' ? (b.action?.url || null) : null) || null,
                    }));
                }
                const footerComp = tmplComponents.find(c => (c.type || '').toUpperCase() === 'FOOTER');
                if (footerComp?.text) templateFooter = footerComp.text;
            } catch (err) {
                console.warn(`[WhatsAppMessageHandler] Could not auto-fetch template definition for ${templateName}:`, err.message);
            }

            const displayContent = templateBody || `Template: ${templateName}`;
            let meta = serializeOutgoingMetadata(options.metadata);

            // 🚨 PRODUCTION-FIX: حفظ الرسالة محلياً بعد نجاح إرسال ميتا الفعلي.
            // لو فشل الـ upsert (DB error)، لا يجب أن يحوّل إرسالاً وصل فعلاً إلى
            // "فشل" — كان يسبب fallback مكرر (رسالة مكررة للعميل) أو failureReason مضلل.
            let savedMessage;
            try {
                savedMessage = await saveOutgoingMessage(sessionId, jid, {
                    messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                    type: 'TEMPLATE',
                    content: displayContent,
                    interactiveData: JSON.stringify({ templateName, languageCode, components, templateBody, templateButtons, templateFooter }),
                    isAIResponse: options.isAIResponse || false,
                    metadata: meta
                }, { companyId: dbSession?.companyId, senderId: options.senderId });
            } catch (saveErr) {
                console.warn(`⚠️ [WhatsAppMessageHandler] saveOutgoingMessage failed (non-critical, send already succeeded): ${saveErr.message}`);
                savedMessage = {
                    messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                    messageType: 'TEMPLATE',
                    content: displayContent
                };
            }

            try {
                await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            } catch (contactErr) {
                // 🚨 PRODUCTION-FIX: فشل تحديث بيانات الـ contact (مثل upsert فشل)
                // لا يجب أبداً أن يحوّل إرسالَ قالبٍ نجح فعلاً إلى "فشل" —
                // كان بيسبب fallback خاطئ لـ BUTTONS رغم نجاح الـ TEMPLATE.
                console.warn(`⚠️ [WhatsAppMessageHandler] ensureMetaContact failed (non-critical): ${contactErr.message}`);
            }
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const messageOptions = {
            template: {
                id: templateId,
                params: parameters
            }
        };

        session = assertSessionReadyAfterPrep(sessionId, 'media prep');
        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'TEMPLATE',
            content: `Template: ${templateId}`,
            interactiveData: JSON.stringify({ templateId, parameters }),
            isAIResponse: options.isAIResponse || false,
            metadata: serializeOutgoingMetadata(options.metadata)
        }, { companyId: session.companyId, senderId: options.senderId });

        return savedMessage;
    } catch (error) {
        // 🔍 DIAG (2026-08-26): اطبع response ميتا الكامل عشان نشوف السبب الحقيقي للرفض
        console.error('❌ Error sending template message:', error?.message);
        console.error('❌ [META-RAW]', JSON.stringify(error?.response?.data || error?.originalError?.response?.data || error?.details || error));
        throw error;
    }
}

/**
 * الحصول على قوالب الرسائل
 */
async function getMessageTemplate(sessionId) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        if (provider === 'META_CLOUD') {
            const templates = await MetaCloudProvider.listTemplates(sessionId);
            return templates;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);

        const templates = await session.sock.getMessageTemplate();
        return templates;
    } catch (error) {
        console.error('❌ Error getting message templates:', error);
        throw error;
    }
}

// ==================== Pinned Messages ====================

/**
 * تثبيت رسالة في المحادثة
 * @param {string} sessionId
 * @param {string} jid
 * @param {string} messageId
 * @param {number} duration - مدة التثبيت بالثواني (86400 = 24h, 604800 = 7d, 2592000 = 30d)
 */
async function pinMessage(sessionId, jid, messageId, duration = 86400) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        let session = await getSendableBaileysSession(sessionId, dbSession);
        const targetJid = formatJid(jid);

        const targetMsg = await getSharedPrismaClient().whatsAppMessage.findFirst({
            where: { messageId }
        });

        const isFromMe = targetMsg ? targetMsg.fromMe : false;

        session = assertSessionReadyAfterPrep(sessionId, 'pin prep');
        await session.sock.sendMessage(targetJid, {
            pin: {
                remoteJid: targetJid,
                fromMe: isFromMe,
                id: messageId
            },
            type: 1, // 1 = PIN
            time: duration
        });

        const expiresAt = new Date(Date.now() + duration * 1000);
        if (targetMsg) {
            let meta = {};
            try { meta = targetMsg.metadata ? (typeof targetMsg.metadata === 'string' ? JSON.parse(targetMsg.metadata) : targetMsg.metadata) : {}; } catch {}
            meta.isPinned = true;
            meta.pinnedAt = new Date();
            meta.pinDuration = duration;
            meta.pinExpiresAt = expiresAt;

            await getSharedPrismaClient().whatsAppMessage.update({
                where: { id: targetMsg.id },
                data: {
                    metadata: JSON.stringify(meta),
                    updatedAt: new Date()
                }
            });
        }

        const io = getIO();
        io?.to(`company_${session.companyId}`).emit('whatsapp:message:pinned', {
            sessionId,
            remoteJid: targetJid,
            messageId,
            duration,
            expiresAt,
            message: targetMsg
        });

        return { success: true, messageId, duration, expiresAt };
    } catch (error) {
        console.error('❌ Error pinning message:', error);
        throw error;
    }
}

/**
 * إلغاء تثبيت رسالة من المحادثة
 */
async function unpinMessage(sessionId, jid, messageId) {
    try {
        const { session: dbSession } = await getSessionProvider(sessionId);
        let session = await getSendableBaileysSession(sessionId, dbSession);
        const targetJid = formatJid(jid);

        const targetMsg = await getSharedPrismaClient().whatsAppMessage.findFirst({
            where: { messageId }
        });

        const isFromMe = targetMsg ? targetMsg.fromMe : false;

        session = assertSessionReadyAfterPrep(sessionId, 'unpin prep');
        await session.sock.sendMessage(targetJid, {
            pin: {
                remoteJid: targetJid,
                fromMe: isFromMe,
                id: messageId
            },
            type: 0, // 0 = UNPIN
            time: 0
        });

        if (targetMsg) {
            let meta = {};
            try { meta = targetMsg.metadata ? (typeof targetMsg.metadata === 'string' ? JSON.parse(targetMsg.metadata) : targetMsg.metadata) : {}; } catch {}
            meta.isPinned = false;
            meta.unpinnedAt = new Date();

            await getSharedPrismaClient().whatsAppMessage.update({
                where: { id: targetMsg.id },
                data: {
                    metadata: JSON.stringify(meta),
                    updatedAt: new Date()
                }
            });
        }

        const io = getIO();
        io?.to(`company_${session.companyId}`).emit('whatsapp:message:unpinned', {
            sessionId,
            remoteJid: targetJid,
            messageId
        });

        return { success: true, messageId };
    } catch (error) {
        console.error('❌ Error unpinning message:', error);
        throw error;
    }
}

// ==================== Native Flow Interactive Messages ====================

/**
 * إرسال رسالة بأزرار تفاعلية حديثة (Native Flow Interactive Messages)
 * تدعم: نسخ كود/كوبون (cta_copy)، رابط (cta_url)، اتصال هاتفي (cta_call)، رد سريع (quick_reply)
 */
async function sendInteractiveButtons(sessionId, to, data, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);
        const jid = await resolveAndValidateOutgoingJid(sessionId, to);
        const { text, title, footer, buttons = [] } = data;

        if (provider === 'META_CLOUD') {
            return await sendButtons(sessionId, to, text, buttons, { ...options, footer, title });
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);
        session = assertSessionReadyAfterPrep(sessionId, 'interactive prep');

        const nativeButtons = buttons.map((btn, index) => {
            const btnType = btn.type || 'quick_reply';
            if (btnType === 'copy' || btnType === 'cta_copy') {
                return {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.displayText || btn.text || 'نسخ الكود',
                        id: btn.id || `copy_${index + 1}`,
                        copy_code: btn.code || btn.copyCode || ''
                    })
                };
            } else if (btnType === 'url' || btnType === 'cta_url') {
                return {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.displayText || btn.text || 'زيارة الرابط',
                        url: btn.url || '',
                        merchant_url: btn.url || ''
                    })
                };
            } else if (btnType === 'call' || btnType === 'cta_call') {
                return {
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.displayText || btn.text || 'اتصال',
                        phone_number: btn.phoneNumber || btn.phone || ''
                    })
                };
            } else {
                return {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.displayText || btn.text || `خيار ${index + 1}`,
                        id: btn.id || `reply_${index + 1}`
                    })
                };
            }
        });

        const proto = WhatsAppManager.getBaileysProto();
        const generateWAMsg = WhatsAppManager.getGenerateWAMessageFromContent();

        let messageId;
        if (generateWAMsg && proto) {
            const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: text || '' }),
                footer: footer ? proto.Message.InteractiveMessage.Footer.fromObject({ text: footer }) : undefined,
                header: title ? proto.Message.InteractiveMessage.Header.fromObject({ title: title, hasMediaAttachment: false }) : undefined,
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: nativeButtons
                })
            });

            const waMsg = generateWAMsg(jid, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage
                    }
                }
            }, { userJid: session.sock.user?.id });

            messageId = waMsg.key.id;
            await session.sock.relayMessage(jid, waMsg.message, { messageId });
        } else {
            return await sendButtons(sessionId, to, text, buttons, { ...options, footer });
        }

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId,
            type: 'INTERACTIVE',
            content: text,
            interactiveData: JSON.stringify({
                title,
                text,
                footer,
                buttons
            }),
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        await safeUpdateContact(sessionId, jid, { sock: session.sock });
        return savedMessage;
    } catch (error) {
        console.error('❌ Error sending native interactive buttons:', error);
        throw error;
    }
}

module.exports = {
    sendText,
    sendImage,
    sendVideo,
    sendAudio,
    sendDocument,
    sendLocation,
    sendContact,
    sendReaction,
    sendQuickReply,
    sendButtons,
    sendList,
    sendProduct,
    getMessages,
    deleteMessage,
    markAsRead,
    formatJid,
    resolveAndValidateOutgoingJid,
    // Poll & Order Features
    sendPoll,
    sendOrder,
    sendCatalog,
    getCatalog,
    getProducts,
    getCart,
    // Template Messages
    sendTemplateMessage,
    getMessageTemplate,
    // Advanced Baileys Features
    pinMessage,
    unpinMessage,
    sendInteractiveButtons
};

