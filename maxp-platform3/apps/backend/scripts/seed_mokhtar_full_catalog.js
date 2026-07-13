const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const { safeDb } = require('../utils/safeDatabase');

const COMPANY_ID = '0a9f17f0-6a13-4e00-9606-be0232ea7978';

// ============================================================
// IMAGE POOLS — high-quality Unsplash images for shoes & clothes
// ============================================================
const SHOE_IMAGES = {
  men: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1200',
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=1200',
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=1200',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1200',
  ],
  women: [
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1200',
    'https://images.unsplash.com/photo-1564257056282-f79107f8556f?q=80&w=1200',
    'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=1200',
    'https://images.unsplash.com/photo-1585238342024-78d387f4a707?q=80&w=1200',
  ],
  kids: [
    'https://images.unsplash.com/photo-1594323435-7250e25b0ef4?q=80&w=1200',
    'https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=1200',
    'https://images.unsplash.com/photo-1593095948071-474c5cc2c1cf?q=80&w=1200',
    'https://images.unsplash.com/photo-1623689046286-845af3902cba?q=80&w=1200',
  ],
};

const CLOTHING_IMAGES = {
  men: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200',
    'https://images.unsplash.com/photo-1594938298603-6f48d851e3b2?q=80&w=1200',
    'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?q=80&w=1200',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=1200',
    'https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1200',
  ],
  women: [
    'https://images.unsplash.com/photo-1539109132382-381bb3f1c2b3?q=80&w=1200',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1200',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=1200',
  ],
  kids: [
    'https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=1200',
    'https://images.unsplash.com/photo-1525253013412-55c1e5d7a4b7?q=80&w=1200',
    'https://images.unsplash.com/photo-1544884240-16dd1ee250b2?q=80&w=1200',
  ],
};

