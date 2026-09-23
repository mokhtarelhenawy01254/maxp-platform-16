/**
 * 🚨 System Incident Alert Service
 * محرك الإنذار والإشعارات الفورية عند حدوث مشاكل في السيستم
 *
 * القنوات المدعومة:
 * 1. قاعدة البيانات (جدول notifications - مرئي لجميع مديري ومسؤولي الشركة)
 * 2. إشعار سوكيت فوري (socket.io company room + user rooms) مع صوت وتنبيه Toast
 * 3. إشعارات المتصفح الفورية (Web Push) عبر VAPID
 * 4. تنبيهات تيليجرام (Telegram Alerts) للإدارة التقنية وبوت التنبيهات
 *
 * الحالات المدعومة:
 * - ORDER_SYNC_STOPPAGE: توقف أو فشل استيراد الطلبات (WooCommerce, EasyOrders, Sheets, ركود الطلبات)
 * - AD_CAMPAIGN_STOPPED: توقف إعلان أو حملة إعلانية (ميزانية منتهية، مخالفة سياسات، توقف مفاجئ)
 * - AD_ACCOUNT_ISSUE: مشاكل الحساب الإعلاني (معطل، فواتير معلقة، توكن منتهي)
 * - AUTOMATION_ENDED: انتهاء جميع خطوات أتمتة المتابعة لعميل بنجاح
 * - AUTOMATION_STEP_FAILED: فشل أو تعثر إرسال إحدى خطوات الأتمتة
 * - WHATSAPP_DISCONNECTED: انقطاع رقم الواتساب وتوقف الرسائل التلقائية
 * - SYSTEM_ERROR: أخطاء تقنية حرجة بالسيرفر
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');
const { sendBrowserPushToCompany } = require('./browserPushService');
const telegramAlertService = require('./telegramAlertService');

// أنواع الحوادث المدعومة
const INCIDENT_TYPES = {
    ORDER_SYNC_STOPPAGE: 'ORDER_SYNC_STOPPAGE',
    AD_CAMPAIGN_STOPPED: 'AD_CAMPAIGN_STOPPED',
    AD_ACCOUNT_ISSUE: 'AD_ACCOUNT_ISSUE',
    AUTOMATION_ENDED: 'AUTOMATION_ENDED',
    AUTOMATION_STEP_FAILED: 'AUTOMATION_STEP_FAILED',
    WHATSAPP_DISCONNECTED: 'WHATSAPP_DISCONNECTED',
    SYSTEM_ERROR: 'SYSTEM_ERROR'
};

// درجات الخطورة
const SEVERITIES = {
    CRITICAL: 'CRITICAL', // أحمر - خطأ كارثي يتطلب تدخلاً فورياً
    WARNING: 'WARNING',   // برتقالي - تحذير يحتاج مراجعة
    INFO: 'INFO'          // أزرق / أخضر - معلومة اكتمال أو نجاح
};

// روابط التوجيه الافتراضية لكل نوع حادث
const DEFAULT_URLS = {
    [INCIDENT_TYPES.ORDER_SYNC_STOPPAGE]: '/orders',
    [INCIDENT_TYPES.AD_CAMPAIGN_STOPPED]: '/facebook-ads',
    [INCIDENT_TYPES.AD_ACCOUNT_ISSUE]: '/facebook-ads',
    [INCIDENT_TYPES.AUTOMATION_ENDED]: '/whatsapp-automation',
    [INCIDENT_TYPES.AUTOMATION_STEP_FAILED]: '/whatsapp-automation',
    [INCIDENT_TYPES.WHATSAPP_DISCONNECTED]: '/whatsapp',
    [INCIDENT_TYPES.SYSTEM_ERROR]: '/notification-settings'
};

// نوع الإشعار في نظام التفضيلات المقابل
const PREFERENCE_TYPE_MAPPING = {
    [INCIDENT_TYPES.ORDER_SYNC_STOPPAGE]: 'order_sync_stoppage',
    [INCIDENT_TYPES.AD_CAMPAIGN_STOPPED]: 'ad_campaign_stoppage',
    [INCIDENT_TYPES.AD_ACCOUNT_ISSUE]: 'ad_campaign_stoppage',
    [INCIDENT_TYPES.AUTOMATION_ENDED]: 'automation_lifecycle',
    [INCIDENT_TYPES.AUTOMATION_STEP_FAILED]: 'automation_lifecycle',
    [INCIDENT_TYPES.WHATSAPP_DISCONNECTED]: 'system_incident',
    [INCIDENT_TYPES.SYSTEM_ERROR]: 'system_incident'
};

class SystemIncidentAlertService {
    constructor() {
        // ذاكرة كاش لمنع التكرار (Cooldown Cache)
        // المفتاح: `${companyId}:${incidentType}:${entityId || 'general'}` -> timestamp
        this.cooldowns = new Map();
        this.defaultCooldownMinutes = 30; // 30 دقيقة افتراضياً لكل خطأ متطابق
    }

    /**
     * التحقق مما إذا كان الحادث في فترة التهدئة لمنع التكرار المزعج
     */
    isCoolingDown(companyId, incidentType, entityId, cooldownMinutes = this.defaultCooldownMinutes) {
        const key = `${companyId}:${incidentType}:${entityId || 'general'}`;
        const lastSent = this.cooldowns.get(key);
        if (!lastSent) return false;

        const elapsedMs = Date.now() - lastSent;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        return elapsedMs < cooldownMs;
    }

    /**
     * تسجيل وقت إرسال الحادث
     */
    markIncidentSent(companyId, incidentType, entityId) {
        const key = `${companyId}:${incidentType}:${entityId || 'general'}`;
        this.cooldowns.set(key, Date.now());

        // تنظيف الكاش القديم دورياً إذا زاد الحجم عن 2000 عنصر
        if (this.cooldowns.size > 2000) {
            const cutoff = Date.now() - (24 * 60 * 60 * 1000);
            for (const [k, timestamp] of this.cooldowns.entries()) {
                if (timestamp < cutoff) {
                    this.cooldowns.delete(k);
                }
            }
        }
    }

    /**
     * بناء نص تنبيه التليجرام
     */
    buildTelegramAlertText({ companyName, title, message, incidentType, severity, url, metadata }) {
        const severityIcon = severity === SEVERITIES.CRITICAL ? '🚨' : severity === SEVERITIES.WARNING ? '⚠️' : 'ℹ️';
        const lines = [
            `${severityIcon} *[SYSTEM ALERT - ${incidentType}]*`,
            `🏢 *الشركة:* ${companyName || 'منصة MaxP'}`,
            `📌 *العنوان:* ${title}`,
            `📝 *التفاصيل:* ${message}`,
            `⏱ *الوقت:* ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`
        ];

        if (url) {
            lines.push(`🔗 *الرابط:* https://maxp.online${url.startsWith('/') ? url : '/' + url}`);
        }

        if (metadata && typeof metadata === 'object') {
            const cleanMeta = Object.entries(metadata)
                .filter(([_, v]) => v !== undefined && v !== null && typeof v !== 'object')
                .map(([k, v]) => `• ${k}: ${v}`)
                .slice(0, 5)
                .join('\n');
            if (cleanMeta) {
                lines.push(`\n📊 *معلومات تقنية:*\n${cleanMeta}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * إطلاق حادث وإرسال إشعارات فورية عبر كافة القنوات
     *
     * @param {Object} params
     * @param {string} params.companyId - معرف الشركة المعنية
     * @param {string} params.incidentType - نوع الحادث من INCIDENT_TYPES
     * @param {string} params.title - عنوان الإشعار بالعربية
     * @param {string} params.message - نص الإشعار وتفاصيل المشكلة
     * @param {string} [params.severity=WARNING] - CRITICAL | WARNING | INFO
     * @param {string} [params.entityId] - معرف الكيان المسبب (رقم طلب، معرف حملة، رقم هاتف)
     * @param {string} [params.url] - رابط التوجيه عند النقر
     * @param {Object} [params.metadata] - بيانات إضافية (أسباب تقنية، أكواد الخطأ)
     * @param {number} [params.cooldownMinutes] - مدة منع التكرار بالدقائق (افتراضياً 30)
     * @param {boolean} [params.force=false] - تجاوز فترة التهدئة وإرسال فوري
     */
    async dispatchIncident({
        companyId,
        incidentType,
        title,
        message,
        severity = SEVERITIES.WARNING,
        entityId = null,
        url = null,
        metadata = null,
        cooldownMinutes = this.defaultCooldownMinutes,
        force = false
    }) {
        if (!companyId) {
            console.warn('⚠️ [SYSTEM-INCIDENT] companyId is required to dispatch incident');
            return { sent: false, reason: 'missing_company_id' };
        }

        // فحص الـ Cooldown
        if (!force && this.isCoolingDown(companyId, incidentType, entityId, cooldownMinutes)) {
            console.log(`⏳ [SYSTEM-INCIDENT] Suppressed by cooldown (${incidentType} on company ${companyId})`);
            return { sent: false, reason: 'in_cooldown' };
        }

        const prisma = getSharedPrismaClient();
        const targetUrl = url || DEFAULT_URLS[incidentType] || '/notification-settings';
        const prefTypeId = PREFERENCE_TYPE_MAPPING[incidentType] || 'system_incident';

        let companyName = '';
        try {
            const comp = await prisma.company.findUnique({
                where: { id: companyId },
                select: { name: true }
            });
            companyName = comp?.name || '';
        } catch {
            // fallback
        }

        const notificationData = {
            incidentType,
            severity,
            entityId,
            url: targetUrl,
            metadata: metadata || {},
            timestamp: new Date().toISOString()
        };

        const dispatchResults = {
            db: false,
            socket: false,
            browserPush: false,
            telegram: false
        };

        // 1. الحفظ في جدول notifications (لكل مسؤولي الشركة حيث userId = null)
        try {
            const created = await prisma.notification.create({
                data: {
                    companyId,
                    userId: null, // إشعار عام للشركة
                    type: prefTypeId,
                    title,
                    message,
                    data: notificationData,
                    isRead: false
                }
            });
            dispatchResults.db = true;
            notificationData.id = created.id;
        } catch (dbErr) {
            console.error('❌ [SYSTEM-INCIDENT] Failed to save in DB:', dbErr.message);
        }

        // 2. البث اللحظي عبر Socket.io (صوت + توست + تحديث الجرس)
        try {
            const io = socketService.getIO();
            if (io) {
                const socketPayload = {
                    id: notificationData.id || `inc_${Date.now()}`,
                    type: severity === SEVERITIES.CRITICAL ? 'error' : severity === SEVERITIES.WARNING ? 'warning' : 'info',
                    title,
                    message,
                    incidentType,
                    severity,
                    data: notificationData,
                    metadata: notificationData,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    requireAlarm: severity === SEVERITIES.CRITICAL
                };

                // إرسال لغرفة الشركة
                io.to(`company_${companyId}`).emit('notification:new', socketPayload);
                io.to(`company_${companyId}`).emit('system:incident', socketPayload);

                dispatchResults.socket = true;
            }
        } catch (sockErr) {
            console.warn('⚠️ [SYSTEM-INCIDENT] Socket emit failed:', sockErr.message);
        }

        // 3. إرسال Web Push إلى متصفحات مديري الشركة (يعمل حتى لو المتصفح في الخلفية)
        try {
            const pushResult = await sendBrowserPushToCompany({
                companyId,
                typeId: prefTypeId,
                title,
                body: message,
                compactBody: title,
                url: targetUrl,
                tag: `incident-${incidentType}-${companyId}`,
                requireInteraction: severity === SEVERITIES.CRITICAL,
                forceVisibleNotification: severity === SEVERITIES.CRITICAL,
                data: {
                    incidentType,
                    severity,
                    entityId,
                    url: targetUrl
                }
            });
            dispatchResults.browserPush = pushResult.sent > 0;
        } catch (pushErr) {
            console.warn('⚠️ [SYSTEM-INCIDENT] Browser push delivery failed:', pushErr.message);
        }

        // 4. إرسال إلى Telegram (للتنبيهات التقنية وإدارة المنصة)
        try {
            const telegramText = this.buildTelegramAlertText({
                companyName,
                title,
                message,
                incidentType,
                severity,
                url: targetUrl,
                metadata
            });
            const tgSent = await telegramAlertService.sendAlert(telegramText);
            dispatchResults.telegram = Boolean(tgSent);
        } catch (tgErr) {
            console.warn('⚠️ [SYSTEM-INCIDENT] Telegram alert failed:', tgErr.message);
        }

        // تسجيل إتمام الإرسال في الكاش
        this.markIncidentSent(companyId, incidentType, entityId);

        console.log(`🚨 [SYSTEM-INCIDENT] Incident dispatched (${incidentType} - ${severity}):`, {
            companyId,
            title,
            results: dispatchResults
        });

        return {
            sent: true,
            dispatchResults,
            notificationData
        };
    }
}

const singleton = new SystemIncidentAlertService();
singleton.INCIDENT_TYPES = INCIDENT_TYPES;
singleton.SEVERITIES = SEVERITIES;

module.exports = singleton;
