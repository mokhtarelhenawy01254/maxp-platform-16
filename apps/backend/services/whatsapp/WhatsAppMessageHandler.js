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
const socketService = require('../socketService');
const getIO = () => socketService.getIO();
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');
const { normalizeWhatsAppContactIdentity } = require('./contactIdentity');
const { emitToAudience, getConversationAudience } = require('../whatsappRealtimeAudienceService');

const DEFAULT_BAILEYS_SEND_RECONNECT_WAIT_MS = 10000;
const BAILEYS_SEND_RECONNECT_POLL_MS = 500;

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
                totalMessages: { increment: 1 },
                unreadCount: isOutgoing ? undefined : { increment: 1 },
                updatedAt: new Date()
            },
            create: {
                jid: normalizedJid,
                phoneNumber,
                lastMessageAt: new Date(),
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
 * إرسال رسالة نصية
 * @param {string} sessionId - معرف الجلسة
 * @param {string} to - رقم المستلم
 * @param {string} text - نص الرسالة
 * @param {object} options - خيارات إضافية
 */
async function sendText(sessionId, to, text, options = {}) {
    try {
        const { session: dbSession, provider } = await getSessionProvider(sessionId);

        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const result = await MetaCloudProvider.sendText(sessionId, to, text, {
                previewUrl: options.previewUrl
            });

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'TEXT',
                content: text,
                quotedMessageId: options.quotedMessageId,
                interactiveData: options.interactiveData ? JSON.stringify(options.interactiveData) : null,
                isAIResponse: options.isAIResponse || false,
                aiConfidence: options.aiConfidence,
                metadata: options.metadata
            }, { companyId: dbSession?.companyId, senderId: options.senderId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        let session = await getSendableBaileysSession(sessionId, dbSession);
        console.log(`🔍 [DEBUG] sendText: Retrieving session ${sessionId}`, {
            exists: !!session,
            status: session?.status,
            isConnected: session?.status === 'connected',
            hasSocket: !!session?.sock
        });

        const jid = formatJid(to);

        // إرسال حالة الكتابة
        await sendTypingSafely(sessionId, jid, true);

        // تأخير بسيط لمحاكاة الكتابة
        await delay(Math.min(text.length * 20, 2000));

        // إرسال الرسالة
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
            session = await getSendableBaileysSession(sessionId, dbSession);
            result = await session.sock.sendMessage(jid, messageOptions);
        } catch (sendError) {
            console.warn(`⚠️ [WA-SEND:${sessionId}] First send attempt failed: ${sendError.message}. Reconnecting and retrying...`);
            try {
                const companyId = session?.companyId || dbSession?.companyId;
                if (companyId) {
                    await WhatsAppManager.reconnectSession(sessionId, companyId, 0, {
                        syncFullHistory: session?.syncFullHistory || false,
                        forceRestart: true
                    });
                }
            } catch (reconnectError) {
                console.error(`❌ [WA-SEND:${sessionId}] Reconnect during retry failed:`, reconnectError.message);
            }
            
            session = await waitForSendableBaileysSession(sessionId);
            if (!session) {
                throw sendError;
            }
            result = await session.sock.sendMessage(jid, messageOptions);
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
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const result = await MetaCloudProvider.sendMedia(sessionId, to, imageSource, 'image', { caption });

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'IMAGE',
                content: caption,
                mediaUrl: imageSource.url || imageSource.filePath,
                mediaType: 'image',
                mediaMimeType: imageSource.mimetype,
                isAIResponse: options.isAIResponse || false
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            image: imageSource.buffer || { url: imageSource.filePath || imageSource.url },
            caption,
            mimetype: imageSource.mimetype || 'image/jpeg'
        };

        if (options.quotedMessageId) {
            messageOptions.quoted = {
                key: { remoteJid: jid, id: options.quotedMessageId }
            };
        }

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'IMAGE',
            content: caption,
            mediaUrl: imageSource.url,
            mediaType: 'image',
            mediaMimeType: imageSource.mimetype,
            isAIResponse: options.isAIResponse || false
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const result = await MetaCloudProvider.sendMedia(sessionId, to, videoSource, 'video', { caption });

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

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            video: videoSource.buffer || { url: videoSource.filePath || videoSource.url },
            caption,
            mimetype: videoSource.mimetype || 'video/mp4'
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'VIDEO',
            content: caption,
            mediaUrl: videoSource.url,
            mediaType: 'video',
            mediaMimeType: videoSource.mimetype
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const result = await MetaCloudProvider.sendMedia(sessionId, to, audioSource, 'audio', {});

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

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            audio: audioSource.buffer || { url: audioSource.filePath || audioSource.url },
            mimetype: cleanMime,
            ptt: options.ptt || false // voice note
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'AUDIO',
            mediaUrl: audioSource.url,
            mediaType: 'audio',
            mediaMimeType: cleanMime
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const result = await MetaCloudProvider.sendMedia(sessionId, to, documentSource, 'document', {
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

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            document: documentSource.buffer || { url: documentSource.filePath || documentSource.url },
            mimetype: documentSource.mimetype || 'application/pdf',
            fileName: documentSource.fileName || 'document',
            caption: options.caption
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

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
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const result = await MetaCloudProvider.sendLocation(sessionId, to, {
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

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            location: {
                degreesLatitude: latitude,
                degreesLongitude: longitude,
                name: options.name,
                address: options.address
            }
        };

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'LOCATION',
            content: `${latitude},${longitude}`
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
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

            const result = await MetaCloudProvider.sendContacts(sessionId, to, contactsPayload);

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'CONTACT',
                content: contact.fullName
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

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

        const result = await session.sock.sendMessage(jid, messageOptions);

        const savedMessage = await saveOutgoingMessage(sessionId, jid, {
            messageId: result.key.id,
            type: 'CONTACT',
            content: contact.fullName
        }, { companyId: session.companyId });

        // تحديث جهة الاتصال
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const result = await MetaCloudProvider.sendReaction(sessionId, to, messageId, emoji);
            return result;
        }

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const result = await session.sock.sendMessage(jid, {
            react: {
                text: emoji,
                key: {
                    remoteJid: jid,
                    id: messageId
                }
            }
        });

        return result;
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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
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

            const result = await MetaCloudProvider.sendInteractive(sessionId, to, interactivePayload);

            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'BUTTONS',
                content: text,
                interactiveData: JSON.stringify({ buttons: limitedButtons, footer }),
                isAIResponse: options.isAIResponse || false
            }, { companyId: dbSession?.companyId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);
        const footer = options.footer || '';

        // التحقق من عدد الأزرار (حد أقصى 3)
        if (buttons.length > 3) {
            buttons = buttons.slice(0, 3);
        }

        console.log(`🚀 [WHATSAPP-BTN] Sending formatted text with ${buttons.length} options to ${jid}`);

        // رسالة نصية منسقة مع الخيارات - مضمونة 100% على كل إصدارات واتساب
        const btnText = buttons.map((btn, i) => `   ${['1️⃣', '2️⃣', '3️⃣'][i]} *${btn.text}*`).join('\n');
        const formattedText = `${text}\n\n┌─────────────────┐\n${btnText}\n└─────────────────┘\n\n_${footer}_`;

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

        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);

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

            const result = await MetaCloudProvider.sendInteractive(sessionId, to, interactivePayload);

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

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

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
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const fallbackText = `*${product.name}*\n\n${product.description || ''}\n\n💰 السعر: ${product.price || 'غير محدد'}`;

            const result = await MetaCloudProvider.sendText(sessionId, to, fallbackText, {});

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

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

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
        await WhatsAppManager.updateContact(sessionId, jid, { pushName: undefined }, session.sock, { isOutgoing: true });

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

        const enriched = messages.map(m => ({
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
        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(remoteJid);

        if (forEveryone) {
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
        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

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
        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            order: orderData
        };

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
        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            catalog: catalogData
        };

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
        const session = await getSendableBaileysSession(sessionId, dbSession);

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
        const session = await getSendableBaileysSession(sessionId, dbSession);

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
        const session = await getSendableBaileysSession(sessionId, dbSession);

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
        if (provider === 'META_CLOUD') {
            const jid = formatJid(to);
            const templateName = parameters?.name || templateId;
            const languageCode = parameters?.language || parameters?.languageCode || 'en';
            const components = parameters?.components || [];

            const result = await MetaCloudProvider.sendTemplate(sessionId, to, templateName, languageCode, components);

            let templateBody = options?.templateBody || '';
            if (!templateBody) {
                try {
                    const allTemplates = await MetaCloudProvider.listTemplates(sessionId);
                    const tmpl = Array.isArray(allTemplates) ? allTemplates.find(t => t.name === templateName) : null;
                    const bodyComp = tmpl?.components?.find(c => c.type === 'BODY' || c.type === 'body');
                    let bodyText = bodyComp?.text || '';
                    if (bodyText) {
                        const bodyParamObj = components.find(c => c.type === 'BODY' || c.type === 'body');
                        if (bodyParamObj?.parameters && Array.isArray(bodyParamObj.parameters)) {
                            bodyParamObj.parameters.forEach((param, idx) => {
                                const val = param.text || param.value || '';
                                bodyText = bodyText.replace(new RegExp(`\\\\{\\\\{\\\\s*${idx + 1}\\\\s*\\\\}\\\\}`, 'g'), val);
                            });
                        }
                        templateBody = bodyText;
                    }
                } catch (err) {
                    console.warn(`[WhatsAppMessageHandler] Could not auto-fetch body text for template ${templateName}:`, err.message);
                }
            }

            const displayContent = templateBody ? `${templateName}\n${templateBody}` : `Template: ${templateName}`;
            let meta = serializeOutgoingMetadata(options.metadata);
            const savedMessage = await saveOutgoingMessage(sessionId, jid, {
                messageId: result.messageId || `meta_${Date.now()}_${Math.random()}`,
                type: 'TEMPLATE',
                content: displayContent,
                interactiveData: JSON.stringify({ templateName, languageCode, components, templateBody }),
                isAIResponse: options.isAIResponse || false,
                metadata: meta
            }, { companyId: dbSession?.companyId, senderId: options.senderId });

            await ensureMetaContact(sessionId, jid, { isOutgoing: true });
            return savedMessage;
        }

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const jid = formatJid(to);

        const messageOptions = {
            template: {
                id: templateId,
                params: parameters
            }
        };

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
        console.error('❌ Error sending template message:', error);
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

        const session = await getSendableBaileysSession(sessionId, dbSession);

        const templates = await session.sock.getMessageTemplate();
        return templates;
    } catch (error) {
        console.error('❌ Error getting message templates:', error);
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
    // Poll & Order Features
    sendPoll,
    sendOrder,
    sendCatalog,
    getCatalog,
    getProducts,
    getCart,
    // Template Messages
    sendTemplateMessage,
    getMessageTemplate
};

