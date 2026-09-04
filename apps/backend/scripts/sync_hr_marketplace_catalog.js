#!/usr/bin/env node

/**
 * Sync & Clean HR Marketplace Catalog
 * Synchronizes the 5 official HR apps, deprecates duplicates without breaking existing installs,
 * and adds the comprehensive HR bundle.
 */

const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

const OFFICIAL_HR_APPS = [
  {
    slug: 'hr-core',
    name: 'نظام HR الأساسي',
    description: 'إدارة بيانات الموظفين، الأقسام، الهيكل التنظيمي، ملفات ومستندات العمل، وسياسات الشركة — الأساس المتكامل لإدارة فريقك.',
    category: 'HR',
    pricingModel: 'FREE',
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 14,
    requiredApps: [],
    features: {
      employees: { enabled: true, name: 'إدارة الموظفين', description: 'ملفات كاملة لبيانات الموظفين وعقودهم ومستنداتهم.', access: 'FREE' },
      departments: { enabled: true, name: 'الأقسام والمناصب', description: 'تنظيم الأقسام والمسميات الوظيفية وهيكل الشركة.', access: 'FREE' },
      orgChart: { enabled: true, name: 'الهيكل التنظيمي', description: 'عرض شجري تفاعلي لتسلسل الإدارات والمسؤوليات.', access: 'FREE' },
      policies: { enabled: true, name: 'سياسات الشركة', description: 'نشر لوائح العمل والقوانين الداخلية للفريق.', access: 'FREE' }
    },
    isActive: true,
    isPublic: true,
    isFeatured: true,
    isPopular: true,
    icon: 'users'
  },
  {
    slug: 'hr-attendance-pro',
    name: 'الحضور والانصراف والورديات',
    description: 'تتبع الحضور بالـ Geofencing/GPS و QR Code، جدول الورديات والمناوبات، إدارة الإجازات والأذونات، واحتساب التأخيرات وساعات العمل تلقائياً.',
    category: 'HR',
    pricingModel: 'SUBSCRIPTION',
    monthlyPrice: 79,
    yearlyPrice: 790,
    trialDays: 14,
    requiredApps: ['hr-core'],
    features: {
      geofencingCheckin: { enabled: true, name: 'حضور بالـ GPS و QR', description: 'تسجيل الحضور والانصراف من الموقع الجغرافي المحدد أو مسح الكود.', access: 'PAID' },
      shiftManagement: { enabled: true, name: 'إدارة الورديات والمناوبات', description: 'جدولة وتوزيع ورديات العمل وتعيين الموظفين عليها.', access: 'PAID' },
      leaveRequests: { enabled: true, name: 'إدارة الإجازات والأرصدة', description: 'تقديم ومتابعة طلبات الإجازات مع دورة اعتماد وموافقة.', access: 'PAID' },
      permissions: { enabled: true, name: 'أذونات التأخير والخروج', description: 'إدارة أذونات التأخير وساعات الاستئذان المعتمدة.', access: 'PAID' }
    },
    isActive: true,
    isPublic: true,
    isFeatured: false,
    isPopular: true,
    icon: 'clock'
  },
  {
    slug: 'hr-payroll',
    name: 'مسير الرواتب والمستحقات',
    description: 'حساب الرواتب الشهري التلقائي، إدارة السلف والخصومات والبدلات، كشوف الحسابات ومفردات المرتب، وتقارير الضرائب والتأمينات.',
    category: 'HR',
    pricingModel: 'SUBSCRIPTION',
    monthlyPrice: 99,
    yearlyPrice: 990,
    trialDays: 14,
    requiredApps: ['hr-core'],
    features: {
      automatedPayroll: { enabled: true, name: 'توليد الرواتب التلقائي', description: 'احتساب الرواتب بناءً على الحضور والتأخيرات والبدلات بنقرة واحدة.', access: 'PAID' },
      advancesManagement: { enabled: true, name: 'إدارة السلف', description: 'استقبال طلبات السلف وسدادها وخصمها من الراتب تلقائياً.', access: 'PAID' },
      deductionsBonuses: { enabled: true, name: 'الخصومات والمكافآت', description: 'تسجيل الخصومات والجزاءات والمكافآت الإضافية للموظفين.', access: 'PAID' },
      payslips: { enabled: true, name: 'كشوف مفردات المرتب', description: 'تصدير كشوف الرواتب الشهرية بصيغ جاهزة للطباعة والبنوك.', access: 'PAID' }
    },
    isActive: true,
    isPublic: true,
    isFeatured: true,
    isPopular: false,
    icon: 'banknote'
  },
  {
    slug: 'hr-recruitment',
    name: 'نظام التوظيف واستبيانات العمل',
    description: 'نشر الوظائف واستقبال طلبات التوظيف، استبيانات التقديم الديناميكية، مسار تتبع المتقدمين (ATS Pipeline)، وجدولة المقابلات والتقييم.',
    category: 'HR',
    pricingModel: 'SUBSCRIPTION',
    monthlyPrice: 129,
    yearlyPrice: 1290,
    trialDays: 14,
    requiredApps: ['hr-core'],
    features: {
      jobPostings: { enabled: true, name: 'نشر الوظائف', description: 'إنشاء وإدارة إعلانات الوظائف وتحديد المتطلبات.', access: 'PAID' },
      candidatePipeline: { enabled: true, name: 'مسار تتبع المتقدمين (ATS)', description: 'نقل المرشحين بين مراحل الفرز، المقابلة، والعرض الوظيفي.', access: 'PAID' },
      applicationForms: { enabled: true, name: 'نماذج التقديم واستبيانات العمل', description: 'نماذج مخصصة لاستقبال السير الذاتية وإجابات المتقدمين.', access: 'PAID' },
      interviewScheduling: { enabled: true, name: 'جدولة المقابلات', description: 'تحديد مواعيد المقابلات وتقييم المرشحين وتدوين الملاحظات.', access: 'PAID' }
    },
    isActive: true,
    isPublic: true,
    isFeatured: false,
    isPopular: false,
    icon: 'briefcase'
  },
  {
    slug: 'hr-assets',
    name: 'إدارة العهد والأصول وتقييم الأداء',
    description: 'تسجيل عهد وأصول الشركة وتسليمها للموظفين مع نماذج التصفية، بالإضافة لتقييمات الأداء الدورية، ومكافآت التقدير، وإجراءات المخالصة.',
    category: 'HR',
    pricingModel: 'SUBSCRIPTION',
    monthlyPrice: 99,
    yearlyPrice: 990,
    trialDays: 14,
    requiredApps: ['hr-core'],
    features: {
      assetCustody: { enabled: true, name: 'إدارة العهد والأجهزة', description: 'تسجيل الأجهزة وتخصيصها ونماذج الاستلام والتسليم.', access: 'PAID' },
      performanceReviews: { enabled: true, name: 'تقييمات الأداء الدورية', description: 'نماذج تقييم أداء الموظفين وقياس مؤشرات النجاح.', access: 'PAID' },
      rewardsKudos: { enabled: true, name: 'المكافآت والتقدير', description: 'برنامج حوافز وتقدير وإرسال شارات الإنجاز للموظفين.', access: 'PAID' },
      clearanceSettlement: { enabled: true, name: 'إخلاء الطرف والمخالصة', description: 'قائمة تصفية العهد والمستحقات عند انتهاء خدمة الموظف.', access: 'PAID' }
    },
    isActive: true,
    isPublic: true,
    isFeatured: false,
    isPopular: false,
    icon: 'monitor'
  }
];

