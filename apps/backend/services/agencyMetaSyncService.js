/**
 * Agency Meta Sync Service
 * ═══════════════════════
 * يربط موديول Agency OS بخدمة Meta الإعلانية الموجودة بالفعل
 * (`facebookAdsService`) وبمصدر التوكن الموجود في إعدادات الشركة
 * (`Company.facebookAdsAccessToken` / `facebookUserAccessToken` — نفس مصدر
 * `facebookAdsBudgetAlertService.getCompanyAdsAccessToken`).
 *
 * المسؤوليات:
 *  - قراءة اعتماد ميتا (توكن + adAccountId) بدون أي توكن جديد أو hardcode.
 *  - تحويل نتائج Insights اليومية إلى صفوف `dailyLogs` بصيغة الوكالة الحالية.
 *  - upsert بالتاريخ: صف واحد لكل تاريخ فقط، مع الحفاظ على الحقول التي لا تأتي من ميتا.
 *  - إعادة حساب `monthlyLogs` كمجموع للـ dailyLogs (بنفس منطق logClientPerformance)
 *    مع عدم المساس بحالة السداد `isPaid` / `paidAt`.
 *  - استيراد CSV لتقرير ميتا كبديل احتياطي بنفس الـ upsert.
 *
 * ملاحظات صدق البيانات: أي رقم لا يرجعه ميتا فعليًا لا يُكتب كصفر مضلل؛
 * يتم الحفاظ على القيمة اليدوية الموجودة (إن وُجدت) وتسجيلها في `unavailableMetrics`.
 */

const crypto = require('crypto');

const META_SOURCE = 'META';
const CSV_SOURCE = 'CSV';
const MANUAL_SOURCE = 'MANUAL';

const PURCHASE_ACTION_TYPES = [
    'purchase',
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_web_purchase',
];

/** يحوّل أي صيغة لحساب إعلاني إلى `act_<digits>` بشكل موحّد. */
function normalizeAdAccountId(adAccountId) {
    const raw = String(adAccountId || '').trim();
    if (!raw) return '';
    const withoutPrefix = raw.replace(/^act_/i, '');
    return `act_${withoutPrefix}`;
}

/** نفس مصدر التوكن المستخدم في facebookAdsBudgetAlertService. */
function pickCompanyAdsToken(company) {
    return company?.facebookAdsAccessToken || company?.facebookUserAccessToken || null;
}

