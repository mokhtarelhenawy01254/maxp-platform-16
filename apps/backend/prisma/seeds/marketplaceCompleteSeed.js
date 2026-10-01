const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getSharedPrismaClientAsync } = require('../../services/sharedDatabase');

async function seedMarketplace() {
  console.log('🌱 بدء إضافة تطبيقات المتجر المنظمة...\n');

  const prisma = await getSharedPrismaClientAsync();

  if (!prisma) {
    console.error('❌ CRITICAL: Could not initialize Prisma client.');
    process.exit(1);
  }

  const upsertAppSafely = async (app) => {
    // 🛡️ CRITICAL: Never overwrite name, description, pricing or admin status for existing apps in DB
    const {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      pricingModel,
      unitPrice,
      unitName,
      ppuBillingMethod,
      trialDays,
      isActive,
      isPublic,
      ...safeMetadataUpdate
    } = app;

    return await prisma.marketplaceApp.upsert({
      where: { slug: app.slug },
      update: safeMetadataUpdate,
      create: app
    });
  };

  // ============================================
  // القسم 1: التجارة الإلكترونية (ECOMMERCE)
  // ============================================
  console.log('🛒 القسم 1: التجارة الإلكترونية');

  const ecommerceApps = [
    {
      slug: 'store-basic',
      name: 'المتجر',
      category: 'ECOMMERCE',
      description: 'متجر إلكتروني كامل: منتجات وطلبات وسلة تسوق ومتجر إلكتروني. مناسب للمشاريع الصغيرة والمتوسطة.',
      icon: '🛒',
      monthlyPrice: 249,
      yearlyPrice: 2490,
      trialDays: 14,
      features: JSON.stringify([
        'إدارة الطلبات',
        'إدارة المنتجات',
        'المتجر الإلكتروني',
        'سلة تسوق ذكية',
        'معالجة الطلبات',
        'تقارير المبيعات الأساسية',
        'إدارة الفئات',
        'صفحات المنتجات',
        'كوبونات وعروض',
        'إدارة الشحن'
      ]),
      isActive: true,
      isFeatured: true,
      isPopular: true
    },
    {
      slug: 'order-preparation-hold',
      name: 'تجهيز الطلبات',
      category: 'ORDER_OPS',
      description: 'متابعة ومعالجة الطلبات المعلقة في مرحلة التجهيز ومشاكل النواقص والتوريد (عرض 96 طلب).',
      pricingModel: 'FREE',
      monthlyPrice: 0,
      yearlyPrice: 0,
      mainRoute: '/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP',
      adminRoute: '/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP',
      trialDays: 0,
      icon: 'clock',
      features: JSON.stringify([
        'طابور التجهيز المعلق',
        'عرض 96 طلب بنقرة واحدة',
        'معالجة مشاكل النواقص والتوريد',
        'تحديث حالات الطلبات المتوقفة'
      ]),
      isActive: true,
      isFeatured: true,
      isPopular: true
    },
    {
      slug: 'store-pro',
      name: 'متجر ماكس',
      category: 'ECOMMERCE',
      description: 'متجر متقدم: منتجات غير محدودة، مخازن متعددة، تقارير متقدمة وميزات احترافية للشركات المتوسطة والكبيرة.',
      icon: '🏪',
      monthlyPrice: 499,
      yearlyPrice: 4990,
      trialDays: 14,
      features: JSON.stringify([
        'منتجات غير محدودة',
        'مخازن متعددة',
        'تتبع المخزون Real-time',
        'تقارير متقدمة',
        'تكامل مع WooCommerce',
        'إدارة الموردين',
        'طلبات الشراء',
        'إشعارات نفاد المخزون'
      ]),
      isActive: true,
      isFeatured: true
    },
    {
      slug: 'pos-pro',
      name: 'نظام POS',
      category: 'ECOMMERCE',
      description: 'نقطة بيع متكاملة: كاشير، فواتير بيع مباشر، سلة بيع سريعة، وطباعة فواتير بيع فورية.',
      icon: '🖥️',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'كاشير POS',
        'بيع سريع',
        'فاتورة بيع فورية'
      ]),
      isActive: true,
      isPublic: true,
      isFeatured: false,
      mainRoute: '/pos',
      adminRoute: '/pos'
    },
    {
      slug: 'coupons-pro',
      name: 'الكوبونات والعروض',
      category: 'MARKETING',
      description: 'إنشاء كوبونات خصم وعروض ترويجية — نسب/مبالغ خصم، حد أدنى للطلب، وتتبع أداء الكوبونات.',
      icon: '🎟️',
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      features: JSON.stringify([
        'كوبونات الخصم',
        'العروض الترويجية',
        'تتبع أداء الكوبونات'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'woocommerce-pro',
      name: 'تكامل WooCommerce',
      category: 'INTEGRATION',
      description: 'مزامنة المنتجات والطلبات والمخزون بين منصة MaxP ومتجر WooCommerce — استيراد وتصدير تلقائي.',
      icon: '🛒',
      monthlyPrice: 79,
      yearlyPrice: 790,
      trialDays: 14,
      features: JSON.stringify([
        'مزامنة المنتجات',
        'مزامنة الطلبات',
        'مزامنة المخزون'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'multi-warehouse-pro',
      name: 'المخزون المتعدد',
      category: 'WAREHOUSE',
      description: 'إدارة مخزون عبر مستودعات متعددة — تحويلات المخزون بين المستودعات، وتوزيع الكميات لكل فرع.',
      icon: '🏬',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'مستودعات متعددة',
        'تحويلات المخزون',
        'توزيع الكميات'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'order-accounting-sources',
      name: 'مصادر الطلبات والمحاسبة',
      category: 'ORDER_OPS',
      description: 'تتبع مصدر كل طلب (متجر، يدوي، فيسبوك، واتساب، تليجرام، استيراد) مع محاسبة وإيرادات منفصلة لكل مصدر.',
      icon: '🔀',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'تتبع مصدر الطلب',
        'محاسبة كل مصدر',
        'تقارير المصادر'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'manual-orders-pro',
      name: 'الطلب اليدوي',
      category: 'ORDER_OPS',
      description: 'إنشاء طلبات يدوية من صفحة مخصصة: اختيار المنتج والمتغيرات، إضافة العميل، وتحديد طريقة الدفع والشحن.',
      icon: '✍️',
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      features: JSON.stringify([
        'نموذج الطلب اليدوي',
        'بيانات العميل',
        'الدفع والشحن'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'inventory-pro',
      name: 'إدارة المخزون المتقدمة',
      category: 'WAREHOUSE',
      description: 'نظام إدارة مخزون متقدم مع Barcode، تتبع Serial Numbers، وتنبيهات ذكية.',
      icon: '📦',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'Barcode Scanner',
        'Serial Numbers',
        'تاريخ التحركات',
        'تنبيهات نفاد',
        'جرد آلي',
        'تقارير المخزون'
      ]),
      isActive: true,
      isPopular: false
    }
  ];

  for (const app of ecommerceApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 2: الموارد البشرية (HR)
  // ============================================
  console.log('\n👥 القسم 2: الموارد البشرية');

  const hrApps = [
    {
      slug: 'hr-core',
      name: 'نظام HR الأساسي',
      category: 'HR',
      description: 'إدارة بيانات الموظفين، الأقسام، المناصب، والهيكل التنظيمي. مجاني حتى 10 موظفين.',
      icon: '👥',
      monthlyPrice: 0,
      yearlyPrice: 0,
      trialDays: 14,
      features: JSON.stringify([
        'حتى 10 موظفين مجاناً',
        'بيانات الموظفين',
        'الأقسام والمناصب',
        'الهيكل التنظيمي',
        'ملفات الموظفين',
        'تقارير أساسية'
      ]),
      isActive: true,
      isPopular: true
    },
    {
      slug: 'hr-attendance-pro',
      name: 'الحضور والانصراف المتقدم',
      category: 'HR',
      description: 'تتبع حضور وانصراف الموظفين مع Geofencing، QR Code، والتأخير التلقائي.',
      icon: '⏰',
      monthlyPrice: 79,
      yearlyPrice: 790,
      trialDays: 14,
      features: JSON.stringify([
        'Geofencing',
        'QR Code للحضور',
        'تتبع التأخير',
        'ساعات العمل',
        'إجازات وغياب',
        'تقارير الحضور'
      ]),
      isActive: true,
      isPopular: false
    },
    {
      slug: 'hr-payroll',
      name: 'نظام الرواتب والمحاسبة',
      category: 'HR',
      description: 'حساب الرواتب التلقائي مع السلف، الخصومات، المكافآت، والتقارير الضريبية.',
      icon: '💰',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'حساب الرواتب التلقائي',
        'السلف والخصومات',
        'المكافآت والحوافز',
        'كشوف الرواتب',
        'التقارير الضريبية',
        'تكامل مع البنوك'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'hr-assets',
      name: 'إدارة الأصول والمعدات',
      category: 'HR',
      description: 'إدارة أصول الشركة، المعدات، الصيانة، والتخصيص للموظفين.',
      icon: '🖥️',
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      features: JSON.stringify([
        'تسجيل الأصول',
        'تخصيص للموظفين',
        'صيانة دورية',
        'إهلاك الأصول',
        'تقارير الموجودات',
        'تنبيهات الصيانة'
      ]),
      isActive: true,
      isPopular: false
    },
    {
      slug: 'hr-recruitment',
      name: 'نظام التوظيف الذكي',
      category: 'HR',
      description: 'إدارة عملية التوظيف من الإعلان حتى التعيين مع AI Screening.',
      icon: '🎯',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'نشر الوظائف',
        'استقبال الطلبات',
        'AI Screening',
        'مقابلات مجدولة',
        'تقييم المرشحين',
        'Offer Letters'
      ]),
      isActive: true,
      isFeatured: false
    }
  ];

  for (const app of hrApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice === 0 ? 'مجاني' : app.monthlyPrice + 'ج/شهر'}`);
  }

  // ============================================
  // القسم 3: الذكاء الاصطناعي (AI)
  // ============================================
  console.log('\n🤖 القسم 3: الذكاء الاصطناعي');

  const aiApps = [
    {
      slug: 'ai-chat-basic',
      name: 'AI Chat - الباقة الأساسية',
      category: 'AI',
      description: 'محادثات ذكية مع العملاء باستخدام AI. يشمل 1000 محادثة شهرياً وتقارير الأداء.',
      icon: '🤖',
      monthlyPrice: 299,
      yearlyPrice: 2990,
      trialDays: 14,
      features: JSON.stringify([
        '1000 محادثة/شهر',
        'ردود تلقائية ذكية',
        'تحليل المشاعر',
        'تاريخ المحادثات',
        'تقارير الأداء',
        'دعم العربية والإنجليزية'
      ]),
      isActive: true,
      isFeatured: true,
      isPopular: true
    },
    {
      slug: 'ai-chat-pro',
      name: 'AI Chat - الباقة الاحترافية',
      category: 'AI',
      description: 'محادثات AI متقدمة مع RAG، Few-Shot Learning، ودعم متعدد اللغات.',
      icon: '🧠',
      monthlyPrice: 599,
      yearlyPrice: 5990,
      trialDays: 14,
      features: JSON.stringify([
        '5000 محادثة/شهر',
        'RAG - قاعدة المعرفة',
        'Few-Shot Learning',
        'تدريب مخصص',
        'تحليلات متقدمة',
        'دعم 10 لغات'
      ]),
      isActive: true,
      isFeatured: true
    },
    {
      slug: 'ai-image-studio',
      name: 'AI Image Studio',
      category: 'AI',
      description: 'توليد صور احترافية للمنتجات والتسويق باستخدام AI. 200 صورة شهرياً.',
      icon: '🎨',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        '200 صورة/شهر',
        'توليد صور المنتجات',
        'تعديل الخلفيات',
        'تحسين الصور',
        'تصميمات تسويقية',
        'Export HD'
      ]),
      isActive: true,
      isPopular: true
    },
    {
      slug: 'ai-rag-knowledge',
      name: 'RAG - قاعدة المعرفة',
      category: 'AI',
      description: 'إدارة قاعدة معرفة ذكية للشركة مع Vector Embeddings والبحث الذكي.',
      icon: '📚',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'Vector Embeddings',
        'بحث ذكي',
        'استيراد المستندات',
        'تحديث تلقائي',
        'ربط مع AI Chat',
        'تحليل الاستخدام'
      ]),
      isActive: true,
      isFeatured: false
    }
  ];

  for (const app of aiApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 4: التواصل والإشعارات (COMMUNICATION)
  // ============================================
  console.log('\n💬 القسم 4: التواصل والإشعارات');

  const communicationApps = [
    {
      slug: 'whatsapp-business',
      name: 'WhatsApp Business API',
      category: 'COMMUNICATION',
      description: 'تكامل كامل مع WhatsApp Business API. إرسال واستقبال الرسائل والردود التلقائية.',
      icon: '💬',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'WhatsApp Business API',
        'ردود سريعة',
        'قوالب الرسائل',
        'ردود تلقائية',
        'تقارير الرسائل',
        'إشعارات الطلبات'
      ]),
      isActive: true,
      isFeatured: true,
      isPopular: true
    },
    {
      slug: 'telegram-business',
      name: 'Telegram for Business',
      category: 'COMMUNICATION',
      description: 'إدارة مجموعات وقنوات تليجرام، الرد الآلي، والبوتات المتقدمة.',
      icon: '✈️',
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      features: JSON.stringify([
        'إدارة القنوات والمجموعات',
        'بوتات الرد الآلي',
        'جدولة الرسائل',
        'تحليلات التفاعل',
        'ربط مع AI',
        'Broadcast'
      ]),
      isActive: true,
      isPopular: false
    },
    {
      slug: 'broadcast-pro',
      name: 'نظام البث المتقدم',
      category: 'COMMUNICATION',
      description: 'نظام إرسال رسائل جماعية متقدم مع تصنيف العملاء وجدولة الإرسال.',
      icon: '📢',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'تصنيف العملاء',
        'جدولة الإرسال',
        'A/B Testing',
        'تقارير الفتح',
        'SMS + WhatsApp + Email',
        'قوالب جاهزة'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'unified-inbox',
      name: 'Unified Inbox',
      category: 'COMMUNICATION',
      description: 'صندوق وارد موحد يجمع محادثاتك من كل المنصات في مكان واحد مع إمكانية الرد المباشر.',
      icon: '📬',
      monthlyPrice: 299,
      yearlyPrice: 2999,
      trialDays: 0,
      features: JSON.stringify([
        'دعم المنصات المتعددة',
        'الرد الموحد',
        'سجل المحادثات',
        'فريق العمل المشترك'
      ]),
      isActive: true,
      isFeatured: false,
      isPopular: true
    }
  ];

  for (const app of communicationApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 5: CRM والعملاء (CRM)
  // ============================================
  console.log('\n📊 القسم 5: CRM والعملاء');

  const crmApps = [
    {
      slug: 'crm-basic',
      name: 'CRM - الباقة الأساسية',
      category: 'CRM',
      description: 'إدارة العملاء والمحادثات والملاحظات. حتى 1000 عميل.',
      icon: '📊',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        '1000 عميل',
        'سجل المحادثات',
        'الملاحظات والتags',
        'تقارير أساسية',
        'استيراد العملاء',
        'تصدير البيانات'
      ]),
      isActive: true,
      isPopular: true
    },
    {
      slug: 'crm-loyalty',
      name: 'CRM + نظام الولاء',
      category: 'CRM',
      description: 'CRM متقدم مع نظام نقاط الولاء، المكافآت، والهدايا للعملاء.',
      icon: '💎',
      monthlyPrice: 299,
      yearlyPrice: 2990,
      trialDays: 14,
      features: JSON.stringify([
        'عملاء غير محدودين',
        'نقاط الولاء',
        'برنامج المكافآت',
        'بطاقات VIP',
        'الهدايا والخصومات',
        'تقارير الولاء'
      ]),
      isActive: true,
      isFeatured: true
    },
    {
      slug: 'opportunities-pipeline',
      name: 'إدارة الفرص والمبيعات',
      category: 'CRM',
      description: 'إدارة فرص المبيعات، الـ Pipeline، والتوقعات المالية.',
      icon: '📈',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'Sales Pipeline',
        'توقعات المبيعات',
        'مراحل الصفقات',
        'Tasks and Reminders',
        'تقارير الأداء',
        'Dashboard تفاعلي'
      ]),
      isActive: true,
      isFeatured: false
    }
  ];

  for (const app of crmApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 6: التحليلات والتقارير (ANALYTICS)
  // ============================================
  console.log('\n📈 القسم 6: التحليلات والتقارير');

  const analyticsApps = [
    {
      slug: 'analytics-basic',
      name: 'التحليلات والتقارير',
      category: 'ANALYTICS',
      description: 'تحليلات متقدمة مع تقارير مخصصة، تصدير البيانات، وتتبع الأهداف.',
      icon: '📈',
      monthlyPrice: 249,
      yearlyPrice: 2490,
      trialDays: 14,
      features: JSON.stringify([
        'تحليلات متقدمة',
        'تقارير مخصصة',
        'تصدير Excel/PDF',
        'تتبع الأهداف',
        'Dashboards',
        'جدولة التقارير'
      ]),
      isActive: true,
      isFeatured: true,
      isPopular: true
    },
    {
      slug: 'turbo-analytics',
      name: 'Turbo Analytics Pro',
      category: 'ANALYTICS',
      description: 'تحليلات فورية Real-time مع AI Insights والتنبؤات المستقبلية.',
      icon: '⚡',
      monthlyPrice: 399,
      yearlyPrice: 3990,
      trialDays: 14,
      features: JSON.stringify([
        'Real-time Analytics',
        'AI Insights',
        'Predictive Analytics',
        'Custom Dashboards',
        'Alerts and Notifications',
        'API Access'
      ]),
      isActive: true,
      isFeatured: true
    }
  ];

  for (const app of analyticsApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 7: الجدولة والمواعيد (SCHEDULING)
  // ============================================
  console.log('\n📅 القسم 7: الجدولة والمواعيد');

  const schedulingApps = [
    {
      slug: 'appointments-pro',
      name: 'نظام المواعيد والحجوزات',
      category: 'PRODUCTIVITY',
      description: 'نظام حجوزات متكامل مع Calendar، تذكيرات، وتكامل مع Google Calendar.',
      icon: '📅',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'Calendar متكامل',
        'حجوزات أونلاين',
        'تذكيرات تلقائية',
        'Google Calendar Sync',
        'إدارة الموظفين',
        'تقارير الحجوزات'
      ]),
      isActive: true,
      isPopular: false
    },
    {
      slug: 'smart-scheduler',
      name: 'الجدولة الذكية للمهام',
      category: 'PRODUCTIVITY',
      description: 'جدولة مهام ذكية مع تذكيرات، أتمتة، وربط مع الأهداف.',
      icon: '⏰',
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      features: JSON.stringify([
        'جدولة المهام',
        'تذكيرات ذكية',
        'أتمتة العمليات',
        'ربط الأهداف',
        'تتبع الوقت',
        'تقارير الإنتاجية'
      ]),
      isActive: true,
      isPopular: false
    }
  ];

  for (const app of schedulingApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 8: التكاملات والـ API (INTEGRATIONS)
  // ============================================
  console.log('\n🔗 القسم 8: التكاملات والـ API');

  const integrationApps = [
    {
      slug: 'woocommerce-sync',
      name: 'WooCommerce Sync',
      category: 'INTEGRATION',
      description: 'مزامنة كاملة مع WooCommerce: استيراد/تصدير المنتجات والطلبات.',
      icon: '🔄',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'مزامنة المنتجات',
        'مزامنة الطلبات',
        'استيراد العملاء',
        'تحديث آلي',
        'Webhook Support',
        'Mapper مخصص'
      ]),
      isActive: true,
      isPopular: true
    },
    {
      slug: 'webhooks-pro',
      name: 'Webhooks & API Pro',
      category: 'INTEGRATION',
      description: 'تكاملات API متقدمة مع Webhooks، Zapier، وأتمتة العمليات.',
      icon: '🔌',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'Custom Webhooks',
        'API Access',
        'Zapier Integration',
        'Workflow Automation',
        'Data Sync',
        'Security Logs'
      ]),
      isActive: true,
      isFeatured: false
    }
  ];

  for (const app of integrationApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 9: التسويق الرقمي (MARKETING)
  // ============================================
  console.log('\n📱 القسم 9: التسويق الرقمي');

  const marketingApps = [
    {
      slug: 'facebook-pages-connect',
      name: 'ربط صفحات فيسبوك',
      category: 'MARKETING',
      description: 'ربط صفحات فيسبوك وإدارة الصفحات الأساسية والمحتوى.',
      icon: '📄',
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      features: JSON.stringify([
        'ربط الصفحات (OAuth)',
        'إدارة الصفحات',
        'نشر المحتوى',
        'الرد على التعليقات',
        'تحليلات الصفحة'
      ]),
      isActive: true,
      isPopular: false
    },
    {
      slug: 'facebook-pixel-capi',
      name: 'Pixel وتحليلات التحويل',
      category: 'MARKETING',
      description: 'تتبع الزوار والتحويلات عبر Pixel و CAPI مع تقارير دقيقة.',
      icon: '📊',
      monthlyPrice: 99,
      yearlyPrice: 990,
      trialDays: 14,
      features: JSON.stringify([
        'Pixel Tracking',
        'Conversions API (CAPI)',
        'أحداث قياسية',
        'تقارير التحويل',
        'ربط مع المتجر',
        'تحسين الحملات'
      ]),
      isActive: true,
      isFeatured: true,
      isPopular: false,
      requiredApps: ['facebook-pages-connect']
    },
    {
      slug: 'facebook-ads-pro',
      name: 'إعلانات فيسبوك وانستجرام',
      category: 'MARKETING',
      description: 'إدارة حملات فيسبوك وانستجرام مع AI Optimization وتقارير متقدمة.',
      icon: '📢',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'إنشاء الحملات',
        'AI Optimization',
        'Audience Targeting',
        'A/B Testing',
        'تقارير الأداء',
        'Automation Rules',
        'Budget Alerts',
        'Lead Forms'
      ]),
      isActive: true,
      isFeatured: true,
      isPopular: true,
      requiredApps: ['facebook-pages-connect']
    },
    {
      slug: 'facebook-catalog-shop',
      name: 'كتالوج ومتجر فيسبوك',
      category: 'MARKETING',
      description: 'مزامنة كتالوج المنتجات مع فيسبوك وانستجرام Shop، إدارة المخزون، وإعلانات Dynamic Ads.',
      icon: '🛍️',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'مزامنة الكتالوج',
        'Dynamic Ads',
        'Instagram Shop',
        'Facebook Shops',
        'تصنيف المنتجات',
        'إدارة المخزون',
        'تحديث آلي'
      ]),
      isActive: true,
      isPopular: false,
      requiredApps: ['facebook-pages-connect']
    },
    {
      slug: 'facebook-post',
      name: 'إنشاء منشور فيسبوك',
      category: 'MARKETING',
      description: 'إنشاء ونشر منشورات فيسبوك مباشرة من المنصة — نصوص، صور، وجدولة النشر على صفحاتك.',
      icon: '📝',
      monthlyPrice: 49,
      yearlyPrice: 490,
      trialDays: 14,
      features: JSON.stringify([
        'منشئ المنشورات',
        'جدولة النشر'
      ]),
      isActive: true,
      isFeatured: false,
      isPopular: false,
      requiredApps: ['facebook-pages-connect']
    }
  ];

  for (const app of marketingApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 10: المالية والفواتير (FINANCE)
  // ============================================
  console.log('\n💰 القسم 10: المالية والفواتير');

  const financeApps = [
    {
      slug: 'invoicing-pro',
      name: 'نظام الفواتير الاحترافي',
      category: 'FINANCE',
      description: 'إنشاء وإرسال الفواتير، متابعة المدفوعات، وتقارير الضرائب.',
      icon: '📝',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'فواتير مخصصة',
        'إرسال PDF/Email',
        'متابعة المدفوعات',
        'تذكيرات التحصيل',
        'تقارير الضرائب',
        'تكامل مع البنوك'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'wallet-system',
      name: 'نظام المحفظة الإلكترونية',
      category: 'FINANCE',
      description: 'محفظة إلكترونية للعملاء والشركات مع شحن وسحب وتحويل.',
      icon: '💳',
      monthlyPrice: 0,
      yearlyPrice: 0,
      trialDays: 14,
      features: JSON.stringify([
        'محفظة إلكترونية',
        'شحن الرصيد',
        'سحب الأموال',
        'تحويل داخلي',
        'سجل المعاملات',
        'تكامل Fawry/Vodafone Cash'
      ]),
      isActive: true,
      isPopular: true
    }
  ];

  for (const app of financeApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice === 0 ? 'مجاني' : app.monthlyPrice + 'ج/شهر'}`);
  }

  // ============================================
  // القسم 11: التحفيز والمكافآت (GAMIFICATION)
  // ============================================
  console.log('\n🏆 القسم 11: التحفيز والمكافآت');

  const gamificationApps = [
    {
      slug: 'kudos-recognition',
      name: 'نظام Kudos (تقدير الموظفين)',
      category: 'GAMIFICATION',
      description: 'نظام تقدير الموظفين والثناء بين أعضاء الفريق.',
      icon: '🏆',
      monthlyPrice: 79,
      yearlyPrice: 790,
      trialDays: 14,
      features: JSON.stringify([
        'إرسال Kudos',
        'نقاط التقدير',
        'Leaderboard',
        'شارات الإنجاز',
        'تكامل مع HR',
        'تقارير التقدير'
      ]),
      isActive: true,
      isPopular: false
    },
    {
      slug: 'gamification-pro',
      name: 'Gamification Pro',
      category: 'GAMIFICATION',
      description: 'نظام تحفيز متكامل مع نقاط، شارات، مستويات، ومكافآت.',
      icon: '🎮',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'نقاط التحفيز',
        'شارات الإنجاز',
        'مستويات التقدم',
        'تحديات أسبوعية',
        'مكافآت تلقائية',
        'تقارير التفاعل'
      ]),
      isActive: true,
      isFeatured: false
    }
  ];

  for (const app of gamificationApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice}ج/شهر`);
  }

  // ============================================
  // القسم 12: إدارة الطلبات واللوجستيات (ORDERS)
  // ============================================
  console.log('\n📦 القسم 12: إدارة الطلبات واللوجستيات');

  const orderApps = [
    {
      slug: 'order-core',
      name: 'إدارة الطلبات - المستوى الأساسي',
      category: 'ORDER_OPS',
      description: 'نظام متكامل لمعالجة الطلبات، تتبع الحالات، وطباعة الفواتير. يشمل التكامل مع سلة التسوق.',
      icon: '📝',
      monthlyPrice: 0,
      yearlyPrice: 0,
      trialDays: 14,
      features: JSON.stringify([
        'تتبع حالات الطلبات',
        'تعديل الطلبات',
        'تحديث الحالات آلياً',
        'داشبورد الطلبات اليومية',
        'سجل تغييرات الحالات',
        'إدارة المرتجعات الأساسية'
      ]),
      isActive: true,
      isPopular: true
    },
    {
      slug: 'order-shipping-turbo',
      name: 'بوابة وشركات الشحن الذكي',
      category: 'SHIPPING',
      description: 'إدارة والربط الآلي مع كافة شركات الشحن (كيو بي إكسبريس QP Express، بوسطة Bosta، تربو Turbo، أرامكس، والمناديب): إصدار بوالص الشحن، التتبع اللحظي، وإدارة التسويات المالية.',
      icon: '🚚',
      monthlyPrice: 149,
      yearlyPrice: 1490,
      trialDays: 14,
      features: JSON.stringify([
        'الربط مع كافة شركات الشحن (Turbo, Bosta, QP Express)',
        'إنشاء وطباعة بوالص الشحن الموحدة',
        'تتبع الشحنات اللحظي Real-time',
        'شحن الطلبات الفردية والجماعية بنقرة واحدة',
        'إدارة فروع وعناوين الاستلام',
        'متابعة التسويات المالية والمبالغ المحصلة'
      ]),
      isActive: true,
      isFeatured: true
    },
    {
      slug: 'order-shipping-reports',
      name: 'تقارير وتحليلات الشحن',
      category: 'ANALYTICS',
      description: 'تقارير ذكية لتحليل تكاليف الشحن، مقارنة سعر العميل بالسعر الفعلي، وإحصائيات أداء الشحن.',
      icon: '📊',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      trialDays: 14,
      features: JSON.stringify([
        'مقارنة التكلفة الفعلية بسعر العميل',
        'إحصائيات الشحن الشهرية',
        'تحليل فروق أسعار الشحن',
        'تتبع أرباح/خسائر الشحن',
        'تقارير أداء شركات الشحن',
        'تصدير البيانات بصيغة CSV'
      ]),
      isActive: true,
      isFeatured: false
    },
    {
      slug: 'order-invoicing',
      name: 'نظام الفواتير المتقدم',
      category: 'ACCOUNTING',
      description: 'تصميم وإصدار فواتير احترافية للطلبات، تقارير الضرائب، وإحصائيات المبيعات المالية.',
      icon: '🧾',
      monthlyPrice: 129,
      yearlyPrice: 1290,
      trialDays: 14,
      features: JSON.stringify([
        'إصدار فواتير PDF تلقائياً',
        'تقارير ضريبة القيمة المضافة',
        'ملخصات مالية يومية',
        'أرشفة الفواتير إلكترونياً',
        'تخصيص تصميم الفاتورة',
        'كشف حساب مبيعات مفصل'
      ]),
      isActive: true,
      isPopular: false
    }

  ];

  for (const app of orderApps) {
    await upsertAppSafely(app);
    console.log(`  ✅ ${app.name} - ${app.monthlyPrice === 0 ? 'مجاني' : app.monthlyPrice + 'ج/شهر'}`);
  }


  // ============================================
  // إضافة الباقات المجمعة
  // ============================================
  console.log('\n📦 إضافة الباقات المجمعة...\n');

  const bundles = [
    {
      slug: 'messaging-bundle',
      name: 'باقة المراسلة',
      description: 'كل أدوات المحادثات: واتساب + تلجرام + انستجرام + ماسنجر في صندوق واحد مع AI Agent',
      apps: ['crm-basic', 'whatsapp-business', 'telegram-business'],
      monthlyPrice: 999,
      yearlyPrice: 9990,
      discount: 69,
      isActive: true,
      isFeatured: true
    },
    {
      slug: 'ai-inbox-bundle',
      name: 'AI + Inbox Bundle',
      description: 'باقة متكاملة تجمع الذكاء الاصطناعي للمحادثات مع صندوق وارد موحد لكل المنصات — AI Agent يرد على العملاء وينشئ طلبات وحجوزات بشكل تلقائي.',
      apps: ['unified-inbox', 'ai-chat-basic'],
      monthlyPrice: 999,
      yearlyPrice: null,
      discount: 0,
      isActive: true,
      isFeatured: true
    },
    {
      slug: 'medical-bundle',
      name: 'الباقة الطبية الشاملة',
      description: 'النظام الطبي المتكامل + واتساب بزنس + ٥ وكلاء ذكاء اصطناعي بشخصيات بشرية — كل ما تحتاجه لإدارة عياداتك ومراكزك الطبية في باقة واحدة.',
      apps: ['medical-system', 'unified-inbox', 'ai-chat-basic'],
      monthlyPrice: 999,
      yearlyPrice: null,
      discount: 37,
      isActive: true,
      isFeatured: true
    },
    {
      slug: 'facebook-complete-bundle',
      name: 'باقة فيسبوك الشاملة',
      description: 'كل أدوات فيسبوك: ربط الصفحات + إعلانات + Pixel + كتالوج متجر + نشر المنشورات في باقة واحدة بتوفير.',
      apps: ['facebook-pages-connect', 'facebook-ads-pro', 'facebook-pixel-capi', 'facebook-catalog-shop', 'facebook-post'],
      monthlyPrice: 399,
      yearlyPrice: 3990,
      discount: 27,
      isActive: true,
      isFeatured: true
    }
  ];

  for (const bundle of bundles) {
    const { apps, ...bundleData } = bundle;
    await prisma.appBundle.upsert({
      where: { slug: bundle.slug },
      update: {
        ...bundleData,
        appIds: apps
      },
      create: {
        ...bundleData,
        appIds: apps
      }
    });
    console.log(`  ✅ ${bundle.name} - ${bundle.monthlyPrice}ج/شهر (توفير ${bundle.discount}%)`);
  }

  // ============================================
  // تنظيف التطبيقات المكررة والقديمة
  // ============================================
  console.log('\n🧹 تنظيف التطبيقات...');

  // 1. ترحيل اشتراكات whatsapp-integration → whatsapp-business
  const oldApp = await prisma.marketplaceApp.findUnique({ where: { slug: 'whatsapp-integration' } });
  const newApp = await prisma.marketplaceApp.findUnique({ where: { slug: 'whatsapp-business' } });
  if (oldApp && newApp) {
    const oldCompanyApps = await prisma.companyApp.findMany({ where: { appId: oldApp.id } });
    for (const ca of oldCompanyApps) {
      await prisma.companyApp.upsert({
        where: { companyId_appId: { companyId: ca.companyId, appId: newApp.id } },
        update: { status: ca.status, trialEndsAt: ca.trialEndsAt },
        create: { companyId: ca.companyId, appId: newApp.id, status: ca.status, trialEndsAt: ca.trialEndsAt }
      });
    }
    console.log(`  ✅ تم ترحيل ${oldCompanyApps.length} اشتراك من whatsapp-integration → whatsapp-business`);
  }

  // 2. إخفاء التطبيقات القديمة
  const slugsToRemove = [
    'whatsapp-integration',    // مكرر - تم دمجه مع whatsapp-business
    'whatsapp-routing',        // وهمي - مش gate حقيقي
    'whatsapp-inbox',          // وهمي - مش gate حقيقي
    'whatsapp-notifications',  // وهمي - مش gate حقيقي
    'whatsapp-settings',       // وهمي - مش gate حقيقي
    'whatsapp-templates',      // وهمي - مش gate حقيقي
    'whatsapp-analytics',      // وهمي - مش gate حقيقي
    'facebook-catalog',        // مستبدل بـ facebook-catalog-shop
  ];
  const { count } = await prisma.marketplaceApp.updateMany({
    where: { slug: { in: slugsToRemove } },
    data: { isActive: false, isPublic: false }
  });
  console.log(`  ✅ تم إخفاء ${count} تطبيق قديم/مكرر`);

  // ============================================
  // ملخص
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ تم إضافة جميع التطبيقات والباقات بنجاح!');
  console.log('='.repeat(60));
  console.log('\n📊 ملخص ما تم إضافته:');
  console.log(`  • ${ecommerceApps.length} تطبيق تجارة إلكترونية`);
  console.log(`  • ${hrApps.length} تطبيق موارد بشرية`);
  console.log(`  • ${aiApps.length} تطبيق ذكاء اصطناعي`);
  console.log(`  • ${communicationApps.length} تطبيق تواصل`);
  console.log(`  • ${crmApps.length} تطبيق CRM`);
  console.log(`  • ${analyticsApps.length} تطبيق تحليلات`);
  console.log(`  • ${schedulingApps.length} تطبيق جدولة`);
  console.log(`  • ${integrationApps.length} تطبيق تكامل`);
  console.log(`  • ${marketingApps.length} تطبيق تسويق`);
  console.log(`  • ${financeApps.length} تطبيق مالي`);
  console.log(`  • ${gamificationApps.length} تطبيق تحفيز`);
  console.log(`  • ${orderApps.length} تطبيق إدارة طلبات`);
  console.log(`  • ${bundles.length} باقة مجمعة`);
  console.log('\n🏆 المجموع الكلي: 36 تطبيق + 5 باقات');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

seedMarketplace()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
