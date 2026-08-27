/**
 * ðŸ“¢ Customer WhatsApp Notifications Controller
 * Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡ (Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯ØŒ Ø¹Ø±ÙˆØ¶ØŒ Ø¥Ù„Ø®)
 */

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const WhatsAppMessageHandler = require('../services/whatsapp/WhatsAppMessageHandler');
const WhatsAppManager = require('../services/whatsapp/WhatsAppManager');

console.log('ðŸ“¢ [CWA] Customer WhatsApp Notifications Controller Loaded');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Active campaign tracker (in-memory, per-process)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const activeCampaigns = new Map(); // campaignId -> { status, sent, failed, total, startedAt, dbId }
const scheduledCampaignTimers = new Map(); // campaignId -> timeoutId
const MAX_CAMPAIGN_TIMEOUT_MS = 2147483647; // Node.js setTimeout max delay (~24.8 days)

/**
 * Persist campaign to DB and return DB record id
 */
async function persistCampaignToDB(companyId, userId, campaignData) {
    try {
        const prisma = getSharedPrismaClient();
        const record = await prisma.broadcastCampaign.create({
            data: {
                companyId,
                name: campaignData.occasionName || 'Ø­Ù…Ù„Ø© ÙˆØ§ØªØ³Ø§Ø¨',
                message: campaignData.message || '',
                targetAudience: campaignData.audience || 'all',
                scheduledAt: campaignData.scheduledAt ? new Date(campaignData.scheduledAt) : null,
                status: campaignData.status || 'running',
                recipientCount: campaignData.total || 0,
                creatorId: userId || null,
            }
        });
        return record.id;
    } catch (err) {
        console.error('[CWA] Failed to persist campaign to DB:', err.message);
        return null;
    }
}

/**
 * Update campaign record in DB when done
 */
async function updateCampaignInDB(dbId, updates) {
    if (!dbId) return;
    try {
        const prisma = getSharedPrismaClient();
        await prisma.broadcastCampaign.update({
            where: { id: dbId },
            data: {
                status: updates.status,
                sentCount: updates.sent || 0,
                failedCount: updates.failed || 0,
                sentAt: updates.sentAt ? new Date(updates.sentAt) : null,
            }
        });
    } catch (err) {
        console.error('[CWA] Failed to update campaign in DB:', err.message);
    }
}

const BIRTHDAY_KEY_PATTERN = /(birth|birthday|dob|date[_-]?of[_-]?birth|ØªØ§Ø±ÙŠØ®.?Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯|Ù…ÙŠÙ„Ø§Ø¯)/i;
const ARABIC_INDIC_DIGITS = 'Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©';
const EASTERN_ARABIC_DIGITS = 'Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹';

function pad2(n) {
    return String(n).padStart(2, '0');
}

/**
 * يصحّح النصوص المخزنة بترميز مزدوج (double UTF-8) — مثل القوالب القديمة.
 * يعيد النص الأصلي لو كانت الفكّة نظيفة، وإلا يبقي النص كما هو.
 */
function fixMojibake(str) {
    if (!str || typeof str !== 'string') return str;
    if (!/[^\u0000-\u007F]/.test(str)) return str;
    try {
        const decoded = Buffer.from(str, 'latin1').toString('utf8');
        if (decoded.includes('\uFFFD')) return str;
        if (!/[^\u0000-\u007F]/.test(decoded)) return str;
        return decoded;
    } catch (e) {
        return str;
    }
}

function normalizeYear(year) {
    const y = Number(year);
    if (!Number.isFinite(y)) return null;
    if (String(year).length === 2) {
        // 00-29 => 2000s, 30-99 => 1900s
        return y <= 29 ? 2000 + y : 1900 + y;
    }
    return y;
}

function isValidMonthDay(month, day, year = 2000) {
    if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const d = new Date(year, month - 1, day);
    return d.getMonth() + 1 === month && d.getDate() === day;
}

function normalizeDateText(text) {
    if (typeof text !== 'string') return '';
    let normalized = text.trim();
    if (!normalized) return '';

    normalized = normalized
        .replace(/[Ù -Ù©]/g, d => String(ARABIC_INDIC_DIGITS.indexOf(d)))
        .replace(/[Û°-Û¹]/g, d => String(EASTERN_ARABIC_DIGITS.indexOf(d)))
        .replace(/[.]/g, '/')
        .replace(/[\\]/g, '/')
        .replace(/[Ù€]/g, '')
        .replace(/\s+/g, ' ');

    return normalized;
}

function parseDateParts(value) {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return {
            year: value.getFullYear(),
            month: value.getMonth() + 1,
            day: value.getDate(),
        };
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        const normalized = value < 1e12 ? value * 1000 : value; // seconds or ms
        const d = new Date(normalized);
        if (!Number.isNaN(d.getTime())) {
            return {
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate(),
            };
        }
    }

    if (typeof value !== 'string') return null;
    const raw = normalizeDateText(value);
    if (!raw) return null;

    // Unix timestamp (seconds/ms) as string
    if (/^\d{10,13}$/.test(raw)) {
        const asNumber = Number(raw);
        const normalizedTs = raw.length === 10 ? asNumber * 1000 : asNumber;
        const tsDate = new Date(normalizedTs);
        if (!Number.isNaN(tsDate.getTime())) {
            return {
                year: tsDate.getFullYear(),
                month: tsDate.getMonth() + 1,
                day: tsDate.getDate(),
            };
        }
    }

    // YYYY-MM-DD / YYYY/MM/DD
    const ymd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymd) {
        const year = Number(ymd[1]);
        const month = Number(ymd[2]);
        const day = Number(ymd[3]);
        if (isValidMonthDay(month, day, year)) return { year, month, day };
    }

    // DD/MM[/YYYY] or MM/DD[/YYYY] (default DD/MM if ambiguous)
    const dmyOrMdy = raw.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
    if (dmyOrMdy) {
        const first = Number(dmyOrMdy[1]);
        const second = Number(dmyOrMdy[2]);
        const year = dmyOrMdy[3] ? normalizeYear(dmyOrMdy[3]) : null;

        // Prefer DD/MM for Arabic data; switch only when clearly MM/DD.
        let day = first;
        let month = second;
        if (first <= 12 && second > 12) {
            month = first;
            day = second;
        }

        const valid = isValidMonthDay(month, day, year || 2000);
        if (valid) return { year, month, day };
    }

    // Fallback to native Date parse
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return {
            year: parsed.getFullYear(),
            month: parsed.getMonth() + 1,
            day: parsed.getDate(),
        };
    }

    return null;
}

function getTargetDateParts(inputDate) {
    if (!inputDate) {
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            isoDate: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
        };
    }

    const parts = parseDateParts(inputDate);
    if (!parts) return null;
    return {
        ...parts,
        isoDate: `${parts.year || new Date().getFullYear()}-${pad2(parts.month)}-${pad2(parts.day)}`,
    };
}

function findBirthdayValueInObject(rawObject) {
    if (!rawObject || typeof rawObject !== 'object') return null;

    const queue = [rawObject];
    const seen = new Set();

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== 'object' || seen.has(current)) continue;
        seen.add(current);

        for (const [key, value] of Object.entries(current)) {
            if (value == null) continue;

            if (BIRTHDAY_KEY_PATTERN.test(key)) {
                if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
                    return value;
                }
            }

            if (typeof value === 'object') {
                queue.push(value);
            }
        }
    }

    return null;
}

function extractBirthdayParts(customer) {
    if (!customer) return null;

    let metadataObject = null;
    if (typeof customer.metadata === 'string') {
        const trimmed = customer.metadata.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                metadataObject = JSON.parse(trimmed);
            } catch {
                metadataObject = null;
            }
        }
    } else if (customer.metadata && typeof customer.metadata === 'object') {
        metadataObject = customer.metadata;
    }

    const birthdayRaw = findBirthdayValueInObject(metadataObject);
    if (!birthdayRaw) return null;
    return parseDateParts(birthdayRaw);
}

