/**
 * 📱 WhatsApp Routes
 * مسارات API لنظام WhatsApp
 */

const express = require('express');
const router = express.Router();
const whatsappController = require('../controller/whatsappController');
const whatsappNotificationRoutes = require('./whatsappNotificationRoutes');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// 🚦 Rate limiting: منع السبام على نقاط إرسال الرسائل والبث
const messageSendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => req.user?.companyId
        ? `wa_send_${req.user.companyId}`
        : `wa_send_${ipKeyGenerator(req, res)}`,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'تجاوزت الحد المسموح لإرسال الرسائل. حاول بعد دقيقة.' } }
});

const broadcastLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => req.user?.companyId
        ? `wa_broadcast_${req.user.companyId}`
        : `wa_broadcast_${ipKeyGenerator(req, res)}`,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'تجاوزت الحد المسموح للبث الجماعي. حاول بعد دقيقة.' } }
});

// إعداد multer لرفع الملفات
// إعداد multer لرفع الملفات
const MIME_TYPE_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'video/quicktime': 'mov',
    'video/x-matroska': 'mkv',
    'video/avi': 'avi',
    'video/x-msvideo': 'avi',
    'video/msvideo': 'avi',
    'video/x-ms-wmv': 'wmv',
    'video/x-flv': 'flv',
    'video/mpeg': 'mpeg',
    'video/x-m4v': 'm4v',
    'video/ogg': 'ogv',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/amr': 'amr',
    'audio/webm': 'webm',
    'video/webm': 'webm',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-pn-wav': 'wav',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/x-aac': 'aac',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/rar': 'rar',
    'application/x-rar-compressed': 'rar',
    'application/octet-stream': 'bin',
    'text/plain': 'txt'
};

const WhatsAppMediaHandler = require('../services/whatsapp/WhatsAppMediaHandler');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(WhatsAppMediaHandler.MEDIA_DIR, 'temp'));
    },
    filename: (req, file, cb) => {
        const cleanMimetype = file.mimetype ? file.mimetype.split(';')[0].trim() : '';
        let ext = MIME_TYPE_MAP[cleanMimetype];
        if (!ext && cleanMimetype.startsWith('video/')) {
            ext = 'mp4';
        }
        ext = ext || 'bin';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}.${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    },
    fileFilter: (req, file, cb) => {
        const cleanMimetype = file.mimetype ? file.mimetype.split(';')[0].trim() : '';
        if (MIME_TYPE_MAP[cleanMimetype] || cleanMimetype.startsWith('video/') || cleanMimetype.startsWith('image/') || cleanMimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            console.error(`❌ [WhatsApp Upload] File rejected by Multer fileFilter: name="${file.originalname}", mimetype="${file.mimetype}", size="${file.size || 'unknown'}"`);
            cb(new Error('نوع الملف غير مدعوم'), false);
        }
    }
});

// Logging middleware
router.use((req, res, next) => {
    console.log(`📱 WhatsApp Router: ${req.method} ${req.path}`);
    next();
});

// Test route
router.get('/test', (req, res) => res.json({ message: 'WhatsApp router is working' }));

// Backward-compatible alias for notification endpoints used by the frontend.
router.use('/notifications', whatsappNotificationRoutes);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 Local Bridge Endpoint (SMS Parity) - Secret Protected
// ═══════════════════════════════════════════════════════════════════════════════

const hasValidLocalBridgeSecret = (provided, expected) => {
    try {
        const providedBuffer = Buffer.from(String(provided || ''));
        const expectedBuffer = Buffer.from(String(expected || ''));

        if (!providedBuffer.length || providedBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    } catch (_) {
        return false;
    }
};

const requireLocalBridgeSecret = (req, res, next) => {
    // 🤖 Allow AI service authenticated calls
    const authHeader = req.headers.authorization;
    const bearerToken = (authHeader && authHeader.split(' ')[1]) || req.query?.token;
    const serviceToken = process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
    if (serviceToken && bearerToken && bearerToken === serviceToken) {
        return next();
    }

    const expectedSecret = String(process.env.LOCAL_WHATSAPP_BRIDGE_SECRET || '').trim();
    if (!expectedSecret) {
        return res.status(503).json({
            success: false,
            error: 'Local WhatsApp bridge is not configured'
        });
    }

    const providedSecret = req.headers['x-local-bridge-secret'] || req.headers['x-whatsapp-bridge-secret'];
    if (!hasValidLocalBridgeSecret(providedSecret, expectedSecret)) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized bridge request'
        });
    }

    return next();
};

