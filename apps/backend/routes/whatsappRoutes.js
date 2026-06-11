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
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// إعداد multer لرفع الملفات
// إعداد multer لرفع الملفات
const MIME_TYPE_MAP = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'video/quicktime': 'mov',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/amr': 'amr',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/whatsapp/temp'));
    },
    filename: (req, file, cb) => {
        const ext = MIME_TYPE_MAP[file.mimetype] || 'bin';
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
        if (MIME_TYPE_MAP[file.mimetype]) {
            cb(null, true);
        } else {
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
        const { phone, message, orderNumber, customerName, variables, eventType, buttons } = req.body;

        console.log(`🔗 [LOCAL-BRIDGE] Received request:`, {
            phone,
            orderNumber,
            customerName,
            eventType,
            hasMessage: !!message,
            hasVariables: !!variables,
            buttonsCount: buttons?.length || 0
        });

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone and message are required'
            });
        }

        // Get default session for the company
        const { getSharedPrismaClient } = require('../services/sharedDatabase');
        const prisma = getSharedPrismaClient();

        // Find the first available session
        const session = await prisma.whatsAppSession.findFirst({
            where: {
                status: 'CONNECTED'
            },
            orderBy: { lastConnectedAt: 'desc' }
        });

        if (!session) {
            console.log(`⚠️ [LOCAL-BRIDGE] No active WhatsApp session found`);
            return res.status(503).json({
                success: false,
                error: 'No active WhatsApp session available'
            });
        }

        // Send the message using WhatsAppMessageHandler (handle buttons if present)
        const { WhatsAppMessageHandler } = require('../services/whatsapp');
        const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
        let result;

        if (buttons && Array.isArray(buttons) && buttons.length > 0) {
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
router.get('/sessions/debug', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getDebugSessions);
router.post('/sessions', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.createSession);

// ✅ إنشاء جلسة باستخدام Pairing Code (بدون QR)
router.post('/sessions/pairing-code', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.createSessionWithPairingCode);

// جلب كل الجلسات
router.get('/sessions', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getSessions);

// جلب جلسة محددة
router.get('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getSession);

// تحديث جلسة
router.put('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.updateSession);

// حذف جلسة
router.delete('/sessions/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.deleteSession);

// بدء الاتصال بجلسة
router.post('/sessions/:id/connect', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.connectSession);

// قطع الاتصال بجلسة
router.post('/sessions/:id/disconnect', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.disconnectSession);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 المحادثات والرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// جلب المحادثات
router.get('/conversations', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getConversations);

// جلب رسائل محادثة
router.get('/conversations/:jid/messages', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getMessages);

// إرسال رسالة نصية
router.post('/messages/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendMessage);

// إرسال وسائط
router.post('/messages/send-media', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendMedia);

// رفع وإرسال ملف
router.post('/messages/upload-send', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم رفع ملف' });
        }

        const { sessionId, to, caption } = req.body;
        const { WhatsAppMediaHandler, WhatsAppMessageHandler } = require('../services/whatsapp');

        // رفع الملف
        const media = await WhatsAppMediaHandler.uploadMedia(
            req.file.path,
            req.file.mimetype,
            req.file.originalname
        );

        // تحديد نوع الوسائط
        let message;
        switch (media.type) {
            case 'image':
                message = await WhatsAppMessageHandler.sendImage(sessionId, to, media, caption);
                break;
            case 'video':
                message = await WhatsAppMessageHandler.sendVideo(sessionId, to, media, caption);
                break;
            case 'audio':
                message = await WhatsAppMessageHandler.sendAudio(sessionId, to, media);
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
        res.status(500).json({ error: 'حدث خطأ أثناء رفع وإرسال الملف' });
    }
});

// تحديد الرسائل كمقروءة
router.post('/messages/read', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.markAsRead);

// إرسال رسالة بأزرار تفاعلية
router.post('/messages/send-buttons', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendButtons);

// إرسال رسالة بقائمة
router.post('/messages/send-list', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendList);

// إرسال منتج
router.post('/messages/send-product', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendProduct);

// إرسال تفاعل (Reaction)
router.post('/messages/send-reaction', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendReaction);

// ═══════════════════════════════════════════════════════════════════════════════
// 📸 الحالات (Status Updates)
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الحالات
router.get('/:sessionId/statuses', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getStatuses);

// نشر حالة جديدة
router.post('/:sessionId/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), upload.single('media'), whatsappController.postStatus);

// تحديد الحالة كمشاهدة
router.put('/:sessionId/status/:statusId/view', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.markStatusViewed);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 جهات الاتصال
// ═══════════════════════════════════════════════════════════════════════════════

// تحديث جهة اتصال
router.put('/contacts/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.updateContact);

// ربط جهة اتصال بعميل
router.post('/contacts/:id/link-customer', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.linkCustomer);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 الردود السريعة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الردود السريعة
router.get('/quick-replies', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getQuickReplies);

// إنشاء رد سريع
router.post('/quick-replies', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.createQuickReply);

// تحديث رد سريع
router.put('/quick-replies/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.updateQuickReply);

// حذف رد سريع
router.delete('/quick-replies/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.deleteQuickReply);

// إرسال رد سريع
router.post('/quick-replies/:id/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendQuickReply);

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ الإعدادات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الإعدادات
router.get('/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.getSettings);

// تحديث الإعدادات
router.put('/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.updateSettings);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 المجموعات
// ═══════════════════════════════════════════════════════════════════════════════

// إنشاء مجموعة
router.post('/groups', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.createGroup);

// جلب بيانات مجموعة
router.get('/groups/:jid', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getGroupMetadata);

// تحديث اسم المجموعة
router.put('/groups/:jid/subject', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.updateGroupSubject);

// تحديث وصف المجموعة
router.put('/groups/:jid/description', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.updateGroupDescription);

// تحديث إعدادات المجموعة
router.put('/groups/:jid/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.updateGroupSettings);

// إضافة/إزالة مشاركين
router.put('/groups/:jid/participants', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.updateGroupParticipants);

// الخروج من المجموعة
router.post('/groups/:jid/leave', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.leaveGroup);

// جلب رابط الدعوة
router.get('/groups/:jid/invite-code', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getGroupInviteCode);

// إلغاء رابط الدعوة
router.post('/groups/:jid/revoke-invite', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.revokeGroupInviteCode);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الإحصائيات
// ═══════════════════════════════════════════════════════════════════════════════

// جلب الإحصائيات
router.get('/stats', verifyToken.authenticateToken, checkAppAccess('whatsapp-analytics'), whatsappController.getStats);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 إدارة الرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// تعديل رسالة
router.post('/messages/edit', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.editMessage);

// حذف رسالة
router.post('/messages/delete', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.deleteMessage);

// إعادة توجيه رسالة
router.post('/messages/forward', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.forwardMessage);

// ═══════════════════════════════════════════════════════════════════════════════
// 💬 إدارة المحادثات
// ═══════════════════════════════════════════════════════════════════════════════

// أرشفة محادثة
router.post('/chats/archive', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.archiveChat);

// تثبيت محادثة
router.post('/chats/pin', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.pinChat);

// كتم محادثة
router.post('/chats/mute', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.muteChat);

// تحديد كغير مقروء
router.post('/chats/unread', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.markChatUnread);

// حذف محادثة
router.post('/chats/delete', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.deleteChat);

// مسح محتوى المحادثة
router.post('/chats/clear', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.clearChat);

// Migration endpoint
router.post('/migrate-auth', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.migrateAuthToDatabase);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية والحظر
// ═══════════════════════════════════════════════════════════════════════════════

// حظر جهة اتصال
router.post('/contacts/block', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.blockContact);

// إلغاء حظر جهة اتصال
router.post('/contacts/unblock', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.unblockContact);

// التحقق من الرقم
router.post('/check-number', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.checkNumber);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 الملف الشخصي
// ═══════════════════════════════════════════════════════════════════════════════

// مزامنة الملف الشخصي
router.post('/profile/sync', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.syncProfile);

// جلب الملف الشخصي
router.get('/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.getProfile);

// تحديث الملف الشخصي
router.post('/profile/update', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), upload.single('picture'), whatsappController.updateProfile);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 Business Profile
// ═══════════════════════════════════════════════════════════════════════════════

// جلب ملف الأعمال
router.get('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.getBusinessProfile);

// تعيين ملف الأعمال
router.post('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.setBusinessProfile);

// تحديث ملف الأعمال
router.put('/business/profile', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.updateBusinessProfile);

// جلب ساعات العمل
router.get('/business/hours', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.getBusinessHours);

// تعيين ساعات العمل
router.post('/business/hours', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.setBusinessHours);

// ═══════════════════════════════════════════════════════════════════════════════
// 📢 البث (Broadcast)
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال بث جماعي
router.post('/broadcast/send', verifyToken.authenticateToken, checkAppAccess('whatsapp-templates'), whatsappController.sendBroadcast);

// إنشاء قائمة بث
router.post('/broadcast/lists', verifyToken.authenticateToken, checkAppAccess('whatsapp-templates'), whatsappController.createBroadcastList);

// جلب قوائم البث
router.get('/broadcast/lists', verifyToken.authenticateToken, checkAppAccess('whatsapp-templates'), whatsappController.getBroadcastLists);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏷️ العلامات (Labels)
// ═══════════════════════════════════════════════════════════════════════════════

// إضافة علامة للمحادثة
router.post('/labels/chat', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.labelChat);

// جلب العلامات
router.get('/labels', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getLabels);

// إنشاء علامة جديدة
router.post('/labels', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.createLabel);

// حذف علامة
router.delete('/labels/:id', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.deleteLabel);

// ═══════════════════════════════════════════════════════════════════════════════
// ⭐ الرسائل المميزة (Starred Messages)
// ═══════════════════════════════════════════════════════════════════════════════

// تمييز رسالة
router.post('/messages/star', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.starMessage);

// إلغاء تمييز رسالة
router.post('/messages/unstar', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.unstarMessage);

// جلب الرسائل المميزة
router.get('/messages/starred', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getStarredMessages);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 الخصوصية المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب قائمة المحظورين
router.get('/privacy/blocklist', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.fetchBlocklist);

// جلب إعدادات الخصوصية
router.get('/privacy/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.fetchPrivacySettings);

// تعيين إعدادات الخصوصية
router.post('/privacy/settings', verifyToken.authenticateToken, checkAppAccess('whatsapp-settings'), whatsappController.setPrivacy);

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 ميزات المجموعات المتقدمة
// ═══════════════════════════════════════════════════════════════════════════════

// جلب جميع المجموعات
router.get('/groups/all', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.groupFetchAllParticipating);

// تفعيل/تعطيل الرسائل المؤقتة
router.post('/groups/:jid/ephemeral', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.groupToggleEphemeral);

// تحديث صورة المجموعة
router.post('/groups/:jid/picture', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.groupUpdatePicture);

// قبول دعوة للمجموعة
router.post('/groups/invite/accept', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.groupInviteAccept);

// رفض دعوة للمجموعة
router.post('/groups/invite/reject', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.groupInviteReject);

// معلومات عن رابط الدعوة
router.get('/groups/invite/info', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.groupInviteInfo);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الحالة (Status)
// ═══════════════════════════════════════════════════════════════════════════════

// جلب حالة مستخدم
router.get('/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getStatus);

// تعيين حالة المستخدم
router.post('/status', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.setStatus);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 معلومات الرابط
// ═══════════════════════════════════════════════════════════════════════════════

// الحصول على معلومات رابط
router.get('/url/info', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getUrlInfo);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 الاستطلاعات والطلبات
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال استطلاع
router.post('/messages/send-poll', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendPoll);

// إرسال طلب
router.post('/messages/send-order', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendOrder);

// إرسال كتالوج
router.post('/messages/send-catalog', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendCatalog);

// جلب الكتالوج
router.get('/catalog', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getCatalog);

// جلب المنتجات
router.get('/products', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getProducts);

// جلب السلة
router.get('/cart', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.getCart);

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 قوالب الرسائل
// ═══════════════════════════════════════════════════════════════════════════════

// إرسال رسالة قالب
router.post('/messages/send-template', verifyToken.authenticateToken, checkAppAccess('whatsapp-inbox'), whatsappController.sendTemplateMessage);

// جلب قوالب الرسائل
router.get('/templates', verifyToken.authenticateToken, checkAppAccess('whatsapp-templates'), whatsappController.getMessageTemplate);

module.exports = router;
