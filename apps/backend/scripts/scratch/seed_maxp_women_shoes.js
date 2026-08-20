const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

const COMPANY_ID = 'cmmhkxobb0000vpk440j1n6ui';

const categorySeeds = [
  {
    name: 'سنيكرز',
    slug: 'sneakers',
    image: '/products/fakhama/fakhama_cat_sneakers_1774501352288.png',
  },
  {
    name: 'كعب عالي',
    slug: 'high-heels',
    image: '/products/fakhama/fakhama_cat_heels_1774501290116.png',
  },
  {
    name: 'بوتات',
    slug: 'boots',
    image: '/products/fakhama/fakhama_cat_boots_1774501319384.png',
  },
];

const productSeeds = [
  {
    sku: 'MAXP-WS-001',
    slug: 'milano-white-sneaker',
    name: 'سنيكرز ميلانو الأبيض',
    categoryName: 'سنيكرز',
    price: 1890,
    comparePrice: 2290,
    stock: 18,
    isFeatured: true,
    tags: 'احذية حريمي,سنيكرز,كاجوال,أبيض',
    description: 'سنيكرز حريمي خفيف بتصميم عصري ولون أبيض سهل التنسيق، مناسب للمشاوير اليومية والإطلالات الكاجوال مع نعل مريح يدعم الحركة طوال اليوم.',
    mainImage: '/products/fakhama/prod_milano_white_sneaker_1774534400000_png_1774534440364.png',
    images: [
      {
        url: '/products/fakhama/prod_milano_white_sneaker_1774534400000_png_1774534440364.png',
        alt: 'سنيكرز حريمي أبيض بتصميم يومي',
      },
    ],
  },
  {
    sku: 'MAXP-WS-002',
    slug: 'rosey-urban-sneaker',
    name: 'سنيكرز روزي الحضري',
    categoryName: 'سنيكرز',
    price: 2090,
    comparePrice: 2490,
    stock: 14,
    tags: 'احذية حريمي,سنيكرز,رياضي,مودرن',
    description: 'سنيكرز حريمي بروح شبابية ولمسات لونية ناعمة، يجمع بين الشكل العصري والراحة العملية ليكون اختيارًا مناسبًا للجامعة والعمل والخروجات السريعة.',
    mainImage: '/products/fakhama/fakhama_cat_sneakers_1774501352288.png',
    images: [
      {
        url: '/products/fakhama/fakhama_cat_sneakers_1774501352288.png',
        alt: 'سنيكرز حريمي بألوان عصرية',
      },
    ],
  },
  {
    sku: 'MAXP-WS-003',
    slug: 'luna-satin-heels',
    name: 'كعب لونا الساتان',
    categoryName: 'كعب عالي',
    price: 2450,
    comparePrice: 2890,
    stock: 9,
    isFeatured: true,
    tags: 'احذية حريمي,كعب عالي,مناسبات,ساتان',
    description: 'حذاء كعب عالي أنيق بملمس ساتان ناعم ولمسة أنثوية راقية، مثالي للمناسبات والسهرات مع ثبات جيد وتصميم يبرز جمال الإطلالة.',
    mainImage: '/products/fakhama/fakhama_cat_heels_1774501290116.png',
    images: [
      {
        url: '/products/fakhama/fakhama_cat_heels_1774501290116.png',
        alt: 'حذاء كعب عالي نسائي أنيق',
      },
    ],
  },
  {
    sku: 'MAXP-WS-004',
    slug: 'aura-evening-heels',
    name: 'كعب أورا للمساء',
    categoryName: 'كعب عالي',
    price: 2690,
    comparePrice: 3190,
    stock: 7,
    tags: 'احذية حريمي,كعب عالي,سهرة,لامع',
    description: 'حذاء سهرة بكعب رفيع ولمسة لامعة ناعمة، يمنحك حضورًا أنيقًا في المناسبات الخاصة مع تصميم مريح نسبيًا للارتداء لساعات أطول.',
    mainImage: '/products/fakhama/fakhama_hero_luxury_heels_1774501228599.png',
    images: [
      {
        url: '/products/fakhama/fakhama_hero_luxury_heels_1774501228599.png',
        alt: 'كعب نسائي مناسب للسهرات',
      },
    ],
  },
  {
    sku: 'MAXP-WS-005',
    slug: 'nova-leather-boot',
    name: 'بوت نوفا الجلدي',
    categoryName: 'بوتات',
    price: 2990,
    comparePrice: 3490,
    stock: 11,
    isFeatured: true,
    tags: 'احذية حريمي,بوت,جلد,شتوي',
    description: 'بوت حريمي جلدي بتصميم نظيف وخطوط أنيقة، مناسب للأجواء الباردة ويضيف لمسة قوية وراقية لإطلالات الشتاء اليومية.',
    mainImage: '/products/fakhama/fakhama_cat_boots_1774501319384.png',
    images: [
      {
        url: '/products/fakhama/fakhama_cat_boots_1774501319384.png',
        alt: 'بوت حريمي جلدي بني',
      },
    ],
  },
  {
    sku: 'MAXP-WS-006',
    slug: 'sienna-tall-boot',
    name: 'بوت سيينا الطويل',
    categoryName: 'بوتات',
    price: 3290,
    comparePrice: 3890,
    stock: 8,
    tags: 'احذية حريمي,بوت طويل,أناقة,شتاء',
    description: 'بوت طويل بقصة أنيقة ينسجم بسهولة مع الفساتين والمعاطف، ويمنحك دفئًا وشكلًا مميزًا في الإطلالات الشتوية الراقية.',
    mainImage: '/products/fakhama/fakhama_cat_boots_1774501319384.png',
    images: [
      {
        url: '/products/fakhama/fakhama_cat_boots_1774501319384.png',
        alt: 'بوت نسائي طويل للموسم الشتوي',
      },
    ],
  },
  {
    sku: 'MAXP-WS-007',
    slug: 'mira-soft-sneaker',
    name: 'سنيكرز ميرا الناعم',
    categoryName: 'سنيكرز',
    price: 1790,
    comparePrice: 2190,
    stock: 20,
    tags: 'احذية حريمي,سنيكرز,خفيف,عملي',
    description: 'سنيكرز خفيف ومرن بتصميم ناعم يناسب الاستخدام اليومي، يوفر راحة عالية وثباتًا جيدًا ويكمل الإطلالة العصرية بدون مبالغة.',
    mainImage: '/products/fakhama/fakhama_cat_sneakers_1774501352288.png',
    images: [
      {
        url: '/products/fakhama/fakhama_cat_sneakers_1774501352288.png',
        alt: 'سنيكرز حريمي عملي وخفيف',
      },
    ],
  },
  {
    sku: 'MAXP-WS-008',
    slug: 'velvet-classic-heels',
    name: 'كعب فيلفيت الكلاسيكي',
    categoryName: 'كعب عالي',
    price: 2590,
    comparePrice: 3050,
    stock: 10,
    tags: 'احذية حريمي,كعب عالي,كلاسيك,أنيق',
    description: 'تصميم كلاسيكي راقٍ يناسب العمل والمناسبات الخفيفة، مع خامة ناعمة وكعب متوازن يمنح مظهرًا أنيقًا دون التضحية بالراحة.',
    mainImage: '/products/fakhama/fakhama_cat_flats_lux_1774501704721.png',
    images: [
      {
        url: '/products/fakhama/fakhama_cat_flats_lux_1774501704721.png',
        alt: 'حذاء كعب عالي كلاسيكي',
      },
    ],
  },
];