function parseSpintax(text) {
    const spintaxPattern = /\{([^{|}]+\|[^{|}]*(?:\|[^{|}]*)*)\}/g;
    return String(text || '').replace(spintaxPattern, (_, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

function computeBaseDelayMs(body) {
    let baseDelay = 1500;
    if (body?.delayValue) {
        const multiplier = body.delayUnit === 'minutes' ? 60000 : 1000;
        baseDelay = parseFloat(body.delayValue) * multiplier;
    }
    return Math.max(500, Number.isFinite(baseDelay) ? baseDelay : 1500);
}

function parseScheduledSendAt(sendAt) {
    if (!sendAt) return null;

    const scheduledDate = new Date(sendAt);
    if (Number.isNaN(scheduledDate.getTime())) {
        const error = new Error('INVALID_SCHEDULED_AT');
        error.code = 'INVALID_SCHEDULED_AT';
        throw error;
    }

    const delayMs = scheduledDate.getTime() - Date.now();
    if (delayMs <= 0) {
        const error = new Error('SCHEDULED_AT_IN_PAST');
        error.code = 'SCHEDULED_AT_IN_PAST';
        throw error;
    }

    if (delayMs > MAX_CAMPAIGN_TIMEOUT_MS) {
        const error = new Error('SCHEDULED_AT_TOO_FAR');
        error.code = 'SCHEDULED_AT_TOO_FAR';
        throw error;
    }

    return { scheduledDate, delayMs };
}

function isValidHttpUrl(value) {
    if (!value || typeof value !== 'string') return false;
    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

async function getBirthdayAudienceCustomers(companyId, inputDate) {
    const target = getTargetDateParts(inputDate);
    if (!target) {
        const dateError = new Error('INVALID_DATE');
        dateError.code = 'INVALID_DATE';
        throw dateError;
    }

    const prisma = getSharedPrismaClient();
    const customers = await safeQuery(() =>
        prisma.customer.findMany({
            where: {
                companyId,
                phone: { not: null },
                metadata: { not: null },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                metadata: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })
    );

    const matched = [];
    console.log(`[CWA-DEBUG] getBirthdayAudienceCustomers: companyId=${companyId}, targetMonth=${target.month}, targetDay=${target.day}, totalCustomersWithMeta=${customers.length}`);
    for (const customer of customers) {
        if (!customer?.phone || !String(customer.phone).trim()) continue;
        const birthday = extractBirthdayParts(customer);
        if (!birthday) {
            console.log(`[CWA-DEBUG] No birthday found for ${customer.firstName} (${customer.id})`);
            continue;
        }

        console.log(`[CWA-DEBUG] Checking ${customer.firstName}: customerMonth=${birthday.month}, customerDay=${birthday.day}`);
        if (birthday.month === target.month && birthday.day === target.day) {
            console.log(`[CWA-DEBUG] MATCH FOUND for ${customer.firstName}`);
            let age = null;
            if (birthday.year && birthday.year >= 1900 && birthday.year <= target.year) {
                const maybeAge = target.year - birthday.year;
                if (maybeAge >= 0 && maybeAge <= 120) age = maybeAge;
            }

            matched.push({
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone,
                age,
            });
        }
    }

    return { target, customers: matched };
}

/**
 * Ø¬Ù„Ø¨ Ø¬Ù„Ø³Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ù…ØªØµÙ„Ø© Ù„Ù„Ø´Ø±ÙƒØ©
 */
async function getConnectedSessions(companyId) {
    try {
        const prisma = getSharedPrismaClient();
        const dbSessions = await safeQuery(() =>
            prisma.whatsAppSession.findMany({
                where: { companyId },
                select: { id: true, phoneNumber: true, status: true }
            })
        );

        const activeSessions = WhatsAppManager.getAllActiveSessions();

        return dbSessions.map(ds => {
            const active = activeSessions[ds.id];
            return {
                sessionId: ds.id,
                phoneNumber: ds.phoneNumber || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ',
                isConnected: active ? active.isConnected : false,
                status: active ? active.status : ds.status
            };
        });
    } catch (err) {
        console.error('[CWA] Error getting sessions:', err.message);
        return [];
    }
}

/**
 * Ø¬Ù„Ø¨ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ù…Ø¹ Ø£Ø±Ù‚Ø§Ù… Ù‡ÙˆØ§ØªÙÙ‡Ù… (Ù„Ù„Ø§Ø®ØªÙŠØ§Ø± ÙÙŠ Ø§Ù„ÙØ±ÙˆÙ†Øª)
 */
exports.getCustomersWithPhones = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, hasOrders, limit = 1000, search } = req.query;

        const prisma = getSharedPrismaClient();
        const where = { companyId };

        if (status) where.status = status;
        if (hasOrders === 'true') {
            where.orders = { some: {} };
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }

        const customers = await safeQuery(() =>
            prisma.customer.findMany({
                where,
                take: parseInt(limit),
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    status: true,
                    _count: { select: { orders: true } },
                },
            })
        );

        const withPhones = customers.filter(c => c.phone && c.phone.trim() !== '');

        return res.json({
            success: true,
            data: withPhones,
            total: withPhones.length,
        });
    } catch (error) {
        console.error('[CWA] getCustomersWithPhones error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡' });
    }
};

/**
 * Ø¬Ù„Ø¨ Ø¬Ù„Ø³Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ù…ØªØµÙ„Ø© Ù„Ù„Ø´Ø±ÙƒØ©
 */
exports.getConnectedWhatsAppSessions = async (req, res) => {
    try {
        const { companyId } = req.user;
        const sessions = await getConnectedSessions(companyId);

        return res.json({
            success: true,
            sessions,
            _debug_time: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CWA] getConnectedWhatsAppSessions error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø¬Ù„Ø³Ø§Øª' });
    }
};

/**
 * Ø¥Ø¹Ø§Ø¯Ø© Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ø¬Ù„Ø³Ø§Øª (ØªØ¯Ù†ÙŠØ¨)
 */
exports.refreshSessions = async (req, res) => {
    try {
        await WhatsAppManager.restoreAllSessions();
        return res.json({ success: true, message: 'ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¬Ù„Ø³Ø§Øª' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AUDIENCE FILTER BUILDER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * ÙŠØ¨Ù†ÙŠ where clause Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ ÙÙ„ØªØ± Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±
 * audience: 'all' | 'withOrders' | 'newCustomers' | 'activeCustomers'
 * newDays: Ø¹Ø¯Ø¯ Ø§Ù„Ø£ÙŠØ§Ù… Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ø¬Ø¯Ø¯ (default 7)
 */
async function buildAudienceWhere(companyId, audience, newDays = 7) {
    const where = { companyId, phone: { not: null } };

    switch (audience) {
        case 'withOrders':
            where.orders = { some: {} };
            break;
        case 'newCustomers': {
            const since = new Date();
            since.setDate(since.getDate() - parseInt(newDays));
            where.createdAt = { gte: since };
            break;
        }
        case 'activeCustomers':
            where.status = 'ACTIVE';
            break;
        case 'all':
        default:
            // no extra filter
            break;
    }

    return where;
}

/**
 * Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙÙŠÙ† (Ø¨Ø¯ÙˆÙ† Ø¥Ø±Ø³Ø§Ù„)
 */
exports.previewAudience = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { audience = 'all', newDays = 7 } = req.query;

        const prisma = getSharedPrismaClient();
        const where = await buildAudienceWhere(companyId, audience, newDays);

        const count = await safeQuery(() => prisma.customer.count({ where }));

        return res.json({ success: true, count, audience });
    } catch (error) {
        console.error('[CWA] previewAudience error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„Ø¬Ù…Ù‡ÙˆØ±' });
    }
};

/**
 * Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¹Ø¯Ø¯ Ø¹Ù…Ù„Ø§Ø¡ Ø¹ÙŠØ¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯ Ù„ØªØ§Ø±ÙŠØ® Ù…Ø­Ø¯Ø¯ (Ù…Ù† metadata)
 */
exports.previewBirthdayAudience = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { date } = req.query;
        const { target, customers } = await getBirthdayAudienceCustomers(companyId, date);

        return res.json({
            success: true,
            count: customers.length,
            date: target.isoDate,
        });
    } catch (error) {
        if (error?.code === 'INVALID_DATE') {
            return res.status(400).json({ success: false, message: 'ØµÙŠØºØ© Ø§Ù„ØªØ§Ø±ÙŠØ® ØºÙŠØ± ØµØ­ÙŠØ­Ø©' });
        }
        console.error('[CWA] previewBirthdayAudience error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ù…Ø¹Ø§ÙŠÙ†Ø© Ø¬Ù…Ù‡ÙˆØ± Ø£Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯' });
    }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SMART BULK SEND (filter-based, no manual IDs needed)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø°ÙƒÙŠ Ø¨Ø§Ù„ÙÙ„ØªØ± (Ø¨Ø¯ÙˆÙ† ØªØ­Ø¯ÙŠØ¯ ÙŠØ¯ÙˆÙŠ Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡)
 * Body:
 *   audience: 'all' | 'withOrders' | 'newCustomers' | 'activeCustomers'
 *   newDays: number (for newCustomers)
 *   message: string (supports {Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„})
 *   sessionId: string (optional, auto-selects first connected)
 *   mediaUrl: string (optional)
 *   mediaCaption: string (optional)
 *   delayMs: number (default 1500ms between messages)
 *   occasionName: string (optional, supports {Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø©}/{occasionName})
 *   sendAt: ISO datetime string (optional, schedule send)
 */
