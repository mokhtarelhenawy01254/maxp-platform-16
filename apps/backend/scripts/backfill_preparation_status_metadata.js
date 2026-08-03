/**
 * Backfill preparation status metadata for orders whose order.status was changed
 * outside the preparation queue (quick-status / orders page).
 *
 * The preparation queue reads `metadata.preparationStatus` as its source of truth
 * (falling back to `order.status`). Status changes made via /order-workflow/change-status
 * or /orders only updated `order.status`, leaving a stale `metadata.preparationStatus`
 * (e.g. PACKAGED) that kept the order stuck in the wrong prep stage.
 *
 * This script syncs `metadata.preparationStatus` to `order.status` whenever the
 * order status is a preparation-pipeline status and the metadata is missing or stale.
 *
 * Usage:
 *   node scripts/backfill_preparation_status_metadata.js --dry-run
 *   node scripts/backfill_preparation_status_metadata.js --companyId=cmleybpf70028juo2wwpmp8rt
 *   node scripts/backfill_preparation_status_metadata.js            # applies to all companies
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const companyFilter = args.find(a => a.startsWith('--companyId='))?.split('=')[1] || null;

const PREPARATION_PIPELINE_STATUSES = new Set([
  'PENDING_PREPARATION',
  'PREPARING',
  'PROCESSING',
  'QUALITY_CHECK',
  'PACKAGED',
  'PACKED',
  'READY',
  'READY_TO_SHIP',
  'STOCK_SHORTAGE',
  'PENDING_STOCK',
  'ON_HOLD_STOCK',
  'ON_HOLD_PREP'
]);

const TERMINAL_NON_PREPARATION = new Set([
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED',
  'PARTIALLY_REFUNDED', 'DUPLICATE_ORDER', 'TRASH', 'DRAFT',
  'SCHEDULED', 'EXCHANGED', 'PARTIALLY_DELIVERED'
]);

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_e) { /* ignore */ }
  }
  return {};
}

(async () => {
  const prisma = getSharedPrismaClient();
  try {
    const where = {};
    if (companyFilter) where.companyId = companyFilter;

    const orders = await prisma.order.findMany({
      where,
      select: { id: true, companyId: true, orderNumber: true, status: true, metadata: true },
      orderBy: { updatedAt: 'desc' },
    });

    let matched = 0;
    let updated = 0;
    let skipped = 0;

    for (const order of orders) {
      const normalizedStatus = String(order.status || '').trim().toUpperCase();
      if (!PREPARATION_PIPELINE_STATUSES.has(normalizedStatus)) continue;
      if (TERMINAL_NON_PREPARATION.has(normalizedStatus)) continue;

      const metadata = parseMetadata(order.metadata);
      const currentPrep = String(metadata.preparationStatus || '').trim().toUpperCase();
      matched += 1;

      if (currentPrep === normalizedStatus) {
        skipped += 1;
        continue;
      }

      const nextMetadata = {
        ...metadata,
        preparationStatus: normalizedStatus,
        preparationStatusUpdatedAt: new Date().toISOString(),
      };

      if (DRY_RUN) {
        console.log(`[DRY-RUN] ${order.orderNumber}: prep ${currentPrep || '(none)'} -> ${normalizedStatus}`);
        updated += 1;
        continue;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { metadata: JSON.stringify(nextMetadata) },
      });
      updated += 1;
    }

    console.log(`\nSummary: ${matched} prep-pipeline orders scanned, ${updated} would-be/updated, ${skipped} already in sync.${DRY_RUN ? ' (DRY RUN)' : ''}`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
})();
