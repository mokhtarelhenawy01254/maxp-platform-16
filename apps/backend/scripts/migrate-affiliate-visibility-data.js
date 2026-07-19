/**
 * هجرة affiliateVisibility و affiliateVisibleAffiliateIds من metadata JSON
 * إلى الحقول الجديدة على مستوى المنتج.
 *
 * التشغيل: node scripts/migrate-affiliate-visibility-data.js
 */
const { PrismaClient } = require("../generated/postgresql_v2");
const prisma = new PrismaClient();

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  if (typeof metadata === "object") return metadata;
  return {};
};

const normalizeVisibility = (value) => {
  const v = String(value || "").toUpperCase();
  if (v === "HIDDEN" || v === "SELECTED") return v;
  return null; // don't overwrite if no meaningful value
};

async function migrate() {
  console.log("🔍 جاري جلب المنتجات...");
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, affiliateVisibility: true, metadata: true },
  });

  console.log(`📦 تم العثور على ${products.length} منتج`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const meta = parseMetadata(product.metadata);
    const metaVisibility = normalizeVisibility(meta.affiliateVisibility || meta.marketerVisibility || meta.affiliateProductVisibility);

    if (!metaVisibility) {
      skipped++;
      continue;
    }

    // Only update if the new column is still at default ("ALL") and metadata has a different value
    if (product.affiliateVisibility === metaVisibility) {
      skipped++;
      continue;
    }

    const rawIds =
      meta.affiliateVisibleAffiliateIds ||
      meta.visibleAffiliateIds ||
      meta.allowedAffiliateIds ||
      [];

    const affiliateVisibleAffiliateIds = Array.isArray(rawIds) && rawIds.length > 0
      ? JSON.stringify(rawIds.map(String).filter(Boolean))
      : null;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        affiliateVisibility: metaVisibility,
        affiliateVisibleAffiliateIds,
      },
    });

    updated++;
  }

  console.log(`✅ تم تحديث ${updated} منتج`);
  console.log(`⏭️ تم تخطي ${skipped} منتج (لا توجد إعدادات جديدة)`);

  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error("❌ فشل:", err);
  prisma.$disconnect();
  process.exit(1);
});