exports.sendSmartBulkNotification = async (req, res) => {
    try {
        const { companyId } = req.user;
        const {
            audience = 'all',
            newDays = 7,
            message,
            sessionId,
            productId,
            mediaUrl: reqMediaUrl,
            mediaCaption,
            delayMs = 1500,
            occasionName,
            sendAt,
        } = req.body;

        const MAX_MESSAGE_LENGTH = 3000;
        const MAX_OCCASION_NAME_LENGTH = 80;
        const safeNewDays = Math.max(1, Math.min(365, parseInt(newDays, 10) || 7));

        // 1. Get connected session (only from THIS company's sessions - security fix)
        const connectedSessions = await getConnectedSessions(companyId);
        const usableSession = connectedSessions.find(s => s.isConnected);
        if (!usableSession) {
            return res.status(400).json({
                success: false,
                message: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ù…ØªØµÙ„Ø©. ÙŠØ±Ø¬Ù‰ Ø±Ø¨Ø· ÙˆØ§ØªØ³Ø§Ø¨ Ø£ÙˆÙ„Ø§Ù‹.'
            });
        }

        let targetSessionId = usableSession.sessionId;
        if (sessionId) {
            // Security: Only allow sessions that belong to THIS company
            const selected = connectedSessions.find(s => s.sessionId === sessionId && s.isConnected);
            if (!selected) {
                return res.status(400).json({
                    success: false,
                    message: 'Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ù…Ø®ØªØ§Ø±Ø© ØºÙŠØ± Ù…ØªØµÙ„Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ Ø£Ùˆ Ù„Ø§ ØªÙ†ØªÙ…ÙŠ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ø´Ø±ÙƒØ©. Ø§Ø®ØªØ± Ø¬Ù„Ø³Ø© Ù…ØªØµÙ„Ø©.',
                });
            }
            targetSessionId = selected.sessionId;
        }

        if (reqMediaUrl && !isValidHttpUrl(reqMediaUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Ø±Ø§Ø¨Ø· Ø§Ù„ØµÙˆØ±Ø© ØºÙŠØ± ØµØ§Ù„Ø­. Ø§Ø³ØªØ®Ø¯Ù… Ø±Ø§Ø¨Ø· http Ø£Ùˆ https.',
            });
        }

        const normalizedOccasionName = String(occasionName || '').trim();
        if (normalizedOccasionName.length > MAX_OCCASION_NAME_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø© ÙŠØ¬Ø¨ Ø£Ù† Ù„Ø§ ÙŠØ²ÙŠØ¯ Ø¹Ù† ${MAX_OCCASION_NAME_LENGTH} Ø­Ø±Ù.`,
            });
        }

        // 2. Build audience
        const prisma = getSharedPrismaClient();
        const where = await buildAudienceWhere(companyId, audience, safeNewDays);
        const customers = await safeQuery(() =>
            prisma.customer.findMany({
                where,
                select: { id: true, firstName: true, lastName: true, phone: true },
                orderBy: { createdAt: 'desc' }
            })
        );

        const eligibleCustomers = customers.filter(c => c.phone && c.phone.trim() !== '');

        if (eligibleCustomers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù…Ù„Ø§Ø¡ Ù…Ø·Ø§Ø¨Ù‚ÙˆÙ† Ù„Ù„ÙÙ„ØªØ± Ø§Ù„Ù…Ø­Ø¯Ø¯.',
            });
        }

        // 3. Product context (if applicable)
        let productMediaUrl = reqMediaUrl;
        let baseMessage = message;

        if (productId) {
            const product = await safeQuery(() =>
                prisma.product.findUnique({
                    where: { id: productId },
                    select: { name: true, price: true, images: true }
                })
            );

            if (product) {
                // If no mediaUrl provided, use product's first image
                if (!productMediaUrl && product.images && product.images.length > 0) {
                    productMediaUrl = product.images[0];
                }

                // If no message provided, use a default product template
                if (!baseMessage) {
                    baseMessage = `Ø¹Ø²ÙŠØ²ÙŠ {Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„} âœ¨\n\nÙ†Ø¨Ø´Ø±Ùƒ Ø¨Ù…Ù†ØªØ¬Ù†Ø§ Ø§Ù„Ø¬Ø¯ÙŠØ¯! ðŸŽ‰\n\nâœ¨ ${product.name}\nðŸ’° Ø§Ù„Ø³Ø¹Ø±: ${product.price} Ø¬Ù†ÙŠÙ‡\n\nØ§Ø·Ù„Ø¨Ù‡ Ø§Ù„Ø¢Ù† Ù…Ù† Ù…ØªØ¬Ø±Ù†Ø§ ðŸ›ï¸`;
                } else {
                    // Replace product placeholders
                    baseMessage = baseMessage
                        .replace(/{productName}/g, product.name || '')
                        .replace(/{price}/g, String(product.price || ''));
                }
            }
        }

        const normalizedBaseMessage = String(baseMessage || '').trim();
        if (!normalizedBaseMessage) {
            return res.status(400).json({ success: false, message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø·Ù„ÙˆØ¨Ø©' });
        }
        if (normalizedBaseMessage.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø·ÙˆÙŠÙ„Ø© Ø¬Ø¯Ù‹Ø§. Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ ${MAX_MESSAGE_LENGTH} Ø­Ø±Ù.`,
            });
        }

        let scheduleInfo = null;
        try {
            scheduleInfo = parseScheduledSendAt(sendAt);
        } catch (scheduleError) {
            if (scheduleError.code === 'INVALID_SCHEDULED_AT') {
                return res.status(400).json({ success: false, message: 'ØµÙŠØºØ© Ø§Ù„Ù…ÙˆØ¹Ø¯ ØºÙŠØ± ØµØ­ÙŠØ­Ø©' });
            }
            if (scheduleError.code === 'SCHEDULED_AT_IN_PAST') {
                return res.status(400).json({ success: false, message: 'Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø© ÙÙŠ ÙˆÙ‚Øª Ø³Ø§Ø¨Ù‚' });
            }
            if (scheduleError.code === 'SCHEDULED_AT_TOO_FAR') {
                return res.status(400).json({ success: false, message: 'Ù…ÙˆØ¹Ø¯ Ø§Ù„Ø¬Ø¯ÙˆÙ„Ø© Ø¨Ø¹ÙŠØ¯ Ø¬Ø¯Ù‹Ø§. Ø§Ø®ØªØ± ÙˆÙ‚ØªÙ‹Ø§ Ø£Ù‚Ø±Ø¨ (Ø£Ù‚Ù„ Ù…Ù† 24 ÙŠÙˆÙ…Ù‹Ø§).' });
            }
            throw scheduleError;
        }

        // Generate a campaign ID and return immediately
        const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const initialStatus = scheduleInfo ? 'scheduled' : 'running';
        const scheduledAtIso = scheduleInfo ? scheduleInfo.scheduledDate.toISOString() : null;

        // Persist campaign to DB for persistence across server restarts
        const userId = req.user?.id || req.user?.userId;
        const dbCampaignId = await persistCampaignToDB(companyId, userId, {
            occasionName: normalizedOccasionName || 'Ø­Ù…Ù„Ø© Ù…Ù†Ø§Ø³Ø¨Ø©',
            message: normalizedBaseMessage,
            audience,
            scheduledAt: scheduledAtIso,
            status: initialStatus,
            total: eligibleCustomers.length,
        });

        activeCampaigns.set(campaignId, {
            status: initialStatus,
            sent: 0,
            failed: 0,
            total: eligibleCustomers.length,
            startedAt: scheduleInfo ? null : new Date().toISOString(),
            scheduledAt: scheduledAtIso,
            errors: [],
            dbId: dbCampaignId, // Link to DB record
        });

        // Acknowledge request and process in background
        res.json({
            success: true,
            campaignId,
            dbCampaignId,
            total: eligibleCustomers.length,
            status: initialStatus,
            scheduledAt: scheduledAtIso,
            message: scheduleInfo
                ? `ØªÙ… Ø¬Ø¯ÙˆÙ„Ø© Ø¥Ø±Ø³Ø§Ù„ ${eligibleCustomers.length} Ø±Ø³Ø§Ù„Ø© ÙÙŠ ${scheduledAtIso}.`
                : `Ø¨Ø¯Ø£ Ø¥Ø±Ø³Ø§Ù„ ${eligibleCustomers.length} Ø±Ø³Ø§Ù„Ø© ÙÙŠ Ø§Ù„Ø®Ù„ÙÙŠØ©. ØªØªØ¨Ø¹ Ø§Ù„Ø­Ù…Ù„Ø© Ø¨Ù€ campaignId.`,
        });

        const runCampaign = async () => {
            const campaign = activeCampaigns.get(campaignId);
            if (!campaign || campaign.status === 'cancelled') return;

            campaign.status = 'running';
            campaign.startedAt = new Date().toISOString();
            campaign.scheduledAt = campaign.scheduledAt || null;

            const refreshedSessions = await getConnectedSessions(companyId);
            const targetSessionConnected = refreshedSessions.some(s => s.sessionId === targetSessionId && s.isConnected);
            if (!targetSessionConnected) {
                campaign.status = 'cancelled';
                campaign.completedAt = new Date().toISOString();
                campaign.errors.push({
                    customerId: 'SYSTEM',
                    error: 'Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù„Ù…Ø®ØªØ§Ø±Ø© ØºÙŠØ± Ù…ØªØµÙ„Ø© ÙˆÙ‚Øª Ø§Ù„ØªÙ†ÙÙŠØ°.',
                    timestamp: new Date().toISOString(),
                });
                return;
            }

            const baseDelay = computeBaseDelayMs(req.body);

            for (const customer of eligibleCustomers) {
                // Check if campaign was cancelled
                const currentCampaign = activeCampaigns.get(campaignId);
                if (!currentCampaign || currentCampaign.status === 'cancelled') {
                    console.log(`ðŸ›‘ [CWA-SMART] Campaign ${campaignId} stopped.`);
                    break;
                }

                const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Ø¹Ø²ÙŠØ²ÙŠ Ø§Ù„Ø¹Ù…ÙŠÙ„';

                // 1. Apply Personalization
                let personalizedMessage = normalizedBaseMessage
                    .replace(/{Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„}/g, customerName)
                    .replace(/{customerName}/g, customerName)
                    .replace(/{Ø§Ø³Ù… Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø©}/g, normalizedOccasionName)
                    .replace(/{occasionName}/g, normalizedOccasionName);

                // 2. Apply Spintax {A|B|C} Ø¹Ø´ÙˆØ§Ø¦ÙŠ
                personalizedMessage = parseSpintax(personalizedMessage);

                const formattedPhone = WhatsAppNotificationService.formatPhoneNumber(customer.phone);

                try {
                    if (!formattedPhone) {
                        throw new Error('Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ ØºÙŠØ± ØµØ§Ù„Ø­ (Ø¨ØªÙ†Ø³ÙŠÙ‚ ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ…)');
                    }

                    if (productMediaUrl) {
                        await WhatsAppMessageHandler.sendImage(targetSessionId, formattedPhone, productMediaUrl, mediaCaption || personalizedMessage);
                    } else {
                        await WhatsAppMessageHandler.sendText(targetSessionId, formattedPhone, personalizedMessage);
                    }
                    campaign.sent++;
                } catch (sendErr) {
                    console.error(`[CWA-SMART] Failed to send to ${customer.phone} (${formattedPhone || 'N/A'}):`, sendErr.message);
                    campaign.failed++;
                    campaign.errors.push({
                        customerId: customer.id,
                        phone: customer.phone,
                        formattedPhone: formattedPhone,
                        name: customerName,
                        error: sendErr.message,
                        timestamp: new Date().toISOString()
                    });
                }

                // 3. Throttle with Jitter (Randomness +/- 20%)
                const jitter = (Math.random() * 0.4) + 0.8; // between 0.8 and 1.2
                const finalDelay = baseDelay * jitter;
                await new Promise(r => setTimeout(r, Math.max(500, finalDelay)));
            }

            if (activeCampaigns.has(campaignId) && activeCampaigns.get(campaignId).status === 'running') {
                const finalCampaign = activeCampaigns.get(campaignId);
                finalCampaign.status = 'completed';
                finalCampaign.completedAt = new Date().toISOString();
                console.log(`âœ… [CWA-SMART] Campaign ${campaignId} done: ${finalCampaign.sent} sent, ${finalCampaign.failed} failed`);

                // Update DB record
                await updateCampaignInDB(finalCampaign.dbId, {
                    status: 'completed',
                    sent: finalCampaign.sent,
                    failed: finalCampaign.failed,
                    sentAt: finalCampaign.completedAt,
                });
            }

            // Cleanup from memory AFTER campaign is done + 10 minutes buffer
            // Calculate estimated campaign duration (customers Ã— delay + buffer)
            const estimatedDurationMs = Math.max(
                10 * 60 * 1000, // min 10 minutes
                eligibleCustomers.length * computeBaseDelayMs(req.body) + 10 * 60 * 1000
            );
            const cleanupDelay = Math.min(estimatedDurationMs, MAX_CAMPAIGN_TIMEOUT_MS);
            setTimeout(() => {
                scheduledCampaignTimers.delete(campaignId);
                activeCampaigns.delete(campaignId);
            }, cleanupDelay);
        };

        if (scheduleInfo) {
            const timerId = setTimeout(() => {
                scheduledCampaignTimers.delete(campaignId);
                runCampaign().catch(err => {
                    console.error(`[CWA-SMART] Scheduled campaign ${campaignId} failed:`, err);
                    const current = activeCampaigns.get(campaignId);
                    if (current) {
                        current.status = 'cancelled';
                        current.completedAt = new Date().toISOString();
                        current.errors.push({
                            customerId: 'SYSTEM',
                            error: err.message || 'ÙØ´Ù„ ØªÙ†ÙÙŠØ° Ø§Ù„Ø­Ù…Ù„Ø© Ø§Ù„Ù…Ø¬Ø¯ÙˆÙ„Ø©',
                            timestamp: new Date().toISOString(),
                        });
                    }
                });
            }, scheduleInfo.delayMs);

            scheduledCampaignTimers.set(campaignId, timerId);
        } else {
            setImmediate(() => {
                runCampaign().catch(err => {
                    console.error(`[CWA-SMART] Campaign ${campaignId} failed:`, err);
                    const current = activeCampaigns.get(campaignId);
                    if (current) {
                        current.status = 'cancelled';
                        current.completedAt = new Date().toISOString();
                        current.errors.push({
                            customerId: 'SYSTEM',
                            error: err.message || 'ÙØ´Ù„ ØªÙ†ÙÙŠØ° Ø§Ù„Ø­Ù…Ù„Ø©',
                            timestamp: new Date().toISOString(),
                        });
                    }
                });
            });
        }

    } catch (error) {
        console.error('[CWA] sendSmartBulkNotification error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª: ' + error.message });
    }
};

