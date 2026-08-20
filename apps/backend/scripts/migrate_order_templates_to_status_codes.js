/**
 * Migrate legacy ORDER_* WhatsApp templates to raw status-code templates.
 *
 * Context: order status templates are now managed on /orders/status-templates,
 * where each template's eventType is the raw status code (e.g. "CONFIRMED"),
 * while the generic /whatsapp/templates page used the ORDER_* event names
 * (e.g. "ORDER_CONFIRMED"). The send path now prefers the raw status-code
 * template first, so legacy ORDER_* templates should be re-keyed to raw codes.
 *
 * Mapping:
 *   ORDER_CONFIRMED        -> CONFIRMED
 *   ORDER_PROCESSING       -> PROCESSING
 *   ORDER_SHIPPED          -> SHIPPED
 *   ORDER_OUT_FOR_DELIVERY -> OUT_FOR_DELIVERY
 *   ORDER_DELIVERED        -> DELIVERED
 *   ORDER_CANCELLED        -> CANCELLED
 *   ORDER_RETURNED         -> RETURNED
 *   ORDER_REFUNDED         -> REFUNDED
 *
 * NOTE: ORDER_CREATED is intentionally NOT migrated. The new-order notification
 * is always sent with eventType 'ORDER_CREATED' (no fallback to a status code),
 * so those templates must keep the ORDER_CREATED event type.
 *
 * If a raw-code template already exists for the company/status, the legacy
 * ORDER_* template is deactivated (isActive=false) instead of overwriting.
 *
 * Run:
 *   node scripts/migrate_order_templates_to_status_codes.js --dry-run
 *   node scripts/migrate_order_templates_to_status_codes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient({ datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } } });

const DRY_RUN = process.argv.includes('--dry-run');

const LEGACY_TO_RAW = {
  ORDER_CONFIRMED: 'CONFIRMED',
  ORDER_PROCESSING: 'PROCESSING',
  ORDER_SHIPPED: 'SHIPPED',
  ORDER_OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ORDER_DELIVERED: 'DELIVERED',
  ORDER_CANCELLED: 'CANCELLED',
  ORDER_RETURNED: 'RETURNED',
  ORDER_REFUNDED: 'REFUNDED'
};

async function main() {
  console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Scanning whatsAppNotificationTemplate rows with ORDER_* event types...\n`);

  const legacyTemplates = await prisma.whatsAppNotificationTemplate.findMany({
    where: { eventType: { in: Object.keys(LEGACY_TO_RAW) } },
    select: {
      id: true,
      companyId: true,
      eventType: true,
      name: true,
      isActive: true,
      isDefault: true
    },
    orderBy: [{ companyId: 'asc' }, { eventType: 'asc' }]
  });

  console.log(`Found ${legacyTemplates.length} legacy ORDER_* template(s).\n`);

  let renamed = 0;
  let deactivated = 0;
  let skippedDefault = 0;

  for (const tpl of legacyTemplates) {
    const rawCode = LEGACY_TO_RAW[tpl.eventType];

    // Default system rows (id: null) are never persisted; skip defensively.
    if (tpl.isDefault) {
      skippedDefault++;
      continue;
    }

    // Check for an existing raw-code template for the same company.
    const existingRaw = await prisma.whatsAppNotificationTemplate.findFirst({
      where: { companyId: tpl.companyId, eventType: rawCode },
      select: { id: true }
    });

    if (existingRaw) {
      if (tpl.isActive) {
        if (DRY_RUN) {
          console.log(`  [DRY] Deactivate  ${tpl.companyId} ${tpl.eventType} -> ${rawCode} (raw exists: ${existingRaw.id})`);
        } else {
          await prisma.whatsAppNotificationTemplate.update({
            where: { id: tpl.id },
            data: { isActive: false, updatedAt: new Date() }
          });
          console.log(`  Γ£à Deactivated ${tpl.companyId} ${tpl.eventType} (raw exists: ${existingRaw.id})`);
        }
        deactivated++;
      } else {
        console.log(`  Γ£ô Skip (already inactive) ${tpl.companyId} ${tpl.eventType}`);
      }
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] Rename      ${tpl.companyId} ${tpl.eventType} -> ${rawCode}`);
    } else {
      await prisma.whatsAppNotificationTemplate.update({
        where: { id: tpl.id },
        data: { eventType: rawCode, updatedAt: new Date() }
      });
      console.log(`  Γ£à Renamed ${tpl.companyId} ${tpl.eventType} -> ${rawCode}`);
    }
    renamed++;
  }

  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Summary: ${renamed} renamed, ${deactivated} deactivated, ${skippedDefault} skipped (default), ${legacyTemplates.length} total scanned.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Γ¥î', e);
  process.exit(1);
});
