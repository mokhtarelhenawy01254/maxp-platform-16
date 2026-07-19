/**
 * Trigger knowledge embedding backfill for the physio company.
 * Run on production server.
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const RagKnowledgeMaintenanceService = require('../services/rag/RagKnowledgeMaintenanceService');

const COMPANY_ID = 'cmqpbuw3y3oq1ju40or3mr8it';

async function main() {
  const prisma = getSharedPrismaClient();

  // Check how many policies exist
  const policyCount = await prisma.policy.count({ where: { companyId: COMPANY_ID } });
  console.log(`Policies for physio company: ${policyCount}`);

  if (policyCount === 0) {
    console.log('No policies found. Creating them...');
    const POLICIES = [
      { title: 'سياسة إلغاء الحجز', content: 'يمكن إلغاء الحجز قبل الموعد بـ 24 ساعة على الأقل. في حالة الإلغاء بعد ذلك يتم احتساب رسوم إلغاء بقيمة 50% من قيمة الجلسة. يمكن إعادة جدولة الموعد مجاناً مرة واحدة بشرط الإخطار قبل 12 ساعة.', category: 'general', tags: 'إلغاء, إعادة جدولة, رسوم, مواعيد' },
      { title: 'سياسة التامين الطبي', content: 'نحن نتعامل مع عدد من شركات التأمين الطبي تشمل: مصر للتأمين، أليانز، AXA، وGIG. يرجى التواصل مع الاستقبال لتأكيد تغطية وثيقتكم قبل الحجز.', category: 'insurance', tags: 'تأمين, شركات تأمين, تغطية' },
      { title: 'تعليمات ما قبل الجلسة', content: 'يرجى الحضور قبل الموعد بـ 15 دقيقة. ارتداء ملابس رياضية مريحة. إحضار التقارير الطبية السابقة. يمنع تناول الطعام قبل الجلسة بساعتين.', category: 'preparation', tags: 'تعليمات, تحضير, ملابس, تقارير' },
      { title: 'سياسة الخصوصية', content: 'جميع بيانات المرضى محفوظة بسرية تامة وفقاً لقانون حماية البيانات. لا يتم مشاركة أي معلومات طبية أو شخصية مع أطراف ثالثة دون موافقة خطية.', category: 'privacy', tags: 'خصوصية, بيانات, سرية' },
      { title: 'أسعار الجلسات والباقات', content: 'أسعار الجلسات تبدأ من 150 جنيهاً. باقة 6 جلسات بسعر 750 جنيهاً. باقة 12 جلسة بسعر 1350 جنيهاً. باقة 20 جلسة بسعر 2000 جنيهاً. الأطفال وكبار السن خصم إضافي 10%.', category: 'pricing', tags: 'أسعار, باقات, خصم, جلسات' },
      { title: 'مواعيد العمل', content: 'أيام الرجال: السبت، الاثنين، الأربعاء 3-9 م. أيام النساء: الأحد، الثلاثاء، الخميس 3-9 م. الجمعة إجازة. آخر حجز 8 م.', category: 'general', tags: 'مواعيد, أيام, دوام' },
    ];
    for (const p of POLICIES) {
      await prisma.policy.create({ data: { companyId: COMPANY_ID, ...p, isActive: true } });
      console.log(`  + ${p.title}`);
    }
  }

  // Trigger backfill for policies
  console.log('\nTriggering knowledge backfill (policies, force)...');
  const result = await RagKnowledgeMaintenanceService.backfillEmbeddings(COMPANY_ID, {
    target: 'policy',
    force: true,
    limit: 100,
  });
  console.log(`  scanned: ${result.scanned}, updated: ${result.updated}, skipped: ${result.skipped}`);
  if (result.errors.length) console.log('  errors:', result.errors);

  // Check progress
  console.log('\nAfter backfill:');
  const policies = await prisma.policy.findMany({
    where: { companyId: COMPANY_ID },
    select: { id: true, title: true, embedding: true, embeddingGeneratedAt: true },
  });
  const embedded = policies.filter(p => p.embedding && p.embeddingGeneratedAt);
  console.log(`  Total: ${policies.length}, Embedded: ${embedded.length}`);
  policies.forEach(p => console.log(`  ${p.title}: ${p.embedding ? '✅ embedded' : '❌ not embedded'}`));
}

main().catch(console.error).finally(() => process.exit(0));