/**
 * Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ø¦Ù„ ÙˆØ§ØªØ³Ø§Ø¨ Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¹ÙŠØ¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯ (Ù…Ù† metadata)
 */
exports.sendBirthdayBulkNotification = async (req, res) => {
    try {
        const { companyId } = req.user;
        const {
            date,
            message,
            sessionId,
            mediaUrl,
            mediaCaption,
        } = req.body || {};

        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø·Ù„ÙˆØ¨Ø©' });
        }

        // 1) Check session
        const connectedSessions = await getConnectedSessions(companyId);
        const usableSession = connectedSessions.find(s => s.isConnected);
        if (!usableSession) {
            return res.status(400).json({
                success: false,
                message: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ù…ØªØµÙ„Ø©. ÙŠØ±Ø¬Ù‰ Ø±Ø¨Ø· ÙˆØ§ØªØ³Ø§Ø¨ Ø£ÙˆÙ„Ø§Ù‹.',
            });
        }
        const targetSessionId = sessionId || usableSession.sessionId;

        // 2) Build birthday audience
        const { target, customers: eligibleCustomers } = await getBirthdayAudienceCustomers(companyId, date);
        if (eligibleCustomers.length === 0) {
            return res.status(400).json({
                success: false,
                message: `Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù…Ù„Ø§Ø¡ Ù„Ø¯ÙŠÙ‡Ù… Ø¹ÙŠØ¯ Ù…ÙŠÙ„Ø§Ø¯ ÙÙŠ ${target.isoDate}.`,
            });
        }

        const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const userId = req.user?.id || req.user?.userId;
        const dbCampaignId = await persistCampaignToDB(companyId, userId, {
            occasionName: 'ØªÙ‡Ù†Ø¦Ø© Ø¹ÙŠØ¯ Ù…ÙŠÙ„Ø§Ø¯',
            message: message,
            audience: 'birthday',
            scheduledAt: null,
            status: 'running',
            total: eligibleCustomers.length,
        });

        activeCampaigns.set(campaignId, {
            status: 'running',
            sent: 0,
            failed: 0,
            total: eligibleCustomers.length,
            startedAt: new Date().toISOString(),
            errors: [],
            dbId: dbCampaignId
        });

        res.json({
            success: true,
            campaignId,
            total: eligibleCustomers.length,
            date: target.isoDate,
            message: `Ø¨Ø¯Ø£ Ø¥Ø±Ø³Ø§Ù„ ØªÙ‡Ù†Ø¦Ø© Ø¹ÙŠØ¯ Ù…ÙŠÙ„Ø§Ø¯ Ù„Ù€ ${eligibleCustomers.length} Ø¹Ù…ÙŠÙ„.`,
        });

        setImmediate(async () => {
            const campaign = activeCampaigns.get(campaignId);
            if (!campaign) return;

            const baseDelay = computeBaseDelayMs(req.body);
            const baseMessage = String(message).trim();

            for (const customer of eligibleCustomers) {
                const currentCampaign = activeCampaigns.get(campaignId);
                if (!currentCampaign || currentCampaign.status === 'cancelled') {
                    console.log(`ðŸ›‘ [CWA-BIRTHDAY] Campaign ${campaignId} stopped.`);
                    break;
                }

                const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Ø¹Ø²ÙŠØ²ÙŠ Ø§Ù„Ø¹Ù…ÙŠÙ„';
                const ageText = customer.age != null ? String(customer.age) : '';

                let personalizedMessage = baseMessage
                    .replace(/{Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„}/g, customerName)
                    .replace(/{customerName}/g, customerName)
                    .replace(/{Ø§Ù„Ø¹Ù…Ø±}/g, ageText)
                    .replace(/{age}/g, ageText);
                personalizedMessage = parseSpintax(personalizedMessage);

                const formattedPhone = WhatsAppNotificationService.formatPhoneNumber(customer.phone);

                try {
                    if (!formattedPhone) {
                        throw new Error('Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ ØºÙŠØ± ØµØ§Ù„Ø­ (Ø¨ØªÙ†Ø³ÙŠÙ‚ ØºÙŠØ± Ù…Ø¯Ø¹ÙˆÙ…)');
                    }

                    if (mediaUrl) {
                        await WhatsAppMessageHandler.sendImage(targetSessionId, formattedPhone, mediaUrl, mediaCaption || personalizedMessage);
                    } else {
                        await WhatsAppMessageHandler.sendText(targetSessionId, formattedPhone, personalizedMessage);
                    }
                    campaign.sent++;
                } catch (sendErr) {
                    campaign.failed++;
                    campaign.errors.push({
                        customerId: customer.id,
                        phone: customer.phone,
                        name: customerName,
                        error: sendErr.message,
                        timestamp: new Date().toISOString(),
                    });
                    console.error(`[CWA-BIRTHDAY] Failed to send to ${customer.phone}:`, sendErr.message);
                }

                const jitter = (Math.random() * 0.4) + 0.8;
                const finalDelay = baseDelay * jitter;
                await new Promise(r => setTimeout(r, Math.max(500, finalDelay)));
            }

            const latest = activeCampaigns.get(campaignId);
            if (latest && latest.status === 'running') {
                latest.status = 'completed';
                latest.completedAt = new Date().toISOString();
                console.log(`âœ… [CWA-BIRTHDAY] Campaign ${campaignId} done: ${latest.sent} sent, ${latest.failed} failed`);
                
                // Update DB record
                await updateCampaignInDB(latest.dbId, {
                    status: 'completed',
                    sent: latest.sent,
                    failed: latest.failed,
                    sentAt: latest.completedAt,
                });
            }

            // Cleanup from memory AFTER campaign is done + 10 minutes buffer
            // Calculate estimated campaign duration (customers Ã— delay + buffer)
            const estimatedDurationMs = Math.max(
                10 * 60 * 1000, // min 10 minutes
                eligibleCustomers.length * computeBaseDelayMs(req.body) + 10 * 60 * 1000
            );
            const cleanupDelay = Math.min(estimatedDurationMs, MAX_CAMPAIGN_TIMEOUT_MS);
            setTimeout(() => activeCampaigns.delete(campaignId), cleanupDelay);
        });
    } catch (error) {
        if (error?.code === 'INVALID_DATE') {
            return res.status(400).json({ success: false, message: 'ØµÙŠØºØ© Ø§Ù„ØªØ§Ø±ÙŠØ® ØºÙŠØ± ØµØ­ÙŠØ­Ø©' });
        }
        console.error('[CWA] sendBirthdayBulkNotification error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¥Ø±Ø³Ø§Ù„ ØªÙ‡Ù†Ø¦Ø© Ø¹ÙŠØ¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯: ' + error.message });
    }
};