function pickImages(pool, count = 3) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================
// SHOE PRODUCTS (10)
// ============================================================
const SHOES = [
  {
    name: 'Sprint X Running Shoes - رجالي',
    slug: 'mokhtar-sprint-x-mens',
    description: 'حذاء جري احترافي رجالي بخامة شبكية مريحة ونعل مضاد للانزلاق. مناسب للجري اليومي والتمارين الرياضية.',
    price: 1499,
    comparePrice: 1899,
    gender: 'men',
    sizes: ['40', '41', '42', '43', '44'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'أزرق', code: 'BLU', hex: '#1a5276' },
      { label: 'رمادي', code: 'GRY', hex: '#808080' },
    ],
  },
  {
    name: 'Nova Street Sneakers - رجالي',
    slug: 'mokhtar-nova-street-mens',
    description: 'جزمة كاجوال رجالي عصرية بتصميم رياضي أنيق. مريحة للارتداء اليومي ومتينة.',
    price: 1350,
    comparePrice: 1650,
    gender: 'men',
    sizes: ['40', '41', '42', '43', '44'],
    colors: [
      { label: 'أبيض', code: 'WHT', hex: '#ffffff' },
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'بيج', code: 'BEI', hex: '#f5f5dc' },
    ],
  },
  {
    name: 'Classic Edge Formal Shoes - رجالي',
    slug: 'mokhtar-classic-edge-mens',
    description: 'حذاء رسمي رجالي جلدي أنيق ومناسب للمناسبات الرسمية وأعمال المكتب. مريح طوال اليوم.',
    price: 1899,
    comparePrice: 2299,
    gender: 'men',
    sizes: ['40', '41', '42', '43', '44'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'بني', code: 'BRN', hex: '#6b3a2a' },
    ],
  },
  {
    name: 'Elegant Heel Pump - حريمي',
    slug: 'mokhtar-elegant-heel-women',
    description: 'كعب عالي أنيق للسيدات بتصميم عصري وجلد ناعم. مناسب للسهرات والمناسبات الخاصة.',
    price: 1299,
    comparePrice: 1599,
    gender: 'women',
    sizes: ['36', '37', '38', '39', '40'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'أحمر', code: 'RED', hex: '#ff0000' },
      { label: 'بيج', code: 'BEI', hex: '#f5f5dc' },
    ],
  },
  {
    name: 'Comfort Ballerina Flat - حريمي',
    slug: 'mokhtar-ballerina-flat-women',
    description: 'حذاء باليرينا مسطح مريح للسيدات بنعل طري وتصميم أنيق. مناسب للارتداء اليومي.',
    price: 799,
    comparePrice: 999,
    gender: 'women',
    sizes: ['36', '37', '38', '39', '40'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'ذهبي', code: 'GLD', hex: '#ffd700' },
      { label: 'فضي', code: 'SLV', hex: '#c0c0c0' },
    ],
  },
  {
    name: 'Summer Breeze Sandal - حريمي',
    slug: 'mokhtar-summer-sandal-women',
    description: 'صندل صيفي أنثوي مريح للسيدات بتصميم عصري وأشرطة ناعمة.',
    price: 599,
    comparePrice: 799,
    gender: 'women',
    sizes: ['36', '37', '38', '39', '40'],
    colors: [
      { label: 'أبيض', code: 'WHT', hex: '#ffffff' },
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'زهري', code: 'PNK', hex: '#ffc0cb' },
    ],
  },
  {
    name: 'Sport Flex Running - حريمي',
    slug: 'mokhtar-sport-flex-women',
    description: 'حذاء رياضي نسائي للجري والتمارين بخامة خفيفة ونعل مرن يمتص الصدمات.',
    price: 1399,
    comparePrice: 1699,
    gender: 'women',
    sizes: ['36', '37', '38', '39', '40'],
    colors: [
      { label: 'زهري', code: 'PNK', hex: '#ffc0cb' },
      { label: 'أبيض', code: 'WHT', hex: '#ffffff' },
      { label: 'بنفسجي', code: 'PRP', hex: '#800080' },
    ],
  },
  {
    name: 'Kids Active Sneaker - أطفال',
    slug: 'mokhtar-kids-active-sneaker',
    description: 'حذاء رياضي نشيط للأطفال بتصميم ملون ومريح. مناسب للعب والجري والأنشطة اليومية.',
    price: 499,
    comparePrice: 649,
    gender: 'kids',
    sizes: ['28', '29', '30', '31', '32', '33', '34', '35'],
    colors: [
      { label: 'أزرق', code: 'BLU', hex: '#1a5276' },
      { label: 'أحمر', code: 'RED', hex: '#ff0000' },
      { label: 'أخضر', code: 'GRN', hex: '#008000' },
    ],
  },
  {
    name: 'Kids School Shoe - أطفال',
    slug: 'mokhtar-kids-school-shoe',
    description: 'حذاء مدرسي مريح للأطفال بتصميم بسيط ومتين. مناسب للاستخدام اليومي في المدرسة.',
    price: 399,
    comparePrice: 499,
    gender: 'kids',
    sizes: ['28', '29', '30', '31', '32', '33', '34', '35'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'أبيض', code: 'WHT', hex: '#ffffff' },
    ],
  },
  {
    name: 'Tough Boot - رجالي',
    slug: 'mokhtar-tough-boot-mens',
    description: 'بوت رجالي متين وجلد طبيعي مناسب للشتاء والأجواء الباردة. نعل سميك مضاد للانزلاق.',
    price: 2199,
    comparePrice: 2599,
    gender: 'men',
    sizes: ['40', '41', '42', '43', '44'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'بني', code: 'BRN', hex: '#6b3a2a' },
    ],
  },
];

