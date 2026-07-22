const { getSharedPrismaClient } = require('/var/www/backend2/services/sharedDatabase');
const prisma = getSharedPrismaClient();
const TurboService = require('/var/www/backend2/services/turboService');

async function compareTurboCounts() {
  console.log('====================================================');
  console.log('🔍 Comparing Turbo Live API vs Local DB for Swan');
  console.log('====================================================');

  const company = await prisma.company.findFirst({
    where: { name: { contains: 'swan', mode: 'insensitive' } }
  });

  if (!company) { console.error('❌ Swan not found'); process.exit(1); }
  console.log(`🏢 Company: ${company.name} (${company.id})`);

  const turboService = new TurboService(company.turboApiKey, company.id);

  // Fetch live from Turbo API (last 90 days)
  const today = new Date();
  const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(today.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().split('T')[0];
  const toDate = today.toISOString().split('T')[0];

  console.log(`\n📡 Fetching from Turbo API (${fromDate} → ${toDate})...`);

  let apiResult = null;
  try {
    apiResult = await turboService.fetchAllStatuses(fromDate, toDate);
    console.log(`✅ Retrieved ${apiResult.count} shipments from Turbo API`);
  } catch (error) {
    console.error('❌ Turbo API error:', error.message);
  }

  // Count by internalStatus from API
  const apiCounts = {};
  const apiCountsByCode = {};
  if (apiResult && apiResult.shipments) {
    apiResult.shipments.forEach(s => {
      const ist = s.internalStatus || 'unknown';
      const code = String(s.statusCode || '');
      apiCounts[ist] = (apiCounts[ist] || 0) + 1;
      if (code) apiCountsByCode[code] = (apiCountsByCode[code] || 0) + 1;
    });
  }

  // Fetch local DB orders for Swan
  const dbOrders = await prisma.order.findMany({
    where: { companyId: company.id },
    select: {
      id: true, orderNumber: true, status: true,
      turboShipmentId: true, turboTrackingNumber: true, turboShipmentStatus: true
    }
  });

  const dbCounts = {};
  let totalWithTurbo = 0;
  dbOrders.forEach(o => {
    if (o.turboShipmentId || o.turboTrackingNumber) {
      totalWithTurbo++;
      const ts = (o.turboShipmentStatus || 'no_status').toLowerCase();
      dbCounts[ts] = (dbCounts[ts] || 0) + 1;
    }
  });

  // الحالات من صورة تربو
  const targetStatuses = [
    { nameAr: 'قيد التنفيذ', code: '3', key: 'processing' },
    { nameAr: 'مسلمة للمندوب', code: '4', key: 'out_for_delivery' },
    { nameAr: 'مؤجلات مع المندوب', code: '13', key: 'delayed' },
    { nameAr: 'تم التسليم', code: '7', key: 'delivered' },
    { nameAr: 'مرتجعات في الشركة', code: '5', key: 'returned_to_company' },
    { nameAr: 'مرتجعات معدومة', code: '12', key: 'returned_destroyed' },
    { nameAr: 'مرتجعات مفقودة', code: '11', key: 'returned_missing' },
    { nameAr: 'معاد ارسالها', code: '10', key: 'returned_resent' }
  ];

  console.log('\n📊 === جدول المقارنة لشركة Swan ===');
  console.log('='.repeat(95));
  console.log(`| ${'حالة الشحنة في تربو'.padEnd(28)} | ${'الكود'.padEnd(5)} | ${'العدد في API تربو'.padEnd(18)} | ${'العدد في داتابيز المنصة'.padEnd(24)} | ${'الفرق'.padEnd(6)} |`);
  console.log('='.repeat(95));

  targetStatuses.forEach(st => {
    const apiCount = apiCountsByCode[st.code] || apiCounts[st.key] || 0;
    const dbCount = dbCounts[st.key] || dbCounts[`status_${st.code}`] || 0;
    const diff = apiCount - dbCount;
    const diffStr = diff === 0 ? '✅ 0' : (diff > 0 ? `⚠️ +${diff}` : `🔻 ${diff}`);
    console.log(`| ${st.nameAr.padEnd(28)} | ${st.code.padEnd(5)} | ${String(apiCount).padEnd(18)} | ${String(dbCount).padEnd(24)} | ${diffStr.padEnd(6)} |`);
  });

  console.log('='.repeat(95));
  console.log(`\n📈 إجمالي الشحنات في API تربو: ${apiResult ? apiResult.count : 0}`);
  console.log(`📈 إجمالي الأوردرات مرتبطة بتربو في المنصة: ${totalWithTurbo}`);

  // Show ALL API statuses
  console.log('\n📋 توزيع الحالات الكامل من API تربو (بالكود):');
  Object.entries(apiCountsByCode).sort((a,b) => Number(a[0]) - Number(b[0])).forEach(([code, count]) => {
    console.log(`  كود ${code}: ${count} شحنة`);
  });

  console.log('\n📋 توزيع الحالات الكامل من API تربو (بالاسم الداخلي):');
  Object.entries(apiCounts).sort((a,b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\n📋 توزيع الحالات الكامل في داتابيز المنصة (turboShipmentStatus):');
  Object.entries(dbCounts).sort((a,b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Check turbo-records page statuses
  console.log('\n🔍 فحص حالات صفحة /orders/turbo-records...');
  const statusConfigs = await prisma.orderStatusConfig.findMany({
    where: { companyId: company.id, source: 'turbo' },
    orderBy: { sortOrder: 'asc' },
    select: { code: true, name: true, nameEn: true, color: true, isActive: true, sortOrder: true }
  });
  console.log(`\n📋 حالات الشحن الخاصة بتربو في إعدادات الشركة (/settings/orders): ${statusConfigs.length} حالة`);
  statusConfigs.forEach(sc => {
    console.log(`  ${sc.isActive ? '✅' : '❌'} [${sc.sortOrder}] ${sc.code} → ${sc.name} (${sc.nameEn}) ${sc.color}`);
  });

  process.exit(0);
}

compareTurboCounts().catch(e => { console.error(e); process.exit(1); });
