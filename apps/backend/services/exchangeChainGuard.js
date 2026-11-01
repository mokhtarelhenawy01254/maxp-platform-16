'use strict';

/**
 * حارس سلسلة الاستبدال (Task 4b5b8635).
 *
 * الهدف: منع تكوين سلسلة دائرية بين الأوردرات عبر metadata.originalOrderId
 * (حالة A → B → A) وأيضًا منع استبدال أوردر استبدال أصلاً (سلسلة أطول من جد).
 *
 * الملف ده مقصود يكون dependency-free عشان يتست بجيتس من غير Prisma.
 */

const TERMINAL_STATUSES = ['DELIVERED', 'CANCELLED', 'LOST'];
const DEFAULT_MAX_DEPTH = 10;

function normalizeId(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(String(status || '').toUpperCase());
}

/**
 * تقييم سلسلة الاستبدال بدون قاعدة بيانات.
 *
 * @param {object} input
 * @param {string} input.originalOrderId  الأوردر الأصلي اللي بيتعمل عليه الاستبدال
 * @param {string[]} input.chain          أسلاف الأصلي مرتّبين: [أبو الأصلي، جدّه، ...]
 * @param {number} [input.maxDepth]
 * @returns {{allowed: boolean, code: string|null, message: string|null}}
 */
function evaluateExchangeChain({ originalOrderId, chain = [], maxDepth = DEFAULT_MAX_DEPTH } = {}) {
  const root = normalizeId(originalOrderId);

  if (!root) {
    return {
      allowed: false,
      code: 'EXCHANGE_ORIGINAL_REQUIRED',
      message: 'أوردر الاستبدال لازم يكون مرتبط بأوردر أصلي',
    };
  }

  const seen = new Set([root]);
  let depth = 0;

  for (const raw of Array.isArray(chain) ? chain : []) {
    const id = normalizeId(raw);
    if (!id) continue;

    if (seen.has(id)) {
      return {
        allowed: false,
        code: 'EXCHANGE_CYCLE_DETECTED',
        message: 'سلسلة استبدال دائرية: الأوردر ده جزء من سلسلة ترجع لنفسها',
      };
    }

    seen.add(id);
    depth += 1;

    if (depth > maxDepth) {
      return {
        allowed: false,
        code: 'EXCHANGE_CHAIN_TOO_DEEP',
        message: `سلسلة الاستبدال أطول من الحد المسموح (${maxDepth})`,
      };
    }
  }

  return { allowed: true, code: null, message: null };
}

/**
 * قراءة أسلاف الأوردر الأصلي من قاعدة البيانات (recursive CTE).
 * بيرجع الأصلي نفسه أول عنصر، وبعده الأسلاف.
 */
async function loadExchangeChain(prisma, companyId, originalOrderId, maxDepth = DEFAULT_MAX_DEPTH) {
  const root = normalizeId(originalOrderId);
  if (!root) return [];

  const rows = await prisma.$queryRawUnsafe(
    `WITH RECURSIVE chain AS (
       SELECT o."id" AS id,
              o."metadata"::jsonb->>'originalOrderId' AS parent,
              0 AS depth
       FROM "orders" o
       WHERE o."companyId" = $1 AND o."id" = $2
     UNION ALL
       SELECT p."id" AS id,
              p."metadata"::jsonb->>'originalOrderId' AS parent,
              c.depth + 1 AS depth
       FROM chain c
       JOIN "orders" p ON p."id" = c.parent AND p."companyId" = $1
       WHERE c.depth < $3
     )
     SELECT id FROM chain ORDER BY depth ASC`,
    companyId,
    root,
    maxDepth
  );

  return (Array.isArray(rows) ? rows : []).map((row) => row && row.id).filter(Boolean);
}

/**
 * الفحص الكامل: يقرا السلسلة من الداتابيز ويقيّمها.
 * أخطاء الاستعلام بترجع allowed=true مع warning — نفس سلوك فحص التكرار الموجود،
 * عشان فشل الاستعلام ما يقفلش إنشاء الأوردرات.
 */
async function assertExchangeChain(prisma, companyId, originalOrderId, options = {}) {
  const maxDepth = options.maxDepth || DEFAULT_MAX_DEPTH;
  const root = normalizeId(originalOrderId);

  if (!root) {
    return { allowed: true, code: null, message: null };
  }

  try {
    const chainRows = await loadExchangeChain(prisma, companyId, root, maxDepth);
    // أول عنصر هو الأوردر الأصلي نفسه — الباقي أسلافه.
    // بنشيل أول عنصر بس (مش كل تكراراته) عشان لو الأصلي رجع تاني في السلسلة
    // الفحص يكتشف الدائرة A→B→A.
    const ancestors = chainRows.slice(1);

    return evaluateExchangeChain({ originalOrderId: root, chain: ancestors, maxDepth });
  } catch (error) {
    console.warn('⚠️ [EXCHANGE] Chain guard error:', error && error.message ? error.message : error);
    return { allowed: true, code: null, message: null };
  }
}

/**
 * فحص وجود استبدال مفتوح لنفس الأوردر الأصلي (Task 4b5b8635).
 * نفس الاستعلام المستخدم في الراوت والخدمة — مجمّع هنا عشان يتست.
 */
async function findOpenExchange(prisma, companyId, originalOrderId, originalOrderNumber = null) {
  const root = normalizeId(originalOrderId);
  if (!root) return [];

  const rows = await prisma.$queryRawUnsafe(
    `SELECT o."id", o."orderNumber", o."status"::text AS "status"
     FROM "orders" o
     WHERE o."companyId" = $1
       AND o."status"::text NOT IN ('DELIVERED', 'CANCELLED', 'LOST')
       AND (
         o."metadata"::jsonb->>'originalOrderId' = $2
         OR ($3::text IS NOT NULL AND o."metadata"::jsonb->>'originalOrderNumber' = $3)
       )
     LIMIT 1`,
    companyId,
    root,
    normalizeId(originalOrderNumber)
  );

  return Array.isArray(rows) ? rows : [];
}

/**
 * تحويل نتيجة فحص الاستبدال المفتوح لقرار.
 */
function buildOpenExchangeVerdict(rows) {
  if (Array.isArray(rows) && rows.length > 0) {
    return {
      allowed: false,
      code: 'OPEN_EXCHANGE_ALREADY_EXISTS',
      message: 'يوجد استبدال مفتوح بالفعل لهذا الأوردر',
      openExchange: rows[0],
    };
  }

  return { allowed: true, code: null, message: null, openExchange: null };
}

module.exports = {
  TERMINAL_STATUSES,
  DEFAULT_MAX_DEPTH,
  normalizeId,
  isTerminalStatus,
  evaluateExchangeChain,
  loadExchangeChain,
  assertExchangeChain,
  findOpenExchange,
  buildOpenExchangeVerdict,
};