const DEPRECATED_DUPLICATE_SLUGS = ['hr-basic', 'hr-attendance'];

const HR_BUNDLE = {
  slug: 'hr-complete-bundle',
  name: 'باقة الموارد البشرية المتكاملة',
  nameEn: 'HR Complete Bundle',
  description: 'المنظومة الشاملة لإدارة فريق العمل: الأساسيات + الحضور والورديات بالـ GPS + مسير الرواتب والسلف + التوظيف واستبيانات العمل + إدارة العهد وتقييم الأداء بتوفير 26%.',
  monthlyPrice: 299,
  yearlyPrice: 2990,
  discount: 26,
  appIds: ['hr-core', 'hr-attendance-pro', 'hr-payroll', 'hr-recruitment', 'hr-assets'],
  isActive: true,
  isFeatured: true
};

async function syncHrMarketplace() {
  console.log('🔄 Starting HR Marketplace Sync...');
  const prisma = getSharedPrismaClient();

  // 1. Upsert official HR apps
  for (const app of OFFICIAL_HR_APPS) {
    const payload = {
      name: app.name,
      description: app.description,
      category: app.category,
      pricingModel: app.pricingModel,
      monthlyPrice: app.monthlyPrice,
      yearlyPrice: app.yearlyPrice,
      trialDays: app.trialDays,
      requiredApps: app.requiredApps,
      features: app.features,
      isActive: app.isActive,
      isPublic: app.isPublic,
      isFeatured: app.isFeatured,
      isPopular: app.isPopular,
      icon: app.icon
    };

    const result = await executeWithRetry(async () => {
      return await prisma.marketplaceApp.upsert({
        where: { slug: app.slug },
        update: payload,
        create: {
          slug: app.slug,
          ...payload
        }
      });
    });
    console.log(`  ✅ Synced App: ${result.slug} (${result.name}) - ${result.monthlyPrice} EGP`);
  }

  // 2. Hide deprecated duplicate apps from public store without breaking companyApp installations
  for (const slug of DEPRECATED_DUPLICATE_SLUGS) {
    const existing = await executeWithRetry(async () => {
      return await prisma.marketplaceApp.findUnique({ where: { slug } });
    });

    if (existing) {
      await executeWithRetry(async () => {
        return await prisma.marketplaceApp.update({
          where: { slug },
          data: { isPublic: false }
        });
      });
      console.log(`  🔒 Deprecated duplicate app hidden from public store: ${slug}`);
    }
  }

  // 3. Upsert the HR Complete Bundle
  const bundleResult = await executeWithRetry(async () => {
    return await prisma.appBundle.upsert({
      where: { slug: HR_BUNDLE.slug },
      update: {
        name: HR_BUNDLE.name,
        nameEn: HR_BUNDLE.nameEn,
        description: HR_BUNDLE.description,
        monthlyPrice: HR_BUNDLE.monthlyPrice,
        yearlyPrice: HR_BUNDLE.yearlyPrice,
        discount: HR_BUNDLE.discount,
        appIds: HR_BUNDLE.appIds,
        isActive: HR_BUNDLE.isActive,
        isFeatured: HR_BUNDLE.isFeatured
      },
      create: {
        slug: HR_BUNDLE.slug,
        name: HR_BUNDLE.name,
        nameEn: HR_BUNDLE.nameEn,
        description: HR_BUNDLE.description,
        monthlyPrice: HR_BUNDLE.monthlyPrice,
        yearlyPrice: HR_BUNDLE.yearlyPrice,
        discount: HR_BUNDLE.discount,
        appIds: HR_BUNDLE.appIds,
        isActive: HR_BUNDLE.isActive,
        isFeatured: HR_BUNDLE.isFeatured
      }
    });
  });
  console.log(`  🎁 Synced Bundle: ${bundleResult.slug} (${bundleResult.name}) - ${bundleResult.monthlyPrice} EGP`);

  console.log('✨ HR Marketplace Sync Completed Successfully!');
}

if (require.main === module) {
  syncHrMarketplace()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error during HR Marketplace sync:', error);
      process.exit(1);
    });
}

module.exports = { syncHrMarketplace };
