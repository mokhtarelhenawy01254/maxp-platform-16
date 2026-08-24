/**
 * 🛡️ PRODUCTION-FIX (custom-status-persist) — Backfill
 *
 * قبل إصلاح تخزين الحالات المخصصة، كود الحالة المخصصة (مثل DELAYED-WITH-CAPTAIN)
 * ماكانش بيتخزن على الطلب — كان بيتحول لقيمة mapsToSystem ويضيع، ويفضل موجود بس في
 * OrderStatusHistory.status (بالكود الأصلي). السكريبت ده بيرجّع آخر كود مخصص
 * لكل طلب من سجل التاريخ ويكتبه في العمود الجديد customStatusCode.
 *
 * شروط الرجوع (المحافظة):
 *   1. آخر سجل حالة للطلب كوده حالة مخصصة **نشطة** عند شركة الطلب (orderStatusConfig).
 *   2. order.status الحالي = mapsToSystem بتاع الكود ده (يعني الطلب لسه في الحالة المخصصة
 *      فعليًا — لو اتنقل لحالة تانية بعدها، آخر سجل هيكون الحالة الأحدث مش الكود المخصص).
 *   3. customStatusCode فاضي (idempotent — إعادة التشغيل no-op).
 *
 * التشغيل: بعد deploy فيه prisma db push (العمود لازم يكون موجود):
 *   cd /var/www/backend2 && NODE_ENV=production node scripts/backfill-order-custom-status-codes.js
 */

const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { VALID_ORDER_STATUS_ENUM } = require("../utils/orderStatusEnum");

async function main() {
  const prisma = getSharedPrismaClient();

  // 1) خريطة أكواد الحالات المخصصة النشطة لكل شركة: companyId → Map(UPPER(code) → mapsToSystem)
  const configs = await prisma.orderStatusConfig.findMany({
    where: { isActive: true },
    select: { companyId: true, code: true, mapsToSystem: true },
  });
  const customByCompany = new Map();
  let customCodeCount = 0;
  for (const cfg of configs) {
    const code = String(cfg.code || "").trim().toUpperCase();
    if (!code || VALID_ORDER_STATUS_ENUM.has(code)) continue; // حالة نظامية — ليها ما بيتعملش backfill
    if (!customByCompany.has(cfg.companyId)) customByCompany.set(cfg.companyId, new Map());
    customByCompany.get(cfg.companyId).set(code, String(cfg.mapsToSystem || "").trim().toUpperCase());
    customCodeCount++;
  }
  console.log(`📋 [BACKFILL] Active custom statuses across companies: ${customCodeCount} codes / ${customByCompany.size} companies`);

  if (customCodeCount === 0) {
    console.log("✅ [BACKFILL] No custom statuses configured — nothing to do.");
    return;
  }

  // 2) آخر سجل حالة لكل طلب (customStatusCode فاضي فقط)
  const rows = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT ON (h."orderId")
      h."orderId"      AS order_id,
      h."status"       AS last_status,
      o."status"       AS order_status,
      o."companyId"    AS company_id
    FROM "OrderStatusHistory" h
    JOIN "orders" o ON o."id" = h."orderId"
    WHERE o."customStatusCode" IS NULL
    ORDER BY h."orderId", h."createdAt" DESC
  `);
  console.log(`📦 [BACKFILL] Orders without customStatusCode (with history): ${rows.length}`);

  // 3) جمّع الأوامر المؤهلة مجمّعة بالكود
  const byCode = new Map(); // "companyId||CODE" → Set(orderIds)
  let skippedNotCustom = 0;
  let skippedStatusMoved = 0;
  for (const row of rows) {
    const code = String(row.last_status || "").trim().toUpperCase();
    const companyMap = customByCompany.get(row.company_id);
    if (!companyMap || !companyMap.has(code)) {
      skippedNotCustom++;
      continue;
    }
    const mapsTo = companyMap.get(code);
    // الطلب لسه في قيمة الـ mapping؟ (لو مش مفيش mapsToSystem أصلاً ماكانش هيتخزن — نتجاهله)
    if (!mapsTo || String(row.order_status || "").toUpperCase() !== mapsTo) {
      skippedStatusMoved++;
      continue;
    }
    const key = `${row.company_id}||${code}`;
    if (!byCode.has(key)) byCode.set(key, new Set());
    byCode.get(key).add(row.order_id);
  }

  // 4) تنفيذ على دفعات + توزيع قبل/بعد
  let totalUpdated = 0;
  for (const [key, idSet] of byCode) {
    const [companyId, code] = key.split("||");
    const ids = [...idSet];
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const res = await prisma.order.updateMany({
        where: { id: { in: chunk }, customStatusCode: null },
        data: { customStatusCode: code },
      });
      totalUpdated += res.count;
    }
    console.log(`   ✏️  ${code} (${companyId.slice(0, 8)}…): ${ids.length} order(s)`);
  }

  console.log(`\n✅ [BACKFILL] Done. Updated ${totalUpdated} orders.`);
  console.log(`   Skipped: ${skippedNotCustom} (last status not a custom code) / ${skippedStatusMoved} (order moved on from the mapping)`);

  // 5) توزيع نهائي للتأكد
  const finalDist = await prisma.$queryRawUnsafe(`
    SELECT "customStatusCode" AS code, COUNT(*)::int AS cnt
    FROM "orders"
    WHERE "customStatusCode" IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
  `);
  console.log(`📊 [BACKFILL] Final customStatusCode distribution:`);
  for (const d of finalDist) {
    console.log(`   ${d.code}: ${d.cnt}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ [BACKFILL] Failed:", err);
    process.exit(1);
  });
