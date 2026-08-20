/**
 * ≡ƒöº Fix order-status WhatsApp templates that were wrongly classified as MARKETING.
 *
 * ╪«┘ä┘ü┘è╪⌐: ╪¬╪╡┘å┘è┘ü ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¿┘è╪¬╪¡╪│╪¿ ┘ä╪¡╪╕╪⌐ ╪º┘ä┘å╪┤╪▒ ┘à┘å category ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è (buildMetaTemplatePayload).
 * ┘é┘ê╪º┘ä╪¿ ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘ä┘è eventType ╪¿╪¬╪º╪╣┘ç╪º ┘â┘ê╪» ╪¡╪º┘ä╪⌐ ╪«╪º┘à (╪▓┘è "delivered") ┘â╪º┘å╪¬ ╪¿╪¬╪¬╪«╪▓┘æ┘å
 * category = MARKETING (default ┘é╪»┘è┘à ┘ü┘è getCategoryForEvent) ΓåÆ ┘à┘è╪¬╪º ╪¬┘å╪┤╪ª ╪º┘ä┘é╪º┘ä╪¿ MARKETING
 * ╪¿╪»┘ä UTILITY (┘à╪½╪º┘ä ╪¡┘é┘è┘é┘è: deliveredmsj72rwc).
 *
 * ╪¿╪╣╪» ┘ç╪░╪º ╪º┘ä┘Ç fix ╪º┘ä┘â┘ê╪» ╪¿┘è╪¬╪¼╪º┘ç┘ä category ┘ê┘è╪╡╪▒┘æ┘ü┘ç╪º UTILITY ┘ü┘è ┘à┘è╪¬╪º╪î ┘ä┘â┘å ┘ä╪º╪▓┘à ┘å╪╣╪»┘æ┘ä ╪º┘ä┘é┘ê╪º┘ä╪¿
 * ╪º┘ä┘à┘ê╪¼┘ê╪»╪⌐ ┘ü╪╣┘ä╪º┘ï ╪╣╪┤╪º┘å ╪º┘ä┘Ç UI ┘ê╪º┘ä╪╣╪▒╪╢ ┘ê╪º┘ä┘ü┘ä╪º╪¬╪▒ ╪¬╪▒╪¼╪╣ ╪¬╪╡┘å┘è┘ü┘ç╪º ╪º┘ä╪╡╪¡┘è╪¡ ORDERS.
 *
 * ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à: node scripts/fix_order_status_template_categories.js [--dry-run] [--company=COMPANY_ID]
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { isOrderCategory } = require('../services/whatsapp/notificationTypes');

const DRY_RUN = process.argv.includes('--dry-run');
const companyArg = process.argv.find((a) => a.startsWith('--company='));
const companyId = companyArg ? companyArg.split('=')[1] : null;

async function main() {
  const prisma = getSharedPrismaClient();

  const where = {
    category: 'MARKETING',
    ...(companyId ? { companyId } : {}),
  };

  const templates = await prisma.whatsAppNotificationTemplate.findMany({
    where,
    select: { id: true, name: true, eventType: true, category: true, metaTemplateName: true, companyId: true },
  });

  const orderTemplates = templates.filter((t) => isOrderCategory(t.category, t.eventType));

  console.log(`≡ƒôè Local templates with category=MARKETING: ${templates.length}`);
  console.log(`≡ƒöü Of those, order-status templates (should be ORDERS): ${orderTemplates.length}`);

  if (orderTemplates.length === 0) {
    console.log('Γ£à ┘ä╪º ╪¬┘ê╪¼╪» ┘é┘ê╪º┘ä╪¿ ╪¬╪¡╪¬╪º╪¼ ╪¬╪╣╪»┘è┘ä.');
    await prisma.$disconnect();
    return;
  }

  for (const t of orderTemplates) {
    console.log(`  ΓÇó ${t.name} | eventType=${t.eventType} | meta=${t.metaTemplateName || '-'}`);
  }

  if (DRY_RUN) {
    console.log('Γ£à Dry-run: nothing applied. Remove --dry-run to update.');
    await prisma.$disconnect();
    return;
  }

  for (const t of orderTemplates) {
    await prisma.whatsAppNotificationTemplate.update({
      where: { id: t.id },
      data: { category: 'ORDERS' },
    });
  }

  console.log(`Γ£à Updated ${orderTemplates.length} template(s) to category=ORDERS.`);
  console.log('Γä╣∩╕Å ╪ú┘è ╪Ñ╪╣╪º╪»╪⌐ ┘å╪┤╪▒ (publish/resubmit) ┘ç╪¬╪«┘ä┘é ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º UTILITY ╪¬┘ä┘é╪º╪ª┘è╪º┘ï. ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘é╪»┘è┘à MARKETING ╪╣┘ä┘ë ┘à┘è╪¬╪º ╪¿┘è╪¡╪¬╪º╪¼ ┘è┘Å╪¡╪░┘ü ┘è╪»┘ê┘è╪º┘ï ╪ú┘ê ┘è┘Å╪¬╪▒┘â.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Γ¥î Error:', err?.message || err);
  process.exit(1);
});