/**
 * Ø¥ÙŠÙ‚Ø§Ù Ø­Ù…Ù„Ø© Ø¬Ø§Ø±ÙŠØ©
 */
exports.stopCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = activeCampaigns.get(campaignId);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Ø§Ù„Ø­Ù…Ù„Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' });
        }

        const scheduledTimer = scheduledCampaignTimers.get(campaignId);
        if (scheduledTimer) {
            clearTimeout(scheduledTimer);
            scheduledCampaignTimers.delete(campaignId);
        }

        campaign.status = 'cancelled';
        campaign.completedAt = campaign.completedAt || new Date().toISOString();

        // Update DB record on cancellation
        await updateCampaignInDB(campaign.dbId, {
            status: 'cancelled',
            sent: campaign.sent,
            failed: campaign.failed,
            sentAt: campaign.completedAt,
        });

        setTimeout(() => {
            scheduledCampaignTimers.delete(campaignId);
            activeCampaigns.delete(campaignId);
        }, 10 * 60 * 1000);
        return res.json({ success: true, message: 'ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ø­Ù…Ù„Ø©' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Ø¬Ù„Ø¨ Ø³Ø¬Ù„ Ø§Ù„Ø­Ù…Ù„Ø§Øª Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© Ù…Ù† Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
 */
exports.getCampaignHistory = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { limit = 20 } = req.query;
        const prisma = getSharedPrismaClient();

        const campaigns = await safeQuery(() =>
            prisma.broadcastCampaign.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                select: {
                    id: true,
                    name: true,
                    targetAudience: true,
                    status: true,
                    recipientCount: true,
                    sentCount: true,
                    failedCount: true,
                    scheduledAt: true,
                    sentAt: true,
                    createdAt: true,
                }
            })
        );

        return res.json({ success: true, campaigns });
    } catch (error) {
        console.error('[CWA] getCampaignHistory error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø³Ø¬Ù„ Ø§Ù„Ø­Ù…Ù„Ø§Øª' });
    }
};

/**
 * ØªØªØ¨Ø¹ Ø­Ø§Ù„Ø© Ø­Ù…Ù„Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„
 */
