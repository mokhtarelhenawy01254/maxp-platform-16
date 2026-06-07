/**
 * Test Co - Complete Store Seed
 *
 * Seeds all the data needed to make a complete, testable storefront for
 * the "Test Co" company (id: cmptxk6k30000vpf07j03os8s, slug: test-co).
 *
 * Run from apps/backend: node scripts/seed_test_co_full.js
 *
 * Safe to re-run: most upserts will skip when data already exists.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { PrismaClient } = require(
  path.join(__dirname, '..', 'prisma', 'generated', 'postgresql_v2')
);
const prisma = new PrismaClient();

const COMPANY_ID = 'cmptxk6k30000vpf07j03os8s';

const log = (msg) => console.log(`\n>> ${msg}`);
const ok = (msg) => console.log(`   OK  ${msg}`);
const skip = (msg) => console.log(`   --  ${msg}`);

// ---------------------------------------------------------------------------
// 1) BRANDING — Company record
// ---------------------------------------------------------------------------
async function seedBranding() {
  log('1) Company branding');
  const updated = await prisma.company.update({
    where: { id: COMPANY_ID },
    data: {
      phone: '+201000000000',
      website: 'https://test-co.example.com',
      address: 'القاهرة، مصر',
      settings: JSON.stringify({
        language: 'ar',
        currency: 'EGP',
        description: 'متجر تجريبي لاختبار نظام MaxP',
        supportEmail: 'support@test-co.example.com',
        whatsappNumber: '+201000000000',
      }),
    },
  });
  ok(`phone=${updated.phone}, address=${updated.address}, website=${updated.website}`);
}

// ---------------------------------------------------------------------------
// 2) CATEGORIES
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { name: 'حريمي', slug: 'women', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400' },
  { name: 'رجالي', slug: 'men', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { name: 'أطفال', slug: 'kids', image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400' },
  { name: 'إكسسوارات', slug: 'accessories', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400' },
];

async function seedCategories() {
  log('2) Categories');
  const map = new Map();
  for (const c of CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { companyId: COMPANY_ID, slug: c.slug },
      select: { id: true },
    });
    if (existing) {
      map.set(c.slug, existing.id);
      skip(`category "${c.name}" already exists`);
      continue;
    }
    const created = await prisma.category.create({
      data: {
        companyId: COMPANY_ID,
        name: c.name,
        slug: c.slug,
        image: c.image,
        isActive: true,
        sortOrder: CATEGORIES.indexOf(c),
      },
    });
    map.set(c.slug, created.id);
    ok(`created category "${c.name}"`);
  }
  return map;
}

// ---------------------------------------------------------------------------
// 3) PRODUCTS + VARIANTS
// ---------------------------------------------------------------------------
const PRODUCTS = [
  {
    name: 'كوتشي حريمي رياضي',
    slug: 'kotshy-7rymy-ryady',
    sku: 'TC-WMN-001',
    price: 750,
    comparePrice: 950,
    stock: 50,
    category: 'women',
    isFeatured: true,
    description:
      'كوتشي حريمي رياضي مريح للاستخدام اليومي. خامة عالية الجودة ومقاسات متنوعة.',
    mainImage: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop',
    variants: [
      { name: 'أبيض', sku: 'TC-WMN-001-WHT', price: 750, stock: 25 },
      { name: 'أسود', sku: 'TC-WMN-001-BLK', price: 750, stock: 25 },
    ],
  },
  {
    name: 'حذاء رجالي كلاسيك',
    slug: '7zaa-rgaly-klasyk',
    sku: 'TC-MEN-001',
    price: 1200,
    comparePrice: 1500,
    stock: 30,
    category: 'men',
    isFeatured: true,
    description:
      'حذاء رجالي كلاسيك مناسب للمناسبات الرسمية والعمل. جلد طبيعي.',
    mainImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop',
    variants: [
      { name: 'بني', sku: 'TC-MEN-001-BRN', price: 1200, stock: 15 },
      { name: 'أسود', sku: 'TC-MEN-001-BLK', price: 1200, stock: 15 },
    ],
  },
  {
    name: 'كوتشي أطفال ملون',
    slug: 'kotshy-atfal-mlown',
    sku: 'TC-KID-001',
    price: 450,
    comparePrice: 600,
    stock: 40,
    category: 'kids',
    isFeatured: false,
    description: 'كوتشي أطفال بطبعة ملونة، خفيف ومريح.',
    mainImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&auto=format&fit=crop',
    variants: [
      { name: 'وردي', sku: 'TC-KID-001-PNK', price: 450, stock: 20 },
      { name: 'أزرق', sku: 'TC-KID-001-BLU', price: 450, stock: 20 },
    ],
  },
  {
    name: 'حقيبة يد جلدية',
    slug: '7qyba-yd-gldya',
    sku: 'TC-ACC-001',
    price: 850,
    comparePrice: 1100,
    stock: 25,
    category: 'accessories',
    isFeatured: true,
    description: 'حقيبة يد نسائية من الجلد الطبيعي، تصميم أنيق وعملي.',
    mainImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop',
    variants: [
      { name: 'بيج', sku: 'TC-ACC-001-BEG', price: 850, stock: 12 },
      { name: 'أسود', sku: 'TC-ACC-001-BLK', price: 850, stock: 13 },
    ],
  },
  {
    name: 'وشاح حريري فاخر',
    slug: 'wshah-7ryry-fakhr',
    sku: 'TC-ACC-002',
    price: 350,
    comparePrice: 450,
    stock: 60,
    category: 'accessories',
    isFeatured: false,
    description: 'وشاح من الحرير الطبيعي بألوان عصرية.',
    mainImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&auto=format&fit=crop',
    variants: [
      { name: 'أحمر', sku: 'TC-ACC-002-RED', price: 350, stock: 30 },
      { name: 'أزرق', sku: 'TC-ACC-002-BLU', price: 350, stock: 30 },
    ],
  },
];

async function seedProducts(categoryMap) {
  log('3) Products + Variants');

  // First, fix the existing "كوتشي حريمي" product (stock=0, blank variants)
  const existingShoe = await prisma.product.findFirst({
    where: { companyId: COMPANY_ID, slug: 'kotshy-7rymy' },
    include: { productVariants: true },
  });
  if (existingShoe) {
    await prisma.product.update({
      where: { id: existingShoe.id },
      data: {
        stock: 50,
        price: 750,
        comparePrice: 950,
        categoryId: categoryMap.get('women'),
        isFeatured: true,
        description:
          'كوتشي حريمي رياضي مريح للاستخدام اليومي. خامة عالية الجودة ومقاسات متنوعة.',
      },
    });
    ok('updated existing "كوتشي حريمي" (stock=50, price, category)');
    for (const v of existingShoe.productVariants) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: {
          sku: `TC-WMN-001-${v.name === 'ابيض' ? 'WHT' : 'BLK'}`,
          price: 750,
          stock: 25,
        },
      });
    }
    ok('updated existing variants with SKU/price/stock');
  }

  // Create new products
  for (const prod of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { companyId: COMPANY_ID, slug: prod.slug },
      select: { id: true },
    });
    if (existing) {
      skip(`product "${prod.name}" already exists`);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        companyId: COMPANY_ID,
        name: prod.name,
        slug: prod.slug,
        sku: prod.sku,
        description: prod.description,
        price: prod.price,
        comparePrice: prod.comparePrice,
        stock: prod.stock,
        mainImage: prod.mainImage,
        images: JSON.stringify([prod.mainImage]),
        categoryId: categoryMap.get(prod.category),
        isActive: true,
        isFeatured: prod.isFeatured,
        trackInventory: true,
        source: 'manual',
      },
    });
    ok(`created product "${prod.name}" (${created.id})`);

    for (const v of prod.variants) {
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          name: v.name,
          type: 'color',
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          isActive: true,
        },
      });
    }
    ok(`  ${prod.variants.length} variants created`);
  }
}

// ---------------------------------------------------------------------------
// 4) SHIPPING COMPANY
// ---------------------------------------------------------------------------
async function seedShippingCompany() {
  log('4) Shipping Company');
  const existing = await prisma.shippingCompany.findFirst({
    where: { companyId: COMPANY_ID, slug: 'bosta' },
  });
  if (existing) {
    skip('shipping company "bosta" already exists');
    return existing.id;
  }
  const created = await prisma.shippingCompany.create({
    data: {
      companyId: COMPANY_ID,
      name: 'بوسطة',
      slug: 'bosta',
      phone: '+201000000000',
      email: 'shipping@test-co.example.com',
      website: 'https://bosta.co',
      providerKey: 'BOSTA',
      integrationMode: 'MANUAL',
      isActive: true,
    },
  });
  ok(`created shipping company "بوسطة" (${created.id})`);
  return created.id;
}

// ---------------------------------------------------------------------------
// 5) SHIPPING ZONES + METHODS
// ---------------------------------------------------------------------------
async function seedShippingZones() {
  log('5) Shipping Zones + Methods');

  const zones = [
    {
      name: 'القاهرة والجيزة',
      governorates: ['القاهرة', 'الجيزة', 'القاهرة الجديدة', '6 أكتوبر', 'الشيخ زايد', 'حلوان', '15 مايو'],
      price: 50,
      deliveryTime: '1-2 يوم',
      freeShippingThreshold: 1000,
    },
    {
      name: 'الإسكندرية',
      governorates: ['الإسكندرية'],
      price: 75,
      deliveryTime: '2-3 أيام',
      freeShippingThreshold: 1500,
    },
    {
      name: 'باقي المحافظات',
      governorates: [
        'القليوبية', 'الدقهلية', 'الغربية', 'الشرقية', 'المنوفية', 'كفر الشيخ',
        'دمياط', 'البحيرة', 'بورسعيد', 'الإسماعيلية', 'السويس',
        'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان',
        'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء', 'جنوب سيناء',
      ],
      price: 100,
      deliveryTime: '3-5 أيام',
      freeShippingThreshold: 2000,
    },
  ];

  for (const z of zones) {
    const existing = await prisma.shippingZone.findFirst({
      where: { companyId: COMPANY_ID, name: z.name },
    });
    let zoneId;
    if (existing) {
      zoneId = existing.id;
      skip(`zone "${z.name}" already exists`);
    } else {
      const created = await prisma.shippingZone.create({
        data: {
          companyId: COMPANY_ID,
          name: z.name,
          governorates: JSON.stringify(z.governorates),
          price: z.price,
          deliveryTime: z.deliveryTime,
          deliveryTimeType: 'custom',
          pricingType: 'flat',
          freeShippingThreshold: z.freeShippingThreshold,
          isActive: true,
        },
      });
      zoneId = created.id;
      ok(`created zone "${z.name}" (${z.price} EGP)`);
    }

    // Add shipping methods to this zone
    const existingMethods = await prisma.shippingMethod.count({
      where: { zoneId },
    });
    if (existingMethods > 0) {
      skip(`  methods for "${z.name}" already exist`);
      continue;
    }
    await prisma.shippingMethod.create({
      data: {
        zoneId,
        type: 'flat_rate',
        title: `شحن عادي - ${z.name}`,
        isEnabled: true,
        sortOrder: 0,
        settings: JSON.stringify({ price: z.price, freeShippingThreshold: z.freeShippingThreshold }),
      },
    });
    await prisma.shippingMethod.create({
      data: {
        zoneId,
        type: 'express',
        title: `شحن سريع - ${z.name}`,
        isEnabled: true,
        sortOrder: 1,
        settings: JSON.stringify({ price: z.price + 30 }),
      },
    });
    ok(`  +2 shipping methods for "${z.name}"`);
  }
}

// ---------------------------------------------------------------------------
// 6) FAQs
// ---------------------------------------------------------------------------
const FAQS = [
  {
    question: 'ما هي طرق الدفع المتاحة؟',
    answer: 'نوفر طرق دفع متعددة: الدفع عند الاستلام، فودافون كاش، إنستاباي، والتحويل البنكي.',
    category: 'payment',
    order: 0,
  },
  {
    question: 'كم يستغرق توصيل الطلب؟',
    answer: 'نقوم بالتوصيل خلال 1-2 يوم للقاهرة والجيزة، 2-3 أيام للإسكندرية، و3-5 أيام لباقي المحافظات.',
    category: 'shipping',
    order: 1,
  },
  {
    question: 'هل يمكنني إرجاع المنتج أو استبداله؟',
    answer: 'نعم، يمكنك إرجاع المنتج خلال 14 يوم من الاستلام بشرط أن يكون بحالته الأصلية وبنفس العبوة.',
    category: 'returns',
    order: 2,
  },
  {
    question: 'كيف أتتبع طلبي؟',
    answer: 'سنرسل لك رقم تتبع عبر واتساب فور شحن طلبك، ويمكنك متابعة الطلب من خلال موقع شركة الشحن.',
    category: 'orders',
    order: 3,
  },
  {
    question: 'هل المنتجات أصلية؟',
    answer: 'نعم، جميع منتجاتنا أصلية 100% ومستوردة من مصادر موثوقة.',
    category: 'products',
    order: 4,
  },
  {
    question: 'هل يوجد شحن مجاني؟',
    answer: 'نعم، نقدم شحن مجاني للطلبات فوق 1000 جنيه داخل القاهرة، وفوق 2000 جنيه لباقي المحافظات.',
    category: 'shipping',
    order: 5,
  },
];

async function seedFaqs() {
  log('6) FAQs');
  for (const f of FAQS) {
    const existing = await prisma.faq.findFirst({
      where: { companyId: COMPANY_ID, question: f.question },
    });
    if (existing) {
      skip(`FAQ "${f.question.slice(0, 30)}..." already exists`);
      continue;
    }
    await prisma.faq.create({
      data: { companyId: COMPANY_ID, ...f, isActive: true },
    });
    ok(`FAQ: "${f.question.slice(0, 30)}..."`);
  }
}

// ---------------------------------------------------------------------------
// 7) POLICIES
// ---------------------------------------------------------------------------
const POLICIES = [
  {
    title: 'سياسة الاسترجاع والاستبدال',
    category: 'return',
    order: 0,
    content: `يحق للعميل استرجاع أو استبدال المنتج خلال 14 يوم من تاريخ الاستلام، وذلك في الحالات التالية:

1. المنتج معيب أو به عيب صناعة.
2. المنتج غير مطابق للمواصفات المذكورة في الموقع.
3. المقاس غير مناسب (للأحذية والملابس بشرط أن يكون المنتج غير مستخدم وفي عبوته الأصلية).

شروط الاسترجاع:
- أن يكون المنتج بحالته الأصلية وبنفس العبوة.
- وجود فاتورة الشراء أو رقم الطلب.
- التواصل معنا خلال 14 يوم من الاستلام.

يتم رد المبلغ خلال 7-14 يوم عمل من تاريخ استلامنا للمنتج المرتجع.`,
  },
  {
    title: 'سياسة الخصوصية',
    category: 'privacy',
    order: 1,
    content: `نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك.

المعلومات التي نجمعها:
- الاسم ورقم الهاتف والعنوان (لإتمام الطلب).
- البريد الإلكتروني (للتواصل وإرسال الفواتير).

كيفية استخدام المعلومات:
- معالجة الطلبات وتنفيذ الشحن.
- التواصل معك بخصوص طلبك.
- تحسين خدماتنا وتجربة التسوق.

نلتزم بعدم مشاركة بياناتك مع أي طرف ثالث باستثناء شركات الشحن لإتمام التوصيل، والجهات القانونية عند الضرورة.`,
  },
  {
    title: 'الشروط والأحكام',
    category: 'terms',
    order: 2,
    content: `مرحباً بك في متجر Test Co. باستخدامك للموقع فإنك توافق على الشروط والأحكام التالية:

1. الأسعار قابلة للتغيير دون إشعار مسبق.
2. الصور توضيحية وقد تختلف الألوان قليلاً حسب إعدادات شاشتك.
3. يحق لنا رفض أو إلغاء أي طلب لأي سبب.
4. في حالة نفاد المخزون سيتم إعلامك واسترداد المبلغ بالكامل.
5. أنت مسؤول عن دقة بياناتك التي تقدمها عند الطلب.
6. يحق لنا تعديل هذه الشروط في أي وقت.`,
  },
  {
    title: 'سياسة الشحن والتوصيل',
    category: 'shipping',
    order: 3,
    content: `نوفر خدمة الشحن لجميع محافظات جمهورية مصر العربية من خلال شركة بوسطة.

مدة التوصيل:
- القاهرة والجيزة: 1-2 يوم عمل.
- الإسكندرية: 2-3 أيام عمل.
- باقي المحافظات: 3-5 أيام عمل.

رسوم الشحن:
- القاهرة والجيزة: 50 جنيه (مجاناً فوق 1000 جنيه).
- الإسكندرية: 75 جنيه (مجاناً فوق 1500 جنيه).
- باقي المحافظات: 100 جنيه (مجاناً فوق 2000 جنيه).

الشحن السريع متاح بتكلفة إضافية.

نتلقى الطلبات من السبت إلى الخميس، والطلبات المقدمة يوم الجمعة يتم شحنها السبت.`,
  },
];

async function seedPolicies() {
  log('7) Policies');
  for (const pol of POLICIES) {
    const existing = await prisma.policy.findFirst({
      where: { companyId: COMPANY_ID, title: pol.title },
    });
    if (existing) {
      skip(`policy "${pol.title}" already exists`);
      continue;
    }
    await prisma.policy.create({
      data: {
        companyId: COMPANY_ID,
        ...pol,
        isActive: true,
        effectiveAt: new Date(),
      },
    });
    ok(`policy: "${pol.title}"`);
  }
}

// ---------------------------------------------------------------------------
// 8) STORE SETTINGS (footer, checkout, storefront, promotion)
// ---------------------------------------------------------------------------
async function seedSettings() {
  log('8) Store Settings (footer / checkout / storefront / promotion)');

  await prisma.footerSettings.upsert({
    where: { companyId: COMPANY_ID },
    update: {
      aboutStore: 'Test Co متجر تجريبي لاختبار نظام MaxP.',
      showAboutStore: true,
      email: 'support@test-co.example.com',
      showEmail: true,
      phone: '+201000000000',
      showPhone: true,
      address: 'القاهرة، مصر',
      showAddress: true,
      showQuickLinks: true,
      copyrightText: '© 2026 Test Co. جميع الحقوق محفوظة.',
      showCopyright: true,
    },
    create: {
      companyId: COMPANY_ID,
      aboutStore: 'Test Co متجر تجريبي لاختبار نظام MaxP.',
      showAboutStore: true,
      email: 'support@test-co.example.com',
      showEmail: true,
      phone: '+201000000000',
      showPhone: true,
      address: 'القاهرة، مصر',
      showAddress: true,
      showQuickLinks: true,
      copyrightText: '© 2026 Test Co. جميع الحقوق محفوظة.',
      showCopyright: true,
    },
  });
  ok('footerSettings configured');

  await prisma.checkoutFormSettings.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: {
      companyId: COMPANY_ID,
      showGuestName: true,
      requireGuestName: true,
      showGuestPhone: true,
      requireGuestPhone: true,
      showGuestEmail: true,
      requireGuestEmail: false,
      showCity: true,
      requireCity: true,
      showShippingAddress: true,
      requireShippingAddress: true,
      showPaymentMethod: true,
      showNotes: true,
    },
  });
  ok('checkoutFormSettings configured');

  await prisma.storefrontSettings.upsert({
    where: { companyId: COMPANY_ID },
    update: {
      supportedLanguages: 'ar,en',
      defaultLanguage: 'ar',
      quickViewEnabled: true,
      wishlistEnabled: true,
      reviewsEnabled: true,
      comparisonEnabled: true,
      advancedFiltersEnabled: true,
      countdownEnabled: true,
      backInStockEnabled: true,
      recentlyViewedEnabled: true,
      sizeGuideEnabled: true,
      socialSharingEnabled: true,
      stickyAddToCartEnabled: true,
      seoEnabled: true,
    },
    create: {
      companyId: COMPANY_ID,
      supportedLanguages: 'ar,en',
      defaultLanguage: 'ar',
      quickViewEnabled: true,
      wishlistEnabled: true,
      reviewsEnabled: true,
      comparisonEnabled: true,
      advancedFiltersEnabled: true,
      countdownEnabled: true,
      backInStockEnabled: true,
      recentlyViewedEnabled: true,
      sizeGuideEnabled: true,
      socialSharingEnabled: true,
      stickyAddToCartEnabled: true,
      seoEnabled: true,
    },
  });
  ok('storefrontSettings configured');

  await prisma.storePromotionSettings.upsert({
    where: { companyId: COMPANY_ID },
    update: {
      freeShippingEnabled: true,
      freeShippingThreshold: 1000,
      freeShippingMessage: 'شحن مجاني للطلبات فوق 1000 جنيه!',
      flatShippingEnabled: true,
      flatShippingFee: 50,
    },
    create: {
      companyId: COMPANY_ID,
      freeShippingEnabled: true,
      freeShippingThreshold: 1000,
      freeShippingMessage: 'شحن مجاني للطلبات فوق 1000 جنيه!',
      flatShippingEnabled: true,
      flatShippingFee: 50,
    },
  });
  ok('storePromotionSettings configured');
}

// ---------------------------------------------------------------------------
// 9) HOMEPAGE TEMPLATE
// ---------------------------------------------------------------------------
async function seedHomepage() {
  log('9) Homepage Template');
  const existing = await prisma.homepageTemplate.findFirst({
    where: { companyId: COMPANY_ID, pageType: 'HOMEPAGE' },
  });
  if (existing) {
    await prisma.homepageTemplate.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    skip('homepage template already exists (activated)');
    return;
  }
  const content = {
    format: 'storefront-theme-v1',
    settings: {
      themeId: 'modern-minimal',
      storeName: 'Test Co',
      description: 'متجر تجريبي لاختبار نظام MaxP',
    },
    sections: [
      {
        id: 'hero',
        type: 'hero-banner',
        settings: {
          title: 'مرحباً بك في Test Co',
          subtitle: 'اكتشف تشكيلتنا الجديدة من الأحذية والإكسسوارات',
          ctaText: 'تسوق الآن',
        },
      },
      {
        id: 'featured-products',
        type: 'featured-products',
        settings: { title: 'المنتجات المميزة', limit: 6 },
      },
      {
        id: 'categories',
        type: 'categories-grid',
        settings: { title: 'تسوق حسب الفئة' },
      },
      {
        id: 'newsletter',
        type: 'newsletter',
        settings: { title: 'اشترك في النشرة البريدية' },
      },
    ],
  };
  await prisma.homepageTemplate.create({
    data: {
      companyId: COMPANY_ID,
      name: 'Test Co Homepage',
      description: 'الصفحة الرئيسية لمتجر Test Co',
      slug: 'home',
      pageType: 'HOMEPAGE',
      isActive: true,
      content,
      publishedContent: content,
      version: 1,
    },
  });
  ok('homepage template created and activated');
}

// ---------------------------------------------------------------------------
// 10) BRANCH
// ---------------------------------------------------------------------------
async function seedBranch() {
  log('10) Branch');
  const existing = await prisma.branche.findFirst({
    where: { companyId: COMPANY_ID, name: 'الفرع الرئيسي' },
  });
  if (existing) {
    skip('branch "الفرع الرئيسي" already exists');
    return;
  }
  await prisma.branche.create({
    data: {
      companyId: COMPANY_ID,
      name: 'الفرع الرئيسي',
      address: 'القاهرة، مدينة نصر',
      city: 'القاهرة',
      phone: '+201000000000',
      email: 'branch@test-co.example.com',
      workingHours: 'السبت - الخميس: 10 ص - 10 م',
      isActive: true,
    },
  });
  ok('branch "الفرع الرئيسي" created');
}

// ---------------------------------------------------------------------------
// 11) COUPON
// ---------------------------------------------------------------------------
async function seedCoupon() {
  log('11) Coupon');
  const existing = await prisma.coupon.findFirst({
    where: { companyId: COMPANY_ID, code: 'WELCOME10' },
  });
  if (existing) {
    skip('coupon "WELCOME10" already exists');
    return;
  }
  await prisma.coupon.create({
    data: {
      companyId: COMPANY_ID,
      code: 'WELCOME10',
      name: 'خصم ترحيبي 10%',
      description: 'خصم 10% على أول طلب',
      type: 'PERCENTAGE',
      value: 10,
      minOrderAmount: 500,
      maxDiscountAmount: 200,
      usageLimit: 100,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });
  ok('coupon "WELCOME10" (10% off) created');
}

// ---------------------------------------------------------------------------
// 12) TEST CUSTOMER
// ---------------------------------------------------------------------------
async function seedCustomer() {
  log('12) Test Customer');
  const existing = await prisma.customer.findFirst({
    where: { companyId: COMPANY_ID, phone: '+201234567890' },
  });
  if (existing) {
    skip('test customer already exists');
    return;
  }
  const created = await prisma.customer.create({
    data: {
      companyId: COMPANY_ID,
      firstName: 'أحمد',
      lastName: 'محمد',
      email: 'test-customer@example.com',
      phone: '+201234567890',
      status: 'ACTIVE',
      tags: 'test,seeded',
    },
  });
  ok(`test customer created (${created.id})`);
  await prisma.customerWallet.create({
    data: {
      companyId: COMPANY_ID,
      customerId: created.id,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      currency: 'EGP',
    },
  });
  ok('  +customer wallet');
}

// ---------------------------------------------------------------------------
// 13) AI SETTINGS
// ---------------------------------------------------------------------------
async function seedAiSettings() {
  log('13) AI Settings');
  const existing = await prisma.aiSetting.findUnique({
    where: { companyId: COMPANY_ID },
  });
  if (existing) {
    skip('ai settings already configured');
    return;
  }
  await prisma.aiSetting.create({
    data: {
      companyId: COMPANY_ID,
      autoReplyEnabled: true,
      autoCreateOrders: true,
      autoSuggestProducts: true,
      includeImages: true,
      maxSuggestions: 3,
      useAdvancedTools: false,
      humanApprovalRequiredForWrite: true,
      workingHoursEnabled: true,
      workingHours: JSON.stringify({
        timezone: 'Africa/Cairo',
        schedule: {
          saturday: { open: '10:00', close: '22:00' },
          sunday: { open: '10:00', close: '22:00' },
          monday: { open: '10:00', close: '22:00' },
          tuesday: { open: '10:00', close: '22:00' },
          wednesday: { open: '10:00', close: '22:00' },
          thursday: { open: '10:00', close: '22:00' },
        },
      }),
      multimodalEnabled: true,
      ragEnabled: true,
      qualityEvaluationEnabled: true,
      replyMode: 'all',
      aiResponseStyle: 'balanced',
      aiTemperature: 0.7,
      confidenceThreshold: 0.7,
    },
  });
  ok('ai settings configured (autoReply + autoCreateOrders ON)');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  const t0 = Date.now();
  try {
    console.log('=== Seeding Test Co complete store ===');
    console.log(`Company: ${COMPANY_ID} (test-co)`);

    await seedBranding();
    const categoryMap = await seedCategories();
    await seedProducts(categoryMap);
    await seedShippingCompany();
    await seedShippingZones();
    await seedFaqs();
    await seedPolicies();
    await seedSettings();
    await seedHomepage();
    await seedBranch();
    await seedCoupon();
    await seedCustomer();
    await seedAiSettings();

    console.log(`\n=== DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);
  } catch (err) {
    console.error('\n!! SEED FAILED !!');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
