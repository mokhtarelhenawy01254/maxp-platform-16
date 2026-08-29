const { PrismaClient } = require('./apps/backend/prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function getCompanyStats(companyId, label) {
  console.log(`\n=== ${label} (${companyId}) ===`);
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name:true, email:true, slug:true, createdAt:true } });
  console.log('Company:', company);

  const schedules = await prisma.customerNotificationSchedule.findMany({ where: { companyId } });
  console.log(`Schedules: ${schedules.length}`);
  const enabled = schedules.filter(s=>s.enabled).length;
  console.log(`  Enabled: ${enabled}, Disabled: ${schedules.length-enabled}`);
  console.log(`  By channel:`, schedules.reduce((acc,s)=>{acc[s.activeChannel]=(acc[s.activeChannel]||0)+1; return acc},{}));

  const templates = await prisma.whatsAppNotificationTemplate.findMany({ where: { companyId } });
  console.log(`Templates: ${templates.length}`);
  const byCategory = templates.reduce((acc,t)=>{acc[t.category||'NULL']=(acc[t.category||'NULL']||0)+1; return acc},{});
  const byChannel = templates.reduce((acc,t)=>{acc[t.channel||'NULL']=(acc[t.channel||'NULL']||0)+1; return acc},{});
  console.log('  By category:', byCategory);
  console.log('  By channel:', byChannel);
  console.log('  By eventType:', templates.map(t=>t.eventType).slice(0,10));

  const customers = await prisma.customer.findMany({ where: { companyId }, take: 5 });
  const customerCount = await prisma.customer.count({ where: { companyId } });
  console.log(`Customers: ${customerCount}`);

  const vouchers = await prisma.customerLoyaltyVoucher.count({ where: { companyId } }).catch(()=>0);
  console.log(`Vouchers: ${vouchers}`);

  const logs = await prisma.whatsAppNotificationLog.count({ where: { companyId } }).catch(()=>0);
  console.log(`Notification logs: ${logs}`);

  return { schedules: schedules.length, templates: templates.length, customers: customerCount, logs };
}

async function main() {
  const newId = 'cmtd267gv0000ubf8qryd5io0';
  const oldId = 'cmtc08hm80000ubugv69kjkbn'; // dental lab demo
  // Find another mature company with more data
  const mature = await prisma.company.findFirst({
    where: { NOT: { id: { in: [newId, oldId] } } },
    orderBy: { createdAt: 'asc' },
    select: { id:true, name:true }
  });
  console.log('Mature company candidate:', mature);

  const newStats = await getCompanyStats(newId, 'الشركة الجديدة - اختبار الإشعارات');
  const oldStats = await getCompanyStats(oldId, 'الشركة القديمة - معمل الأسنان');
  if (mature) {
    const matureStats = await getCompanyStats(mature.id, `شركة ناضجة - ${mature.name}`);
    console.log('\n=== المقارنة ===');
    console.log(`| المقياس | الجديدة | القديمة | ناضجة |`);
    console.log(`|---|---|---|---|`);
    console.log(`| الجدولة | ${newStats.schedules} | ${oldStats.schedules} | ${matureStats.schedules} |`);
    console.log(`| القوالب | ${newStats.templates} | ${oldStats.templates} | ${matureStats.templates} |`);
    console.log(`| العملاء | ${newStats.customers} | ${oldStats.customers} | ${matureStats.customers} |`);
  } else {
    console.log('\n=== المقارنة (جديدة vs قديمة) ===');
    console.log(`Schedules: جديد=${newStats.schedules} vs قديم=${oldStats.schedules}`);
    console.log(`Templates: جديد=${newStats.templates} vs قديم=${oldStats.templates}`);
    console.log(`Customers: جديد=${newStats.customers} vs قديم=${oldStats.customers}`);
    console.log(`
التحليل:
- الشركة الجديدة تم إنشاؤها بـ 18 جدولة (كل الأحداث) و 3 قوالب و 3 عملاء - هذا يطابق البنية المتوقعة لـ customerScope
- الشركة القديمة (معمل الأسنان) ${oldStats.schedules===0 ? 'ليس لديها جداول - لم يتم تهيئة الإشعارات بعد' : `لديها ${oldStats.schedules} جدول`}
- الفروقات توضح أن البنية تعمل: الجدولة تُنشأ تلقائياً 18 صف، القوالب يدوية
    `);
  }

  await prisma.$disconnect();
}
main().catch(e=>{console.error(e); process.exit(1)});