exports.getCampaignStatus = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = activeCampaigns.get(campaignId);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Ø§Ù„Ø­Ù…Ù„Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ Ø§Ù†ØªÙ‡Øª' });
        }

        return res.json({
            success: true,
            campaignId,
            ...campaign,
            progress: campaign.total > 0
                ? Math.round(((campaign.sent + campaign.failed) / campaign.total) * 100)
                : 0,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± ÙˆØ§ØªØ³Ø§Ø¨ Ø¬Ù…Ø§Ø¹ÙŠ Ù„Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ø®ØªØ§Ø±ÙŠÙ† ÙŠØ¯ÙˆÙŠØ§Ù‹ (legacy)
 */
exports.sendBulkWhatsAppNotification = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { customerIds, message, sessionId, mediaUrl, mediaCaption } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø·Ù„ÙˆØ¨Ø©' });
        }
        if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
            return res.status(400).json({ success: false, message: 'ÙŠØ¬Ø¨ ØªØ­Ø¯ÙŠØ¯ Ø¹Ù…ÙŠÙ„ ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' });
        }

        const prisma = getSharedPrismaClient();
        const customers = await safeQuery(() =>
            prisma.customer.findMany({
                where: { id: { in: customerIds }, companyId },
                select: { id: true, firstName: true, lastName: true, phone: true },
            })
        );

        const connectedSessions = await getConnectedSessions(companyId);
        if (connectedSessions.length === 0) {
            return res.status(400).json({ success: false, message: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¬Ù„Ø³Ø§Øª ÙˆØ§ØªØ³Ø§Ø¨ Ù…ØªØµÙ„Ø©.' });
        }

        const targetSessionId = sessionId || connectedSessions[0].sessionId;
        const results = { sent: 0, failed: 0, errors: [] };

        for (const customer of customers) {
            if (!customer.phone) {
                results.failed++;
                results.errors.push({ customerId: customer.id, error: 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø±Ù‚Ù… Ù‡Ø§ØªÙ' });
                continue;
            }

            const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Ø¹Ø²ÙŠØ²ÙŠ Ø§Ù„Ø¹Ù…ÙŠÙ„';
            const personalizedMessage = message.replace(/{Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„}/g, customerName).replace(/{customerName}/g, customerName);

            try {
                if (mediaUrl) {
                    await WhatsAppMessageHandler.sendImage(targetSessionId, customer.phone, mediaUrl, mediaCaption || personalizedMessage);
                } else {
                    await WhatsAppMessageHandler.sendText(targetSessionId, customer.phone, personalizedMessage);
                }
                results.sent++;
                await new Promise(r => setTimeout(r, 1200));
            } catch (sendErr) {
                console.error(`[CWA] Failed to send to ${customer.phone}:`, sendErr.message);
                results.failed++;
                results.errors.push({ customerId: customer.id, phone: customer.phone, error: sendErr.message });
            }
        }

        return res.json({ success: true, message: 'ØªÙ… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„', results });
    } catch (error) {
        console.error('[CWA] sendBulkWhatsAppNotification error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª: ' + error.message });
    }
};

/**
 * Ø¬Ù„Ø¨ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª (Ù„Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª)
 */
exports.getProductsForNotification = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { search, limit = 50 } = req.query;

        const prisma = getSharedPrismaClient();
        const where = { companyId, isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const products = await safeQuery(() =>
            prisma.product.findMany({
                where,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, price: true, images: true, description: true },
            })
        );

        return res.json({ success: true, data: products });
    } catch (error) {
        console.error('[CWA] getProductsForNotification error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª' });
    }
};

/**
 * ðŸŽ‰ Ø¬Ø¯ÙˆÙ„Ø© Ø­Ù…Ù„Ø© Ù…Ù†Ø§Ø³Ø¨Ø© (Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒ) â€” Ø¨ØªØªØ¨Ø¹Øª Ù„ÙˆØ­Ø¯Ù‡Ø§ ÙÙŠ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù…Ø­Ø¯Ø¯
 * POST /api/v1/customers/whatsapp-notify/occasions/schedule
 */
exports.scheduleOccasionCampaign = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { name, message, scheduledAt, targetAudience } = req.body || {};

        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ù…Ø·Ù„ÙˆØ¨Ø©' });
        }
        if (!scheduledAt) {
            return res.status(400).json({ success: false, message: 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ù…Ø·Ù„ÙˆØ¨' });
        }

        const prisma = getSharedPrismaClient();
        const record = await prisma.broadcastCampaign.create({
            data: {
                companyId,
                name: name || 'Ø­Ù…Ù„Ø© Ù…Ù†Ø§Ø³Ø¨Ø©',
                message: String(message).trim(),
                channel: 'whatsapp',
                targetAudience: targetAudience || 'all',
                scheduledAt: new Date(scheduledAt),
                status: 'scheduled',
                creatorId: req.user?.id || null
            }
        });

        return res.json({
            success: true,
            data: record,
            message: 'ØªÙ…Øª Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ø­Ù…Ù„Ø© â€” Ù‡ØªØªØ¨Ø¹Øª ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ÙÙŠ Ø§Ù„Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù…Ø­Ø¯Ø¯'
        });
    } catch (error) {
        console.error('[CWA] scheduleOccasionCampaign error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ø¯ÙˆÙ„Ø© Ø§Ù„Ø­Ù…Ù„Ø©' });
    }
};

/**
 * ðŸ“‹ Ù‚Ø§Ø¦Ù…Ø© Ø­Ù…Ù„Ø§Øª Ø§Ù„Ù…Ù†Ø§Ø³Ø¨Ø§Øª Ø§Ù„Ù…Ø¬Ø¯ÙˆÙ„Ø©
 * GET /api/v1/customers/whatsapp-notify/occasions/scheduled
 */
exports.getScheduledOccasionCampaigns = async (req, res) => {
    try {
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();
        const campaigns = await prisma.broadcastCampaign.findMany({
            where: { companyId, channel: 'whatsapp', status: 'scheduled' },
            orderBy: { scheduledAt: 'asc' },
            take: 100
        });
        return res.json({ success: true, data: campaigns });
    } catch (error) {
        console.error('[CWA] getScheduledOccasionCampaigns error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø­Ù…Ù„Ø§Øª Ø§Ù„Ù…Ø¬Ø¯ÙˆÙ„Ø©' });
    }
};


const birthdaySettingsStore = new Map();

/**
 * Ø¬Ù„Ø¨ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø£ØªÙ…ØªØ© Ø±Ø³Ø§Ø¦Ù„ Ø§Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯
 */
exports.getBirthdayAutomationSettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const prisma = getSharedPrismaClient();

        let settings = birthdaySettingsStore.get(companyId);
        if (!settings) {
            // Ù…Ø­Ø§ÙˆÙ„Ø© Ø¬Ù„Ø¨ Ù…Ù† DB Ø¥Ù† ÙˆØ¬Ø¯ ÙÙŠ StoreSetting Ø£Ùˆ Ø§ÙØªØ±Ø§Ø¶ÙŠ
            try {
                const storeSetting = await prisma.storeSetting.findFirst({
                    where: { companyId, key: 'whatsapp_birthday_automation' }
                });
                if (storeSetting && storeSetting.value) {
                    settings = typeof storeSetting.value === 'string' ? JSON.parse(storeSetting.value) : storeSetting.value;
                }
            } catch (e) {
                // Ignore DB error fallback to default
            }
        }

        if (!settings) {
            settings = {
                isEnabled: true,
                dailySendTime: '12:00',
                channel: 'whatsapp_session', // 'meta_api' or 'whatsapp_session'
                messageTemplate: '🎉 كل سنة وأنت طيب يا {first_name}! 🎂\n\nبمناسبة عيد ميلادك، يسعدنا أن نقدم لك هدية خاصة وخصم مميز من متجرنا.\nاستخدم كود الخصم: {coupon_code}\n\nاضغط على الرابط التالي للدخول لصفحتك واستلام هديتك فوراً:\n🔗 {customer_link}\n\nنتمنى لك سنة سعيدة مليئة بالنجاح! ❤️',
                couponCode: 'HBD10',
                metaTemplateName: 'birthday_greeting_v1'
            };
        }

        if (settings && typeof settings.messageTemplate === 'string') {
            settings.messageTemplate = fixMojibake(settings.messageTemplate);
        }

        return res.json({ success: true, data: settings });
    } catch (error) {
        console.error('[CWA] getBirthdayAutomationSettings error:', error);
        return res.status(500).json({ success: false, message: 'ÙØ´Ù„ ÙÙŠ Ø¬Ù„Ø¨ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯' });
    }
};

/**
 * Ø­ÙØ¸ ÙˆØªØ­Ø¯ÙŠØ« Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø£ØªÙ…ØªØ© Ø§Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯
 */
exports.saveBirthdayAutomationSettings = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { isEnabled, dailySendTime, channel, messageTemplate, couponCode, metaTemplateName } = req.body;
        const prisma = getSharedPrismaClient();

        const updatedSettings = {
            isEnabled: Boolean(isEnabled),
            dailySendTime: dailySendTime || '12:00',
            channel: channel || 'whatsapp_session',
            messageTemplate: fixMojibake(messageTemplate || ''),
            couponCode: couponCode || '',
            metaTemplateName: metaTemplateName || 'birthday_greeting_v1',
            updatedAt: new Date().toISOString()
        };

        birthdaySettingsStore.set(companyId, updatedSettings);

        try {
            await prisma.storeSetting.upsert({
                where: { companyId_key: { companyId, key: 'whatsapp_birthday_automation' } },
                update: { value: JSON.stringify(updatedSettings) },
                create: { companyId, key: 'whatsapp_birthday_automation', value: JSON.stringify(updatedSettings) }
            });
        } catch (dbErr) {
            console.log('[CWA] DB save warning for birthday settings:', dbErr.message);
        }

        return res.json({ success: true, message: 'ØªÙ… Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø¨Ù†Ø¬Ø§Ø­', data: updatedSettings });
    } catch (error) {
        console.error('[CWA] saveBirthdayAutomationSettings error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª' });
    }
};