async function ensureCategory(prisma, companyId, categorySeed) {
  const existing = await prisma.category.findFirst({
    where: {
      companyId,
      name: categorySeed.name,
    },
  });

  if (existing) {
    if (existing.image !== categorySeed.image) {
      return prisma.category.update({
        where: { id: existing.id },
        data: { image: categorySeed.image },
      });
    }
    return existing;
  }

  return prisma.category.create({
    data: {
      companyId,
      name: categorySeed.name,
      slug: categorySeed.slug,
      image: categorySeed.image,
      isActive: true,
    },
  });
}

async function main() {
  const prisma = await getSharedPrismaClientAsync();

  try {
    const company = await prisma.company.findUnique({
      where: { id: COMPANY_ID },
      select: { id: true, name: true },
    });

    if (!company) {
      throw new Error(`Company ${COMPANY_ID} was not found.`);
    }

    const categoriesByName = {};
    for (const categorySeed of categorySeeds) {
      const category = await ensureCategory(prisma, company.id, categorySeed);
      categoriesByName[categorySeed.name] = category.id;
    }

    const summary = [];

    for (const productSeed of productSeeds) {
      const existing = await prisma.product.findFirst({
        where: {
          companyId: company.id,
          sku: productSeed.sku,
        },
        select: { id: true, name: true },
      });

      const data = {
        name: productSeed.name,
        slug: productSeed.slug,
        description: productSeed.description,
        sku: productSeed.sku,
        price: productSeed.price,
        comparePrice: productSeed.comparePrice,
        stock: productSeed.stock,
        categoryId: categoriesByName[productSeed.categoryName] || null,
        isActive: true,
        isFeatured: Boolean(productSeed.isFeatured),
        trackInventory: true,
        tags: productSeed.tags,
        companyId: company.id,
        source: 'manual',
        mainImage: productSeed.mainImage,
        images: JSON.stringify(productSeed.images),
      };

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data,
        });

        summary.push(`updated:${productSeed.sku}:${productSeed.name}`);
        continue;
      }

      await prisma.product.create({ data });
      summary.push(`created:${productSeed.sku}:${productSeed.name}`);
    }

    const finalCount = await prisma.product.count({
      where: { companyId: company.id },
    });

    console.log(`✅ Seeded women shoes for ${company.name}`);
    console.log(`✅ Total products now: ${finalCount}`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Failed to seed MaxP women shoes:', error);
  process.exit(1);
});