// ============================================================
// CLOTHING PRODUCTS (10)
// ============================================================
const CLOTHING = [
  {
    name: 'Core Cotton T-Shirt - رجالي',
    slug: 'mokhtar-core-tshirt-mens',
    description: 'تي شيرت رجالي قطني 100% بقصة مريحة ومناسب للاستخدام اليومي.',
    price: 349,
    comparePrice: 449,
    gender: 'men',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: [
      { label: 'أبيض', code: 'WHT', hex: '#ffffff' },
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'كحلي', code: 'NVY', hex: '#000080' },
    ],
  },
  {
    name: 'Urban Shield Hoodie - رجالي',
    slug: 'mokhtar-urban-hoodie-mens',
    description: 'هودي رجالي ثقيل بقماش قطني ثقيل وقلنسوة. مناسب لفصل الشتاء والجو البارد.',
    price: 799,
    comparePrice: 949,
    gender: 'men',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'رمادي', code: 'GRY', hex: '#808080' },
      { label: 'كحلي', code: 'NVY', hex: '#000080' },
    ],
  },
  {
    name: 'Denim Line Jeans - رجالي',
    slug: 'mokhtar-denim-jeans-mens',
    description: 'جينز رجالي بقصة كلاسيكية من قماش دينيم متين ومريح.',
    price: 899,
    comparePrice: 1099,
    gender: 'men',
    sizes: ['32', '34', '36', '38'],
    colors: [
      { label: 'أزرق', code: 'BLU', hex: '#1565c0' },
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'رمادي', code: 'GRY', hex: '#808080' },
    ],
  },
  {
    name: 'Aero Light Jacket - رجالي',
    slug: 'mokhtar-light-jacket-mens',
    description: 'جاكت رجالي خفيف الوزن مناسب لفصلي الربيع والخريف. تصميم عصري ومقاوم للرياح.',
    price: 1099,
    comparePrice: 1299,
    gender: 'men',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: [
      { label: 'كحلي', code: 'NVY', hex: '#000080' },
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'بيج', code: 'BEI', hex: '#f5f5dc' },
    ],
  },
  {
    name: 'Flowy Summer Dress - حريمي',
    slug: 'mokhtar-flowy-dress-women',
    description: 'فستان صيفي أنثوي بقصة واسعة وقماش قطني ناعم. مناسب للخروجات اليومية.',
    price: 699,
    comparePrice: 849,
    gender: 'women',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { label: 'زهري', code: 'PNK', hex: '#ffc0cb' },
      { label: 'أزرق', code: 'BLU', hex: '#1a5276' },
      { label: 'أبيض', code: 'WHT', hex: '#ffffff' },
    ],
  },
  {
    name: 'Slim Fit Blazer - حريمي',
    slug: 'mokhtar-slim-blazer-women',
    description: 'بلازر نسائي بقصة ضيقة وتصميم أنيق مناسب للمكتب والمقابلات الرسمية.',
    price: 1599,
    comparePrice: 1899,
    gender: 'women',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'كحلي', code: 'NVY', hex: '#000080' },
      { label: 'بيج', code: 'BEI', hex: '#f5f5dc' },
    ],
  },
  {
    name: 'Cozy Cardigan - حريمي',
    slug: 'mokhtar-cozy-cardigan-women',
    description: 'كارديجان نسائي صوفي دافئ وناعم. مناسب لفصل الشتاء والطبقات.',
    price: 899,
    comparePrice: 1099,
    gender: 'women',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { label: 'بيج', code: 'BEI', hex: '#f5f5dc' },
      { label: 'رمادي', code: 'GRY', hex: '#808080' },
      { label: 'كحلي', code: 'NVY', hex: '#000080' },
    ],
  },
  {
    name: 'Stretch Fit Leggings - حريمي',
    slug: 'mokhtar-stretch-leggings-women',
    description: 'ليجنز نسائي رياضي مطاطي مريح للتمارين الرياضية والارتداء اليومي.',
    price: 449,
    comparePrice: 549,
    gender: 'women',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { label: 'أسود', code: 'BLK', hex: '#000000' },
      { label: 'كحلي', code: 'NVY', hex: '#000080' },
      { label: 'رمادي', code: 'GRY', hex: '#808080' },
    ],
  },
  {
    name: 'Kids Cotton T-Shirt - أطفال',
    slug: 'mokhtar-kids-tshirt',
    description: 'تي شيرت قطني مريح للأطفال بتصميم ملون ومرح. مناسب للعب والمدرسة.',
    price: 199,
    comparePrice: 269,
    gender: 'kids',
    sizes: ['4Y', '6Y', '8Y', '10Y', '12Y'],
    colors: [
      { label: 'أزرق', code: 'BLU', hex: '#1a5276' },
      { label: 'أحمر', code: 'RED', hex: '#ff0000' },
      { label: 'أخضر', code: 'GRN', hex: '#008000' },
    ],
  },
  {
    name: 'Kids Jogger Set - أطفال',
    slug: 'mokhtar-kids-jogger-set',
    description: 'طقم بنطلون وجاكيت قطني للأطفال بقصة مريحة ومناسب للعب والأنشطة.',
    price: 499,
    comparePrice: 649,
    gender: 'kids',
    sizes: ['4Y', '6Y', '8Y', '10Y', '12Y'],
    colors: [
      { label: 'رمادي', code: 'GRY', hex: '#808080' },
      { label: 'أزرق', code: 'BLU', hex: '#1a5276' },
    ],
  },
];

