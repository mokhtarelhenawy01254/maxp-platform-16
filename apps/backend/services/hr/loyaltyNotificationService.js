/**
 * Loyalty Points Expiry WhatsApp Notification Service
 * خدمة إشعارات انتهاء صلاحية نقاط الولاء عبر واتساب
 *
 * مسؤولة عن إرسال تذكيرات ودّية (عربي/إنجليزي) للعملاء قبل انتهاء صلاحية نقاطهم
 * (قبل 7 أيام وقبل 48 ساعة) باستخدام Meta Cloud WhatsApp API.
 */

const { getSharedPrismaClient } = require('../../sharedDatabase');
const MetaCloudProvider = require('../whatsapp/providers/MetaCloudProvider');
// خدمة الولاء (مصدّرة كـ instance) — تُضاف إليها getExpiringPoints من وكيل آخر
const customerLoyaltyService = require('./customerLoyaltyService');

/**
 * إرسال رسالة نصية عبر واتساب لعميل تابع لشركة معيّنة.
 * يقرأ رمز الوصول ورقم الهاتف من جلسة واتساب (whatsAppSessions) الخاصة بالشركة.
 * دفاعي: إن لم تتوفر جلسة/رمز صالح يطبع تحذيراً ولا يرمي خطأ (no-op).
 *
 * @param {string} companyId  معرّف الشركة
 * @param {string} phone      رقم العميل (بصيغة دولية)
 * @param {string} text       نص الرسالة (يدعم معاينة الروابط)
 * @returns {Promise<{sent:Boolean, messageId?:string|null, error?:string}>}
 */
async function sendWhatsAppMessage(companyId, phone, text) {
    if (!companyId || !phone || !text) {
        console.warn('⚠️ [Loyalty Notify] sendWhatsAppMessage skipped: missing companyId/phone/text');
        return { sent: false, error: 'missing companyId/phone/text' };
    }

    try {
        const prisma = getSharedPrismaClient();

        // نبحث عن جلسة واتساب موصولة للشركة (تحتوي رمز Meta والـ phone number id)
        const session = await prisma.whatsAppSession.findFirst({
            where: { companyId, status: 'CONNECTED' },
            orderBy: { updatedAt: 'desc' }
        });

        if (!session) {
            console.warn(`⚠️ [Loyalty Notify] No CONNECTED WhatsApp session for company ${companyId} — skipping message`);
            return { sent: false, error: 'no whatsapp session' };
        }

        // نفوّض الإرسال للـ helper الموجود في MetaCloudProvider (يرمّم الرمز المشفّر داخلياً)
        const result = await MetaCloudProvider.sendText(session.id, phone, text, { previewUrl: true });

        return { sent: true, messageId: result?.messageId || null };
    } catch (error) {
        console.error(`❌ [Loyalty Notify] Failed to send WhatsApp to ${phone}:`, error?.message || error);
        return { sent: false, error: error?.message || String(error) };
    }
}

/**
 * بناء نص تذكير ثنائي اللغة (عربي/إنجليزي) بانتهاء صلاحية النقاط.
 */
function buildExpiryReminderText({ customerName, expiringPoints, daysLeft, deepLink }) {
    const name = customerName && customerName.trim() ? customerName.trim() : '';
    const greeting = name ? `مرحباً ${name} / Hello ${name}` : 'مرحباً / Hello';
    const points = Number(expiringPoints) || 0;
    const link = deepLink || '';

    const ar = `لديك ${points} نقطة ستنتهي صلاحيتها خلال ${daysLeft} أيام. افتح المتجر عبر الرابط لتستخدم خصمك قبل الفوات: ${link}`;
    const en = `You have ${points} point(s) expiring in ${daysLeft} day(s). Open the store via the link to use your discount before it expires: ${link}`;

    return `${greeting}\n\n${ar}\n\n${en}`;
}

/**
 * إرسال تذكير انتهاء صلاحية النقاط لعميل واحد.
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.phone
 * @param {string} [params.customerName]
 * @param {number} params.expiringPoints
 * @param {number} params.daysLeft     (7 أو 2)
 * @param {string} [params.deepLink]   رابط المتجر المحمّل بالخصم
 * @returns {Promise<{sent:Boolean, error?:string}>}
 */
async function sendPointsExpiryReminder({ companyId, phone, customerName, expiringPoints, daysLeft, deepLink }) {
    const text = buildExpiryReminderText({ customerName, expiringPoints, daysLeft, deepLink });
    const result = await sendWhatsAppMessage(companyId, phone, text);
    return result;
}

/**
 * جلب العملاء الذين ستنتهي نقاطهم خلال `days` يوماً وإرسال تذكير واتساب لكل منهم.
 * تستدعي الدالة المُضافة في customerLoyaltyService.getExpiringPoints (يضيفها وكيل آخر).
 *
 * @param {string|null} companyId  معرّف الشركة أو null لكل الشركات
 * @param {number} days             عدد الأيام المتبقية (7 أو 2)
 * @returns {Promise<number>}       عدد الرسائل التي تم إرسالها بنجاح
 */
async function notifyExpiringCustomers(companyId, days) {
    let customers = [];
    try {
        customers = await customerLoyaltyService.getExpiringPoints({ companyId, days });
    } catch (error) {
        console.error(`❌ [Loyalty Notify] getExpiringPoints failed (company=${companyId}, days=${days}):`, error?.message || error);
        return 0;
    }

    // دفاعي: نتعامل مع undefined/قوائم فارغة بأمان
    if (!Array.isArray(customers) || customers.length === 0) {
        return 0;
    }

    let sentCount = 0;
    for (const c of customers) {
        if (!c || !c.phone) continue;
        const res = await sendPointsExpiryReminder({
            companyId: c.companyId || companyId,
            phone: c.phone,
            customerName: c.customerName,
            expiringPoints: c.expiringPoints,
            daysLeft: days,
            deepLink: c.deepLink
        });
        if (res && res.sent) sentCount += 1;
    }

    return sentCount;
}

module.exports = {
    sendWhatsAppMessage,
    sendPointsExpiryReminder,
    notifyExpiringCustomers
};
