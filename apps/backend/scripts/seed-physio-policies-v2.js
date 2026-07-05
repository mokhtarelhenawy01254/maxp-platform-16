/**
 * Directly insert policies for the physio company into the database.
 * Run: node scripts/seed-physio-policies-v2.js
 */
const { getSharedPrismaClient } = require('../prisma/prismaUtils');

const COMPANY_ID = 'cmqpbuw3y3oq1ju40or3mr8it';

const POLICIES = [
  { title: 'سياسة إلغاء الحجز', content: 'يمكن إلغاء الحجز قبل الموعد بـ 24 ساعة على الأقل. في حالة الإلغاء بعد ذلك يتم احتساب رسوم إلغاء بقيمة 50% من قيمة الجلسة. يمكن إعادة جدولة الموعد مجاناً مرة واحدة بشرط الإخطار قبل 12 ساعة.', category: 'general', tags: 'إلغاء, إعادة جدولة, رسوم, مواعيد' },
  { title: 'سياسة التامين الطبي', content: 'نحن نتعامل مع عدد من شركات التأمين الطبي تشمل: مصر للتأمين، أليانز، AXA، وGIG. يرجى التواصل مع الاستقبال لتأكيد تغطية وثيقتكم قبل الحجز.', category: 'insurance', tags: 'تأمين, شركات تأمين, تغطية' },
  { title: 'تعليمات ما قبل الجلسة', content: 'يرجى الحضور قبل الموعد بـ 15 دقيقة. ارتداء ملابس رياضية مريحة. إحضار التقارير الطبية السابقة. يمنع تناول الطعام قبل الجلسة بساعتين.', category: 'preparation', tags: 'تعليمات, تحضير, ملابس, تقارير' },
  { title: 'سياسة الخصوصية', content: 'جميع بيانات المرضى محفوظة بسرية تامة وفقاً لقانون حماية البيانات. لا يتم مشاركة أي معلومات طبية أو شخصية مع أطراف ثالثة دون موافقة خطية.', category: 'privacy', tags: 'خصوصية, بيانات, سرية' },
  { title: 'أسعار الجلسات والباقات', content: 'أسعار الجلسات تبدأ من 150 جنيهاً. باقة 6 جلسات بسعر 750 جنيهاً. باقة 12 جلسة بسعر 1350 جنيهاً. باقة 20 جلسة بسعر 2000 جنيهاً. الأطفال وكبار السن خصم إضافي 10%.', category: 'pricing', tags: 'أسعار, باقات, خصم, جلسات' },
  { title: 'مواعيد العمل', content: 'أيام الرجال: السبت، الاثنين، الأربعاء 3-9 م. أيام النساء: الأحد، الثلاثاء، الخميس 3-9 م. الجمعة إجازة. آخر حجز 8 م.', category: 'general', tags: 'مواعيد, أيام, دوام' },
];

async function main() {
  const prisma = getSharedPrismaClient();

  const existing = await prisma.policy.count({ where: { companyId: COMPANY_ID } });
  console.log(`Existing policies for physio company: ${existing}`);

  if (existing > 0) {
    console.log('Policies already exist, skipping creation.');
    return;
  }

  for (const p of POLICIES) {
    const policy = await prisma.policy.create({
      data: {
        companyId: COMPANY_ID,
        title: p.title,
        content: p.content,
        category: p.category,
        tags: p.tags,
        isActive: true,
      },
    });
    console.log(`  ✅ ${policy.title} (${policy.id})`);
  }

  const total = await prisma.policy.count({ where: { companyId: COMPANY_ID } });
  console.log(`\n✅ Done. ${total} policies created.`);
}

main().catch(console.error).finally(() => process.exit(0));
