const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function seedMarketplace() {
  console.log('🌱 Starting Marketplace Seed...');

  try {
    console.log('\n🛠️ Creating Marketplace Apps...');

    const apps = [
      {
        slug: 'ecommerce-basic',
        name: 'المتجر الإلكتروني الأساسي',
        category: 'ECOMMERCE',
        description: 'متجر إلكتروني كامل مع إدارة المنتجات والطلبات وسلة التسوق',
        icon: '🛒',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        trialDays: 0,
        features: JSON.stringify(['إدارة المنتجات', 'سلة تسوق', 'معالجة الطلبات', 'تقارير المبيعات']),
        isActive: true,
        isFeatured: true,
        isPopular: true
      },
      {
        slug: 'hr-basic',
        name: 'إدارة الموارد البشرية',
        category: 'HR',
        description: 'نظام شامل لإدارة بيانات الموظفين والأقسام والمناصب',
        icon: '👥',
        monthlyPrice: 99,
        yearlyPrice: 990,
        trialDays: 0,
        features: JSON.stringify(['إدارة الموظفين', 'الأقسام والمناصب', 'تقارير الموظفين']),
        isActive: true,
        isPopular: true
      },
      {
        slug: 'ai-chat-basic',
        name: 'محادثات AI الأساسية',
        category: 'AI',
        description: 'محادثات ذكية مع العملاء باستخدام الذكاء الاصطناعي',
        icon: '🤖',
        monthlyPrice: 299,
        yearlyPrice: 2990,
        trialDays: 0,
        features: JSON.stringify(['ردود تلقائية ذكية', 'تحليل المشاعر', 'تقارير الأداء']),
        isActive: true,
        isFeatured: true
      },
      {
        slug: 'whatsapp-integration',
        name: 'تكامل WhatsApp Business',
        category: 'COMMUNICATION',
        description: 'تكامل كامل مع WhatsApp Business API',
        icon: '💬',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        trialDays: 0,
        features: JSON.stringify(['WhatsApp Business API', 'ردود سريعة', 'قوالب الرسائل']),
        isActive: true,
        isPopular: true
      },
      {
        slug: 'crm-basic',
        name: 'CRM الأساسي',
        category: 'CRM',
        description: 'إدارة العملاء والمحادثات والملاحظات',
        icon: '📊',
        monthlyPrice: 149,
        yearlyPrice: 1490,
        trialDays: 0,
        features: JSON.stringify(['إدارة العملاء', 'المحادثات', 'الملاحظات', 'تقارير أساسية']),
        isActive: true
      },
      {
        slug: 'analytics-advanced',
        name: 'التحليلات المتقدمة',
        category: 'ANALYTICS',
        description: 'تحليلات متقدمة مع تقارير مخصصة وتصدير البيانات',
        icon: '📈',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        trialDays: 0,
        features: JSON.stringify(['تحليلات متقدمة', 'تقارير مخصصة', 'تصدير البيانات']),
        isActive: true
      },
      // تطبيقات التحكم في الظهور بالـ sidebar
      { slug: 'business-tools', name: 'المهام والمواعيد', description: 'إدارة المهام والمواعيد وجدولة الأعمال', category: 'PRODUCTIVITY', monthlyPrice: 0, yearlyPrice: 0, features: JSON.stringify(['إدارة المهام', 'المواعيد']), isActive: true, isPublic: true },
      { slug: 'competitor-analysis', name: 'تحليل المنافسين', description: 'تحليل السوق والمنافسين وتقارير المقارنة', category: 'ANALYTICS', monthlyPrice: 0, yearlyPrice: 0, features: JSON.stringify(['تحليل المنافسين', 'تقارير السوق']), isActive: true, isPublic: true },
      { slug: 'affiliate-program', name: 'الأفليت والدروب شيبنج', description: 'نظام الأفليت والتسويق بالعمولة', category: 'MARKETING', monthlyPrice: 0, yearlyPrice: 0, features: JSON.stringify(['إدارة الأفليت', 'دروب شيبنج']), isActive: true, isPublic: true },
      { slug: 'partner-program', name: 'برنامج الشركاء', description: 'برنامج شركاء المنصة و نظام العمولات', category: 'MARKETING', monthlyPrice: 0, yearlyPrice: 0, features: JSON.stringify(['برنامج الشركاء', 'العمولات']), isActive: true, isPublic: true },
    ];

    for (const app of apps) {
      await prisma.marketplaceApp.upsert({
        where: { slug: app.slug },
        update: app,
        create: app
      });
      console.log(`  ✅ Created app: ${app.name}`);
    }

    console.log('\n📦 Creating App Bundles...');

    const bundles = [
      {
        slug: 'starter-bundle',
        name: 'باقة البداية',
        description: 'باقة مثالية للشركات الناشئة: المتجر الأساسي + CRM + إدارة الموظفين',
        appIds: JSON.stringify(['ecommerce-basic', 'crm-basic', 'hr-basic']),
        monthlyPrice: 399,
        yearlyPrice: 3990,
        discount: 30,
        isActive: true,
        isFeatured: true
      },
      {
        slug: 'business-bundle',
        name: 'باقة الأعمال',
        description: 'باقة شاملة للشركات المتوسطة: جميع الأدوات الأساسية',
        appIds: JSON.stringify(['ecommerce-basic', 'crm-basic', 'hr-basic', 'ai-chat-basic', 'whatsapp-integration']),
        monthlyPrice: 899,
        yearlyPrice: 8990,
        discount: 40,
        isActive: true,
        isFeatured: true
      },
      {
        slug: 'messaging-bundle',
        name: 'باقة المراسلة',
        description: 'كل أدوات المحادثات: واتساب + تلجرام + انستجرام + ماسنجر في صندوق واحد مع AI Agent',
        appIds: JSON.stringify(['crm-basic', 'whatsapp-integration', 'telegram-business']),
        monthlyPrice: 999,
        yearlyPrice: 9990,
        discount: 69,
        isActive: true,
        isFeatured: true
      }
    ];

    for (const bundle of bundles) {
      await prisma.appBundle.upsert({
        where: { slug: bundle.slug },
        update: bundle,
        create: bundle
      });
      console.log(`  ✅ Created bundle: ${bundle.name}`);
    }

    console.log('\n✅ Marketplace Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${apps.length} Marketplace Apps`);
    console.log(`  - ${bundles.length} App Bundles`);

  } catch (error) {
    console.error('❌ Error seeding marketplace:', error);
    throw error;
  }
}

seedMarketplace()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