router.post('/whatsapp', requireLocalBridgeSecret, async (req, res) => {
    try {
        const { phone, message, mediaUrl, orderNumber, customerName, variables, eventType, buttons, companyId } = req.body;

        console.log(`🔗 [LOCAL-BRIDGE] Received request:`, {
            phone,
            companyId,
            orderNumber,
            customerName,
            eventType,
            hasMessage: !!message,
            hasVariables: !!variables,
            buttonsCount: buttons?.length || 0,
            hasMedia: !!mediaUrl,
        });

        if (!phone || (!message && !mediaUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Phone and message (or mediaUrl) are required'
            });
        }

        if (!companyId || typeof companyId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'companyId is required to scope the send to a specific company'
            });
        }

        // Get default session for the company
        const { getSharedPrismaClient } = require('../services/sharedDatabase');
        const prisma = getSharedPrismaClient();

        // Find the first available session scoped to the requested company only
        const session = await prisma.whatsAppSession.findFirst({
            where: {
                companyId,
                status: 'CONNECTED'
            },
            orderBy: { lastConnectedAt: 'desc' }
        });

        if (!session) {
            console.log(`⚠️ [LOCAL-BRIDGE] No active WhatsApp session found for company ${companyId}`);
            return res.status(503).json({
                success: false,
                error: 'No active WhatsApp session available for the requested company'
            });
        }

        // Send the message using WhatsAppMessageHandler
        const { WhatsAppMessageHandler } = require('../services/whatsapp');
        const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
        let result;

        if (mediaUrl) {
            console.log(`🔗 [LOCAL-BRIDGE] Sending image to ${jid}`);
            result = await WhatsAppMessageHandler.sendImage(session.id, jid, { url: mediaUrl }, message || '', { isAIResponse: true });
        } else if (buttons && Array.isArray(buttons) && buttons.length > 0) {
            console.log(`🔗 [LOCAL-BRIDGE] Sending buttons message to ${jid}`);
            result = await WhatsAppMessageHandler.sendButtons(session.id, jid, message, buttons);
        } else {
            console.log(`🔗 [LOCAL-BRIDGE] Sending text message to ${jid}`);
            result = await WhatsAppMessageHandler.sendText(session.id, jid, message);
        }

        console.log(`✅ [LOCAL-BRIDGE] Message sent successfully:`, {
            sessionId: session.id,
            phone,
            orderNumber,
            messageId: result?.key?.id
        });

        return res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                sessionId: session.id,
                phone,
                orderNumber,
                messageId: result?.key?.id
            }
        });
    } catch (error) {
        console.error(`❌ [LOCAL-BRIDGE] Error:`, error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// �📱 إدارة الجلسات
// ═══════════════════════════════════════════════════════════════════════════════

// إنشاء جلسة جديدة
router.get('/sessions/debug', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getDebugSessions);
router.post('/sessions', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.createSession);

// ✅ إنشاء جلسة باستخدام Pairing Code (بدون QR)
router.post('/sessions/pairing-code', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.createSessionWithPairingCode);

// جلب كل الجلسات (للقراءة فقط — أي شخص عنده صلاحية عرض المحادثات)
router.get('/sessions', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getSessions);

// جلب جلسة محددة (للقراءة فقط)
router.get('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getSession);

// تحديث جلسة
router.put('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.updateSession);

// 🛡️ درع المكالمات (Call Shield)
router.get('/sessions/:id/call-shield', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getCallShield);
router.put('/sessions/:id/call-shield', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.updateCallShield);

// حذف جلسة
router.delete('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.deleteSession);

// بدء الاتصال بجلسة
router.post('/sessions/:id/connect', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.connectSession);

// طلب مزامنة الرسائل التاريخية يدوياً
router.post('/sessions/:id/history-sync', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.requestHistorySync);

// قطع الاتصال بجلسة
router.post('/sessions/:id/disconnect', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.disconnectSession);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// جلب المحادثات
router.get('/conversations', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getConversations);

// جلب رسائل محادثة
router.get('/conversations/:jid/messages', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getMessages);

// تشغيل جلب صور البروفايل المفقودة في الخلفية
router.post('/profile-pics/refresh', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.refreshProfilePics);

// إرسال رسالة نصية
router.post('/messages/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendMessage);

// تصحيح رد الوكيل الآلي
router.post('/messages/:whatsappMessageId/correct', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.correctAIMessage);

// إرسال وسائط
router.post('/messages/send-media', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendMedia);

// إرسال رسالة بأزرار تفاعلية حديثة (Native Flow Interactive Messages)
router.post('/messages/send-interactive', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendInteractive);

// تثبيت وإلغاء تثبيت الرسائل (Pin / Unpin Message)
router.post('/messages/:messageId/pin', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), whatsappController.pinMessage);
router.delete('/messages/:messageId/pin', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), whatsappController.unpinMessage);

// جلب الرسالة المثبتة الحالية لمحادثة
router.get('/conversations/:jid/pinned', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getPinnedMessage);

// رفع وإرسال ملف
router.post('/messages/upload-send', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), upload.single('file'), messageSendLimiter, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم رفع ملف' });
        }

        let { sessionId, to, caption, ptt } = req.body;
        if (!sessionId || !to) {
            return res.status(400).json({ error: 'sessionId و to مطلوبين' });
        }

        const { getSharedPrismaClient } = require('../services/sharedDatabase');
        if (sessionId === 'all') {
            const prisma = getSharedPrismaClient();

            // 1. Try Baileys sessions connected in-memory first
            const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');
            const companySessions = WhatsAppManager.getCompanySessions(req.companyId);
            const connectedMemorySessions = companySessions.filter(s => s.status === 'connected');
            if (connectedMemorySessions.length > 0) {
                sessionId = connectedMemorySessions[0].sessionId;
            } else {
                // 2. Fallback: find any CONNECTED session in DB (for META_CLOUD or recent Baileys)
                const firstSession = await prisma.whatsAppSession.findFirst({
                    where: { companyId: req.companyId, status: 'CONNECTED' },
                    orderBy: { lastConnectedAt: 'desc' }
                });
                if (!firstSession) {
                    return res.status(400).json({ error: 'لا توجد جلسة متصلة' });
                }
                // If Baileys session, verify it's actually in memory
                if (firstSession.provider !== 'META_CLOUD') {
                    const memSession = WhatsAppManager.getSession(firstSession.id);
                    if (!memSession || memSession.status !== 'connected') {
                        return res.status(400).json({ error: 'الجلسة غير متصلة حالياً، يرجى إعادة الاتصال' });
                    }
                }
                sessionId = firstSession.id;
            }
        }

        const { WhatsAppMediaHandler, WhatsAppMessageHandler } = require('../services/whatsapp');

        // رفع الملف
        const media = await WhatsAppMediaHandler.uploadMedia(
            req.file.path,
            req.file.mimetype,
            req.file.originalname
        );

        // حذف الملف المؤقت بعد القراءة
        const fsSync = require('fs');
        if (req.file.path && fsSync.existsSync(req.file.path)) {
            fsSync.unlinkSync(req.file.path);
        }

        // تحديد نوع الوسائط
        let mediaType = media.type;
        const isVoiceNote = ptt === 'true' || req.file.originalname === 'voice_note.webm';
        if (isVoiceNote) {
            mediaType = 'audio';
        }

        let message;
        switch (mediaType) {
            case 'image':
                message = await WhatsAppMessageHandler.sendImage(sessionId, to, media, caption);
                break;
            case 'video':
                message = await WhatsAppMessageHandler.sendVideo(sessionId, to, media, caption);
                break;
            case 'audio':
                message = await WhatsAppMessageHandler.sendAudio(sessionId, to, media, { ptt: isVoiceNote });
                break;
            default:
                message = await WhatsAppMessageHandler.sendDocument(sessionId, to, {
                    ...media,
                    fileName: req.file.originalname
                }, { caption });
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('❌ Error uploading and sending:', error);
        res.status(500).json({
            error: 'حدث خطأ أثناء رفع وإرسال الملف',
            details: error.message || 'Unknown error'
        });
    }
});

// تحديد الرسائل كمقروءة
router.post('/messages/read', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.markAsRead);

// إرسال رسالة بأزرار تفاعلية
router.post('/messages/send-buttons', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendButtons);

// إرسال رسالة بقائمة
router.post('/messages/send-list', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendList);

// إرسال منتج
router.post('/messages/send-product', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendProduct);

// إرسال تفاعل (Reaction)
router.post('/messages/send-reaction', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendReaction);

// ═══════════════════════════════════════════════════════════════════════════════
// 📸 الحالات (Status Updates)
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الحالات
router.get('/:sessionId/statuses', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getStatuses);

// نشر حالة جديدة
router.post('/:sessionId/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), upload.single('media'), whatsappController.postStatus);

// تحديد الحالة كمشاهدة
router.put('/:sessionId/status/:statusId/view', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.markStatusViewed);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 جهات الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

// تحديث جهة اتصال
router.put('/contacts/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.contacts.manage'), whatsappController.updateContact);

// ربط جهة اتصال بعميل
router.post('/contacts/:id/link-customer', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.contacts.manage'), whatsappController.linkCustomer);

// تغيير الجلسة المرتبطة بجهة اتصال
router.put('/contacts/:id/reassign-session', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.contacts.manage'), whatsappController.reassignContactSession);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الردود السريعة (للقراءة فقط)
router.get('/quick-replies', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getQuickReplies);

// إنشاء رد سريع
router.post('/quick-replies', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.quick-replies.manage'), whatsappController.createQuickReply);

// تحديث رد سريع
router.put('/quick-replies/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.quick-replies.manage'), whatsappController.updateQuickReply);

// حذف رد سريع
router.delete('/quick-replies/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.quick-replies.manage'), whatsappController.deleteQuickReply);

// إرسال رد سريع
router.post('/quick-replies/:id/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), whatsappController.sendQuickReply);

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الإعدادات (للقراءة فقط)
router.get('/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getSettings);

// تحديث الإعدادات
router.put('/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.updateSettings);

// جلب إعدادات سياسة نافذة 24 ساعة والـ SMS
router.get('/settings/window-policy', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getWindowPolicy);

// تحديث إعدادات سياسة نافذة 24 ساعة والـ SMS
router.put('/settings/window-policy', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.updateWindowPolicy);

// اختبار إرسال رسالة SMS تجريبية
router.post('/settings/test-sms', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.testSendSMS);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 المجموعات
// ═══════════════════════════════════════════════════════════════════════════════

// إنشاء مجموعة
router.post('/groups', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.createGroup);

// جلب جميع المجموعات (يجب أن يسبق /groups/:jid لتجنب shadowing)
router.get('/groups/all', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.groupFetchAllParticipating);

// جلب بيانات مجموعة
router.get('/groups/:jid', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.getGroupMetadata);

// تحديث اسم المجموعة
router.put('/groups/:jid/subject', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.updateGroupSubject);

// تحديث وصف المجموعة
router.put('/groups/:jid/description', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.updateGroupDescription);

// تحديث إعدادات المجموعة
router.put('/groups/:jid/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.updateGroupSettings);

// إضافة/إزالة مشاركين
router.put('/groups/:jid/participants', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.updateGroupParticipants);

// الخروج من المجموعة
router.post('/groups/:jid/leave', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.leaveGroup);

// جلب رابط الدعوة
router.get('/groups/:jid/invite-code', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.getGroupInviteCode);

// إلغاء رابط الدعوة
router.post('/groups/:jid/revoke-invite', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.revokeGroupInviteCode);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الإحصائيات
router.get('/stats', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.analytics.view'), whatsappController.getStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 إدارة الرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// تعديل رسالة
router.post('/messages/edit', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), whatsappController.editMessage);

// حذف رسالة
router.post('/messages/delete', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), whatsappController.deleteMessage);

// إعادة توجيه رسالة
router.post('/messages/forward', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.forwardMessage);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 إدارة المحادثات
// ═══════════════════════════════════════════════════════════════════════════════

// أرشفة محادثة
router.post('/chats/archive', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.archiveChat);

// تثبيت محادثة
router.post('/chats/pin', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.pinChat);

// كتم محادثة
router.post('/chats/mute', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.muteChat);

// تحديد كغير مقروء
router.post('/chats/unread', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.markChatUnread);

// حذف محادثة
router.post('/chats/delete', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.deleteChat);

// حذف محادثات متعددة
router.post('/chats/delete-bulk', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.deleteChatsBulk);

// حذف كل المحادثات
router.post('/chats/delete-all', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.deleteAllChats);

// مسح محتوى المحادثة
router.post('/chats/clear', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.clearChat);

// Migration endpoint
router.post('/migrate-auth', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), whatsappController.migrateAuthToDatabase);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية والحظر
// ═══════════════════════════════════════════════════════════════════════════════

// حظر جهة اتصال
router.post('/contacts/block', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.contacts.manage'), whatsappController.blockContact);

// إلغاء حظر جهة اتصال
router.post('/contacts/unblock', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.contacts.manage'), whatsappController.unblockContact);

// التحقق من الرقم
router.post('/check-number', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.contacts.manage'), whatsappController.checkNumber);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الملف الشخصي
// ═══════════════════════════════════════════════════════════════════════════════

// مزامنة الملف الشخصي
router.post('/profile/sync', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.syncProfile);

// جلب الملف الشخصي
router.get('/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.getProfile);

// تحديث الملف الشخصي
router.post('/profile/update', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), upload.single('picture'), whatsappController.updateProfile);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 Business Profile
// ═══════════════════════════════════════════════════════════════════════════════

// جلب ملف الأعمال
router.get('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.getBusinessProfile);

// تعيين ملف الأعمال
router.post('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.setBusinessProfile);

// تحديث ملف الأعمال
router.put('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.updateBusinessProfile);

// جلب ساعات العمل
router.get('/business/hours', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.getBusinessHours);

// تعيين ساعات العمل
router.post('/business/hours', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.setBusinessHours);

// ═══════════════════════════════════════════════════════════════════════════════
// 📢 البث (Broadcast)
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال بث جماعي
router.post('/broadcast/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.broadcast'), broadcastLimiter, whatsappController.sendBroadcast);

// إنشاء قائمة بث
router.post('/broadcast/lists', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.broadcast'), whatsappController.createBroadcastList);

// جلب قوائم البث
router.get('/broadcast/lists', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.broadcast'), whatsappController.getBroadcastLists);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ العلامات (Labels)
// ═══════════════════════════════════════════════════════════════════════════════

// إضافة علامة للمحادثة
router.post('/labels/chat', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.labels.manage'), whatsappController.labelChat);

// جلب العلامات (للقراءة فقط)
router.get('/labels', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getLabels);

// جلب عملاء تصنيف معين (للقراءة فقط)
router.get('/labels/:labelId/contacts', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getLabelContacts);

// مزامنة يدوية للتصنيفات
router.post('/labels/sync', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.labels.manage'), whatsappController.syncLabels);

// استعادة التصنيفات الافتراضية
router.post('/labels/restore', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.labels.manage'), whatsappController.restoreDefaultLabels);

// إنشاء علامة جديدة
router.post('/labels', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.labels.manage'), whatsappController.createLabel);

// حذف علامة
router.delete('/labels/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.labels.manage'), whatsappController.deleteLabel);

// إضافة علامة لمحادثة (route متوافق مع LabelsDialog)
router.post('/labels/:labelId/chat/:jid', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.labels.manage'), whatsappController.addLabelToChat);

// إزالة علامة من محادثة
router.delete('/labels/:labelId/chat/:jid', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.labels.manage'), whatsappController.removeLabelFromChat);

// ═══════════════════════════════════════════════════════════════════════════════
// ⭐ الرسائل المميزة (Starred Messages)
// ═══════════════════════════════════════════════════════════════════════════════

// تمييز رسالة
router.post('/messages/star', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.starMessage);

// إلغاء تمييز رسالة
router.post('/messages/unstar', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.chats.manage'), whatsappController.unstarMessage);

// جلب الرسائل المميزة
router.get('/messages/starred', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getStarredMessages);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب قائمة المحظورين
router.get('/privacy/blocklist', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.fetchBlocklist);

// جلب إعدادات الخصوصية
router.get('/privacy/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.fetchPrivacySettings);

// تعيين إعدادات الخصوصية
router.post('/privacy/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.settings'), whatsappController.setPrivacy);

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 ميزات المجموعات المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════

// تفعيل/تعطيل الرسائل المؤقتة
router.post('/groups/:jid/ephemeral', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.groupToggleEphemeral);

// تحديث صورة المجموعة
router.post('/groups/:jid/picture', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), upload.single('image'), whatsappController.groupUpdatePicture);

// قبول دعوة للمجموعة
router.post('/groups/invite/accept', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.groupInviteAccept);

// رفض دعوة للمجموعة
router.post('/groups/invite/reject', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.groupInviteReject);

// معلومات عن رابط الدعوة
router.get('/groups/invite/info', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.groups.manage'), whatsappController.groupInviteInfo);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الحالة (Status)
// ═══════════════════════════════════════════════════════════════════════════════

// جلب حالة مستخدم
router.get('/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getStatus);

// تعيين حالة المستخدم
router.post('/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), whatsappController.setStatus);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 معلومات الرابط
// ═══════════════════════════════════════════════════════════════════════════════

// الحصول على معلومات رابط
router.get('/url/info', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), whatsappController.getUrlInfo);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الاستطلاعات والطلبات
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال استطلاع
router.post('/messages/send-poll', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendPoll);

// إرسال طلب
router.post('/messages/send-order', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendOrder);

// إرسال كتالوج
router.post('/messages/send-catalog', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.reply'), messageSendLimiter, whatsappController.sendCatalog);

// جلب الكتالوج
router.get('/catalog', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getCatalog);

// جلب المنتجات
router.get('/products', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getProducts);

// جلب السلة
router.get('/cart', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('inbox.view'), whatsappController.getCart);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 Facebook Embedded Sign-Up
// ═══════════════════════════════════════════════════════════════════════════════

// جلب إعدادات Facebook (App ID, Redirect URI)
router.get('/facebook/config', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.getFacebookConfig);

// استلام كود OAuth من Facebook وإنشاء جلسة واتساب
router.post('/facebook/connect', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.facebookConnect);

// استلام بيانات Embedded Sign-Up من Facebook SDK وإنشاء جلسة واتساب (WABA + رقم)
router.post('/facebook/connect-embedded', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.sessions'), whatsappController.facebookEmbeddedConnect);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 قوالب الرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال رسالة قالب
router.post('/messages/send-template', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.templates'), messageSendLimiter, whatsappController.sendTemplateMessage);

// جلب قوالب الرسائل
router.get('/templates', verifyToken.authenticateToken, checkAppAccess('whatsapp-business'), requireDbPermission('whatsapp.templates'), whatsappController.getMessageTemplate);

module.exports = router;