function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function addDays(isoDate, days) {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** آخر 30 يومًا شامل اليوم (default الفترة لو المستخدم مبعتش from/to). */
function defaultDateRange(today = new Date().toISOString().slice(0, 10)) {
    return { from: addDays(today, -29), to: today };
}

function extractPurchaseMetric(actions, actionValues) {
    const pick = (list) => {
        if (!Array.isArray(list)) return { reported: false, value: 0 };
        for (const type of PURCHASE_ACTION_TYPES) {
            const hit = list.find((item) => String(item?.action_type || '').toLowerCase() === type);
            if (hit) {
                return { reported: true, value: Number(hit.value) || 0 };
            }
        }
        // المصفوفة موجودة لكن مفيش شراء مسجّل ⇒ ميتا بتقول صفر فعلاً
        return { reported: true, value: 0 };
    };

    const orders = pick(actions);
    const sales = pick(actionValues);
    return {
        ordersReported: orders.reported,
        ordersCount: Math.round(orders.value),
        salesReported: sales.reported,
        salesRevenue: round2(sales.value),
    };
}

/**
 * يحوّل صفوف Insights (time_increment=1) إلى خريطة يومية مجمّعة.
 * @returns {Array<{date, adSpend, ordersCount, salesRevenue, ordersReported, salesReported, campaigns}>}
 */
function aggregateInsightsByDate(insightRows) {
    const byDate = new Map();

    (Array.isArray(insightRows) ? insightRows : []).forEach((row) => {
        const date = String(row?.date_start || row?.date_stop || '').slice(0, 10);
        if (!isValidIsoDate(date)) return;

        const spend = toNumberOrNull(row?.spend) || 0;
        const purchase = extractPurchaseMetric(row?.actions, row?.action_values);

        const current = byDate.get(date) || {
            date,
            adSpend: 0,
            ordersCount: 0,
            salesRevenue: 0,
            ordersReported: true,
            salesReported: true,
            campaigns: 0,
        };

        current.adSpend = round2(current.adSpend + spend);
        current.ordersCount += purchase.ordersCount;
        current.salesRevenue = round2(current.salesRevenue + purchase.salesRevenue);
        current.ordersReported = current.ordersReported && purchase.ordersReported;
        current.salesReported = current.salesReported && purchase.salesReported;
        current.campaigns += 1;

        byDate.set(date, current);
    });

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * upsert صف يومي واحد لكل تاريخ.
 * - يحافظ على `id` و `createdAt` عند التحديث (ممنوع تكرار الصفوف).
 * - القيم `null` (مش متاحة من المصدر) بتحافظ على القيمة اليدوية الموجودة.
 */
function upsertDailyLog(client, payload) {
    if (!Array.isArray(client.dailyLogs)) client.dailyLogs = [];

    const date = payload.date;
    const idx = client.dailyLogs.findIndex((entry) => entry?.date === date);
    const existing = idx !== -1 ? client.dailyLogs[idx] : null;
    const now = new Date().toISOString();

    const next = {
        ...(existing || {}),
        id: existing?.id || `dlog_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        date,
        month: date.slice(0, 7),
        adSpend: payload.adSpend !== null && payload.adSpend !== undefined
            ? round2(payload.adSpend)
            : (Number(existing?.adSpend) || 0),
        salesRevenue: payload.salesRevenue !== null && payload.salesRevenue !== undefined
            ? round2(payload.salesRevenue)
            : (Number(existing?.salesRevenue) || 0),
        ordersCount: payload.ordersCount !== null && payload.ordersCount !== undefined
            ? Math.round(payload.ordersCount)
            : (Number(existing?.ordersCount) || 0),
        unitsSold: payload.unitsSold !== null && payload.unitsSold !== undefined
            ? Math.round(payload.unitsSold)
            : (Number(existing?.unitsSold) || 0),
        notes: payload.notes !== undefined ? (payload.notes || '').trim() : (existing?.notes || ''),
        source: payload.source || existing?.source || MANUAL_SOURCE,
        syncedAt: now,
        updatedAt: now,
        createdAt: existing?.createdAt || now,
    };

    if (idx !== -1) {
        client.dailyLogs[idx] = next;
    } else {
        client.dailyLogs.push(next);
    }

    client.dailyLogs.sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));
    return next;
}

/**
 * يعيد حساب صفوف `monthlyLogs` كمجموع للـ dailyLogs.
 * - لو الشهر مغطّى بالكامل بفترة السحب ⇒ الإجمالي = مجموع الـ dailyLogs (مصدر الحقيقة).
 * - لو الشهر مغطّى جزئيًا (مثل سحب آخر 30 يوم اللي بيقطع شهرين) ⇒ تعديل تراكمي (delta):
 *   الإجمالي القديم + (مجموع الأيام المسحوبة بعد − قبل)، عشان الأيام اللي برّه
 *   فترة السحب (إدخال يدوي) متضيعش.
 * بيحافظ على isPaid / paidAt / notes الخاصة بالمستخدم.
 */
function rollupMonthlyLogs(client, months, options = {}) {
    if (!Array.isArray(client.monthlyLogs)) client.monthlyLogs = [];

    const fullMonths = options.fullMonths instanceof Set
        ? options.fullMonths
        : new Set(options.fullMonths || []);
    const deltas = options.deltas || {};

    const targets = Array.from(new Set((months || []).filter(Boolean)));
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const updatedMonths = [];

    targets.forEach((month) => {
        const monthDaily = (client.dailyLogs || []).filter((d) => String(d?.date || '').startsWith(month));
        const sumSpend = round2(monthDaily.reduce((acc, d) => acc + (Number(d.adSpend) || 0), 0));
        const sumSales = round2(monthDaily.reduce((acc, d) => acc + (Number(d.salesRevenue) || 0), 0));
        const sumOrders = monthDaily.reduce((acc, d) => acc + (Number(d.ordersCount) || 0), 0);
        const sumUnits = monthDaily.reduce((acc, d) => acc + (Number(d.unitsSold) || 0), 0);
        const now = new Date().toISOString();

        const idx = client.monthlyLogs.findIndex((log) => log?.month === month);
        const existing = idx !== -1 ? client.monthlyLogs[idx] : null;
        const useSum = fullMonths.has(month) || !existing;
        const monthDelta = deltas[month] || {};

        const nextSpend = useSum
            ? sumSpend
            : round2((Number(existing.adSpend) || 0) + (Number(monthDelta.adSpend) || 0));
        const nextSales = useSum
            ? sumSales
            : round2((Number(existing.salesRevenue) || 0) + (Number(monthDelta.salesRevenue) || 0));
        const nextOrders = useSum
            ? sumOrders
            : Math.round((Number(existing.ordersCount) || 0) + (Number(monthDelta.ordersCount) || 0));
        const nextUnits = useSum
            ? sumUnits
            : Math.round((Number(existing.unitsSold) || 0) + (Number(monthDelta.unitsSold) || 0));

        if (idx !== -1) {
            client.monthlyLogs[idx] = {
                ...client.monthlyLogs[idx],
                adSpend: nextSpend,
                salesRevenue: nextSales,
                ordersCount: nextOrders,
                unitsSold: nextUnits,
                updatedAt: now,
            };
        } else {
            client.monthlyLogs.push({
                month,
                adSpend: nextSpend,
                salesRevenue: nextSales,
                ordersCount: nextOrders,
                unitsSold: nextUnits,
                isPaid: false,
                notes: '',
                createdAt: now,
                updatedAt: now,
            });
        }

        if (month === currentMonthStr) {
            client.currentSpend = nextSpend;
            client.monthlySales = nextSales;
            client.monthlyOrders = nextOrders;
            client.monthlyUnits = nextUnits;
        }

        updatedMonths.push(month);
    });

    client.monthlyLogs.sort((a, b) => String(b?.month || '').localeCompare(String(a?.month || '')));
    return {
        updatedMonths,
        monthsSummary: targets.map((month) => {
            const log = client.monthlyLogs.find((entry) => entry?.month === month) || {};
            return {
                month,
                adSpend: Number(log.adSpend) || 0,
                ordersCount: Number(log.ordersCount) || 0,
                salesRevenue: Number(log.salesRevenue) || 0,
                merged: !fullMonths.has(month),
            };
        }),
        dailyCounts: Object.fromEntries(targets.map((month) => [
            month,
            (client.dailyLogs || []).filter((d) => String(d?.date || '').startsWith(month)).length,
        ])),
    };
}

/** الشهر مغطّى بالكامل بفترة السحب؟ (من أول يوم لآخر يوم في الشهر) */
function isMonthFullyCovered(month, from, to) {
    if (!isValidIsoDate(from) || !isValidIsoDate(to) || !month) return false;
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7));
    const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
    return from <= monthStart && to >= monthEnd;
}

// ═══════════════════════════════════════════════════
// CSV parsing (Meta report: Date, Campaign Name, Amount Spent, Purchases)
// ═══════════════════════════════════════════════════

function splitCsvLine(line, delimiter) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            cells.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    cells.push(current);
    return cells.map((cell) => cell.trim());
}

function normalizeHeader(header) {
    return String(header || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]+/g, ' ');
}

const HEADER_ALIASES = {
    date: ['date', 'day', 'reporting starts', 'reporting start', 'date start', 'تاريخ'],
    campaign: ['campaign name', 'campaign', 'ad set name', 'اسم الحملة', 'الحملة'],
    spend: ['amount spent', 'amount spent (egp)', 'spend', 'cost', 'المبلغ المنفق', 'الإنفاق'],
    purchases: ['purchases', 'purchase', 'orders', 'results', 'website purchases', 'المشتريات', 'الأوردرات'],
};

function resolveHeaderMap(headerCells) {
    const normalized = headerCells.map(normalizeHeader);
    const map = {};
    Object.entries(HEADER_ALIASES).forEach(([key, aliases]) => {
        const foundIndex = normalized.findIndex((cell) => aliases.includes(cell));
        if (foundIndex !== -1) map[key] = foundIndex;
    });
    return map;
}

/**
 * يحوّل نص CSV إلى صفوف يومية مجمّعة + ملخص الرفض.
 * يدعم ISO (YYYY-MM-DD) و DD/MM/YYYY و MM/DD/YYYY (يُحسم بالترتيب لو أحد الجزأين > 12).
 */
function parseMetaCsv(csvText, options = {}) {
    const text = String(csvText || '').replace(/^\uFEFF/, '');
    const rejected = [];
    const warnings = [];

    if (!text.trim()) {
        return { rows: [], rejected: [{ line: 0, reason: 'ملف CSV فاضي' }], rejectedCount: 1, warnings };
    }

    const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== '');
    const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const headerCells = splitCsvLine(lines[0], delimiter);
    const headerMap = resolveHeaderMap(headerCells);

    const missingHeaders = ['date', 'spend'].filter((key) => headerMap[key] === undefined);
    if (missingHeaders.length > 0) {
        throw Object.assign(
            new Error(`رأس ملف CSV غير مطابق لتقرير ميتا. الأعمدة المطلوبة: Date, Campaign Name, Amount Spent, Purchases`),
            { code: 'INVALID_CSV_HEADER', missingHeaders, headerCells },
        );
    }
    if (headerMap.purchases === undefined) {
        warnings.push('عمود Purchases غير موجود — سيتم الاحتفاظ بعدد الأوردرات اليدوي.');
    }

    const byDate = new Map();
    const ambiguousDates = new Set();

    for (let i = 1; i < lines.length; i += 1) {
        const lineNumber = i + 1;
        const cells = splitCsvLine(lines[i], delimiter);
        if (cells.every((cell) => cell === '')) continue;

        const rawDate = cells[headerMap.date] || '';
        const normalizedDate = normalizeCsvDate(rawDate);
        if (!normalizedDate.date) {
            rejected.push({ line: lineNumber, reason: `تاريخ غير صالح: "${rawDate}"`, value: rawDate });
            continue;
        }
        if (normalizedDate.ambiguous) ambiguousDates.add(rawDate);

        const spendRaw = cells[headerMap.spend];
        const spend = toNumberOrNull(String(spendRaw || '').replace(/[^\d.,-]/g, ''));
        if (spend === null) {
            rejected.push({ line: lineNumber, reason: `قيمة "Amount Spent" غير رقمية: "${spendRaw ?? ''}"`, value: spendRaw });
            continue;
        }
        if (spend < 0) {
            rejected.push({ line: lineNumber, reason: `"Amount Spent" سالب: ${spend}`, value: spendRaw });
            continue;
        }

        let purchases = null;
        if (headerMap.purchases !== undefined) {
            const purchasesRaw = cells[headerMap.purchases];
            if (String(purchasesRaw || '').trim() !== '') {
                const parsedPurchases = toNumberOrNull(String(purchasesRaw).replace(/[^\d.,-]/g, ''));
                if (parsedPurchases === null || parsedPurchases < 0) {
                    rejected.push({ line: lineNumber, reason: `قيمة "Purchases" غير صالحة: "${purchasesRaw}"`, value: purchasesRaw });
                    continue;
                }
                purchases = parsedPurchases;
            }
        }

        const current = byDate.get(normalizedDate.date) || {
            date: normalizedDate.date,
            adSpend: 0,
            purchases: 0,
            purchasesReported: false,
            campaigns: 0,
            rowsApplied: 0,
        };
        current.adSpend = round2(current.adSpend + spend);
        if (purchases !== null) {
            current.purchases += Math.round(purchases);
            current.purchasesReported = true;
            current.rowsApplied += 1;
        }
        current.campaigns += 1;
        byDate.set(normalizedDate.date, current);
    }

    if (ambiguousDates.size > 0) {
        warnings.push(`تواريخ بصيغة يوم/شهر تم تفسيرها كـ DD/MM/YYYY: ${Array.from(ambiguousDates).slice(0, 5).join(', ')}`);
    }

    const rows = Array.from(byDate.values())
        .map((row) => ({
            date: row.date,
            adSpend: row.adSpend,
            ordersCount: row.purchasesReported ? row.purchases : null,
            ordersReported: row.purchasesReported,
            campaigns: row.campaigns,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const rejectedCount = rejected.length;
    const rejectedSamples = options.maxRejectedSamples
        ? rejected.slice(0, options.maxRejectedSamples)
        : rejected;

    return {
        rows,
        rejected: rejectedSamples,
        rejectedCount,
        warnings,
        totalLines: lines.length - 1,
    };
}

function normalizeCsvDate(rawValue) {
    const raw = String(rawValue || '').trim();
    if (!raw) return { date: null, ambiguous: false };

    const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
        const candidate = `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
        return { date: isValidIsoDate(candidate) ? candidate : null, ambiguous: false };
    }

    const dmy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!dmy) return { date: null, ambiguous: false };

    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    let day = first;
    let month = second;
    let ambiguous = false;

    if (first > 12 && second <= 12) {
        day = first;
        month = second;
    } else if (second > 12 && first <= 12) {
        day = second;
        month = first;
    } else {
        // كلاهما ≤ 12 ⇒ الافتراضي DD/MM (تنسيق التقرير المحلي)
        ambiguous = true;
    }

    const candidate = `${dmy[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date: isValidIsoDate(candidate) ? candidate : null, ambiguous };
}

// ═══════════════════════════════════════════════════
// تنسيق ملخص الـ API
// ═══════════════════════════════════════════════════

function buildClientSyncMeta(client, { source, period, lastSyncedAt, summary }) {
    return {
        ...client,
        dataSource: source,
        lastSyncedAt,
        lastSyncSource: source,
        lastSyncPeriod: period,
        lastSyncSummary: summary,
    };
}

module.exports = {
    META_SOURCE,
    CSV_SOURCE,
    MANUAL_SOURCE,
    normalizeAdAccountId,
    pickCompanyAdsToken,
    defaultDateRange,
    isValidIsoDate,
    aggregateInsightsByDate,
    extractPurchaseMetric,
    upsertDailyLog,
    rollupMonthlyLogs,
    isMonthFullyCovered,
    parseMetaCsv,
    buildClientSyncMeta,
    round2,
    toNumberOrNull,
};
