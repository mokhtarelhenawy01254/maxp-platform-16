const { PrismaClient } = require('./apps/backend/prisma/generated/postgresql_v2');
const bcrypt = require('./apps/backend/node_modules/bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const ts = Date.now().toString(36);
  const companyName = `شركة اختبار الإشعارات ${ts}`;
  const companyEmail = `test-notify-${ts}@maxp.test`;
  const adminEmail = `admin-notify-${ts}@maxp.test`;
  const adminPassword = 'Test1234!@#';
  
  console.log('Creating company:', companyName);
  
  // Check existing
  const existing = await prisma.company.findUnique({ where: { email: companyEmail }});
  if (existing) {
    console.log('Company already exists:', existing.id);
    return;
  }

  // Generate slug (simple)
  const slug = `test-notify-${ts}`;

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug: slug,
      email: companyEmail,
      phone: '01000000000',
      currency: 'EGP',
      isActive: true,
      sidebarLayout: 'three-tier',
    }
  });
  console.log('Company created:', company.id, company.slug);

  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'مدير',
      lastName: 'الاختبار',
      role: 'COMPANY_ADMIN',
      companyId: company.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    }
  });
  console.log('Admin created:', adminUser.id, adminUser.email);

  // Add sample data for customer notifications
  // 1. Create customer loyalty schedules (ensure 13 rows)
  // Use service logic: create schedules if not exists
  const events = [
    { eventType: 'LOYALTY_POINTS_AWARDED', category: 'loyalty', label: 'كسب نقاط ولاء' },
    { eventType: 'LOYALTY_TIER_UPGRADED', category: 'loyalty', label: 'الترقية لمستوى أعلى' },
    { eventType: 'CASHBACK_CREDITED', category: 'cashback', label: 'إيداع كاش باك' },
    { eventType: 'CUSTOMER_QUALITY_UPGRADED', category: 'quality', label: 'ارتفاع تصنيف الجودة' },
    { eventType: 'AUTO_DISCOUNT_COUPON_GRANTED', category: 'autoDiscount', label: 'منح كوبون' },
  ];

  // Check if CustomerNotificationSchedule model exists
  // Try to create schedules via raw query inspection
  try {
    // List available models
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%customer%notification%schedule%'`;
    console.log('Schedule tables:', tables);
  } catch(e) { console.log('Schedule table check failed:', e.message); }

  // Try prisma.customerNotificationSchedule
  try {
    if (prisma.customerNotificationSchedule) {
      for (const ev of events) {
        const existing = await prisma.customerNotificationSchedule.findUnique({
          where: { companyId_eventType: { companyId: company.id, eventType: ev.eventType } }
        });
        if (!existing) {
          await prisma.customerNotificationSchedule.create({
            data: {
              companyId: company.id,
              eventType: ev.eventType,
              enabled: true,
              activeChannel: 'AUTO',
              delayValue: 0,
              delayUnit: 'HOURS',
              label: ev.label,
              category: ev.category,
            }
          });
          console.log('Schedule created:', ev.eventType);
        }
      }
    } else {
      console.log('Model customerNotificationSchedule not found in client, trying alternative names...');
      console.log(Object.keys(prisma).filter(k=>k.toLowerCase().includes('customer')||k.toLowerCase().includes('schedule')).slice(0,20));
    }
  } catch(e) {
    console.log('Schedule creation error:', e.message);
    console.log(e);
  }

  // 2. Create whatsapp templates
  try {
    const templateChecks = Object.keys(prisma).filter(k=>k.toLowerCase().includes('whatsapp')||k.toLowerCase().includes('template'));
    console.log('Template models:', templateChecks.slice(0,20));
    
    // Try whatsappNotificationTemplate or similar
    const modelNames = ['whatsAppNotificationTemplate','whatsappNotificationTemplate','whatsAppTemplate','template','whatsappTemplate'];
    let model = null;
    let modelName = null;
    for (const n of modelNames) {
      if (prisma[n]) { model = prisma[n]; modelName = n; break; }
    }
    console.log('Found template model:', modelName);
    
    if (model) {
      const samples = [
        { eventType: 'LOYALTY_POINTS_AWARDED', name: 'قالب كسب نقاط', content: 'مرحبا {customerName} كسبت {points} نقطة! رصيدك {currentPoints}', category: 'MARKETING', channel: 'BAILEYS' },
        { eventType: 'CASHBACK_CREDITED', name: 'قالب كاش باك', content: 'مرحبا {customerName} تم إيداع {cashAmount} {currency}', category: 'MARKETING', channel: 'BAILEYS' },
        { eventType: 'CUSTOMER_QUALITY_UPGRADED', name: 'قالب ترقية جودة', content: 'مبروك {customerName} تصنيفك أصبح {qualityTier}', category: 'MARKETING', channel: 'BAILEYS' },
      ];
      for (const tpl of samples) {
        try {
          await model.create({
            data: {
              companyId: company.id,
              eventType: tpl.eventType,
              name: tpl.name,
              content: tpl.content,
              category: tpl.category,
              channel: tpl.channel,
              isActive: true,
              hasButtons: false,
            }
          });
          console.log('Template created:', tpl.eventType);
        } catch(e) {
          console.log('Template create failed for', tpl.eventType, ':', e.message);
        }
      }
    }
  } catch(e) {
    console.log('Template creation error:', e.message);
  }

  // 3. Create customers
  try {
    const customerModelNames = ['customer','Customer'];
    let cModel = null;
    for (const n of customerModelNames) if (prisma[n]) { cModel = prisma[n]; break; }
    if (cModel) {
      for (let i=1; i<=3; i++) {
        await cModel.create({
          data: {
            companyId: company.id,
            name: `عميل اختبار ${i}`,
            phone: `0100000000${i}`,
            email: `customer${i}-${ts}@test.local`,
          }
        });
      }
      console.log('3 customers created');
    } else {
      console.log('Customer model not found, keys:', Object.keys(prisma).filter(k=>k.toLowerCase().includes('customer')).slice(0,10));
    }
  } catch(e) { console.log('Customer creation error:', e.message); }

  console.log('\n=== DONE ===');
  console.log(JSON.stringify({ companyId: company.id, companyEmail, adminEmail, adminPassword }, null, 2));
  
  await prisma.$disconnect();
}

main().catch(e=>{console.error(e); process.exit(1)});