/**
 * Ø¬Ù„Ø¨ ØªØªØ¨Ø¹ Ø§Ø¹ÙŠØ§Ø¯ Ù…ÙŠÙ„Ø§Ø¯ Ø§Ù„ÙŠÙˆÙ… (Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ + Ø­Ø§Ù„Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„)
 */
exports.getTodayBirthdayTrack = async (req, res) => {
    try {
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const customers = await safeQuery(() =>
            prisma.customer.findMany({
                where: { companyId, isDeleted: { not: true } },
                select: { id: true, firstName: true, lastName: true, phone: true, email: true, metadata: true, createdAt: true }
            })
        );

        const todayBirthdays = [];
        for (const customer of customers) {
            const dateParts = extractBirthdayParts(customer);
            if (dateParts && dateParts.month === currentMonth && dateParts.day === currentDay) {
                todayBirthdays.push({
                    id: customer.id,
                    name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Ø¹Ù…ÙŠÙ„ Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…',
                    phone: customer.phone,
                    email: customer.email,
                    birthday: `${dateParts.year || '----'}-${pad2(dateParts.month)}-${pad2(dateParts.day)}`,
                    age: dateParts.year ? today.getFullYear() - dateParts.year : null,
                    scheduledTime: '12:00 PM',
                    status: 'scheduled', // 'scheduled' | 'sent' | 'failed'
                    sentAt: null
                });
            }
        }

        return res.json({
            success: true,
            totalToday: todayBirthdays.length,
            data: todayBirthdays
        });
    } catch (error) {
        console.error('[CWA] getTodayBirthdayTrack error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ø¹ÙŠØ§Ø¯ Ù…ÙŠÙ„Ø§Ø¯ Ø§Ù„ÙŠÙˆÙ…' });
    }
};

/**
 * Ø¬Ù„Ø¨ Ø§Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯ Ø§Ù„Ù‚Ø§Ø¯Ù…Ø© (Ø®Ù„Ø§Ù„ N ÙŠÙˆÙ…)
 */
exports.getUpcomingBirthdaysTrack = async (req, res) => {
    try {
        const { companyId } = req.user;
        const daysAhead = parseInt(req.query.days || '30', 10);
        const prisma = getSharedPrismaClient();

        const customers = await safeQuery(() =>
            prisma.customer.findMany({
                where: { companyId, isDeleted: { not: true } },
                select: { id: true, firstName: true, lastName: true, phone: true, metadata: true }
            })
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = [];
        for (const customer of customers) {
            const dateParts = extractBirthdayParts(customer);
            if (!dateParts) continue;

            const nextBday = new Date(today.getFullYear(), dateParts.month - 1, dateParts.day);
            if (nextBday < today) {
                nextBday.setFullYear(today.getFullYear() + 1);
            }

            const diffTime = nextBday.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= daysAhead) {
                upcoming.push({
                    id: customer.id,
                    name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Ø¹Ù…ÙŠÙ„ Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…',
                    phone: customer.phone,
                    birthdayDate: `${pad2(dateParts.month)}-${pad2(dateParts.day)}`,
                    daysRemaining: diffDays,
                    formattedNextDate: nextBday.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })
                });
            }
        }

        upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);

        return res.json({ success: true, total: upcoming.length, data: upcoming });
    } catch (error) {
        console.error('[CWA] getUpcomingBirthdaysTrack error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯ Ø§Ù„Ù‚Ø§Ø¯Ù…Ø©' });
    }
};

/**
 * Ø¬Ù„Ø¨ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¨Ø¯ÙˆÙ† ØªØ§Ø±ÙŠØ® Ù…ÙŠÙ„Ø§Ø¯ Ù„ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†
 */
exports.getMissingBirthdaysTrack = async (req, res) => {
    try {
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();

        const customers = await safeQuery(() =>
            prisma.customer.findMany({
                where: { companyId, isDeleted: { not: true } },
                select: { id: true, firstName: true, lastName: true, phone: true, email: true, metadata: true, createdAt: true },
                take: 100
            })
        );

        const missing = [];
        for (const customer of customers) {
            const dateParts = extractBirthdayParts(customer);
            if (!dateParts) {
                missing.push({
                    id: customer.id,
                    name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Ø¹Ù…ÙŠÙ„ Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…',
                    phone: customer.phone,
                    email: customer.email,
                    createdAt: customer.createdAt
                });
            }
        }

        return res.json({ success: true, totalMissing: missing.length, data: missing });
    } catch (error) {
        console.error('[CWA] getMissingBirthdaysTrack error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù†Ø§Ù‚Øµ Ø¨ÙŠØ§Ù†Ø§ØªÙ‡Ù…' });
    }
};

/**
 * Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø© ØªÙ‡Ù†Ø¦Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ©
 */
exports.sendTestBirthdayMessage = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { testPhone, messageTemplate, couponCode } = req.body;

        if (!testPhone) {
            return res.status(400).json({ success: false, message: 'ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ Ø§Ù„ØªØ¬Ø±ÙŠØ¨ÙŠ' });
        }

        const formattedMsg = (messageTemplate || 'ÙƒÙ„ Ø³Ù†Ø© ÙˆØ£Ù†Øª Ø·ÙŠØ¨ ÙŠØ§ {first_name}!')
            .replace(/\{first_name\}/g, 'Ø£Ø­Ù…Ø¯')
            .replace(/\{full_name\}/g, 'Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…ÙˆØ¯')
            .replace(/\{coupon_code\}/g, couponCode || 'TEST10')
            .replace(/\{company_name\}/g, 'Ù…ØªØ¬Ø±Ù†Ø§')
            .replace(/\{customer_link\}/g, 'https://yourdomain.com/customer/profile?token=demo');


        const { channel = 'auto' } = req.body;

        // 1. Attempt Meta Cloud API if explicitly requested or auto
        if (channel === 'meta_api' || channel === 'auto') {
            try {
                const MetaCloudProvider = require('../services/whatsapp/providers/MetaCloudProvider');
                const prisma = getSharedPrismaClient();
                const metaSession = await safeQuery(() =>
                    prisma.whatsAppSession.findFirst({
                        where: {
                            companyId,
                            OR: [
                                { provider: 'meta' },
                                { metaAccessToken: { not: null } },
                                { metaPhoneNumberId: { not: null } }
                            ]
                        }
                    })
                );

                if (metaSession) {
                    await MetaCloudProvider.sendTextMessage(metaSession, testPhone, formattedMsg);
                    return res.json({ success: true, message: `تم إرسال الرسالة بنجاح عبر Meta WhatsApp Cloud API إلى الرقم ${testPhone}` });
                }
            } catch (metaErr) {
                console.error('[CWA] Meta Cloud API Send Fallback:', metaErr.message);
                if (channel === 'meta_api') {
                    console.log('[CWA] Meta API explicit send failed, falling back to connected WhatsApp Session...');
                }
            }
        }

        const activeSessions = await getConnectedSessions(companyId);
        if (!activeSessions || activeSessions.length === 0) {
            return res.status(400).json({ success: false, message: 'لا توجد جلسات واتساب متصلة حالياً لإرسال الاختيار التجريبي' });
        }

        const sessionId = activeSessions[0].sessionId;
        await WhatsAppMessageHandler.sendTextMessage(sessionId, testPhone, formattedMsg);

        return res.json({ success: true, message: `ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ¬Ø±ÙŠØ¨ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­ Ø¥Ù„Ù‰ Ø§Ù„Ø±Ù‚Ù… ${testPhone}` });
    } catch (error) {
        console.error('[CWA] sendTestBirthdayMessage error:', error);
        return res.status(500).json({ success: false, message: 'ÙØ´Ù„ ÙÙŠ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ¬Ø±ÙŠØ¨ÙŠØ©: ' + error.message });
    }
};

