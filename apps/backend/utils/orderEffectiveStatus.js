/**
 * 🛡️ PRODUCTION-FIX (custom-status-persist): مصدر موحّد لتعبير "الحالة الفعلية"
 * للطلبات العادية — نفس الأولوية في كل مكان (ليست/فلتر/إحصائيات):
 *   1. customStatusCode (كود الحالة المخصصة — مثال DELAYED_WITH_CAPTAIN)
 *   2. metadata.preparationStatus محوّلة لقيمتها النظامية (نفس getMappedRegularOrderStatus)
 *   3. status (الـ enum)
 *
 * قبل الإصلاح ده كل نقطة كانت تحسب بطريقة مختلفة: الإحصائيات groupBy على الـ enum
 * بس (الحالات المخصصة مستحيلة تظهر)، والتحليلات COALESCE غير محوّلة — فنفس الطلب
 * كان بيتحسب بشكل مختلف في كل صفحة ("مش صورة حقيقية").
 */

const TERMINAL_ORDER_STATUSES = new Set([
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED',
  'PARTIALLY_RETURNED', 'PARTIALLY_REFUNDED', 'EXCHANGED',
  'DUPLICATE_ORDER', 'TRASH', 'LOST'
]);

// تعبير SQL للحالة الفعلية — يستخدم ضد جدول "orders" (بأسماء الأعمدة المقتبسة).
// 🛡️ (analytics-unify): بيقبل alias للجدول (مثل 'o') عشان استعلامات JOIN التحليلات.
// 🛡️ استثناء الحالات النهائية (DELIVERED, RETURNED, SHIPPED...): بيانات التجهيز القديمة
// في metadata.preparationStatus لا تعيد تصنيف الطلبات المنتهية إلى PROCESSING.
const effectiveOrderStatusSql = (alias = '') => {
  const p = alias ? `${alias}.` : '';
  return `
  CASE
    WHEN ${p}"customStatusCode" IS NOT NULL AND ${p}"customStatusCode" <> '' THEN UPPER(${p}"customStatusCode")
    WHEN UPPER(${p}"status"::text) IN ('SHIPPED','DELIVERED','CANCELLED','RETURNED','REFUNDED','PARTIALLY_RETURNED','PARTIALLY_REFUNDED','EXCHANGED','DUPLICATE_ORDER','TRASH','LOST')
    THEN ${p}"status"::text
    WHEN ${p}"metadata"::jsonb->>'preparationStatus' IS NOT NULL AND ${p}"metadata"::jsonb->>'preparationStatus' <> ''
    THEN CASE
      WHEN ${p}"metadata"::jsonb->>'preparationStatus' = 'PENDING_PREPARATION' THEN 'CONFIRMED'
      WHEN ${p}"metadata"::jsonb->>'preparationStatus' IN ('STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK') THEN 'STOCK_SHORTAGE'
      WHEN ${p}"metadata"::jsonb->>'preparationStatus' = 'ON_HOLD_PREP' THEN 'ON_HOLD_PREP'
      ELSE 'PROCESSING'
    END
    ELSE ${p}"status"::text
  END
`;
};

const EFFECTIVE_ORDER_STATUS_SQL = effectiveOrderStatusSql();

// نفس المنطق في JS (للاستخدام على صفوف محمّلة بالفعل — بلا SQL).
const getMappedRegularOrderStatus = (preparationStatus) => {
  if (preparationStatus === 'PENDING_PREPARATION') return 'CONFIRMED';
  if (['STOCK_SHORTAGE', 'PENDING_STOCK', 'ON_HOLD_STOCK'].includes(preparationStatus)) return 'STOCK_SHORTAGE';
  if (preparationStatus === 'ON_HOLD_PREP') return 'ON_HOLD_PREP';
  return 'PROCESSING';
};

function computeEffectiveOrderStatus(order) {
  if (!order) return 'PENDING';
  if (order.customStatusCode) return String(order.customStatusCode).toUpperCase();
  const rawStatus = String(order.status || 'PENDING').toUpperCase();
  if (TERMINAL_ORDER_STATUSES.has(rawStatus)) {
    return rawStatus;
  }
  let meta = order.metadata;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch (_e) {
      meta = null;
    }
  }
  if (meta?.preparationStatus) return getMappedRegularOrderStatus(meta.preparationStatus);
  return rawStatus;
}

/**
 * عدّ الطلبات لكل "حالة فعلية" (كود مخصص أو مرحلة تجهيز محوّلة أو enum)
 * لشركة واحدة — بقية شروط الـ where تُمرَّر كـ SQL خام (اختياري).
 *
 * @returns {Promise<Record<string, number>>} مثل { PENDING: 12, DELAYED_WITH_CAPTAIN: 3 }
 */
async function getEffectiveOrderStatusCounts(prisma, companyId, extraWhereSql = '', params = []) {
  const sql = `
    SELECT ${EFFECTIVE_ORDER_STATUS_SQL} AS effective_status, COUNT(*)::int AS cnt
    FROM "orders"
    WHERE "companyId" = $1 ${extraWhereSql ? `AND ${extraWhereSql}` : ''}
    GROUP BY 1
  `;
  const rows = await prisma.$queryRawUnsafe(sql, companyId, ...params);
  const counts = {};
  for (const row of rows) {
    counts[String(row.effective_status || '').toUpperCase() || 'PENDING'] = Number(row.cnt || 0);
  }
  return counts;
}

module.exports = {
  EFFECTIVE_ORDER_STATUS_SQL,
  effectiveOrderStatusSql,
  getMappedRegularOrderStatus,
  computeEffectiveOrderStatus,
  getEffectiveOrderStatusCounts,
};
