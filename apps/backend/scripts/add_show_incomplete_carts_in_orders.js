/**
 * ╪Ñ╪╢╪º┘ü╪⌐ ╪Ñ╪╣╪»╪º╪» "╪╣╪▒╪╢ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪║┘è╪▒ ╪º┘ä┘à┘â╪¬┘à┘ä╪⌐ ┘ü┘è ╪╡┘ü╪¡╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬" ╪Ñ┘ä┘ë OrderInvoiceSettings.
 *
 * ╪ó┘à┘å (idempotent): ADD COLUMN IF NOT EXISTS.
 *
 * ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à: node scripts/add_show_incomplete_carts_in_orders.js [--dry-run]
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const prisma = getSharedPrismaClient();
  const url = String(process.env.POSTGRES_URL || process.env.DATABASE_URL || '');
  const isMysql = url.toLowerCase().startsWith('mysql://');

  const sql = isMysql
    ? 'ALTER TABLE `order_invoice_settings` ADD COLUMN IF NOT EXISTS `showIncompleteCartsInOrders` BOOLEAN NOT NULL DEFAULT false'
    : 'ALTER TABLE "order_invoice_settings" ADD COLUMN IF NOT EXISTS "showIncompleteCartsInOrders" BOOLEAN NOT NULL DEFAULT false';

  if (DRY_RUN) {
    console.log(`Γ£à (dry-run) ${sql}`);
  } else {
    await prisma.$executeRawUnsafe(sql);
    console.log('Γ£à Column showIncompleteCartsInOrders added to order_invoice_settings');
  }

  await prisma.$disconnect();
  console.log('≡ƒÄë Migration complete.');
}

main().catch((e) => {
  console.error('Γ¥î Failed:', e.message);
  process.exit(1);
});
