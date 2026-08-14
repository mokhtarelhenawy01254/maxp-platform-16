/**
 * 🎉 Occasion Controller
 * إدارة المناسبات القابلة للتعديل: إضافة/حذف/تعديل/نشر (جدولة تلقائية).
 * الجمهور يُحل وقت الإرسال من قوائم العملاء المختارة (customerListIds).
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const MAX_OCCASION_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 3000;
const RECURRENCES = ['none', 'monthly', 'yearly'];

function parseListIds(raw) {
    if (Array.isArray(raw)) return raw.filter(x => typeof x === 'string' && x);
    if (typeof raw === 'string') {
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
        } catch {
            return [];
        }
    }
    return [];
}

function isValidHttpUrl(value) {
    if (!value) return true;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function parseCount(value) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

async function listOccasions(req, res) {
    try {
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();
        const occasions = await prisma.occasion.findMany({
            where: { companyId },
            orderBy: { scheduledAt: 'asc' },
        });
        const data = occasions.map(o => ({ ...o, customerListIds: parseListIds(o.customerListIds) }));
        return res.json({ success: true, data });
    } catch (error) {
        console.error('[OCCASION] listOccasions error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في جلب المناسبات' });
    }
}

async function createOccasion(req, res) {
    try {
        const { companyId } = req.user;
        const { name, message, mediaUrl, scheduledAt, recurrence, customerListIds, sendLimit, throttlePerRun } = req.body || {};
        const trimmedName = (name || '').toString().trim();
        const trimmedMessage = (message || '').toString().trim();

        if (!trimmedName) return res.status(400).json({ success: false, message: 'اسم المناسبة مطلوب' });
        if (trimmedName.length > MAX_OCCASION_NAME_LENGTH)
            return res.status(400).json({ success: false, message: `اسم المناسبة لا يزيد عن ${MAX_OCCASION_NAME_LENGTH} حرف` });
        if (!trimmedMessage) return res.status(400).json({ success: false, message: 'محتوى الرسالة مطلوب' });
        if (trimmedMessage.length > MAX_MESSAGE_LENGTH)
            return res.status(400).json({ success: false, message: `الرسالة لا تزيد عن ${MAX_MESSAGE_LENGTH} حرف` });
        if (!isValidHttpUrl(mediaUrl))
            return res.status(400).json({ success: false, message: 'رابط الصورة غير صالح. استخدم رابط http/https' });
        if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime()))
            return res.status(400).json({ success: false, message: 'تاريخ المناسبة مطلوب وصحيح' });

        const rec = RECURRENCES.includes(recurrence) ? recurrence : 'none';
        const listIds = parseListIds(customerListIds);
        const sendLimitCount = parseCount(sendLimit);
        const throttlePerRunCount = parseCount(throttlePerRun);
        const prisma = getSharedPrismaClient();

        const record = await prisma.occasion.create({
            data: {
                companyId,
                name: trimmedName,
                message: trimmedMessage,
                mediaUrl: mediaUrl && mediaUrl.trim() ? mediaUrl.trim() : null,
                scheduledAt: new Date(scheduledAt),
                recurrence: rec,
                customerListIds: JSON.stringify(listIds),
                sendLimit: sendLimitCount,
                throttlePerRun: throttlePerRunCount,
                status: 'draft',
            },
        });
        return res.json({
            success: true,
            data: { ...record, customerListIds: listIds },
            message: 'تمت إضافة المناسبة',
        });
    } catch (error) {
        console.error('[OCCASION] createOccasion error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في إنشاء المناسبة' });
    }
}

async function updateOccasion(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { name, message, mediaUrl, scheduledAt, recurrence, customerListIds, sendLimit, throttlePerRun } = req.body || {};
        const prisma = getSharedPrismaClient();
        const existing = await prisma.occasion.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ success: false, message: 'المناسبة غير موجودة' });

        const data = {};
        if (name !== undefined) {
            const t = name.toString().trim();
            if (!t) return res.status(400).json({ success: false, message: 'اسم المناسبة مطلوب' });
            if (t.length > MAX_OCCASION_NAME_LENGTH)
                return res.status(400).json({ success: false, message: `اسم المناسبة لا يزيد عن ${MAX_OCCASION_NAME_LENGTH} حرف` });
            data.name = t;
        }
        if (message !== undefined) {
            const t = message.toString().trim();
            if (!t) return res.status(400).json({ success: false, message: 'محتوى الرسالة مطلوب' });
            if (t.length > MAX_MESSAGE_LENGTH)
                return res.status(400).json({ success: false, message: `الرسالة لا تزيد عن ${MAX_MESSAGE_LENGTH} حرف` });
            data.message = t;
        }
        if (mediaUrl !== undefined) {
            if (!isValidHttpUrl(mediaUrl))
                return res.status(400).json({ success: false, message: 'رابط الصورة غير صالح. استخدم رابط http/https' });
            data.mediaUrl = mediaUrl && mediaUrl.trim() ? mediaUrl.trim() : null;
        }
        if (scheduledAt !== undefined) {
            if (Number.isNaN(new Date(scheduledAt).getTime()))
                return res.status(400).json({ success: false, message: 'تاريخ المناسبة غير صحيح' });
            data.scheduledAt = new Date(scheduledAt);
        }
        if (recurrence !== undefined) data.recurrence = RECURRENCES.includes(recurrence) ? recurrence : 'none';
        if (customerListIds !== undefined) data.customerListIds = JSON.stringify(parseListIds(customerListIds));
        if (sendLimit !== undefined) data.sendLimit = parseCount(sendLimit);
        if (throttlePerRun !== undefined) data.throttlePerRun = parseCount(throttlePerRun);

        const updated = await prisma.occasion.update({ where: { id }, data });
        return res.json({
            success: true,
            data: { ...updated, customerListIds: parseListIds(updated.customerListIds) },
            message: 'تم تحديث المناسبة',
        });
    } catch (error) {
        console.error('[OCCASION] updateOccasion error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في تحديث المناسبة' });
    }
}

async function deleteOccasion(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const prisma = getSharedPrismaClient();
        const existing = await prisma.occasion.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ success: false, message: 'المناسبة غير موجودة' });
        await prisma.occasion.delete({ where: { id } });
        return res.json({ success: true, message: 'تم حذف المناسبة' });
    } catch (error) {
        console.error('[OCCASION] deleteOccasion error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في حذف المناسبة' });
    }
}

async function publishOccasion(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { scheduledAt } = req.body || {};
        const prisma = getSharedPrismaClient();
        const existing = await prisma.occasion.findFirst({ where: { id, companyId } });
        if (!existing) return res.status(404).json({ success: false, message: 'المناسبة غير موجودة' });

        let when = existing.scheduledAt;
        if (scheduledAt) {
            if (Number.isNaN(new Date(scheduledAt).getTime()))
                return res.status(400).json({ success: false, message: 'تاريخ النشر غير صحيح' });
            when = new Date(scheduledAt);
        }

        const updated = await prisma.occasion.update({
            where: { id },
            data: { status: 'scheduled', scheduledAt: when, nextRunAt: when, totalSent: 0, lastSentCount: 0 },
        });
        return res.json({
            success: true,
            data: { ...updated, customerListIds: parseListIds(updated.customerListIds) },
            message: 'تم جدولة المناسبة — هتتبعت تلقائياً في الموعد',
        });
    } catch (error) {
        console.error('[OCCASION] publishOccasion error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في نشر المناسبة' });
    }
}

module.exports = {
    listOccasions,
    createOccasion,
    updateOccasion,
    deleteOccasion,
    publishOccasion,
};