// ============================================================
// SHIPPING ZONES — grouped by Egyptian region
// ============================================================
const SHIPPING_ZONES = [
  {
    name: 'القاهرة الكبرى',
    governorateCodes: ['cairo', 'new-cairo', 'helwan', '15th-may', 'giza', '6th-october', 'sheikh-zayed', 'qalyubia'],
    price: 35,
    deliveryTime: '1-2 أيام',
  },
  {
    name: 'الإسكندرية والساحل الشمالي',
    governorateCodes: ['alexandria', 'matrouh', 'beheira', 'damietta'],
    price: 45,
    deliveryTime: '2-3 أيام',
  },
  {
    name: 'الدلتا',
    governorateCodes: ['dakahlia', 'gharbia', 'sharqia', 'monufia', 'kafr-el-sheikh'],
    price: 45,
    deliveryTime: '2-3 أيام',
  },
  {
    name: 'قناة السويس وسيناء',
    governorateCodes: ['port-said', 'ismailia', 'suez', 'north-sinai', 'south-sinai'],
    price: 55,
    deliveryTime: '2-4 أيام',
  },
  {
    name: 'الصعيد - شمال',
    governorateCodes: ['fayoum', 'beni-suef', 'minya', 'giza-upper'],
    price: 60,
    deliveryTime: '3-5 أيام',
  },
  {
    name: 'الصعيد - جنوب',
    governorateCodes: ['asyut', 'sohag', 'qena', 'luxor', 'aswan'],
    price: 70,
    deliveryTime: '3-6 أيام',
  },
  {
    name: 'المناطق النائية',
    governorateCodes: ['red-sea', 'new-valley'],
    price: 85,
    deliveryTime: '4-7 أيام',
  },
];

// ============================================================
// HELPERS
// ============================================================
function buildVariantRows(item, imagePool) {
  const rows = [];
  let sortOrder = 1;
  const allImages = pickImages(imagePool, 4);

  for (const color of item.colors) {
    for (const size of item.sizes) {
      const colorIdx = item.colors.indexOf(color);
      const sizeIdx = item.sizes.indexOf(size);
      const primaryImg = allImages[colorIdx % allImages.length];
      const secondaryImg = allImages[(colorIdx + 1) % allImages.length];
      const priceDelta = sizeIdx * 30;

      rows.push({
        name: `${color.label} - ${size}`,
        type: 'variant',
        sku: `${item.sku}-${color.code}-${size}`,
        price: item.price + priceDelta,
        comparePrice: item.comparePrice + priceDelta,
        stock: 10 + colorIdx * 5 + sizeIdx * 3,
        sortOrder,
        metadata: JSON.stringify({ color: color.label, size, colorCode: color.code }),
        images: JSON.stringify([primaryImg, secondaryImg]),
      });
      sortOrder += 1;
    }
  }
  return rows;
}

