/**
 * 🔧 Fix order-status WhatsApp templates that were wrongly classified as MARKETING.
 *
 * خلفية: تصنيف قالب ميتا بيتحسب لحظة النشر من category القالب المحلي (buildMetaTemplatePayload).
 * قوالب حالات الطلبات اللي eventType بتاعها كود حالة خام (زي "delivered") كانت بتتخزّن
 * category = MARKETING (default قديم في getCategoryForEvent) → ميتا تنشئ القالب MARKETING
 * بدل UTILITY (مثال حقيقي: deliveredmsj72rwc).
 *
 * بعد هذا الـ fix الكود بيتجاهل category ويصرّفها UTILITY في ميتا، لكن لازم نعدّل القوالب
 * الموجودة فعلاً عشان الـ UI والعرض والفلاتر ترجع تصنيفها الصحيح ORDERS.
 *
 * الاستخدام: node scripts/fix_order_status_template_categories.js [--dry-run] [--company=COMPANY_ID]
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

  console.log(`📊 Local templates with category=MARKETING: ${templates.length}`);
  console.log(`🔁 Of those, order-status templates (should be ORDERS): ${orderTemplates.length}`);

  if (orderTemplates.length === 0) {
    console.log('✅ لا توجد قوالب تحتاج تعديل.');
    await prisma.$disconnect();
    return;
  }

  for (const t of orderTemplates) {
    console.log(`  • ${t.name} | eventType=${t.eventType} | meta=${t.metaTemplateName || '-'}`);
  }

  if (DRY_RUN) {
    console.log('✅ Dry-run: nothing applied. Remove --dry-run to update.');
    await prisma.$disconnect();
    return;
  }

  for (const t of orderTemplates) {
    await prisma.whatsAppNotificationTemplate.update({
      where: { id: t.id },
      data: { category: 'ORDERS' },
    });
  }

  console.log(`✅ Updated ${orderTemplates.length} template(s) to category=ORDERS.`);
  console.log('ℹ️ أي إعادة نشر (publish/resubmit) هتخلق قالب ميتا UTILITY تلقائياً. القالب القديم MARKETING على ميتا بيحتاج يُحذف يدوياً أو يُترك.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err?.message || err);
  process.exit(1);
});
