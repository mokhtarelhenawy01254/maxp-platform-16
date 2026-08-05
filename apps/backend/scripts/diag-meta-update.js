/**
 * diag-meta-update.js — يعمل داخل /var/www/backend2 (حيث modules متاحة)
 * يشخّص endpoint تعديل القالب على Meta Cloud API:
 * 1) يعرض listTemplates الخام (name + id + status)
 * 2) يجرب updateTemplate الحالي (POST /message_templates/{id})
 * 3) يجرب POST /message_templates?name=... (الطريقة القديمة)
 * 4) يعرض الاستجابة الخام من ميتا لكل محاولة
 */

const { getSharedPrismaClient } = require('./services/sharedDatabase');
const MetaCloudProvider = require('./services/whatsapp/providers/MetaCloudProvider');

const companyEmail = 'swan@h2m.com';

async function main() {
  const prisma = getSharedPrismaClient();

  // إيجاد الشركة
  const user = await prisma.user.findFirst({
    where: { email: companyEmail },
    select: { id: true, companyId: true },
  });
  if (!user) {
    console.log('USER_NOT_FOUND');
    return;
  }
  const companyId = user.companyId;

  // إيجاد جلسة Meta Cloud
  const session = await prisma.whatsAppSession.findFirst({
    where: { companyId, provider: 'META_CLOUD' },
  });
  if (!session) {
    console.log('NO_META_SESSION company=' + companyId);
    return;
  }
  console.log('SESSION_ID=' + session.id + ' provider=' + session.provider);

  // القالب المحلي CONFIRMED
  const local = await prisma.whatsAppNotificationTemplate.findFirst({
    where: { companyId, eventType: { equals: 'CONFIRMED', mode: 'insensitive' } },
  });
  if (!local) {
    console.log('NO_LOCAL_CONFIRMED');
    return;
  }
  console.log('LOCAL id=' + local.id + ' metaTemplateName=' + local.metaTemplateName + ' metaTemplateId=' + local.metaTemplateId + ' status=' + local.metaTemplateStatus);

  // 1) listTemplates الخام
  console.log('\n=== 1) LIST TEMPLATES (raw) ===');
  let templates = [];
  try {
    templates = await MetaCloudProvider.listTemplates(session.id);
    for (const t of templates.slice(0, 50)) {
      console.log(`  name=${t.name} | id=${t.id} | status=${t.status} | lang=${t.language} | category=${t.category}`);
    }
    console.log(`  total=${templates.length}`);
  } catch (e) {
    console.log('  LIST ERROR: ' + e.message);
    console.log('  raw:', JSON.stringify(e.response?.data || e).slice(0, 500));
  }

  // إيجاد template id من listTemplates
  const found = templates.find((t) => t.name === local.metaTemplateName);
  console.log('\nFOUND meta template: name=' + (found && found.name) + ' id=' + (found && found.id) + ' status=' + (found && found.status));

  // بناء payload مشابه لما يرسله controller
  const { buildMetaTemplatePayload } = require('./utils/metaTemplatePayload');
  const built = buildMetaTemplatePayload(local);
  const bodyWithExample = built.variableCount > 0
    ? { type: 'BODY', text: built.bodyText, example: { body_text: [Array.from({ length: built.variableCount }, (_, i) => `قيمة ${i + 1}`)] } }
    : { type: 'BODY', text: built.bodyText };
  const components = [bodyWithExample];
  if (built.buttonsComponent) components.push(built.buttonsComponent);

  // 2) محاولة updateTemplate الجديدة (POST /message_templates/{id})
  if (found && found.id) {
    console.log('\n=== 2) updateTemplate(session, name, data, templateId=' + found.id + ') ===');
    try {
      const r = await MetaCloudProvider.updateTemplate(session.id, local.metaTemplateName, {
        components,
        language: 'ar',
        category: built.metaCategory,
      }, found.id);
      console.log('  SUCCESS:', JSON.stringify(r));
    } catch (e) {
      console.log('  ERROR: ' + e.message);
      console.log('  raw:', JSON.stringify(e.response?.data || e).slice(0, 800));
    }
  }

  // 3) محاولة الطريقة القديمة (POST /message_templates?name=...)
  console.log('\n=== 3) updateTemplate بدون templateId (سيعتمد على ?name= قديماً? لا — جديداً يحل الـ id داخلياً) ===');
  try {
    const r = await MetaCloudProvider.updateTemplate(session.id, local.metaTemplateName, {
      components,
      language: 'ar',
      category: built.metaCategory,
    });
    console.log('  SUCCESS:', JSON.stringify(r));
  } catch (e) {
    console.log('  ERROR: ' + e.message);
    console.log('  raw:', JSON.stringify(e.response?.data || e).slice(0, 800));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('DIAG_FATAL', e.message);
  console.error(JSON.stringify(e.response?.data || e).slice(0, 800));
  process.exit(1);
});