/**
 * ðŸ“Š Birthday Analytics Reports
 * Ø¬Ù„Ø¨ Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø­Ù…Ù„Ø§Øª Ø£Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯ Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø© Ù…Ù† Ù…ØµØ§Ø¯Ø± Ø­Ù‚ÙŠÙ‚ÙŠØ©
 *
 * Query params:
 *   range : 'today' | 'week' | 'month' | 'all' | 'custom'
 *   from  : ISO date (YYYY-MM-DD) â€” required when range=custom
 *   to    : ISO date (YYYY-MM-DD) â€” required when range=custom
 */
exports.getBirthdayAnalyticsReports = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { range = 'all', from, to } = req.query;

        const prisma = getSharedPrismaClient();
        const now = new Date();

        // â”€â”€ Resolve date window â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let fromDate = null;
        let toDate = null;

        if (range === 'custom' && from && to) {
            fromDate = new Date(`${String(from).split('T')[0]}T00:00:00.000Z`);
            toDate = new Date(`${String(to).split('T')[0]}T23:59:59.999Z`);
        } else if (range === 'today') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            fromDate = start;
            toDate = new Date(now);
            toDate.setHours(23, 59, 59, 999);
        } else if (range === 'week') {
            const start = new Date(now);
            const day = start.getDay();
            start.setDate(start.getDate() - day);
            start.setHours(0, 0, 0, 0);
            fromDate = start;
            toDate = new Date();
        } else if (range === 'month') {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            toDate = new Date();
        } else {
            // 'all' â€” no lower bound
            toDate = new Date();
        }

        const dateFilter = {};
        if (fromDate) dateFilter.gte = fromDate;
        if (toDate) dateFilter.lte = toDate;

        // â”€â”€ 1) Targeted customers (prospective) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Count customers whose birthday falls inside the window.
        let prospectiveCustomers = 0;
        try {
            if (range === 'today' || range === 'custom') {
                // iterate day-by-day across the window
                const start = fromDate || new Date(now.getFullYear(), now.getMonth(), 1);
                const end = toDate || now;
                const cursor = new Date(start);
                while (cursor <= end) {
                    const iso = cursor.toISOString().split('T')[0];
                    const { customers } = await getBirthdayAudienceCustomers(companyId, iso);
                    prospectiveCustomers += customers.length;
                    cursor.setDate(cursor.getDate() + 1);
                    if (prospectiveCustomers > 5_000_000) break; // safety
                }
            } else {
                // for week/month/all we approximate prospective via campaign recipient totals
                const campaigns = await safeQuery(() =>
                    prisma.broadcastCampaign.findMany({
                        where: {
                            companyId,
                            targetAudience: 'birthday',
                            ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
                        },
                        select: { recipientCount: true }
                    })
                );
                prospectiveCustomers = (campaigns || []).reduce((acc, c) => acc + (c.recipientCount || 0), 0);
            }
        } catch (e) {
            console.log('[CWA] Analytics prospective fetch error:', e.message);
        }

        // â”€â”€ 2) Sent / failed messages (real campaigns) â”€â”€â”€â”€â”€â”€â”€â”€
        let totalMessagesSent = 0;
        let failedMessages = 0;
        try {
            const campaigns = await safeQuery(() =>
                prisma.broadcastCampaign.findMany({
                    where: {
                        companyId,
                        targetAudience: 'birthday',
                        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
                    },
                    select: { sentCount: true, failedCount: true, recipientCount: true }
                })
            );
            if (campaigns && Array.isArray(campaigns)) {
                totalMessagesSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
                failedMessages = campaigns.reduce((acc, c) => acc + (c.failedCount || 0), 0);
            }
        } catch (e) {
            console.log('[CWA] Analytics campaigns fetch error:', e.message);
        }

        // â”€â”€ 3) Coupon usage (option A: couponCode from settings) â”€
        let couponCode = null;
        try {
            const storeSetting = await prisma.storeSetting.findFirst({
                where: { companyId, key: 'whatsapp_birthday_automation' }
            });
            if (storeSetting && storeSetting.value) {
                const s = typeof storeSetting.value === 'string'
                    ? JSON.parse(storeSetting.value)
                    : storeSetting.value;
                couponCode = (s.couponCode || '').trim();
            }
        } catch (e) {
            console.log('[CWA] Analytics settings fetch error:', e.message);
        }

        let usedCoupons = 0;
        let totalSales = 0;
        let couponUsages = [];
        if (couponCode) {
            let coupon = null;
            try {
                coupon = await safeQuery(() =>
                    prisma.coupon.findFirst({
                        where: { companyId, code: { equals: couponCode, mode: 'insensitive' } },
                        select: { id: true }
                    })
                );
            } catch (e) {
                console.log('[CWA] Analytics coupon lookup error:', e.message);
            }

            if (coupon && coupon.id) {
                try {
                    couponUsages = await safeQuery(() =>
                        prisma.couponUsage.findMany({
                            where: {
                                companyId,
                                couponId: coupon.id,
                                ...(Object.keys(dateFilter).length ? { usedAt: dateFilter } : {})
                            },
                            select: {
                                id: true,
                                customerId: true,
                                orderId: true,
                                discountAmount: true,
                                orderAmount: true,
                                usedAt: true
                            },
                            orderBy: { usedAt: 'desc' },
                            take: 50
                        })
                    );
                    if (couponUsages && Array.isArray(couponUsages)) {
                        usedCoupons = couponUsages.length;
                        totalSales = couponUsages.reduce(
                            (sum, u) => sum + (Number(u.orderAmount) || 0), 0
                        );
                    }
                } catch (e) {
                    console.log('[CWA] Analytics coupon usage fetch error:', e.message);
                }
            }
        }

        const conversionRate = prospectiveCustomers > 0
            ? ((usedCoupons / prospectiveCustomers) * 100).toFixed(2)
            : 0;

        return res.json({
            success: true,
            data: {
                timeRange: range,
                from: fromDate ? fromDate.toISOString() : null,
                to: toDate ? toDate.toISOString() : null,
                couponCode,
                prospectiveCustomers,
                totalMessagesSent,
                failedMessages,
                usedCoupons,
                conversionRate: parseFloat(conversionRate),
                totalSales: Number(totalSales.toFixed(2)),
                couponUsages: (couponUsages || []).map(u => ({
                    id: u.id,
                    customerId: u.customerId,
                    orderId: u.orderId,
                    discountAmount: Number(u.discountAmount) || 0,
                    orderAmount: Number(u.orderAmount) || 0,
                    usedAt: u.usedAt
                }))
            }
        });

    } catch (error) {
        console.error('[CWA] getBirthdayAnalyticsReports error:', error);
        return res.status(500).json({ success: false, message: 'Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø£Ø¹ÙŠØ§Ø¯ Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯' });
    }
};

/**
 * 🎉 جدولة حملة مناسبة (أوتوماتيك) — بتتبعت لوحدها في الموعد المحدد
 * POST /api/v1/customers/whatsapp-notify/occasions/schedule
 */
exports.scheduleOccasionCampaign = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { name, message, scheduledAt, targetAudience } = req.body || {};

        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
        }
        if (!scheduledAt) {
            return res.status(400).json({ success: false, message: 'تاريخ الإرسال مطلوب' });
        }

        const prisma = getSharedPrismaClient();
        const record = await prisma.broadcastCampaign.create({
            data: {
                companyId,
                name: name || 'حملة مناسبة',
                message: String(message).trim(),
                channel: 'whatsapp',
                targetAudience: targetAudience || 'all',
                scheduledAt: new Date(scheduledAt),
                status: 'scheduled',
                creatorId: req.user?.id || null
            }
        });

        return res.json({
            success: true,
            data: record,
            message: 'تمت جدولة الحملة — هتتبعت تلقائياً في الموعد المحدد'
        });
    } catch (error) {
        console.error('[CWA] scheduleOccasionCampaign error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في جدولة الحملة' });
    }
};

/**
 * 📋 قائمة حملات المناسبات المجدولة
 * GET /api/v1/customers/whatsapp-notify/occasions/scheduled
 */
exports.getScheduledOccasionCampaigns = async (req, res) => {
    try {
        const { companyId } = req.user;
        const prisma = getSharedPrismaClient();
        const campaigns = await prisma.broadcastCampaign.findMany({
            where: { companyId, channel: 'whatsapp', status: 'scheduled' },
            orderBy: { scheduledAt: 'asc' },
            take: 100
        });
        return res.json({ success: true, data: campaigns });
    } catch (error) {
        console.error('[CWA] getScheduledOccasionCampaigns error:', error);
        return res.status(500).json({ success: false, message: 'خطأ في جلب الحملات المجدولة' });
    }
};