async function upsertCategory(name, slug) {
  const existing = await safeDb.findFirst('category', {
    where: { companyId: COMPANY_ID, slug },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await safeDb.create('category', {
    data: { name, slug, companyId: COMPANY_ID, isActive: true },
    select: { id: true },
  });
  return created.id;
}

async function upsertProduct(item, index, imagePool, categoryId) {
  const skuPrefix = `MK-${slugify(item.name).toUpperCase().replace(/-/g, '').slice(0, 8)}`;
  item.sku = skuPrefix;

  const variants = buildVariantRows(item, imagePool);
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);
  const allImages = pickImages(imagePool, 4);

  const payload = {
    name: item.name,
    slug: item.slug,
    description: item.description,
    price: item.price,
    comparePrice: item.comparePrice,
    stock: totalStock,
    sku: item.sku,
    isActive: true,
    isFeatured: index < 4,
    trackInventory: true,
    categoryId,
    companyId: COMPANY_ID,
    mainImage: allImages[0],
    images: JSON.stringify(allImages),
    tags: JSON.stringify(['mokhtar', 'new-arrival', item.gender]),
    metadata: JSON.stringify({
      brand: 'Mokhtar',
      gender: item.gender,
      colors: item.colors.map(c => c.label),
      sizes: item.sizes,
    }),
  };

  const existing = await safeDb.findFirst('product', {
    where: { companyId: COMPANY_ID, slug: item.slug },
    select: { id: true },
  });

  let productId;
  let action;
  if (existing) {
    await safeDb.update('product', { where: { id: existing.id }, data: payload });
    productId = existing.id;
    action = 'updated';
  } else {
    const created = await safeDb.create('product', {
      data: payload,
      select: { id: true },
    });
    productId = created.id;
    action = 'created';
  }

  // Replace variants
  await safeDb.deleteMany('productVariant', { where: { productId } });
  if (variants.length > 0) {
    await safeDb.createMany('productVariant', {
      data: variants.map(v => ({ ...v, productId, isActive: true, trackInventory: true })),
    });
  }

  return { action, name: item.name, slug: item.slug, variantsCount: variants.length };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function setupShipping() {
  // Get governorate map by code
  const govs = await safeDb.findMany('governorate', {
    where: { isActive: true },
    select: { id: true, code: true },
  });
  const govMap = {};
  for (const g of govs) govMap[g.code] = g.id;

  // Delete existing zones for this company
  const existingZones = await safeDb.findMany('shippingZone', {
    where: { companyId: COMPANY_ID },
    select: { id: true },
  });
  for (const z of existingZones) {
    await safeDb.deleteMany('shippingZoneGovernorate', { where: { shippingZoneId: z.id } });
    await safeDb.delete('shippingZone', { where: { id: z.id } });
  }

  const results = [];
  for (const zone of SHIPPING_ZONES) {
    const validGovIds = zone.governorateCodes
      .map(code => govMap[code])
      .filter(Boolean);

    if (validGovIds.length === 0) {
      console.log(`   ⚠ No governorates found for zone "${zone.name}", skipping`);
      continue;
    }

    const created = await safeDb.create('shippingZone', {
      data: {
        name: zone.name,
        governorates: JSON.stringify(zone.governorateCodes),
        price: zone.price,
        deliveryTime: zone.deliveryTime,
        companyId: COMPANY_ID,
        isActive: true,
        deliveryTimeType: 'custom',
        pricingType: 'flat',
      },
      select: { id: true, name: true },
    });

    // Link governorates via join table
    for (const govId of validGovIds) {
      await safeDb.create('shippingZoneGovernorate', {
        data: {
          shippingZoneId: created.id,
          governorateId: govId,
        },
      });
    }

    results.push({ name: zone.name, governorates: validGovIds.length, price: zone.price });
  }
  return results;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🌱 Seeding Mokhtar Company full catalog...\n');

  // 1. Categories
  console.log('--- Categories ---');
  const shoeCatId = await upsertCategory('أحذية', 'shoes');
  const clothingCatId = await upsertCategory('ملابس', 'clothing');
  console.log(`   Shoes category: ${shoeCatId}`);
  console.log(`   Clothing category: ${clothingCatId}\n`);

  // 2. Shoe Products
  console.log('--- Shoe Products (10) ---');
  for (let i = 0; i < SHOES.length; i++) {
    const item = SHOES[i];
    const pool = SHOE_IMAGES[item.gender] || SHOE_IMAGES.men;
    const result = await upsertProduct(item, i, pool, shoeCatId);
    console.log(`   ${result.action.toUpperCase()}: ${result.name} — ${result.variantsCount} variants`);
  }

  // 3. Clothing Products
  console.log('\n--- Clothing Products (10) ---');
  for (let i = 0; i < CLOTHING.length; i++) {
    const item = CLOTHING[i];
    const pool = CLOTHING_IMAGES[item.gender] || CLOTHING_IMAGES.men;
    const result = await upsertProduct(item, i, pool, clothingCatId);
    console.log(`   ${result.action.toUpperCase()}: ${result.name} — ${result.variantsCount} variants`);
  }

  // 4. Shipping
  console.log('\n--- Shipping Zones ---');
  const shippingResults = await setupShipping();
  for (const z of shippingResults) {
    console.log(`   ${z.name}: ${z.governorates} governorates @ ${z.price} EGP`);
  }

  // 5. Summary
  const [totalProducts, totalVariants, totalZones, totalGovs] = await Promise.all([
    safeDb.count('product', { where: { companyId: COMPANY_ID } }),
    safeDb.count('productVariant', { where: { product: { companyId: COMPANY_ID } } }),
    safeDb.count('shippingZone', { where: { companyId: COMPANY_ID } }),
    safeDb.count('shippingZoneGovernorate', {
      where: { shippingZone: { companyId: COMPANY_ID } },
    }),
  ]);

  console.log('\n========================================');
  console.log('✅ Seeding Complete!');
  console.log(`   Products: ${totalProducts}`);
  console.log(`   Variants: ${totalVariants}`);
  console.log(`   Shipping Zones: ${totalZones}`);
  console.log(`   Governorates Covered: ${totalGovs}`);
  console.log('========================================');
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {});
