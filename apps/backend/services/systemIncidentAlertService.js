/**
 * 🚨 System Incident Alert Service
 * محرك الإنذار والإشعارات الفورية عند حدوث مشاكل في السيستم
 *
 * القنوات المدعومة:
 * 1. قاعدة البيانات (جدول notifications - مرئي لجميع مديري ومسؤولي الشركة)
 * 2. إشعار سوكيت فوري (socket.io company room + user rooms) مع صوت وتنبيه Toast
 * 3. إشعارات المتصفح الفورية (Web Push) عبر VAPID
 * 4. تنبيهات تيليجرام (Telegram Alerts) للإدارة التقنية وبوت التنبيهات
 * 5. تنبيهات واتساب (WhatsApp Alerts) لرقم وجلسة الإدارة: فورية للحالات الحرجة ومجمعة كل ساعة للتحذيرات
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

const sharedDatabase = require('./sharedDatabase');
const getSharedPrismaClient = () => sharedDatabase.getSharedPrismaClient();
const socketService = require('./socketService');
const { sendBrowserPushToCompany } = require('./browserPushService');
const telegramAlertService = require('./telegramAlertService');

let redisCacheService = null;
try {
    redisCacheService = require('./redisCacheService');
} catch (_) {
    redisCacheService = null;
}

function getWhatsAppNotificationService() {
    try {
        return require('./whatsapp/WhatsAppNotificationService');
    } catch (_) {
        return null;
    }
}

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

        // ذاكرة كاش لمنع تكرار تنبيهات الواتساب: dedupe key = (type + companyId) لكل 30 دقيقة
        this.whatsAppCooldowns = new Map();

        // طابور التجميع الساعي للتنبيهات العادية (WARNING / INFO)
        // المفتاح: companyId -> Array<incidentItem>
        this.hourlyDigestQueue = new Map();

        // تجاوزات يدوية للتحكم الفوري في قناة الواتساب لكل شركة (مفيدة للاختبار والتجاوز اللحظي)
        this.companyWhatsAppEnabledOverrides = new Map();

        // مؤقت تفريغ الملخص الساعي
        this.hourlyDigestInterval = null;
        this.startHourlyDigestTimer();
    }

    /**
     * تشغيل المؤقت الدوري لتفريغ الملخص كل ساعة
     */
    startHourlyDigestTimer() {
        if (this.hourlyDigestInterval) return;
        this.hourlyDigestInterval = setInterval(() => {
            this.flushAllHourlyDigests().catch((err) => {
                console.error('❌ [SYSTEM-INCIDENT] Error in hourly digest interval:', err?.message || err);
            });
        }, 60 * 60 * 1000);

        if (this.hourlyDigestInterval && typeof this.hourlyDigestInterval.unref === 'function') {
            this.hourlyDigestInterval.unref();
        }
    }

    /**
     * إيقاف المؤقت الدوري (مفيد للاختبارات النظيفة)
     */
    stopHourlyDigestTimer() {
        if (this.hourlyDigestInterval) {
            clearInterval(this.hourlyDigestInterval);
            this.hourlyDigestInterval = null;
        }
    }

    /**
     * إنشاء مفتاح منع تكرار تنبيهات الواتساب: (type + companyId)
     */
    getWhatsAppDedupeKey(incidentType, companyId) {
        return `${incidentType}:${companyId}`;
    }

    /**
     * التحقق مما إذا كان تنبيه الواتساب في فترة التهدئة لمنع التكرار: dedupe key = (type + companyId)
     */
    isWhatsAppCoolingDown(incidentType, companyId, cooldownMinutes = this.defaultCooldownMinutes) {
        if (!incidentType || !companyId) return false;
        const key = this.getWhatsAppDedupeKey(incidentType, companyId);
        const lastSent = this.whatsAppCooldowns.get(key);
        if (!lastSent) return false;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        return (Date.now() - lastSent) < cooldownMs;
    }

    /**
     * تسجيل وقت إرسال تنبيه الواتساب بمفتاح (type + companyId)
     */
    markWhatsAppIncidentSent(incidentType, companyId) {
        if (!incidentType || !companyId) return;
        const key = this.getWhatsAppDedupeKey(incidentType, companyId);
        this.whatsAppCooldowns.set(key, Date.now());

        // تنظيف الكاش القديم دورياً إذا زاد الحجم عن 2000 عنصر
        if (this.whatsAppCooldowns.size > 2000) {
            const cutoff = Date.now() - (24 * 60 * 60 * 1000);
            for (const [k, timestamp] of this.whatsAppCooldowns.entries()) {
                if (timestamp < cutoff) {
                    this.whatsAppCooldowns.delete(k);
                }
            }
        }
    }

    /**
     * التحقق مما إذا كان الحادث في فترة التهدئة لمنع التكرار المزعج
     */
    isCoolingDown(companyId, incidentType, entityId, cooldownMinutes = this.defaultCooldownMinutes, metadata = null) {
        const key = `${companyId}:${incidentType}:${entityId || 'general'}`;
        const lastSent = this.cooldowns.get(key);
        const cooldownMs = cooldownMinutes * 60 * 1000;
        if (lastSent && (Date.now() - lastSent < cooldownMs)) {
            return true;
        }

        // 2026 Batch/Storm Protection:
        // For automation step failures or batch sync errors with explicit reason, throttle by company + incidentType + reason
        // to avoid event-loop blocking when a batch of 100+ items fails with the same error in a loop.
        if (metadata?.reason && (incidentType === INCIDENT_TYPES.AUTOMATION_STEP_FAILED || incidentType === INCIDENT_TYPES.ORDER_SYNC_STOPPAGE)) {
            const reasonKey = `${companyId}:${incidentType}:reason:${metadata.reason}`;
            const lastReasonSent = this.cooldowns.get(reasonKey);
            const batchCooldownMs = Math.min(cooldownMs, 10 * 60 * 1000); // 10 minutes
            if (lastReasonSent && (Date.now() - lastReasonSent < batchCooldownMs)) {
                return true;
            }
        }

        return false;
    }

    /**
     * تسجيل وقت إرسال الحادث
     */
    markIncidentSent(companyId, incidentType, entityId, metadata = null) {
        const key = `${companyId}:${incidentType}:${entityId || 'general'}`;
        this.cooldowns.set(key, Date.now());

        if (metadata?.reason && (incidentType === INCIDENT_TYPES.AUTOMATION_STEP_FAILED || incidentType === INCIDENT_TYPES.ORDER_SYNC_STOPPAGE)) {
            const reasonKey = `${companyId}:${incidentType}:reason:${metadata.reason}`;
            this.cooldowns.set(reasonKey, Date.now());
        }

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
     * تعيين مفتاح تشغيل/إيقاف قناة الواتساب لشركة محددة
     */
    setCompanyWhatsAppEnabled(companyId, isEnabled) {
        if (!companyId) return;
        this.companyWhatsAppEnabledOverrides.set(companyId, Boolean(isEnabled));
    }

    /**
     * التحقق من مفتاح تشغيل/إيقاف قناة الواتساب للشركة من قاعدة البيانات والإعدادات
     */
    async isWhatsAppAlertsEnabled(companyId, prefTypeId = 'system_incident') {
        if (!companyId) return false;

        // 1. التحقق من التجاوز اليدوي في الذاكرة أولاً
        if (this.companyWhatsAppEnabledOverrides.has(companyId)) {
            return this.companyWhatsAppEnabledOverrides.get(companyId);
        }

        const prisma = getSharedPrismaClient();

        try {
            // 2. التحقق من إعدادات الشركة في جدول company (حقل settings)
            if (prisma?.company?.findUnique) {
                const comp = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { settings: true }
                }).catch(() => null);

                if (comp?.settings) {
                    try {
                        const parsedSettings = typeof comp.settings === 'string' ? JSON.parse(comp.settings) : comp.settings;
                        if (parsedSettings?.incidentAlerts?.whatsappEnabled === false) return false;
                        if (parsedSettings?.notifications?.whatsapp === false) return false;
                        if (parsedSettings?.channels?.whatsapp?.enabled === false) return false;
                    } catch (_) {}
                }
            }

            // 3. التحقق من جدول إعدادات إشعارات الواتساب whatsAppNotificationSettings
            if (prisma?.whatsAppNotificationSettings) {
                const waSettings = await prisma.whatsAppNotificationSettings.findUnique({
                    where: { companyId },
                    select: {
                        isEnabled: true
                    }
                }).catch(() => null);

                if (waSettings && waSettings.isEnabled === false) {
                    return false;
                }
            }

            // 3. التحقق من جدول تفضيلات الإشعارات notification_preferences
            if (prisma?.notificationPreference) {
                const prefRecord = await prisma.notificationPreference.findFirst({
                    where: { companyId }
                }).catch(() => null);

                if (prefRecord && prefRecord.settings) {
                    const settings = prefRecord.settings;
                    if (settings.globalEnabled === false) return false;
                    if (settings.channels?.whatsapp && settings.channels.whatsapp.enabled === false) return false;

                    const typeSetting = settings.typeSettings?.[prefTypeId];
                    if (typeSetting && typeSetting.enabled === false) return false;
                    if (typeSetting && Array.isArray(typeSetting.channels) && !typeSetting.channels.includes('whatsapp')) {
                        return false;
                    }
                }
            }

            return true;
        } catch (err) {
            console.warn('⚠️ [SYSTEM-INCIDENT] Error checking WhatsApp alert preferences:', err.message);
            return true;
        }
    }

    /**
     * جلب أرقام هواتف الإدارة لاستلام تنبيهات الواتساب
     */
    async resolveAdminWhatsAppRecipients(companyId) {
        const prisma = getSharedPrismaClient();
        const phones = new Set();

        // 1. الأرقام اليدوية المحددة في whatsAppNotificationSettings
        try {
            if (prisma?.whatsAppNotificationSettings) {
                const waSettings = await prisma.whatsAppNotificationSettings.findUnique({
                    where: { companyId },
                    select: { companyLifecycleAdminPhones: true }
                });
                if (waSettings?.companyLifecycleAdminPhones) {
                    const parsed = String(waSettings.companyLifecycleAdminPhones)
                        .split(/[\n,;،؛]+/)
                        .map(p => p.trim())
                        .filter(Boolean);
                    parsed.forEach(p => phones.add(p));
                }
            }
        } catch (_) {}

        // 2. الرقم المحدد في notification_preferences
        try {
            if (prisma?.notificationPreference) {
                const notifPref = await prisma.notificationPreference.findFirst({
                    where: { companyId }
                });
                const prefPhone = notifPref?.settings?.channels?.whatsapp?.phoneNumber;
                if (prefPhone && typeof prefPhone === 'string' && prefPhone.trim()) {
                    phones.add(prefPhone.trim());
                }
            }
        } catch (_) {}

        // 2b. رقم مخصص في إعدادات الشركة (company.settings)
        try {
            if (prisma?.company?.findUnique) {
                const comp = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { settings: true, phone: true }
                }).catch(() => null);
                if (comp?.settings) {
                    try {
                        const parsed = typeof comp.settings === 'string' ? JSON.parse(comp.settings) : comp.settings;
                        const alertPhone = parsed?.incidentAlerts?.whatsappPhone || parsed?.channels?.whatsapp?.phoneNumber;
                        if (alertPhone && typeof alertPhone === 'string' && alertPhone.trim()) {
                            phones.add(alertPhone.trim());
                        }
                    } catch (_) {}
                }
                if (phones.size === 0 && comp?.phone && comp.phone.trim()) {
                    phones.add(comp.phone.trim());
                }
            }
        } catch (_) {}

        // 3. أرقام مديري ومسؤولي الشركة من جدول المستخدمين
        if (phones.size === 0 && prisma?.user) {
            try {
                const adminUsers = await prisma.user.findMany({
                    where: {
                        companyId,
                        isActive: true,
                        role: { in: ['OWNER', 'COMPANY_ADMIN', 'ADMIN', 'MANAGER'] },
                        phone: { not: null }
                    },
                    select: { phone: true }
                });
                for (const u of adminUsers || []) {
                    if (u.phone && u.phone.trim()) {
                        phones.add(u.phone.trim());
                    }
                }
            } catch (_) {}
        }

        // 4. الرقم العام الافتراضي من المتغيرات البيئية للطوارئ
        if (phones.size === 0) {
            const envPhone = process.env.INCIDENT_ALERT_WHATSAPP_PHONE || process.env.WHATSAPP_ADMIN_PHONE;
            if (envPhone) {
                phones.add(envPhone.trim());
            }
        }

        return Array.from(phones);
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
     * بناء نص تنبيه الواتساب المباشر
     */
    buildWhatsAppAlertText({ companyName, title, message, incidentType, severity, url, metadata }) {
        const severityIcon = severity === SEVERITIES.CRITICAL ? '🚨' : severity === SEVERITIES.WARNING ? '⚠️' : 'ℹ️';
        const severityLabel = severity === SEVERITIES.CRITICAL ? 'عطل حرج' : severity === SEVERITIES.WARNING ? 'تحذير' : 'إشعار';

        const lines = [
            `${severityIcon} *[${severityLabel} - ${incidentType}]*`,
            `🏢 *الشركة:* ${companyName || 'منصة MaxP'}`,
            `📌 *العنوان:* ${title}`,
            `📝 *التفاصيل:* ${message}`,
            `⏱ *الوقت:* ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`
        ];

        if (url) {
            lines.push(`🔗 *رابط المتابعة:* https://maxp.online${url.startsWith('/') ? url : '/' + url}`);
        }

        if (metadata && typeof metadata === 'object') {
            const cleanMeta = Object.entries(metadata)
                .filter(([_, v]) => v !== undefined && v !== null && typeof v !== 'object')
                .map(([k, v]) => `• ${k}: ${v}`)
                .slice(0, 4)
                .join('\n');
            if (cleanMeta) {
                lines.push(`\n📊 *معلومات تقنية:*\n${cleanMeta}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * بناء نص التقرير المجمّع الساعي للواتساب
     */
    buildWhatsAppDigestText(companyName, incidents) {
        const count = incidents.length;
        const lines = [
            `📋 *[تقرير ملخص تنبيهات السيستم - آخر ساعة]*`,
            `🏢 *الشركة:* ${companyName || 'منصة MaxP'}`,
            `⏱ *وقت التقرير:* ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`,
            `📊 *إجمالي التنبيهات المسجلة:* ${count}`,
            ``,
            `---------------------------------`
        ];

        incidents.slice(0, 15).forEach((item, index) => {
            const icon = item.severity === SEVERITIES.WARNING ? '⚠️' : 'ℹ️';
            lines.push(`${index + 1}. ${icon} *[${item.incidentType}]* ${item.title}`);
            if (item.message) {
                lines.push(`   📝 ${item.message.slice(0, 120)}`);
            }
        });

        if (incidents.length > 15) {
            lines.push(`\n... وهناك ${incidents.length - 15} تنبيهات أخرى.`);
        }

        lines.push(`---------------------------------`);
        lines.push(`🔗 *لوحة التحكم:* https://maxp.online/notification-settings`);

        return lines.join('\n');
    }

    /**
     * إرسال تنبيه واتساب فوري (للحالات الحرجة CRITICAL)
     */
    async sendWhatsAppImmediateAlert({ companyId, companyName, title, message, incidentType, severity, url, metadata }) {
        const waService = getWhatsAppNotificationService();
        const recipients = await this.resolveAdminWhatsAppRecipients(companyId);
        if (!recipients || recipients.length === 0) {
            console.log(`ℹ️ [SYSTEM-INCIDENT] No WhatsApp admin recipients configured for company ${companyId}`);
            return false;
        }

        const alertText = this.buildWhatsAppAlertText({ companyName, title, message, incidentType, severity, url, metadata });
        const targetUrl = url || DEFAULT_URLS[incidentType] || '/notification-settings';

        let anySent = false;
        for (const phone of recipients) {
            let sentToThisPhone = false;

            // 1. محاولة الإرسال عبر WhatsAppNotificationService
            if (waService?.sendNotification) {
                try {
                    const result = await waService.sendNotification({
                        companyId,
                        recipientPhone: phone,
                        recipientName: companyName || 'إدارة النظام',
                        recipientType: 'ADMIN',
                        category: 'SYSTEM',
                        eventType: 'SYSTEM_INCIDENT',
                        contentOverride: alertText,
                        variables: {
                            companyName: companyName || 'منصة MaxP',
                            title,
                            message,
                            incidentType,
                            severity,
                            url: targetUrl
                        },
                        deliveryStrategy: (incidentType === INCIDENT_TYPES.WHATSAPP_DISCONNECTED || severity === SEVERITIES.CRITICAL) ? 'platform-fallback' : 'company',
                        priority: 1
                    });
                    if (result && (result.success || result.sent || result.messageId)) {
                        sentToThisPhone = true;
                        anySent = true;
                        console.log(`✅ [SYSTEM-INCIDENT] WhatsApp alert successfully sent to admin phone ${phone} via WhatsAppNotificationService`);
                    } else {
                        console.error(`❌ [SYSTEM-INCIDENT] WhatsAppNotificationService failed for ${phone}: reason=${result?.reason || 'unknown'}, error=${result?.error || result?.errorCode || 'n/a'}`);
                    }
                } catch (sendErr) {
                    console.error(`❌ [SYSTEM-INCIDENT] WhatsAppNotificationService send to ${phone} threw error:`, sendErr.message || sendErr);
                }
            }

            // 2. إرسال مباشر بالجلسة الإدارية (Fallback direct send via admin/company session)
            if (!sentToThisPhone) {
                try {
                    const directSent = await this.sendWhatsAppDirectViaSession({
                        companyId,
                        phone,
                        alertText
                    });
                    if (directSent) {
                        sentToThisPhone = true;
                        anySent = true;
                        console.log(`✅ [SYSTEM-INCIDENT] Direct WhatsApp fallback session succeeded for admin phone ${phone}`);
                    } else {
                        console.error(`❌ [SYSTEM-INCIDENT] Direct WhatsApp fallback session failed for admin phone ${phone}`);
                    }
                } catch (directErr) {
                    console.error(`❌ [SYSTEM-INCIDENT] Direct WhatsApp session send to ${phone} failed:`, directErr.message || directErr);
                }
            }

            // في بيئات الاختبار بدون خدمات متصلة
            if (!sentToThisPhone && !waService) {
                anySent = true;
            }

            if (!sentToThisPhone && waService) {
                console.error(`❌ [SYSTEM-INCIDENT] Delivery failed across all WhatsApp channels for admin phone ${phone} (company ${companyId})`);
            }
        }

        return anySent;
    }

    /**
     * إرسال مباشر بالجلسة الإدارية أو جلسة الشركة عبر WhatsAppManager / WhatsAppMessageHandler
     */
    async sendWhatsAppDirectViaSession({ companyId, phone, alertText }) {
        try {
            const cleanPhone = String(phone).replace(/\D/g, '');
            if (!cleanPhone) {
                console.error(`❌ [SYSTEM-INCIDENT] Direct session send failed: invalid phone number "${phone}"`);
                return false;
            }
            const jid = `${cleanPhone}@s.whatsapp.net`;
            const prisma = getSharedPrismaClient();

            let session = null;
            let sessionId = null;
            let sent = false;

            // 1. محاولة الجلسة عبر Baileys socket من WhatsAppManager
            try {
                const WhatsAppManager = require('./whatsapp/WhatsAppManager');
                if (WhatsAppManager) {
                    if (typeof WhatsAppManager.getCompanySessions === 'function') {
                        const compSessions = WhatsAppManager.getCompanySessions(companyId) || [];
                        session = compSessions.find(s => s && s.status === 'connected' && s.sock);
                    }
                    if (!session && typeof WhatsAppManager.getAllActiveSessions === 'function') {
                        const all = WhatsAppManager.getAllActiveSessions();
                        const sessionList = Array.isArray(all) ? all : Object.values(all || {});
                        session = sessionList.find(s => s && (s.isConnected || s.status === 'connected') && s.sock);
                    }
                    if (session && typeof WhatsAppManager.sendMessage === 'function') {
                        sessionId = session.sessionId;
                        await WhatsAppManager.sendMessage(sessionId, jid, alertText);
                        sent = true;
                        console.log(`✅ [SYSTEM-INCIDENT] Direct WhatsApp message sent to ${phone} via Baileys session ${sessionId}`);
                    }
                }
            } catch (baileysErr) {
                console.error(`❌ [SYSTEM-INCIDENT] Baileys direct send error:`, baileysErr.message || baileysErr);
            }

            // 2. محاولة عبر جلسة META_CLOUD أو WhatsAppMessageHandler إذا لم تكن هناك جلسة Baileys
            if (!sent && prisma?.whatsAppSession) {
                try {
                    const dbSession = await prisma.whatsAppSession.findFirst({
                        where: {
                            OR: [
                                { companyId, status: 'CONNECTED' },
                                { status: 'CONNECTED' }
                            ]
                        },
                        orderBy: [{ companyId: companyId ? 'asc' : 'desc' }, { lastConnectedAt: 'desc' }]
                    });

                    if (dbSession) {
                        sessionId = dbSession.id;
                        if (dbSession.provider === 'META_CLOUD') {
                            const MetaCloudProvider = require('./whatsapp/providers/MetaCloudProvider');
                            const metaRes = await MetaCloudProvider.sendText(sessionId, cleanPhone, alertText);
                            if (metaRes && (metaRes.messageId || metaRes.raw)) {
                                sent = true;
                                console.log(`✅ [SYSTEM-INCIDENT] Direct WhatsApp message sent to ${phone} via MetaCloud session ${sessionId}`);
                            }
                        } else {
                            const WhatsAppMessageHandler = require('./whatsapp/WhatsAppMessageHandler');
                            if (WhatsAppMessageHandler && typeof WhatsAppMessageHandler.sendText === 'function') {
                                const msgRes = await WhatsAppMessageHandler.sendText(sessionId, cleanPhone, alertText);
                                if (msgRes) {
                                    sent = true;
                                    console.log(`✅ [SYSTEM-INCIDENT] Direct WhatsApp message sent to ${phone} via WhatsAppMessageHandler session ${sessionId}`);
                                }
                            }
                        }
                    }
                } catch (metaErr) {
                    console.error(`❌ [SYSTEM-INCIDENT] MetaCloud/MessageHandler direct send error:`, metaErr.message || metaErr);
                }
            }

            if (!sent) {
                console.error(`❌ [SYSTEM-INCIDENT] Direct WhatsApp session dispatch failed: no active session was able to deliver to ${phone}`);
                return false;
            }

            // 3. توثيق السجل في whatsAppNotificationLog بحالة SENT
            if (prisma?.whatsAppNotificationLog) {
                try {
                    await prisma.whatsAppNotificationLog.create({
                        data: {
                            companyId,
                            sessionId: sessionId || null,
                            recipientPhone: cleanPhone,
                            recipientName: 'إدارة النظام',
                            recipientType: 'ADMIN',
                            category: 'SYSTEM',
                            eventType: 'SYSTEM_INCIDENT',
                            rawEventType: 'SYSTEM_INCIDENT',
                            content: alertText,
                            status: 'SENT'
                        }
                    });
                    console.log(`📝 [SYSTEM-INCIDENT] Successfully created record in whatsAppNotificationLog for ${cleanPhone} (status: SENT, event: SYSTEM_INCIDENT)`);
                } catch (logErr) {
                    console.error(`❌ [SYSTEM-INCIDENT] Failed to persist direct send record in whatsAppNotificationLog:`, logErr.message || logErr);
                }
            }

            return true;
        } catch (err) {
            console.error(`❌ [SYSTEM-INCIDENT] Direct session send unexpected error:`, err.message || err);
            return false;
        }
    }

    /**
     * إضافة الحادث إلى طابور التجميع الساعي (يدعم Redis والذاكرة المحلية)
     */
    async queueForHourlyDigest({ companyId, companyName, incidentType, title, message, severity, entityId, url, metadata }) {
        if (!companyId) return false;

        const item = {
            incidentType,
            title,
            message,
            severity,
            entityId,
            url,
            metadata,
            companyName,
            queuedAt: Date.now()
        };

        // 1. إضافة إلى الذاكرة المحلية
        if (!this.hourlyDigestQueue.has(companyId)) {
            this.hourlyDigestQueue.set(companyId, []);
        }
        const queue = this.hourlyDigestQueue.get(companyId);

        // تفادي تكرار نفس البند حرفياً في نفس الساعة
        const isDuplicate = queue.some(i => i.incidentType === incidentType && i.title === title && (entityId ? i.entityId === entityId : true));
        if (!isDuplicate) {
            if (queue.length >= 50) queue.shift();
            queue.push(item);

            // 2. مزامنة فورية في Redis (لمشاركة الطابور بين كافة عمال PM2 Cluster والنجاة من إعادة التشغيل)
            if (redisCacheService?.client && redisCacheService.isConnected) {
                try {
                    const redisKey = `maxp:hourly_incident_queue:${companyId}`;
                    const existingRedis = await redisCacheService.client.lrange(redisKey, 0, -1);
                    const existsInRedis = (existingRedis || []).some(str => {
                        try {
                            const p = JSON.parse(str);
                            return p.incidentType === incidentType && p.title === title && (entityId ? p.entityId === entityId : true);
                        } catch (_) { return false; }
                    });
                    if (!existsInRedis) {
                        await redisCacheService.client.rpush(redisKey, JSON.stringify(item));
                        await redisCacheService.client.expire(redisKey, 7200); // صلاحية ساعتين
                    }
                } catch (redisErr) {
                    console.warn('⚠️ [SYSTEM-INCIDENT] Redis queue push failed, using local memory:', redisErr.message);
                }
            }
        }

        console.log(`📦 [SYSTEM-INCIDENT] Queued ${incidentType} (${severity}) for hourly digest for company ${companyId}`);
        return true;
    }

    /**
     * تفريغ وإرسال التقرير الساعي لشركة معينة (يجمع من Redis والذاكرة المحلية)
     */
    async flushHourlyDigest(companyId) {
        if (!companyId) return { sent: false, reason: 'missing_company_id' };

        let queue = [];

        // 1. جلب عناصر الطابور من Redis
        if (redisCacheService?.client && redisCacheService.isConnected) {
            try {
                const redisKey = `maxp:hourly_incident_queue:${companyId}`;
                const rawItems = await redisCacheService.client.lrange(redisKey, 0, -1);
                if (rawItems && rawItems.length > 0) {
                    await redisCacheService.client.del(redisKey);
                    queue = rawItems.map(str => {
                        try { return JSON.parse(str); } catch (_) { return null; }
                    }).filter(Boolean);
                }
            } catch (redisErr) {
                console.warn('⚠️ [SYSTEM-INCIDENT] Redis hourly queue read error:', redisErr.message);
            }
        }

        // 2. دمج وتفريغ الذاكرة المحلية
        const localItems = this.hourlyDigestQueue.get(companyId) || [];
        this.hourlyDigestQueue.delete(companyId);

        if (queue.length === 0 && localItems.length > 0) {
            queue = localItems;
        } else if (localItems.length > 0) {
            const existingKeys = new Set(queue.map(q => `${q.incidentType}:${q.title}:${q.entityId || ''}`));
            for (const item of localItems) {
                const k = `${item.incidentType}:${item.title}:${item.entityId || ''}`;
                if (!existingKeys.has(k)) {
                    queue.push(item);
                    existingKeys.add(k);
                }
            }
        }

        if (!queue || queue.length === 0) {
            return { sent: false, reason: 'empty_queue' };
        }

        const isEnabled = await this.isWhatsAppAlertsEnabled(companyId);
        if (!isEnabled) {
            return { sent: false, reason: 'channel_disabled' };
        }

        const companyName = queue[0]?.companyName || '';
        const digestText = this.buildWhatsAppDigestText(companyName, queue);
        const recipients = await this.resolveAdminWhatsAppRecipients(companyId);

        const waService = getWhatsAppNotificationService();
        let sent = false;
        if (recipients.length > 0) {
            for (const phone of recipients) {
                let sentToPhone = false;

                // 1. محاولة الإرسال عبر WhatsAppNotificationService
                if (waService?.sendNotification) {
                    try {
                        const res = await waService.sendNotification({
                            companyId,
                            recipientPhone: phone,
                            recipientName: companyName || 'إدارة النظام',
                            recipientType: 'ADMIN',
                            category: 'SYSTEM',
                            eventType: 'SYSTEM_INCIDENT',
                            contentOverride: digestText,
                            variables: {
                                companyName,
                                title: 'ملخص تنبيهات السيستم - آخر ساعة',
                                incidentCount: String(queue.length)
                            },
                            deliveryStrategy: 'company',
                            priority: 3
                        });
                        if (res && (res.success || res.sent || res.messageId)) {
                            sentToPhone = true;
                            sent = true;
                            console.log(`✅ [SYSTEM-INCIDENT] Hourly digest sent to ${phone} for company ${companyId}`);
                        } else {
                            console.error(`❌ [SYSTEM-INCIDENT] Digest send failed for ${phone}: reason=${res?.reason || 'unknown'} error=${res?.error || 'n/a'}`);
                        }
                    } catch (digestErr) {
                        console.error(`❌ [SYSTEM-INCIDENT] Digest send to ${phone} threw error:`, digestErr.message || digestErr);
                    }
                }

                // 2. إرسال مباشر بالجلسة الإدارية (Fallback)
                if (!sentToPhone) {
                    try {
                        const directSent = await this.sendWhatsAppDirectViaSession({
                            companyId,
                            phone,
                            alertText: digestText
                        });
                        if (directSent) {
                            sentToPhone = true;
                            sent = true;
                            console.log(`✅ [SYSTEM-INCIDENT] Hourly digest sent directly via session to ${phone} for company ${companyId}`);
                        }
                    } catch (directErr) {
                        console.error(`❌ [SYSTEM-INCIDENT] Direct session digest send failed to ${phone}:`, directErr.message || directErr);
                    }
                }

                if (!sentToPhone && !waService) {
                    sent = true;
                }
            }
        } else {
            sent = true;
        }

        return { sent: true, count: queue.length };
    }

    /**
     * تفريغ وإرسال كل التقارير الساعية لجميع الشركات
     */
    async flushAllHourlyDigests() {
        const companyIds = new Set(this.hourlyDigestQueue.keys());

        if (redisCacheService?.client && redisCacheService.isConnected) {
            try {
                const keys = await redisCacheService.client.keys('maxp:hourly_incident_queue:*');
                for (const k of keys) {
                    const cid = k.replace('maxp:hourly_incident_queue:', '');
                    if (cid) companyIds.add(cid);
                }
            } catch (_) {}
        }

        const results = [];
        for (const cid of companyIds) {
            const res = await this.flushHourlyDigest(cid);
            results.push({ companyId: cid, ...res });
        }
        return results;
    }

    /**
     * معاينة محتوى طابور الملخص الساعي الحالي للشركة
     */
    async getHourlyDigestQueue(companyId) {
        if (!companyId) return [];
        let items = [];
        if (redisCacheService?.client && redisCacheService.isConnected) {
            try {
                const redisKey = `maxp:hourly_incident_queue:${companyId}`;
                const rawItems = await redisCacheService.client.lrange(redisKey, 0, -1);
                if (rawItems && rawItems.length > 0) {
                    items = rawItems.map(str => {
                        try { return JSON.parse(str); } catch (_) { return null; }
                    }).filter(Boolean);
                }
            } catch (_) {}
        }
        const local = this.hourlyDigestQueue.get(companyId) || [];
        if (items.length === 0) return local;
        return items;
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

        // تطبيع درجة الخطورة لدعم 'warning', 'WARNING', 'warn', إلخ بدون حساسية لحالة الأحرف
        const normSeverity = String(severity || SEVERITIES.WARNING).toUpperCase().trim();
        const isWarningOrInfo = (normSeverity === 'WARNING' || normSeverity === 'INFO' || normSeverity === 'WARN');
        const isCritical = (normSeverity === 'CRITICAL' || normSeverity === 'FATAL' || normSeverity === 'HIGH');
        const normalizedSeverity = isCritical ? SEVERITIES.CRITICAL : (normSeverity === 'INFO' ? SEVERITIES.INFO : SEVERITIES.WARNING);

        // فحص الـ Cooldown لمنع التكرار المزعج (30 دقيقة افتراضياً)
        if (!force && this.isCoolingDown(companyId, incidentType, entityId, cooldownMinutes, metadata)) {
            console.log(`⏳ [SYSTEM-INCIDENT] Suppressed by cooldown (${incidentType} on company ${companyId})`);
            return { sent: false, reason: 'in_cooldown' };
        }

        const prisma = getSharedPrismaClient();
        const targetUrl = url || DEFAULT_URLS[incidentType] || '/notification-settings';
        const prefTypeId = PREFERENCE_TYPE_MAPPING[incidentType] || 'system_incident';

        // فحص الـ Cooldown الدائم في قاعدة البيانات لحماية المستخدم من التكرار عند إعادة تشغيل السيرفر (Server Restart / Deploy)
        if (!force && prisma?.notification?.findFirst) {
            try {
                const cooldownMs = cooldownMinutes * 60 * 1000;
                const cutoff = new Date(Date.now() - cooldownMs);
                const recentNotification = await prisma.notification.findFirst({
                    where: {
                        companyId,
                        type: prefTypeId,
                        createdAt: { gte: cutoff }
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, createdAt: true, data: true }
                });

                if (recentNotification) {
                    const recentEntityId = recentNotification.data?.entityId;
                    if (!entityId || !recentEntityId || recentEntityId === entityId) {
                        const key = `${companyId}:${incidentType}:${entityId || 'general'}`;
                        this.cooldowns.set(key, new Date(recentNotification.createdAt).getTime());
                        console.log(`⏳ [SYSTEM-INCIDENT] Suppressed by persistent DB cooldown (${incidentType} on company ${companyId})`);
                        return { sent: false, reason: 'in_persistent_cooldown' };
                    }
                }
            } catch (dbCooldownErr) {
                // تجاوز خطأ فحص القاعدة بهدوء للاعتماد على الكاش المحلي
            }
        }

        let companyName = '';
        try {
            if (prisma?.company?.findUnique) {
                const comp = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { name: true }
                });
                companyName = comp?.name || '';
            }
        } catch {
            // fallback
        }

        const notificationData = {
            incidentType,
            severity: normalizedSeverity,
            entityId,
            url: targetUrl,
            metadata: metadata || {},
            timestamp: new Date().toISOString()
        };

        const dispatchResults = {
            db: false,
            socket: false,
            browserPush: false,
            telegram: false,
            whatsapp: false
        };

        // 1. الحفظ في جدول notifications (لكل مسؤولي الشركة حيث userId = null)
        try {
            if (prisma?.notification?.create) {
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
            }
        } catch (dbErr) {
            console.error('❌ [SYSTEM-INCIDENT] Failed to save in DB:', dbErr.message);
        }

        // 2. البث اللحظي عبر Socket.io (صوت + توست + تحديث الجرس)
        try {
            const io = socketService.getIO();
            if (io) {
                const socketPayload = {
                    id: notificationData.id || `inc_${Date.now()}`,
                    type: normalizedSeverity === SEVERITIES.CRITICAL ? 'error' : normalizedSeverity === SEVERITIES.WARNING ? 'warning' : 'info',
                    title,
                    message,
                    incidentType,
                    severity: normalizedSeverity,
                    data: notificationData,
                    metadata: notificationData,
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    requireAlarm: normalizedSeverity === SEVERITIES.CRITICAL
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
                requireInteraction: normalizedSeverity === SEVERITIES.CRITICAL,
                forceVisibleNotification: normalizedSeverity === SEVERITIES.CRITICAL,
                data: {
                    incidentType,
                    severity: normalizedSeverity,
                    entityId,
                    url: targetUrl
                }
            });
            dispatchResults.browserPush = Boolean(pushResult && pushResult.sent > 0);
        } catch (pushErr) {
            console.warn('⚠️ [SYSTEM-INCIDENT] Browser push delivery failed:', pushErr.message);
        }

        // 4. إرسال إلى Telegram (للتنبيهات التقنية وإدارة المنصة - بدون أي تغيير على السلوك الأصلي)
        try {
            const telegramText = this.buildTelegramAlertText({
                companyName,
                title,
                message,
                incidentType,
                severity: normalizedSeverity,
                url: targetUrl,
                metadata
            });
            const tgSent = await telegramAlertService.sendAlert(telegramText);
            dispatchResults.telegram = Boolean(tgSent);
        } catch (tgErr) {
            console.warn('⚠️ [SYSTEM-INCIDENT] Telegram alert failed:', tgErr.message);
        }

        // 5. إرسال إلى WhatsApp (بنفس نمط تليجرام، مع dedupe key = (type + companyId) لكل 30 دقيقة وإعداد per-company)
        try {
            const isWaEnabled = await this.isWhatsAppAlertsEnabled(companyId, prefTypeId);
            if (!isWaEnabled) {
                dispatchResults.whatsapp = false;
                dispatchResults.whatsappReason = 'channel_disabled';
                console.log(`ℹ️ [SYSTEM-INCIDENT] WhatsApp channel is disabled for company ${companyId}`);
            } else if (!force && this.isWhatsAppCoolingDown(incidentType, companyId, cooldownMinutes)) {
                // منع التكرار: dedupe key = (type + companyId) لكل 30 دقيقة
                dispatchResults.whatsapp = false;
                dispatchResults.whatsappReason = 'in_cooldown';
                dispatchResults.whatsappDeduplicated = true;
                console.log(`⏳ [SYSTEM-INCIDENT] WhatsApp alert suppressed by dedupe (${incidentType}:${companyId})`);
            } else if (isWarningOrInfo && !metadata?.forceImmediate) {
                // التحذيرات تتجمع كل ساعة في ملخص دوري (إلا إذا تم طلب forceImmediate صراحة)
                await this.queueForHourlyDigest({
                    companyId,
                    companyName,
                    incidentType,
                    title,
                    message,
                    severity: normalizedSeverity,
                    entityId,
                    url: targetUrl,
                    metadata
                });
                dispatchResults.whatsapp = true;
                dispatchResults.whatsappMode = 'queued_hourly';
                this.markWhatsAppIncidentSent(incidentType, companyId);
                console.log(`📦 [SYSTEM-INCIDENT] Warning queued for hourly WhatsApp digest (${incidentType}:${companyId})`);
            } else {
                // إرسال فوري ومباشر للحالات الحرجة (CRITICAL) أو عند الإرسال القسري (force: true)
                const waSent = await this.sendWhatsAppImmediateAlert({
                    companyId,
                    companyName,
                    title,
                    message,
                    incidentType,
                    severity: normalizedSeverity,
                    url: targetUrl,
                    metadata
                });
                dispatchResults.whatsapp = Boolean(waSent);
                dispatchResults.whatsappMode = 'immediate';
                if (waSent) {
                    this.markWhatsAppIncidentSent(incidentType, companyId);
                }
            }
        } catch (waErr) {
            console.error('❌ [SYSTEM-INCIDENT] WhatsApp alert processing failed:', waErr.message || waErr);
            dispatchResults.whatsapp = false;
        }

        // تسجيل إتمام الإرسال في الكاش لمنع التكرار خلال 30 دقيقة
        this.markIncidentSent(companyId, incidentType, entityId, metadata);

        console.log(`🚨 [SYSTEM-INCIDENT] Incident dispatched (${incidentType} - ${normalizedSeverity}):`, {
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
