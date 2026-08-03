/**
 * One-off: backfill stale `metadata.preparationStatus` on orders whose
 * `order.status` was changed outside the preparation queue.
 *
 * The preparation queue reads `metadata.preparationStatus` as its source of
 * truth (falling back to `order.status`). Status changes via quick-status /
 * /orders only updated `order.status`, leaving a stale metadata value that
 * kept the order stuck in the wrong prep stage.
 *
 * IMPORTANT: orders inside the preparation queue persist their real stage in
 * metadata.preparationStatus while order.status holds the *mapped* value
 * (e.g. PREPARING/QUALITY_CHECK/PACKAGED -> PROCESSING, PENDING_PREPARATION ->
 * CONFIRMED). So this script must NOT overwrite an existing metadata stage with
 * a mapped order.status. It only syncs when order.status is an explicit stage
 * code (CONFIRMED, READY, READY_TO_SHIP, ...) that should win over a stale
 * metadata value, or when metadata is entirely missing.
 *
 * Handles both regular and guest orders, batched.
 *
 * Usage (via GitHub workflow or manually on the server):
 *   COMPANY_SLUG=swan DRY_RUN=true node scripts/one-off/backfill-preparation-status-metadata.js
 *   COMPANY_SLUG=swan DRY_RUN=false node scripts/one-off/backfill-preparation-status-metadata.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const COMPANY_SLUG = process.env.COMPANY_SLUG || '';
const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

// order.status values that are explicit preparation stages and should be
// written into metadata.preparationStatus. Note PROCESSING is intentionally
// absent: orders persisted as PROCESSING usually carry their real stage in
// metadata already (or are truly "in the queue"), and rewriting metadata to the
// mapped PROCESSING would corrupt the queue display.
const EXPLICIT_STAGE_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'SCHEDULED',
  'PENDING_PREPARATION',
  'PREPARING',
  'QUALITY_CHECK',
  'PACKAGED',
  'PACKED',
  'READY',
  'READY_TO_SHIP',
  'STOCK_SHORTAGE',
  'PENDING_STOCK',
  'ON_HOLD_STOCK',
  'PENDING_CANCELLATION',
  'ON_HOLD_PREP'
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

async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('Backfill preparation status metadata');
  console.log(`Company slug : ${COMPANY_SLUG || '(all companies)'}`);
  console.log(`Dry run      : ${DRY_RUN}`);
  console.log(`Batch size   : ${BATCH_SIZE}`);
  console.log('══════════════════════════════════════════════════════════════');

  let companyId = null;
  if (COMPANY_SLUG) {
    const company = await prisma.company.findUnique({
      where: { slug: COMPANY_SLUG },
      select: { id: true, name: true, slug: true }
    });
    if (!company) {
      console.error(`❌ Company with slug "${COMPANY_SLUG}" not found.`);
      process.exit(1);
    }
    companyId = company.id;
    console.log(`✅ Found company: ${company.name} (${company.id})`);
  }

  // ─── Regular orders ──────────────────────────────────────────────────────
  console.log('\n── Regular orders ──');
  let matched = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const batch = await prisma.order.findMany({
      where: companyId ? { companyId } : undefined,
      select: { id: true, orderNumber: true, status: true, metadata: true },
      take: BATCH_SIZE,
      orderBy: { updatedAt: 'desc' },
      skip: matched
    });

    if (batch.length === 0) break;
    matched += batch.length;

    for (const order of batch) {
      const normalizedStatus = String(order.status || '').trim().toUpperCase();
      if (!EXPLICIT_STAGE_STATUSES.has(normalizedStatus)) {
        skipped += 1;
        continue;
      }

      const metadata = parseMetadata(order.metadata);
      const currentPrep = String(metadata.preparationStatus || '').trim().toUpperCase();

      // When metadata already carries a distinct prep stage, keep it (it is the
      // queue's source of truth). Only override when missing or stale vs an
      // explicit order.status.
      if (currentPrep && currentPrep !== normalizedStatus) {
        // A real stage already exists and differs — but if order.status is an
        // explicit stage (e.g. CONFIRMED after a move back), the newer intent
        // is order.status, so sync it.
        // If currentPrep is the mapped PROCESSING left by an earlier backfill,
        // replace it with the explicit order.status.
        if (currentPrep === 'PROCESSING') {
          const nextMetadata = {
            ...metadata,
            preparationStatus: normalizedStatus,
            preparationStatusUpdatedAt: new Date().toISOString()
          };
          if (!DRY_RUN) {
            await prisma.order.update({
              where: { id: order.id },
              data: { metadata: JSON.stringify(nextMetadata) }
            });
          }
          updated += 1;
          console.log(`  ${DRY_RUN ? '[DRY]' : '[OK]'} ${order.orderNumber}: prep ${currentPrep} -> ${normalizedStatus} (stale PROCESSING)`);
        } else {
          // Real distinct stage that predates this order.status — leave it.
          skipped += 1;
        }
        continue;
      }

      if (currentPrep === normalizedStatus) {
        skipped += 1;
        continue;
      }

      const nextMetadata = {
        ...metadata,
        preparationStatus: normalizedStatus,
        preparationStatusUpdatedAt: new Date().toISOString()
      };

      if (!DRY_RUN) {
        await prisma.order.update({
          where: { id: order.id },
          data: { metadata: JSON.stringify(nextMetadata) }
        });
      }
      updated += 1;
      if (updated <= 5 || updated % 100 === 0) {
        console.log(`  ${DRY_RUN ? '[DRY]' : '[OK]'} ${order.orderNumber}: prep ${currentPrep || '(none)'} -> ${normalizedStatus}`);
      }
    }
  }
  console.log(`Regular: ${matched} scanned, ${updated} would-be/updated, ${skipped} skipped`);

  // ─── Guest orders ────────────────────────────────────────────────────────
  console.log('\n── Guest orders ──');
  let gMatched = 0;
  let gUpdated = 0;
  let gSkipped = 0;

  while (true) {
    const batch = await prisma.guestOrder.findMany({
      where: companyId ? { companyId } : undefined,
      select: { id: true, orderNumber: true, status: true, metadata: true },
      take: BATCH_SIZE,
      orderBy: { updatedAt: 'desc' },
      skip: gMatched
    });

    if (batch.length === 0) break;
    gMatched += batch.length;

    for (const order of batch) {
      const normalizedStatus = String(order.status || '').trim().toUpperCase();
      if (!EXPLICIT_STAGE_STATUSES.has(normalizedStatus)) {
        gSkipped += 1;
        continue;
      }

      const metadata = parseMetadata(order.metadata);
      const currentPrep = String(metadata.preparationStatus || '').trim().toUpperCase();

      if (currentPrep && currentPrep !== normalizedStatus) {
        if (currentPrep === 'PROCESSING') {
          const nextMetadata = {
            ...metadata,
            preparationStatus: normalizedStatus,
            preparationStatusUpdatedAt: new Date().toISOString()
          };
          if (!DRY_RUN) {
            await prisma.guestOrder.update({
              where: { id: order.id },
              data: { metadata: JSON.stringify(nextMetadata) }
            });
          }
          gUpdated += 1;
        } else {
          gSkipped += 1;
        }
        continue;
      }

      if (currentPrep === normalizedStatus) {
        gSkipped += 1;
        continue;
      }

      const nextMetadata = {
        ...metadata,
        preparationStatus: normalizedStatus,
        preparationStatusUpdatedAt: new Date().toISOString()
      };

      if (!DRY_RUN) {
        await prisma.guestOrder.update({
          where: { id: order.id },
          data: { metadata: JSON.stringify(nextMetadata) }
        });
      }
      gUpdated += 1;
    }
  }
  console.log(`Guest: ${gMatched} scanned, ${gUpdated} would-be/updated, ${gSkipped} skipped`);

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`✅ ${DRY_RUN ? 'DRY RUN — no changes made.' : 'Backfill complete.'}`);
  console.log(`   Regular: ${updated} updated | Guest: ${gUpdated} updated`);
  console.log('══════════════════════════════════════════════════════════════');
}

main()
  .catch(async (err) => {
    console.error('❌ Backfill failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
